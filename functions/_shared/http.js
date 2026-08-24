export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
export function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }); }
export function options() { return new Response(null, { status: 200, headers: corsHeaders }); }
export function pathId(context) { return context.params?.id || new URL(context.request.url).pathname.split('/').filter(Boolean).pop(); }
