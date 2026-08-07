export const ROLES = ["member", "editor", "moderator", "admin"] as const;

export type Role = (typeof ROLES)[number];

const roleRank: Record<Role, number> = {
  member: 10,
  editor: 20,
  moderator: 30,
  admin: 40,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

export function hasMinimumRole(roles: readonly Role[], required: Role): boolean {
  return roles.some((role) => roleRank[role] >= roleRank[required]);
}

export function highestRole(roles: readonly Role[]): Role | null {
  return roles.reduce<Role | null>(
    (highest, role) => (!highest || roleRank[role] > roleRank[highest] ? role : highest),
    null,
  );
}
