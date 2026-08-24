import { createClient } from '@supabase/supabase-js';

export function createServiceClient(env) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase service configuration');
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function createAnonClient(env) {
  if (!env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) throw new Error('Missing Supabase anon configuration');
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function getAuthContext(request, env, role) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const anon = createAnonClient(env);
  const { data: { user }, error } = await anon.auth.getUser(token);
  if (error || !user) return null;
  const service = createServiceClient(env);
  const { data: profile, error: profileError } = await service.from('profiles').select('id,username,role').eq('id', user.id).maybeSingle();
  if (profileError || !profile || (role && profile.role !== role)) return null;
  return { client: service, user, profile };
}
