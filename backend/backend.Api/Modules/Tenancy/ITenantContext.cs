namespace backend.Api.Modules.Tenancy;

public interface ITenantContext
{
    Guid? CurrentMartId { get; }
}
