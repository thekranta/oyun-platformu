import { MAARIF_CIKTILAR_2026 } from '../constants/maarifCurriculum2026';
import { getMaarif } from '../constants/maarifMap';

// Öğretmen panelinde, çocuğun oynadığı oyunun Maarif karşılığını resmi metniyle göstermek için.
// Kaynak: constants/maarifMap.ts (oyun -> çıktı kodu) + constants/maarifCurriculum2026.ts (kodun resmi metni).

export interface MaarifInfo {
    /** Gösterilecek kod (örn. "MAB.4"). Resmi olmayan (platform içi) kodlarda null: öğretmene uydurma kod gösterilmez. */
    code: string | null;
    alan: string;
    surec: string;
    /** Kodun Maarif belgesindeki resmi metni; belgede yoksa oyunun kendi açıklaması. */
    text: string;
    /** Metin Maarif belgesinden mi (true), yoksa platformun kendi açıklamasından mı (false). */
    official: boolean;
}

export function getMaarifInfo(oyunTuru: string): MaarifInfo {
    const entry = getMaarif(oyunTuru);
    const curr = MAARIF_CIKTILAR_2026[entry.cikti];
    const isOfficialCode = !!curr && curr.resmi;
    return {
        code: isOfficialCode ? entry.cikti : null,
        alan: entry.alan,
        surec: entry.surec,
        text: curr ? curr.aciklama : entry.ciktiAciklama,
        official: !!curr,
    };
}
