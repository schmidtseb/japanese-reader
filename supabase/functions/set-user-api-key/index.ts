/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import 'https://esm.sh/@supabase/functions-js/edge-runtime'
import { createClient } from 'jsr:@supabase/supabase-js@^2';

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');
const IV_LENGTH = 12; // For AES-GCM.

// --- Encryption Helper ---
async function encrypt(text: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(text);
  const encryptedData = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: iv
  }, key, encodedText);
  const dataWithIv = new Uint8Array(iv.length + encryptedData.byteLength);
  dataWithIv.set(iv);
  dataWithIv.set(new Uint8Array(encryptedData), iv.length);
  return btoa(String.fromCharCode(...dataWithIv));
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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

    const { apiKey } = await req.json();

    let encryptedApiKey: string | null = null;
    if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(ENCRYPTION_KEY), {
          name: 'AES-GCM'
        }, false, ['encrypt']);
        encryptedApiKey = await encrypt(apiKey.trim(), key);
    }
    
    // Use upsert for resilience. This will create the profile row if it's missing,
    // or update it if it exists. The `id` is the primary key for the lookup.
    // The `updated_at` column is handled by a database trigger.
    const { error } = await supabaseClient
      .from('user_profiles')
      .upsert({
        id: user.id,
        encrypted_api_key: encryptedApiKey,
      });

    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      message: encryptedApiKey ? 'API key saved.' : 'API key cleared.'
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