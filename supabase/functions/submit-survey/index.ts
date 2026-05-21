import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const {
      session_id,
      nombre_apellido,
      dni,
      telefono,
      conocia_lista,
      opinion_propuestas,
      propuesta_nueva,
      fingerprint
    } = body;

    if (!session_id || !conocia_lista || !opinion_propuestas || !fingerprint) {
      return new Response(
        JSON.stringify({ error: 'missing_fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify session is active
    const { data: session } = await supabase
      .from('survey_sessions')
      .select('id, is_active')
      .eq('id', session_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'session_not_active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';

    // Create combined hash
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint + ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fingerprintHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check for duplicate
    const { data: existing } = await supabase
      .from('submission_controls')
      .select('id')
      .eq('session_id', session_id)
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'already_submitted' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert submission control
    const { error: controlError } = await supabase
      .from('submission_controls')
      .insert({ session_id, fingerprint_hash: fingerprintHash, ip_address: ip });

    if (controlError) {
      if (controlError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'already_submitted' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw controlError;
    }

    // Insert survey response
    const { error: responseError } = await supabase
      .from('survey_responses')
      .insert({
        session_id,
        nombre_apellido: nombre_apellido || null,
        dni: dni || null,
        telefono: telefono || null,
        conocia_lista,
        opinion_propuestas,
        propuesta_nueva: propuesta_nueva || null,
        fingerprint_hash: fingerprintHash
      });

    if (responseError) throw responseError;

    return new Response(
      JSON.stringify({ success: true }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'internal_error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
