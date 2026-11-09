export type SynapseUser = { id: string; name: string; email: string };

export type AuthLoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: SynapseUser;
};

export function isSynapseUser(data: unknown): data is SynapseUser {
  return !!data && typeof data === 'object' &&
    typeof (data as SynapseUser).id === 'string' &&
    typeof (data as SynapseUser).name === 'string' &&
    typeof (data as SynapseUser).email === 'string';
}

export function parseLoginResponse(data: unknown, now: number = Date.now()): AuthLoginResponse {
  if (!data || typeof data !== 'object') throw new Error('Resposta de autenticação inválida.');
  const result = data as Partial<AuthLoginResponse>;
  if (result.tokenType !== 'Bearer' || typeof result.accessToken !== 'string' ||
    !result.accessToken || typeof result.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(result.expiresAt)) || !isSynapseUser(result.user)) {
    throw new Error('O backend retornou um contrato de login inesperado.');
  }
  if (Date.parse(result.expiresAt) <= now) throw new Error('O backend retornou uma sessão já expirada.');
  return result as AuthLoginResponse;
}
