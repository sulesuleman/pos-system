namespace backend.Api.Modules.Identity.Domain;

public class User
{
    public Guid Id { get; set; }

    public Guid MartId { get; set; }

    public int StaffId { get; set; }

    public Guid RoleId { get; set; }

    // Null = Owner/Mart-wide. A User belongs to at most one Branch per Mart - a person in a
    // second Mart needs a second User row (already possible via the (MartId, Email) index).
    public Guid? BranchId { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    // Required in practice for email+password Roles (Owner, Manager); null for Counter-role
    // staff (Staff ID + PIN login, FR-27 - no email).
    public string? Email { get; set; }

    public required string Contact { get; set; }

    public required string Cnic { get; set; }

    public string? PasswordHash { get; set; }

    // Story 2.5 (FR-1/FR-27): the Owner, or a higher-Role staff member with "manage staff and
    // Roles", disables an account instead of deleting it - history stays visible, same one-way
    // pattern as Branch.IsActive. A disabled account can't sign in, and an already-signed-in
    // session for it is ended on its next request (Program.cs's suspension/disabled middleware).
    public bool IsActive { get; set; } = true;

    // Reserved for Epic 2's Counter-role PIN login - unused until that story is built.
    public string? PinHash { get; set; }

    // Null for Counter-role staff, who don't use the email+setup-code activation flow.
    public string? SetupCodeHash { get; set; }

    public DateTime? SetupCodeExpiresAtUtc { get; set; }

    public DateTime? SetupCodeUsedAtUtc { get; set; }

    // Which User created this one (e.g. the Owner who created a Manager). Null for the Owner
    // row itself, created by a Super Admin (not a User).
    public Guid? CreatedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
