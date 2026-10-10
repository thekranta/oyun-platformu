import { supabase } from './supabase';
import {
    ChildRow, ClassRow, DailyPoint, GameTypeRow, InstitutionDataSource, InstitutionInfo, Overview, PeriodDays,
    parseChild, parseClass, parseDaily, parseGameType, parseInstitution, parseOverview,
} from './institutionStats';

// Kurum paneli veri katmanı: supabase_migrations/add_institutions.sql fonksiyonlarını çağırır.
// İstemci tablolara DOKUNMAZ; yalnız yönetici olduğu kurum için fonksiyon döner, aksi hâlde boş küme gelir.

export type InstitutionErrorCode = 'not_installed' | 'failed';

export class InstitutionApiError extends Error {
    code: InstitutionErrorCode;
    constructor(code: InstitutionErrorCode, message: string) {
        super(message);
        this.code = code;
    }
}

// SQL henüz çalıştırılmadıysa PostgREST PGRST202 döner.
const isMissingFunction = (error: { code?: string; message?: string }) =>
    error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || '');

type Row = Record<string, unknown>;

async function call(fn: string, args?: Record<string, unknown>): Promise<Row[]> {
    let res;
    try {
        res = await supabase.rpc(fn, args);
    } catch (e) {
        throw new InstitutionApiError('failed', e instanceof Error ? e.message : String(e));
    }
    if (res.error) {
        throw new InstitutionApiError(isMissingFunction(res.error) ? 'not_installed' : 'failed', res.error.message);
    }
    return Array.isArray(res.data) ? (res.data as Row[]) : [];
}

/**
 * Yöneticisi olduğum kurumlar.
 *   [] : yönetici değil (panel gösterilmez)
 *   undefined : sorgu yapılamadı (SQL yok / ağ hatası) — panel girişi gösterilmez, öğretmen paneli aynen çalışır
 */
export async function fetchAdminInstitutions(): Promise<InstitutionInfo[] | undefined> {
    try {
        return (await call('my_admin_institutions')).map(parseInstitution);
    } catch {
        return undefined;
    }
}

export function createInstitutionSource(institutionId: string): InstitutionDataSource {
    const args = (days: PeriodDays) => ({ p_institution: institutionId, p_days: days });
    return {
        isDemo: false,
        async overview(days: PeriodDays): Promise<Overview | null> {
            const rows = await call('institution_overview', args(days));
            return rows.length ? parseOverview(rows[0]) : null;
        },
        async daily(days: PeriodDays): Promise<DailyPoint[]> {
            return (await call('institution_activity_daily', args(days))).map(parseDaily);
        },
        async gamesByType(days: PeriodDays): Promise<GameTypeRow[]> {
            return (await call('institution_games_by_type', args(days))).map(parseGameType);
        },
        async classes(days: PeriodDays): Promise<ClassRow[]> {
            return (await call('institution_classes', args(days))).map(parseClass);
        },
        async classChildren(classId: string, days: PeriodDays): Promise<ChildRow[]> {
            return (await call('institution_class_children', { ...args(days), p_class_id: classId })).map(parseChild);
        },
    };
}

/**
 * VELİ bildirimi: çocuğumun sınıfı bir kuruma bağlı mı? { sınıf-davet-id: kurum adı }.
 * Başarısızlıkta boş nesne (bildirim yalnız ek bilgidir, davet kartını bozmamalı).
 */
export async function fetchMyClassInstitutions(): Promise<Record<string, string>> {
    try {
        const out: Record<string, string> = {};
        for (const r of await call('my_class_institutions')) out[String(r.invite_id)] = String(r.institution_name ?? '');
        return out;
    } catch {
        return {};
    }
}
