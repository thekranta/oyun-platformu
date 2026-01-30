/**
 * Supabase Client - Shared instance for the application
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// SSR-safe Supabase client initialization
let supabase: SupabaseClient;

if (typeof window !== 'undefined') {
    // Client-side only: use AsyncStorage for session persistence
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    });
} else {
    // Server-side: basic client without storage
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            persistSession: false,
        },
    });
}

export { supabase };
export default supabase;
