import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { boardGameTier } from './boardMode';
import type { OgretmenTier, VeliTier } from './subscriptionTiers';
import { supabase } from './supabase';

/**
 * Tahta Modu erişimi: yalnız ÖĞRETMEN hesabı (teachers tablosunda user_id satırı olan oturum) açar; oyun erişimi
 * öğretmenin paketinden gelir (Çınar = Filiz düzeyi, Meşe = Fidan düzeyi, süresi dolmuşsa ücretsiz). Hem sahne sayfası
 * (app/tahta.tsx) hem oyun penceresi (app/tahta-oyun.tsx) aynı kuralı buradan okur; adresteki bir parametreye güvenilmez.
 */

export type BoardAccess =
    | { phase: 'loading' }
    | { phase: 'web-only' }
    | { phase: 'no-teacher' }
    | { phase: 'error' }
    | { phase: 'ready'; name: string; teacherTier: OgretmenTier; tier: VeliTier };

interface ClientLike {
    auth: { getSession(): Promise<{ data: { session: { user: { id: string } } | null } }> };
    from(table: string): any;
}

export async function loadBoardAccess(client: ClientLike): Promise<BoardAccess> {
    try {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        if (!user) return { phase: 'no-teacher' };
        const { data: row, error } = await client
            .from('teachers')
            .select('name, subscription_tier, package_expires_at')
            .eq('user_id', user.id)
            .maybeSingle();
        if (error) return { phase: 'error' };
        if (!row) return { phase: 'no-teacher' };
        const teacherTier = (row.subscription_tier as OgretmenTier | null) ?? 'free';
        return {
            phase: 'ready',
            name: String(row.name ?? ''),
            teacherTier,
            tier: boardGameTier(teacherTier, row.package_expires_at as string | null),
        };
    } catch {
        return { phase: 'error' };
    }
}

/** YALNIZ geliştirme (`__DEV__`) sürümünde `?dev=1` ile öğretmen oturumu olmadan önizleme için. Üretim paketinde çalışmaz. */
export const DEV_BOARD_ACCESS: BoardAccess = { phase: 'ready', name: 'Deneme Öğretmen', teacherTier: 'mese', tier: 'fidan' };

export function useBoardAccess(devBypass: boolean): { access: BoardAccess; retry: () => void } {
    const [access, setAccess] = useState<BoardAccess>({ phase: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'web') {
            setAccess({ phase: 'web-only' });
            return;
        }
        if (__DEV__ && devBypass) {
            setAccess(DEV_BOARD_ACCESS);
            return;
        }
        let alive = true;
        setAccess({ phase: 'loading' });
        loadBoardAccess(supabase).then((next) => { if (alive) setAccess(next); });
        return () => { alive = false; };
    }, [devBypass, attempt]);

    return { access, retry: () => setAttempt((n) => n + 1) };
}
