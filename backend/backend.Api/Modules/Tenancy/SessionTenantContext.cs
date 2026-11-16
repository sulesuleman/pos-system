using Microsoft.AspNetCore.Http;

namespace backend.Api.Modules.Tenancy;

public class SessionTenantContext : ITenantContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SessionTenantContext(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? CurrentMartId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?.Session.GetString("MartId");
            return value is null ? null : Guid.Parse(value);
        }
    }
}
