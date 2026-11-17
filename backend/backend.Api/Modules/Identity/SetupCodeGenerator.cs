using System.Security.Cryptography;
using backend.Api.Modules.Identity.Domain;
using Microsoft.AspNetCore.Identity;

namespace backend.Api.Modules.Identity;

// Generates the one-time setup code shown once at account creation (Owner, and now Manager too
// - same email+password activation flow for both Roles). Renamed from OwnerSetupCodeGenerator
// since it's no longer Owner-specific.
public static class SetupCodeGenerator
{
    // Same safe alphabet as MartCodeGenerator - excludes 0/O/1/I, which are easily mistyped.
    private const string Alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int CodeLength = 10;
    public static readonly TimeSpan Validity = TimeSpan.FromHours(1);

    public record GeneratedCode(string PlaintextCode, string Hash, DateTime ExpiresAtUtc);

    public static GeneratedCode Generate()
    {
        Span<char> chars = stackalloc char[CodeLength];
        for (var i = 0; i < CodeLength; i++)
        {
            chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
        }

        var plaintext = new string(chars);
        var hasher = new PasswordHasher<User>();
        var hash = hasher.HashPassword(user: null!, plaintext);

        return new GeneratedCode(plaintext, hash, DateTime.UtcNow.Add(Validity));
    }
}
