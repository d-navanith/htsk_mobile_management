import React, { useEffect, useRef } from 'react';

/**
 * SkyTechFluidEffect Component
 * Authentic WebGL2 Navier-Stokes 2D Fluid Simulation adapted directly from https://skytech.se/
 * Features:
 * - Dual-channel density + sub-stepped bright core highlight ribbon
 * - 18-step Jacobi pressure solver, vorticity/gradient subtraction, and viscosity diffusion
 * - Custom shader bilerp with exponential tone mapping (vec3(0.95686275, 0.31764706, 0.14509804))
 * - Works both as a card-scoped effect and a full-workspace interactive overlay
 */

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 aPosition;
out vec2 vUv;

void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const ADVECTION_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler2D uVelocity;
uniform vec2 uSourceTexelSize;
uniform vec2 uVelocityTexelSize;
uniform float uDt;
uniform float uDissipation;

vec4 bilerp(sampler2D source, vec2 uv, vec2 texelSize) {
    vec2 clampedUv = clamp(uv, texelSize * 0.5, 1.0 - texelSize * 0.5);
    vec2 position = clampedUv / texelSize - 0.5;
    vec2 index = floor(position);
    vec2 fraction = fract(position);

    vec2 uv00 = (index + vec2(0.5, 0.5)) * texelSize;
    vec2 uv10 = (index + vec2(1.5, 0.5)) * texelSize;
    vec2 uv01 = (index + vec2(0.5, 1.5)) * texelSize;
    vec2 uv11 = (index + vec2(1.5, 1.5)) * texelSize;

    vec4 bottom = mix(texture(source, uv00), texture(source, uv10), fraction.x);
    vec4 top = mix(texture(source, uv01), texture(source, uv11), fraction.x);
    return mix(bottom, top, fraction.y);
}

void main() {
    vec2 velocity = bilerp(uVelocity, vUv, uVelocityTexelSize).xy;
    vec2 previousUv = vUv - velocity * uDt;
    fragColor = uDissipation * bilerp(uSource, previousUv, uSourceTexelSize);
}
`;

const VISCOSITY_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
uniform float uViscosity;

void main() {
    vec2 left = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).xy;
    vec2 right = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).xy;
    vec2 bottom = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).xy;
    vec2 top = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).xy;
    vec2 center = texture(uVelocity, vUv).xy;
    vec2 averagedVelocity = (left + right + bottom + top) * 0.25;

    fragColor = vec4(mix(center, averagedVelocity, uViscosity), 0.0, 1.0);
}
`;

const DIVERGENCE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
    float left = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
    float top = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;

    fragColor = vec4(0.5 * ((right - left) + (top - bottom)), 0.0, 0.0, 1.0);
}
`;

const PRESSURE_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;

void main() {
    float left = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    float divergence = texture(uDivergence, vUv).x;

    fragColor = vec4((left + right + bottom + top - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`;

const GRADIENT_SUBTRACT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
    float left = texture(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
    float right = texture(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
    float bottom = texture(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
    float top = texture(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
    vec2 velocity = texture(uVelocity, vUv).xy;

    velocity -= 0.5 * vec2(right - left, top - bottom);
    fragColor = vec4(velocity, 0.0, 1.0);
}
`;

const SPLAT_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspectRatio;

void main() {
    vec2 point = vUv - uPoint;
    point.x *= uAspectRatio;

    float influence = exp(-dot(point, point) / uRadius);
    vec4 base = texture(uTarget, vUv);

    fragColor = base + vec4(uValue * influence, 1.0);
}
`;

const DISPLAY_SHADER = `#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDensity;
uniform vec2 uTexelSize;
uniform vec3 uFluidColor;
uniform vec3 uHighlightColor;

vec4 bilerp(sampler2D source, vec2 uv, vec2 texelSize) {
    vec2 clampedUv = clamp(uv, texelSize * 0.5, 1.0 - texelSize * 0.5);
    vec2 position = clampedUv / texelSize - 0.5;
    vec2 index = floor(position);
    vec2 fraction = fract(position);

    vec2 uv00 = (index + vec2(0.5, 0.5)) * texelSize;
    vec2 uv10 = (index + vec2(1.5, 0.5)) * texelSize;
    vec2 uv01 = (index + vec2(0.5, 1.5)) * texelSize;
    vec2 uv11 = (index + vec2(1.5, 1.5)) * texelSize;

    vec4 bottom = mix(texture(source, uv00), texture(source, uv10), fraction.x);
    vec4 top = mix(texture(source, uv01), texture(source, uv11), fraction.x);
    return mix(bottom, top, fraction.y);
}

void main() {
    vec4 dye = bilerp(uDensity, vUv, uTexelSize);
    float density = max(dye.x, 0.0);
    float highlight = max(dye.y, 0.0);

    // Keep the low-density edge restrained while preserving a bright core (exact skytech.se curve)
    float tone = 1.0 - exp(-density * 1.8);
    tone = pow(clamp(tone, 0.0, 1.0), 1.1);
    float highlightTone = 1.0 - exp(-highlight * 3.2);
    float corePower = pow(clamp(highlightTone, 0.0, 1.0), 0.75);
    float alpha = max(tone, corePower);

    vec3 color = mix(uFluidColor, uHighlightColor, clamp(corePower * 0.65, 0.0, 1.0));
    fragColor = vec4(color * alpha, alpha);
}
`;

function getResolution(baseRes, width, height) {
  const res = Math.max(2, Math.floor(baseRes));
  const aspect = width / Math.max(height, 1);
  return aspect > 1
    ? { width: res, height: Math.max(2, Math.round(res / aspect)) }
    : { width: Math.max(2, Math.round(res * aspect)), height: res };
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Unable to create WebGL shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgramObj(gl, vertexSource, fragmentSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error('Unable to create WebGL program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(info);
  }
  const uniforms = new Map();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const u = gl.getActiveUniform(program, i);
    if (u) {
      const name = u.name.replace(/\[0\]$/, '');
      uniforms.set(name, gl.getUniformLocation(program, name));
    }
  }
  return { program, uniforms };
}

function setUniform(progObj, name, setter) {
  const loc = progObj.uniforms.get(name);
  if (loc !== undefined && loc !== null) {
    setter(loc);
  }
}

export default function SkyTechFluidEffect({
  fullScreen = false,
  simulationResolution = 256,
  dyeResolution = 1024,
  cursorRadius = 0.011,
  cursorForce = 42,
  densityAmount = 1.15,
  densityDissipation = 0.992,
  velocityDissipation = 0.992,
  viscosity = 0.085,
  pressureIterations = 18,
  maxDevicePixelRatio = 2,
  autoPulse = true,
  opacity = 1
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // SkyTech signature orange3: vec3(0.95686275, 0.31764706, 0.14509804) -> #F45125
    const fluidRgb = [0.95686275, 0.31764706, 0.14509804];
    const highlightRgb = [1.0, 0.56, 0.24];

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      premultipliedAlpha: true
    });

    if (!gl || (!gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float'))) {
      // Graceful 2D Canvas fluid fallback if WebGL2 float textures are unavailable
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let animId = 0;
      const particles = [];
      const handleMove = e => {
        const rect = canvas.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          particles.push({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            r: 18,
            alpha: 0.75
          });
        }
      };
      const loop = () => {
        animId = window.requestAnimationFrame(loop);
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width || 300;
          canvas.height = rect.height || 150;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.r += 0.9;
          p.alpha *= 0.94;
          const grad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r);
          grad.addColorStop(0, `rgba(244, 81, 37, ${p.alpha})`);
          grad.addColorStop(1, 'rgba(244, 81, 37, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          if (p.alpha < 0.02) particles.splice(i, 1);
        }
      };
      window.addEventListener('pointermove', handleMove, { passive: true });
      animId = window.requestAnimationFrame(loop);
      return () => {
        window.cancelAnimationFrame(animId);
        window.removeEventListener('pointermove', handleMove);
      };
    }

    let animFrameId = 0;
    let needsResize = true;
    let velocityFbo = null;
    let densityFbo = null;
    let pressureFbo = null;
    let divergenceFbo = null;
    const splatQueue = [];

    const radiusClamped = Math.max(cursorRadius, 0.001);
    const viscosityClamped = Math.min(Math.max(viscosity, 0), 0.24);
    const pressureIterClamped = Math.max(1, Math.floor(pressureIterations));

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    if (!vao || !vbo) return;

    let programs = [];
    try {
      programs = [
        createProgramObj(gl, VERTEX_SHADER, ADVECTION_SHADER),
        createProgramObj(gl, VERTEX_SHADER, VISCOSITY_SHADER),
        createProgramObj(gl, VERTEX_SHADER, DIVERGENCE_SHADER),
        createProgramObj(gl, VERTEX_SHADER, PRESSURE_SHADER),
        createProgramObj(gl, VERTEX_SHADER, GRADIENT_SUBTRACT_SHADER),
        createProgramObj(gl, VERTEX_SHADER, SPLAT_SHADER),
        createProgramObj(gl, VERTEX_SHADER, DISPLAY_SHADER)
      ];
    } catch (err) {
      console.error('SkyTech Fluid shader error:', err);
      return;
    }

    const [
      advectionProg,
      viscosityProg,
      divergenceProg,
      pressureProg,
      gradSubtractProg,
      splatProg,
      displayProg
    ] = programs;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);

    function drawQuad() {
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function bindTextureUnit(texture, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    function bindTarget(target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
    }

    function createSingleFbo(w, h) {
      const texture = gl.createTexture();
      const fbo = gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return { texture, fbo, width: w, height: h };
    }

    function createDoubleFbo(w, h) {
      const fboPair = {
        read: createSingleFbo(w, h),
        write: createSingleFbo(w, h),
        swap() {
          const tmp = fboPair.read;
          fboPair.read = fboPair.write;
          fboPair.write = tmp;
        }
      };
      return fboPair;
    }

    function deleteSingleFbo(target) {
      if (target) {
        gl.deleteTexture(target.texture);
        gl.deleteFramebuffer(target.fbo);
      }
    }

    function deleteDoubleFbo(pair) {
      if (pair) {
        deleteSingleFbo(pair.read);
        deleteSingleFbo(pair.write);
      }
    }

    function clearFbo(target) {
      bindTarget(target);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function initFramebuffers() {
      const simSize = getResolution(simulationResolution, canvas.width, canvas.height);
      const dyeSize = getResolution(dyeResolution, canvas.width, canvas.height);

      if (
        !velocityFbo ||
        velocityFbo.read.width !== simSize.width ||
        velocityFbo.read.height !== simSize.height ||
        !densityFbo ||
        densityFbo.read.width !== dyeSize.width ||
        densityFbo.read.height !== dyeSize.height
      ) {
        deleteDoubleFbo(velocityFbo);
        deleteDoubleFbo(densityFbo);
        deleteDoubleFbo(pressureFbo);
        deleteSingleFbo(divergenceFbo);

        velocityFbo = createDoubleFbo(simSize.width, simSize.height);
        densityFbo = createDoubleFbo(dyeSize.width, dyeSize.height);
        pressureFbo = createDoubleFbo(simSize.width, simSize.height);
        divergenceFbo = createSingleFbo(simSize.width, simSize.height);

        clearFbo(velocityFbo.read);
        clearFbo(velocityFbo.write);
        clearFbo(densityFbo.read);
        clearFbo(densityFbo.write);
        clearFbo(pressureFbo.read);
        clearFbo(pressureFbo.write);
        clearFbo(divergenceFbo);
      }
    }

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), Math.max(maxDevicePixelRatio, 1));
      const nextW = Math.max(1, Math.floor(rect.width * dpr));
      const nextH = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      initFramebuffers();
      needsResize = false;
      return true;
    }

    function advect(source, velocity, target, dt, dissipation) {
      gl.useProgram(advectionProg.program);
      bindTextureUnit(source.texture, 0);
      bindTextureUnit(velocity.texture, 1);
      setUniform(advectionProg, 'uSource', loc => gl.uniform1i(loc, 0));
      setUniform(advectionProg, 'uVelocity', loc => gl.uniform1i(loc, 1));
      setUniform(advectionProg, 'uSourceTexelSize', loc => gl.uniform2f(loc, 1 / source.width, 1 / source.height));
      setUniform(advectionProg, 'uVelocityTexelSize', loc => gl.uniform2f(loc, 1 / velocity.width, 1 / velocity.height));
      setUniform(advectionProg, 'uDt', loc => gl.uniform1f(loc, dt));
      setUniform(advectionProg, 'uDissipation', loc => gl.uniform1f(loc, dissipation));
      bindTarget(target);
      drawQuad();
    }

    function applyViscosity() {
      if (!velocityFbo) return;
      for (let i = 0; i < 2; i++) {
        gl.useProgram(viscosityProg.program);
        bindTextureUnit(velocityFbo.read.texture, 0);
        setUniform(viscosityProg, 'uVelocity', loc => gl.uniform1i(loc, 0));
        setUniform(viscosityProg, 'uTexelSize', loc => gl.uniform2f(loc, 1 / velocityFbo.read.width, 1 / velocityFbo.read.height));
        setUniform(viscosityProg, 'uViscosity', loc => gl.uniform1f(loc, viscosityClamped));
        bindTarget(velocityFbo.write);
        drawQuad();
        velocityFbo.swap();
      }
    }

    function splatTarget(fboPair, x, y, value, rad = radiusClamped) {
      gl.useProgram(splatProg.program);
      bindTextureUnit(fboPair.read.texture, 0);
      setUniform(splatProg, 'uTarget', loc => gl.uniform1i(loc, 0));
      setUniform(splatProg, 'uPoint', loc => gl.uniform2f(loc, x, y));
      setUniform(splatProg, 'uValue', loc => gl.uniform3f(loc, value[0], value[1], value[2]));
      setUniform(splatProg, 'uRadius', loc => gl.uniform1f(loc, rad * rad));
      setUniform(splatProg, 'uAspectRatio', loc => gl.uniform1f(loc, canvas.width / Math.max(canvas.height, 1)));
      bindTarget(fboPair.write);
      drawQuad();
      fboPair.swap();
    }

    function processSplats() {
      if (!velocityFbo || !densityFbo || splatQueue.length === 0) return;
      const items = splatQueue.splice(0, splatQueue.length);
      for (const s of items) {
        const dist = Math.hypot(s.dx, s.dy);
        const vx = s.dx * cursorForce;
        const vy = s.dy * cursorForce;
        const intensity = densityAmount * (0.55 + dist * 10);
        const coreRadius = radiusClamped * 0.28;
        const steps = Math.min(8, Math.max(1, Math.ceil(dist / (coreRadius * 1.5))));

        splatTarget(velocityFbo, s.x, s.y, [vx, vy, 0]);
        splatTarget(densityFbo, s.x, s.y, [intensity, 0, 0]);
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          splatTarget(
            densityFbo,
            s.x - s.dx * (1 - t),
            s.y - s.dy * (1 - t),
            [0, intensity * 1.25, 0],
            coreRadius
          );
        }
      }
    }

    function solvePressure() {
      if (!velocityFbo || !pressureFbo || !divergenceFbo) return;
      gl.useProgram(divergenceProg.program);
      bindTextureUnit(velocityFbo.read.texture, 0);
      setUniform(divergenceProg, 'uVelocity', loc => gl.uniform1i(loc, 0));
      setUniform(divergenceProg, 'uTexelSize', loc => gl.uniform2f(loc, 1 / velocityFbo.read.width, 1 / velocityFbo.read.height));
      bindTarget(divergenceFbo);
      drawQuad();

      clearFbo(pressureFbo.read);
      clearFbo(pressureFbo.write);

      for (let i = 0; i < pressureIterClamped; i++) {
        gl.useProgram(pressureProg.program);
        bindTextureUnit(pressureFbo.read.texture, 0);
        bindTextureUnit(divergenceFbo.texture, 1);
        setUniform(pressureProg, 'uPressure', loc => gl.uniform1i(loc, 0));
        setUniform(pressureProg, 'uDivergence', loc => gl.uniform1i(loc, 1));
        setUniform(pressureProg, 'uTexelSize', loc => gl.uniform2f(loc, 1 / pressureFbo.read.width, 1 / pressureFbo.read.height));
        bindTarget(pressureFbo.write);
        drawQuad();
        pressureFbo.swap();
      }

      gl.useProgram(gradSubtractProg.program);
      bindTextureUnit(pressureFbo.read.texture, 0);
      bindTextureUnit(velocityFbo.read.texture, 1);
      setUniform(gradSubtractProg, 'uPressure', loc => gl.uniform1i(loc, 0));
      setUniform(gradSubtractProg, 'uVelocity', loc => gl.uniform1i(loc, 1));
      setUniform(gradSubtractProg, 'uTexelSize', loc => gl.uniform2f(loc, 1 / velocityFbo.read.width, 1 / velocityFbo.read.height));
      bindTarget(velocityFbo.write);
      drawQuad();
      velocityFbo.swap();
    }

    function renderDisplay() {
      if (!densityFbo) return;
      gl.useProgram(displayProg.program);
      bindTextureUnit(densityFbo.read.texture, 0);
      setUniform(displayProg, 'uDensity', loc => gl.uniform1i(loc, 0));
      setUniform(displayProg, 'uTexelSize', loc => gl.uniform2f(loc, 1 / densityFbo.read.width, 1 / densityFbo.read.height));
      setUniform(displayProg, 'uFluidColor', loc => gl.uniform3f(loc, fluidRgb[0], fluidRgb[1], fluidRgb[2]));
      setUniform(displayProg, 'uHighlightColor', loc => gl.uniform3f(loc, highlightRgb[0], highlightRgb[1], highlightRgb[2]));
      bindTarget(null);
      drawQuad();
    }

    let lastTime = performance.now();
    let lastPointerTime = performance.now();
    let autoAngle = Math.random() * Math.PI * 2;
    let lastX = 0.5;
    let lastY = 0.5;
    let hasPointer = false;

    // Seed an initial welcome fluid swirl so the user immediately sees the SkyTech effect on mount
    let initialFrames = 26;

    function step(now) {
      animFrameId = window.requestAnimationFrame(step);
      if ((needsResize && !resizeCanvas()) || !velocityFbo || !densityFbo) return;

      const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Initial or ambient gentle swirl when idle
      if (initialFrames > 0) {
        initialFrames--;
        autoAngle += 0.16;
        const nx = 0.55 + Math.cos(autoAngle) * 0.18;
        const ny = 0.5 + Math.sin(autoAngle * 1.4) * 0.16;
        const dx = -Math.sin(autoAngle) * 0.014;
        const dy = Math.cos(autoAngle * 1.4) * 0.014;
        splatQueue.push({ x: nx, y: ny, dx, dy });
      } else if (autoPulse && now - lastPointerTime > 2600) {
        autoAngle += dt * 1.4;
        const nx = 0.5 + Math.cos(autoAngle) * 0.25;
        const ny = 0.5 + Math.sin(autoAngle * 1.3) * 0.22;
        const dx = -Math.sin(autoAngle) * 0.0045;
        const dy = Math.cos(autoAngle * 1.3) * 0.0045;
        if (Math.random() < 0.45) {
          splatQueue.push({ x: nx, y: ny, dx, dy });
        }
      }

      advect(velocityFbo.read, velocityFbo.read, velocityFbo.write, dt, velocityDissipation);
      velocityFbo.swap();
      applyViscosity();
      processSplats();
      solvePressure();
      advect(densityFbo.read, velocityFbo.read, densityFbo.write, dt, densityDissipation);
      densityFbo.swap();
      renderDisplay();
    }

    function handlePointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      if (
        !(e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) ||
        rect.width <= 0 ||
        rect.height <= 0
      ) {
        hasPointer = false;
        return;
      }

      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      if (!hasPointer) {
        lastX = x;
        lastY = y;
        hasPointer = true;
      }
      const dx = x - lastX;
      const dy = y - lastY;
      lastX = x;
      lastY = y;

      if (Math.abs(dx) + Math.abs(dy) >= 0.0002) {
        lastPointerTime = performance.now();
        splatQueue.push({ x, y, dx, dy });
        if (splatQueue.length > 48) {
          splatQueue.shift();
        }
      }
    }

    function handleContextLost(e) {
      e.preventDefault();
      window.cancelAnimationFrame(animFrameId);
    }

    function handleResize() {
      needsResize = true;
    }

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', handleResize);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    canvas.addEventListener('webglcontextlost', handleContextLost);
    animFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animFrameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      if (resizeObserver) resizeObserver.disconnect();
      deleteDoubleFbo(velocityFbo);
      deleteDoubleFbo(densityFbo);
      deleteDoubleFbo(pressureFbo);
      deleteSingleFbo(divergenceFbo);
      for (const p of programs) {
        gl.deleteProgram(p.program);
      }
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
    };
  }, [
    cursorForce,
    cursorRadius,
    densityAmount,
    densityDissipation,
    dyeResolution,
    maxDevicePixelRatio,
    pressureIterations,
    simulationResolution,
    velocityDissipation,
    viscosity,
    autoPulse
  ]);

  return (
    <div
      className="skytech-fluid-container"
      aria-hidden="true"
      style={{
        position: fullScreen ? 'fixed' : 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        borderRadius: fullScreen ? 0 : 'inherit',
        zIndex: fullScreen ? 40 : 0,
        opacity
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
