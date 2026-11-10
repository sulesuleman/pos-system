using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace backend.Api.Tests;

public class StartupTests
{
    [Fact]
    public void MissingConnectionString_FailsFastOnStartup()
    {
        var factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ConnectionStrings:DefaultConnection", "");
            });

        var exception = Assert.Throws<InvalidOperationException>(() =>
        {
            using var client = factory.CreateClient();
        });

        Assert.Equal("Connection string 'DefaultConnection' was not found.", exception.Message);
    }
}
