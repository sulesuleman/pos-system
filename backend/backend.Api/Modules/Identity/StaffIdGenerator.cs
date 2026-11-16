using backend.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Identity;

public static class StaffIdGenerator
{
    public static async Task<int> GenerateNextAsync(AppDbContext db, Guid martId)
    {
        var maxExisting = await db.Owners
            .IgnoreQueryFilters()
            .Where(o => o.MartId == martId)
            .Select(o => (int?)o.StaffId)
            .MaxAsync();

        return (maxExisting ?? 0) + 1;
    }
}
