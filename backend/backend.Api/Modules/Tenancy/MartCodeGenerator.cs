using System.Security.Cryptography;
using backend.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace backend.Api.Modules.Tenancy;

public class MartCodeGenerator
{
    // Excludes 0/O/1/I - characters easily confused with each other when read aloud or copied.
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 6;
    private const int MaxAttempts = 10;

    public static async Task<string> GenerateUniqueAsync(AppDbContext db)
    {
        for (var attempt = 0; attempt < MaxAttempts; attempt++)
        {
            var code = Generate();
            var exists = await db.Marts.AnyAsync(m => m.Code == code);
            if (!exists)
            {
                return code;
            }
        }

        throw new InvalidOperationException($"Could not generate a unique Mart code after {MaxAttempts} attempts.");
    }

    private static string Generate()
    {
        Span<char> chars = stackalloc char[CodeLength];
        for (var i = 0; i < CodeLength; i++)
        {
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        return new string(chars);
    }
}
