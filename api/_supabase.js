const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
}

function createAnonClient() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createServiceClient() {
  if (!serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createRequestClient(request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

async function getAuthContext(request, options = {}) {
  const client = createRequestClient(request);
  if (!client) return null;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await client
    .from('profiles').select('id, username, role').eq('id', user.id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile || (options.role && profile.role !== options.role)) return null;
  return { client: createServiceClient() || client, user, profile };
}

module.exports = { createAnonClient, createServiceClient, createRequestClient, getAuthContext };
