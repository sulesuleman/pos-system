using backend.Api.Infrastructure.Persistence;
using backend.Api.Modules.Identity;
using backend.Api.Modules.Identity.Endpoints;
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

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseSession();

app.Run();

public partial class Program { }
