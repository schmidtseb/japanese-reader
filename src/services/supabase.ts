// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// This file is now a helper to create a client.
// The actual instance will be managed in a React context to allow for dynamic credentials.
export const createSupabaseClient = (url: string | null, key: string | null): SupabaseClient | null => {
    if (!url || !key) {
        return null;
    }
    try {
        // Create and return a new client instance
        return createClient(url, key);
    } catch (e) {
        // This can happen if the URL is malformed, for example.
        console.error("Failed to create Supabase client:", e);
        return null;
    }
};