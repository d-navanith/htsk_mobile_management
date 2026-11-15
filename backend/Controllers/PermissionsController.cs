using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using backend.Services;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;

    public PermissionsController(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<PermissionRowDto>>> GetPermissions()
    {
        var permissions = await _permissionService.GetAllPermissionsAsync();
        return Ok(permissions);
    }

    [HttpPost]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult<PermissionRowDto>> CreatePermission([FromBody] CreatePermissionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FunctionName))
        {
            return BadRequest(new { message = "Function name is required." });
        }

        try
        {
            var created = await _permissionService.CreatePermissionAsync(request);
            return Ok(created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{functionKey}")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult<PermissionRowDto>> UpdatePermission(string functionKey, [FromBody] UpdatePermissionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FunctionName))
        {
            return BadRequest(new { message = "Function name is required." });
        }

        var updated = await _permissionService.UpdatePermissionAsync(functionKey, request);
        if (updated == null)
        {
            return NotFound(new { message = "Function permission not found." });
        }

        return Ok(updated);
    }

    [HttpPut("toggle")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult<PermissionRowDto>> TogglePermission([FromBody] TogglePermissionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FunctionKey) || string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new { message = "FunctionKey and Role are required." });
        }

        var updated = await _permissionService.TogglePermissionAsync(request);

        if (updated == null)
        {
            return BadRequest(new { message = "Invalid function key or role." });
        }

        return Ok(updated);
    }

    [HttpDelete("{functionKey}")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult> DeletePermission(string functionKey)
    {
        var deleted = await _permissionService.DeletePermissionAsync(functionKey);
        if (!deleted)
        {
            return NotFound(new { message = "Function permission not found." });
        }

        return Ok(new { message = $"Function '{functionKey}' deleted." });
    }

    [HttpPost("reset")]
    [Authorize(Roles = "Developer")]
    public async Task<ActionResult<List<PermissionRowDto>>> ResetPermissions()
    {
        var permissions = await _permissionService.ResetToDefaultsAsync();
        return Ok(permissions);
    }
}
