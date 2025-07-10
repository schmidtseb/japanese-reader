// src/contexts/authContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { createSupabaseClient } from '../services/supabase.ts';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';

type AuthState = 'INITIALIZING' | 'LOGGED_IN' | 'LOGGED_OUT' | 'NO_CONFIG';

interface AuthContextType {
    supabase: SupabaseClient | null;
    authState: AuthState;
    user: User | null;
    session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
    const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);

    // Effect to create/update the Supabase client
    useEffect(() => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        
        if (supabaseUrl && supabaseAnonKey) {
            const client = createSupabaseClient(supabaseUrl, supabaseAnonKey);
            setSupabase(client);
        } else {
            setSupabase(null);
            setAuthState('NO_CONFIG');
        }
    }, []);

    // Effect to listen for auth state changes, depends on the client instance
    useEffect(() => {
        if (!supabase) {
            if (authState !== 'NO_CONFIG') {
                setAuthState('LOGGED_OUT');
                setUser(null);
                setSession(null);
            }
            return;
        }
        
        // When a new client is created, check the session immediately
        setAuthState('INITIALIZING');
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setAuthState(session ? 'LOGGED_IN' : 'LOGGED_OUT');
        }).catch(() => {
            // Handle potential error if client is invalid
            setAuthState('LOGGED_OUT');
        });

        // And subscribe to future changes
        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setAuthState(session ? 'LOGGED_IN' : 'LOGGED_OUT');
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]); // This effect now correctly re-runs when the client changes

    const value = { supabase, authState, user, session };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};