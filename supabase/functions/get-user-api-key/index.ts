/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import 'https://esm.sh/@supabase/functions-js/edge-runtime'
import { createClient } from 'jsr:@supabase/supabase-js@^2';

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
const IV_LENGTH = 12; // For AES-GCM.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- Decryption Helper ---
async function decrypt(encryptedText: string, key: CryptoKey) {
  const dataWithIv = new Uint8Array(atob(encryptedText).split('').map((c) => c.charCodeAt(0)));
  const iv = dataWithIv.slice(0, IV_LENGTH);
  const data = dataWithIv.slice(IV_LENGTH);
  const decrypted = await crypto.subtle.decrypt({
    name: 'AES-GCM',
    iv: iv
  }, key, data);
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    if (!ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY environment variable is not set.");
    }

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!
        }
      }
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }

    const { data: profile, error: profileError } = await supabaseClient.from('user_profiles').select('encrypted_api_key').eq('id', user.id).single();
    if (profileError || !profile || !profile.encrypted_api_key) {
      // It's not an error if the user has no key, just return null.
      return new Response(JSON.stringify({
        apiKey: null
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(ENCRYPTION_KEY), {
      name: 'AES-GCM'
    }, false, ['decrypt']);

    const decryptedApiKey = await decrypt(profile.encrypted_api_key, key);

    return new Response(JSON.stringify({
      apiKey: decryptedApiKey
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: (error as Error).message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});