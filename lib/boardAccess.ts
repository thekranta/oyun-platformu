import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { boardGameTier } from './boardMode';
import { getEffectiveOgretmenTier, getOgretmenFlags, type OgretmenTier, type VeliTier } from './subscriptionTiers';
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
    | {
        phase: 'ready';
        name: string;
        teacherTier: OgretmenTier;
        /** Oyun erişim düzeyi (paketten; süresi dolmuşsa ücretsiz). */
        tier: VeliTier;
        /** Öğretmenin kendi kullanıcı kimliği (kendi sınıflarını okumak için). */
        userId: string;
        /** "Sıra kimde?" (sınıf listesinden çocuk seçme) bu pakette açık mı? Geçerli (süresi dolmamış) Çınar/Meşe. */
        students: boolean;
    };

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
        const expiresAt = row.package_expires_at as string | null;
        return {
            phase: 'ready',
            name: String(row.name ?? ''),
            teacherTier,
            tier: boardGameTier(teacherTier, expiresAt),
            userId: user.id,
            students: getOgretmenFlags(getEffectiveOgretmenTier(teacherTier, expiresAt)).canUseBoardStudents,
        };
    } catch {
        return { phase: 'error' };
    }
}

/** YALNIZ geliştirme (`__DEV__`) sürümünde `?dev=1` ile öğretmen oturumu olmadan önizleme için. Üretim paketinde çalışmaz. */
export const DEV_BOARD_ACCESS: BoardAccess = { phase: 'ready', name: 'Deneme Öğretmen', teacherTier: 'mese', tier: 'fidan', userId: 'dev-user', students: true };

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
