export const teamQueryKeys = {
  all: ["team"] as const,
  members: () => [...teamQueryKeys.all, "members"] as const,
  overview: () => [...teamQueryKeys.all, "overview"] as const,
  invitations: () => [...teamQueryKeys.all, "invitations"] as const,
  domains: () => [...teamQueryKeys.all, "domains"] as const,
  inviteLink: () => [...teamQueryKeys.all, "invite-link"] as const,
}
