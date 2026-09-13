const authIdentities: Record<string, string> = {
  tkachev: 'admin@ddx.local',
};

export const getAuthEmail = (login: string) =>
  authIdentities[login.trim().toLowerCase()] ?? null;
