import { VeliTier } from './subscriptionTiers';
import { ALAN_ORDER, TIER_LABELS } from './teacherGameGuide';

// Öğretmenin veliye göndereceği "evde şu oyunları oynayın" mesajı: seçilen oyunlar kazanıma göre gruplanır,
// her kazanımda Maarif kodu ve resmi metin yer alır, paket gerektiren oyunlarda hangi paketle açıldığı yazılır.
// Metin kalıpları çeviri anahtarlarından gelir (t); bu dosya saf kalır ve testlenir.

export interface MessageGame { name: string; tier: VeliTier }

export interface MessagePick {
    /** Kazanım anahtarı (gruplama). */
    key: string;
    /** Gösterilecek resmi kod; resmi olmayan (platform içi) kodlarda null. */
    code: string | null;
    alan: string;
    /** Maarif belgesindeki resmi metin. */
    text: string;
    games: MessageGame[];
}

export type Translate = (key: string, options?: Record<string, unknown>) => string;

const alanRank = (alan: string) => {
    const i = ALAN_ORDER.indexOf(alan);
    return i === -1 ? ALAN_ORDER.length : i;
};

export function buildParentMessage(picks: MessagePick[], studentName: string | null | undefined, t: Translate): string {
    const chosen = picks.filter(p => p.games.length > 0);
    if (chosen.length === 0) return '';
    const sorted = [...chosen].sort((a, b) => alanRank(a.alan) - alanRank(b.alan) || a.key.localeCompare(b.key, 'tr'));
    const name = studentName?.trim();
    const lines: string[] = [
        t('teacher.guide.msg.greeting'),
        name ? t('teacher.guide.msg.introNamed', { name }) : t('teacher.guide.msg.intro'),
        '',
    ];
    for (const p of sorted) {
        lines.push(`🎯 ${p.alan} — ${p.code ? p.code + ': ' : ''}${p.text}`);
        for (const g of [...p.games].sort((a, b) => a.name.localeCompare(b.name, 'tr'))) {
            lines.push(g.tier === 'free'
                ? `• ${g.name}`
                : `• ${g.name} (${t('teacher.guide.msg.tierOpens', { tier: TIER_LABELS[g.tier] })})`);
        }
        lines.push('');
    }
    lines.push(t('teacher.guide.msg.closing'));
    return lines.join('\n');
}
