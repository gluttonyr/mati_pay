import client from './client';

export type SessionUser = { id: number; nom: string; prenom: string; role: string };

export const ADMIN_ONLY_MESSAGE = 'Accès réservé aux administrateurs';

// Response shape: { data: { access_token, user }, message, status }
export async function loginRequest(email: string, password: string) {
  const res = await client.post('/auth/login', { email, password });
  const { access_token, user } = res.data.data;
  if (!access_token || user?.role !== 'ADMIN') throw new Error(ADMIN_ONLY_MESSAGE);
  return {
    token: access_token as string,
    user: { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role } as SessionUser,
  };
}
