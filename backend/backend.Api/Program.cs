using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.AuditLog.Endpoints;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Endpoints;
using backend.Api.Modules.Tenancy;
using backend.Api.Modules.Tenancy.Domain;
using backend.Api.Modules.Tenancy.Endpoints;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        throw new InvalidOperationException("Connection string 'DefaultConnection' was not found.");
    }

    options.UseSqlServer(connectionString);
});

builder.Services.AddDistributedSqlServerCache(options =>
{
    options.ConnectionString = builder.Configuration.GetConnectionString("DefaultConnection"); // match whatever key your AppDbContext connection string uses
    options.SchemaName = "dbo";
    options.TableName = "SessionCache";
});

builder.Services.AddSession(options =>
{
    options.Cookie.Name = "PosSuperAdminSession";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest; // revisit to Always once you're on HTTPS everywhere (e.g. production)
    options.IdleTimeout = TimeSpan.FromMinutes(30);
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, SessionTenantContext>();

// Dev default covers the Vite dev server (though it normally proxies /api same-origin, see
// vite.config.ts); production origins go in that environment's own appsettings.
const string FrontendCorsPolicy = "Frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials(); // the session cookie needs this - requires explicit origins above, never "*".
    });
});

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SuperAdminSeeder.EnsureSeededAsync(db, builder.Configuration);
}

var v1 = app.MapGroup("/api/v1");

v1.MapGet("/health", () => Results.Ok(new {status = "ok" }));
v1.MapSuperAdminAuthEndpoints();
v1.MapAuthEndpoints();
v1.MapStaffEndpoints();
v1.MapRoleEndpoints();
v1.MapMartsEndpoints();
v1.MapAuditLogEndpoints();
v1.MapBranchesEndpoints();
v1.MapMartSettingsEndpoints();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Skipped in Development: the Vite dev proxy (vite.config.ts) deliberately targets the plain
// HTTP port (5139), so redirecting it to HTTPS (7212) sends every proxied call on a 307 hop to a
// different origin - breaking the session cookie and looking like a CORS failure in the browser.
// Production enforces HTTPS at the hosting/reverse-proxy layer instead.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

app.UseSession();

// Story 1.7 (FR-25) and Story 2.5 (FR-1): a suspended Mart, or a disabled User, refuses every
// API request from its already-signed-in session "on next contact", not just a fresh sign-in -
// one choke point here instead of a repeated check in every endpoint. Super Admin sessions never
// set "MartId"/"UserId", so this never touches /super-admin/* or /marts/*.
app.Use(async (context, next) =>
{
    var martIdValue = context.Session.GetString("MartId");
    if (martIdValue is not null && Guid.TryParse(martIdValue, out var martId))
    {
        var db = context.RequestServices.GetRequiredService<AppDbContext>();
        var mart = await db.Marts.AsNoTracking().SingleOrDefaultAsync(m => m.Id == martId);
        if (mart is null || mart.Status == MartStatus.Suspended)
        {
            context.Session.Clear();
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            // Shares AuthEndpoints.MartSuspendedMessage (Story 1.7/FR-25) rather than hardcoding
            // its own copy, so the two can never drift out of sync with each other.
            await context.Response.WriteAsJsonAsync(new { error = AuthEndpoints.MartSuspendedMessage });
            return;
        }
    }

    var userIdValue = context.Session.GetString("UserId");
    if (userIdValue is not null && Guid.TryParse(userIdValue, out var userId))
    {
        var db = context.RequestServices.GetRequiredService<AppDbContext>();
        var user = await db.Users.IgnoreQueryFilters().AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId);
        if (user is null || !user.IsActive)
        {
            context.Session.Clear();
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { error = AuthEndpoints.UserDisabledMessage });
            return;
        }
    }

    await next();
});

app.Run();

public partial class Program { }
