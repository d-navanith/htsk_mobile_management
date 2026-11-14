using System.Text;
using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Add services to DI
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 2. DbContext with SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost\\SQLEXPRESS;Database=CompanyMobileManagementDB;Integrated Security=True;TrustServerCertificate=True;";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// 3. Custom services
builder.Services.AddSingleton<ITimeService, ColomboTimeService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<ICheckSessionService, CheckSessionService>();
builder.Services.AddScoped<IPermissionService, PermissionService>();

// 4. JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "CompanyMobileManagementSystemSecretKey2026!SecureKeyForJwtTokenAuth";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "CMMS_API";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "CMMS_Client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

// 5. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 6. Automatic DB Initialization and Seeding
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        logger.LogInformation("Initializing database and applying migrations / seeds...");
        await DbInitializer.InitializeAsync(db);
        logger.LogInformation("Database initialized successfully!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// 7. Middleware pipeline
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
