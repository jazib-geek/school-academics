using School.Infrastructure.Entities;

namespace School.Infrastructure.Data;

/// <summary>
/// Canonical permission catalog. Seeded into tblPermission via HasData (PermissionConfiguration).
/// Ids are positional (index + 1): only ever append new entries at the end, never reorder or remove.
/// </summary>
public static class PermissionCatalog
{
    public static IReadOnlyList<Permission> All { get; } = Build();

    private static IReadOnlyList<Permission> Build()
    {
        var items = new List<(string Code, string Name, string Head)>();

        void Add(string code, string name, string head) => items.Add((code, name, head));

        Add("dashboard_view", "View Dashboard", "Dashboard");

        Add("user_list", "List Users", "User Management");
        Add("user_add", "Add User", "User Management");
        Add("user_edit", "Edit User", "User Management");
        Add("user_delete", "Delete User", "User Management");

        Add("activity_log_view", "View Activity Logs", "Activity Logs");
        Add("system_settings_manage", "Manage System Settings", "Settings");
        Add("chat_use", "Use Chat", "Communication");

        return items
            .Select((item, index) => new Permission
            {
                Id = index + 1,
                Code = item.Code,
                Name = item.Name,
                ModuleHead = item.Head,
                SortOrder = (index + 1) * 10,
                IsActive = true
            })
            .ToList();
    }
}
