// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
interface reqPayload {
  name: string;
}

// Add this line to inform TypeScript about the Deno global object.
declare const Deno: any;

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!
const IV_LENGTH = 12; // For AES-GCM.

// --- Encryption Helper ---
async function encrypt(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(text);
  
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedText
  );

  const dataWithIv = new Uint8Array(iv.length + encryptedData.byteLength);
  dataWithIv.set(iv);
  dataWithIv.set(new Uint8Array(encryptedData), iv.length);

  return btoa(String.fromCharCode(...dataWithIv));
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = Deno.createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { apiKey } = await req.json()

    if (!apiKey) {
      // Allow clearing the key by sending an empty string
      const { error } = await supabaseClient
        .from('user_profiles')
        .update({ encrypted_api_key: null })
        .eq('id', user.id)
      
      if (error) throw error
      
      return new Response(JSON.stringify({ success: true, message: 'API key cleared.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    // Encrypt the key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    const encryptedApiKey = await encrypt(apiKey, key);

    // Save to user_profiles table
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({ encrypted_api_key: encryptedApiKey })
      .eq('id', user.id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
