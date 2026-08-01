/**
 * weeklyReport.ts — Haftalık Gelişim Raporu Motoru
 * ------------------------------------------------------------
 * Ebeveyn paneli için PROFESYONEL, yazdırılabilir (PDF) haftalık
 * gelişim raporu üretir. Tüm hesaplama YERELDİR: Gemini/AI erişimi
 * olmasa bile rapor eksiksiz üretilir (AI notu varsa eklenir).
 *
 * PDF stratejisi: jsPDF/CDN yerine tarayıcının kendi yazdırma motoru.
 * buildWeeklyReportHTML() ile üretilen HTML yeni pencerede açılır,
 * kullanıcı "PDF olarak kaydet" ile indirir. Türkçe + emoji kusursuz.
 */

import { getMaarif } from '../constants/maarifMap';
import { ReportEngine } from './ReportEngine';

// ============== TİPLER ==============
export interface WeeklyGameLike {
    created_at: string;
    oyun_turu: string;
    correct_answers?: number | null;
    hata_sayisi?: number | null;
    sure?: number | null;
    response_time?: number | null;
}

export interface WeeklySkillArea {
    area: string;
    count: number;
    pct: number;      // en çok çalışılan alana göre oransal (0-100)
    codes: string[];  // ilişkili Maarif çıktı kodları (MAB.2 vb.)
}

export interface WeeklyTopGame {
    key: string;
    name: string;
    emoji: string;
    count: number;
    success: number;  // 0-100
}

export interface WeeklyDimension {
    label: string;
    value: number;    // 0-100
}

export interface WeeklyActivityDay {
    label: string;
    count: number;
}

export interface WeeklyHomeActivity {
    title: string;
    description: string;
    emoji: string;
    duration: string;
}

export interface WeeklyReportData {
    childName: string;
    childAge: number;
    ageLabel: string;
    period: string;
    rangeLabel: string;
    generatedLabel: string;

    gamesCount: number;
    activeDays: number;
    totalMinutes: number;
    avgSuccess: number;

    hasWeekData: boolean;   // son 7 günde oyun var mı
    sourceCount: number;    // rapora giren oyun sayısı

    skillAreas: WeeklySkillArea[];
    topGames: WeeklyTopGame[];
    dimensions: WeeklyDimension[];
    dailyActivity: WeeklyActivityDay[];
    strengths: string[];
    homeActivities: WeeklyHomeActivity[];
    encouragingMessage: string;
    highlight: { emoji: string; title: string; description: string };
    maarifNote: string;
    aiNote: string | null;
}

// ============== YARDIMCILAR ==============
const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const normalize = (name: string): string => {
    if (!name) return 'bilinmeyen-oyun';
    return name.toLowerCase().trim()
        .replace(/_/g, '-')
        .replace(/\s+/g, '-')
        .replace(/ı/g, 'i').replace(/İ/g, 'i')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c');
};

// Alanına göre varsayılan emoji (oyun özel emojisi yoksa)
const AREA_EMOJI: Record<string, string> = {
    'Matematik': '🔢',
    'Fen': '🔬',
    'Türkçe': '📖',
    'Müzik': '🎵',
    'Sanat': '🎨',
    'Sağlık': '🏃',
    'Hareket': '🏃',
    'Sosyal': '🤝',
    'Sosyal-Duygusal': '💛',
};

// Bilinen oyunlar için özel emoji (DB oyun_turu -> emoji)
const GAME_EMOJI: Record<string, string> = {
    'miktar-avcisi': '🎯', 'golge-dedektifi': '🔍', 'sihirli-tuval': '🎨',
    'uzay-bloklari': '🌌', 'yapboz': '🧩', 'hafiza': '🃏', 'eslestirme': '🃏',
    'onluk-cerceve': '🧮', 'tarti-dengesi': '⚖️', 'rakam-yazma': '✏️', 'rakam-yazma-2': '🔟',
    'hafiza-2': '🐾', 'eksik-sayi-bul-2': '❔', 'miktar-avcisi-2': '🐟', 'diziyi-tamamla-2': '✨', 'golge-dedektifi-2': '🔦', 'onluk-cerceve-2': '⭐',
    'yaratici-cizim': '🖍️', 'duygu-yuzleri': '😊', 'sayi-komsulari': '🔗',
    'sayilari-birlestir': '🔗', 'diziyi-tamamla': '🔢', 'sihirli-siseler': '✨',
    'ceviz-macera': '🌰', 'aile-sepeti': '🧺', 'bunu-soyle': '🗣️',
    'renk-sepetleri': '🌈', 'zitlari-eslestir': '↔️', 'sekil-treni': '🚂',
    'ayi-ailesi': '🐻', 'ciftlikte-sayalim': '🐔', 'ayni-farkli': '🔎',
    'hangisi-farkli': '🧐', 'sayi-boya': '🖌️', 'sayi-boya-2': '🖌️',
    'kutuyu-bul': '📦', 'gruplama': '🗂️', 'siralama': '📊', 'kodlama': '🤖',
};

const emojiFor = (key: string, area: string): string =>
    GAME_EMOJI[key] || AREA_EMOJI[area] || '🎮';

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

const successOf = (g: WeeklyGameLike): number => {
    if (g.correct_answers !== null && g.correct_answers !== undefined) {
        return clampPct(g.correct_answers * 10);
    }
    return clampPct((10 - (g.hata_sayisi || 0)) * 10);
};

const secondsOf = (g: WeeklyGameLike): number => {
    if (g.sure && g.sure > 0) return g.sure;
    if (g.response_time && g.response_time > 0) return Math.round(g.response_time / 1000);
    return 0;
};

const formatAge = (months: number): string => {
    if (!months || months <= 0) return '—';
    const y = Math.floor(months / 12);
    const m = months % 12;
    if (y <= 0) return `${months} aylık`;
    return m > 0 ? `${months} aylık (${y} yaş ${m} ay)` : `${months} aylık (${y} yaş)`;
};

const developmentalPeriod = (months: number): string => {
    if (months < 36) return 'Erken Çocukluk (24–36 ay)';
    if (months < 48) return 'Okul Öncesi Erken Dönem (36–48 ay)';
    if (months < 60) return 'Okul Öncesi Geç Dönem (48–60 ay)';
    return 'Okula Hazırlık Dönemi (60–72 ay)';
};

const highlightFor = (avgSuccess: number, gamesCount: number, activeDays: number) => {
    if (gamesCount === 0) return { emoji: '🌱', title: 'Yeni Bir Hafta', description: 'Birlikte keşfetmeye hazırız!' };
    if (avgSuccess >= 90) return { emoji: '🏆', title: 'Bilgi Şampiyonu', description: 'Bu hafta neredeyse hatasız bir performans!' };
    if (activeDays >= 5) return { emoji: '🔥', title: 'İstikrar Yıldızı', description: 'Bu hafta düzenli çalışma harika gidiyor!' };
    if (avgSuccess >= 75) return { emoji: '🌟', title: 'Parlayan Yıldız', description: 'Yüksek başarı oranıyla güçlü bir hafta!' };
    if (gamesCount >= 8) return { emoji: '🚀', title: 'Meraklı Kâşif', description: 'Bu hafta bolca pratik yapıldı!' };
    return { emoji: '💪', title: 'Gelişen Yetenek', description: 'Her oyunla biraz daha güçleniyor!' };
};

// ============== RAPOR VERİSİ ==============
export function buildWeeklyReport(
    childName: string,
    childAge: number,
    scores: WeeklyGameLike[],
    aiNote?: string | null,
): WeeklyReportData {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const valid = (scores || []).filter(s => s && s.created_at && !isNaN(new Date(s.created_at).getTime()));
    const weekScores = valid.filter(s => new Date(s.created_at) >= weekStart);
    const hasWeekData = weekScores.length > 0;

    // Hafta boşsa son 12 oyundan bir "gelişim özeti" göster (rapor daima anlamlı olsun)
    const source = hasWeekData ? weekScores : valid.slice(0, 12);

    const gamesCount = source.length;
    const activeDays = new Set(weekScores.map(s => new Date(s.created_at).toDateString())).size;
    const totalSeconds = source.reduce((a, g) => a + secondsOf(g), 0);
    const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
    const avgSuccess = gamesCount > 0
        ? Math.round(source.reduce((a, g) => a + successOf(g), 0) / gamesCount)
        : 0;

    // Gelişim alanları (Maarif) — badgeAlan öncelikli, yoksa alan
    const areaMap = new Map<string, { count: number; codes: Set<string> }>();
    source.forEach(g => {
        const m = getMaarif(normalize(g.oyun_turu));
        const area = m.badgeAlan || m.alan || 'Genel';
        if (!areaMap.has(area)) areaMap.set(area, { count: 0, codes: new Set() });
        const entry = areaMap.get(area)!;
        entry.count += 1;
        if (m.cikti) entry.codes.add(m.cikti);
    });
    const maxAreaCount = Math.max(1, ...Array.from(areaMap.values()).map(v => v.count));
    const skillAreas: WeeklySkillArea[] = Array.from(areaMap.entries())
        .map(([area, v]) => ({ area, count: v.count, pct: clampPct((v.count / maxAreaCount) * 100), codes: Array.from(v.codes) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

    // En çok oynanan oyunlar
    const gameMap = new Map<string, { count: number; success: number; area: string }>();
    source.forEach(g => {
        const key = normalize(g.oyun_turu);
        const m = getMaarif(key);
        const area = m.badgeAlan || m.alan || 'Genel';
        if (!gameMap.has(key)) gameMap.set(key, { count: 0, success: 0, area });
        const entry = gameMap.get(key)!;
        entry.count += 1;
        entry.success += successOf(g);
    });
    const topGames: WeeklyTopGame[] = Array.from(gameMap.entries())
        .map(([key, v]) => ({
            key,
            name: getMaarif(key).displayName || key.replace(/-/g, ' '),
            emoji: emojiFor(key, v.area),
            count: v.count,
            success: Math.round(v.success / v.count),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    // Günlük aktivite (son 7 gün)
    const dailyActivity: WeeklyActivityDay[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const count = valid.filter(s => new Date(s.created_at).toDateString() === d.toDateString()).length;
        const label = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
        return { label, count };
    });

    // ReportEngine: gelişim profili + güçlü yönler + evde aktiviteler
    const pr = ReportEngine.generateParentReport(childName, source as any);
    const dimensions: WeeklyDimension[] = pr.radarChartData.map(d => ({ label: d.label, value: d.value }));
    const homeActivities: WeeklyHomeActivity[] = pr.homeActivities;
    const strengths = pr.strengths.length > 0
        ? pr.strengths
        : (dimensions.length > 0
            ? [`${[...dimensions].sort((a, b) => b.value - a.value)[0].label} alanında güçlü performans gösteriyor!`]
            : []);
    const encouragingMessage = pr.encouragingMessage;

    const rangeLabel = `${weekStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const generatedLabel = `${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

    const distinctAreas = skillAreas.map(a => a.area).slice(0, 4).join(', ');
    const maarifNote = distinctAreas
        ? `Bu haftaki etkinlikler Türkiye Yüzyılı Maarif Modeli kazanımlarıyla ilişkilendirilmiştir. Çalışılan alanlar: ${distinctAreas}.`
        : 'Etkinlikler Türkiye Yüzyılı Maarif Modeli kazanımlarıyla ilişkilendirilmiştir.';

    return {
        childName,
        childAge,
        ageLabel: formatAge(childAge),
        period: developmentalPeriod(childAge),
        rangeLabel,
        generatedLabel,
        gamesCount,
        activeDays,
        totalMinutes,
        avgSuccess,
        hasWeekData,
        sourceCount: source.length,
        skillAreas,
        topGames,
        dimensions,
        dailyActivity,
        strengths,
        homeActivities,
        encouragingMessage,
        highlight: highlightFor(avgSuccess, gamesCount, activeDays),
        maarifNote,
        aiNote: aiNote ? cleanText(aiNote) : null,
    };
}

// Markdown işaretlerini temizle (** __ * _ #)
function cleanText(t: string): string {
    return t
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/(^|\s)\*([^*]+)\*/g, '$1$2')
        .replace(/(^|\s)_([^_]+)_/g, '$1$2')
        .replace(/^#{1,6}\s*/gm, '')
        .trim();
}

// ============== YAZDIRILABİLİR HTML ==============
const esc = (s: string): string =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

// Gelişim profili boyutları için sade lacivert tonları (editöryal palet)
const DIM_COLORS = ['#12172b', '#2b3350', '#3d466b', '#586394', '#7580ab'];

/**
 * Premium Editöryal tasarımlı yazdırılabilir rapor.
 * @param premium  true → tam detaylı rapor; false → temel özet + günlük grafik
 *                 + kilitli premium bölümü (ücretsiz kademe).
 */
export function buildWeeklyReportHTML(r: WeeklyReportData, premium: boolean = true): string {
    const initial = esc((r.childName || '?').charAt(0).toUpperCase());

    let n = 0;
    const sec = (title: string, inner: string) => {
        n++;
        return `
    <section class="sec">
      <div class="sec-h"><span class="sec-n">${String(n).padStart(2, '0')}</span><h2 class="sec-t">${esc(title)}</h2><span class="sec-rule"></span></div>
      ${inner}
    </section>`;
    };

    // ---- İstatistik şeridi (her iki kademede) ----
    const stat = (num: string, label: string) =>
        `<div class="stat"><div class="stat-num">${esc(num)}</div><div class="stat-rule"></div><div class="stat-lbl">${esc(label)}</div></div>`;
    const statStrip = `<div class="stats">
      ${stat(String(r.gamesCount), r.hasWeekData ? 'Oyun' : 'Son Oyun')}
      ${stat(`${r.activeDays}/7`, 'Aktif Gün')}
      ${stat(String(r.totalMinutes), 'Dakika')}
      ${stat(`%${r.avgSuccess}`, 'Başarı')}
    </div>`;

    // ---- Günlük aktivite (her iki kademede) ----
    const maxDay = Math.max(1, ...r.dailyActivity.map(d => d.count));
    const dailyBars = r.dailyActivity.map(d => {
        const h = d.count > 0 ? Math.max(12, Math.round((d.count / maxDay) * 64)) : 3;
        return `<div class="day"><div class="day-wrap"><div class="day-bar" style="height:${h}px">${d.count > 0 ? `<span>${d.count}</span>` : ''}</div></div><div class="day-lbl">${esc(d.label)}</div></div>`;
    }).join('');
    const dailySection = sec('Günlük Aktivite', `<div class="daily">${dailyBars}</div><div class="cap">Son yedi gündeki oyun etkinliği.</div>`);

    // ---- Premium bölümleri ----
    const skillInner = r.skillAreas.map(a => `
      <div class="row">
        <div class="row-h"><span class="row-name">${esc(a.area)}</span><span class="row-count">${a.count} etkinlik</span></div>
        <div class="bar"><div class="fill" style="width:${a.pct}%"></div></div>
        ${a.codes.length ? `<div class="codes">${a.codes.map(c => `<span class="code">${esc(c)}</span>`).join('')}</div>` : ''}
      </div>`).join('');

    const dimInner = r.dimensions.map((d, i) => `
      <div class="drow"><span class="dlabel">${esc(d.label)}</span><div class="bar"><div class="fill" style="width:${d.value}%;background:${DIM_COLORS[i % DIM_COLORS.length]}"></div></div><span class="dval">${d.value}</span></div>`).join('');

    const gamesInner = r.topGames.map(g => `
      <div class="grow"><span class="gem">${g.emoji}</span><div class="gmain"><div class="gname">${esc(g.name)}</div><div class="bar sm"><div class="fill gold" style="width:${g.success}%"></div></div></div><div class="gmeta"><span class="gc">${g.count}×</span><span class="gs">%${g.success}</span></div></div>`).join('');

    const strengthsInner = `<div class="strengths">${r.strengths.map(s => `<div class="strength"><span class="tick">✓</span><span>${esc(s)}</span></div>`).join('')}</div>`;

    const homeInner = r.homeActivities.map(a => `
      <div class="home"><span class="hem">${a.emoji}</span><div class="hbody"><div class="ht"><span class="htitle">${esc(a.title)}</span><span class="hdur">${esc(a.duration)}</span></div><div class="hdesc">${esc(a.description)}</div></div></div>`).join('');

    // ---- Ortak öğeler ----
    const highlight = `<div class="hl"><span class="hl-em">${r.highlight.emoji}</span><div><div class="hl-t">${esc(r.highlight.title)}</div><div class="hl-d">${esc(r.highlight.description)}</div></div></div>`;
    const encourage = `<div class="encourage">“${esc(r.encouragingMessage)}”</div>`;

    const emptyBanner = r.gamesCount === 0
        ? `<div class="empty">Bu hafta henüz oyun oynanmadı. Aşağıdaki özet, en son oynanan oyunlardan derlenmiştir.</div>`
        : (!r.hasWeekData
            ? `<div class="empty">Son yedi günde kayıt bulunmadığından özet, en son ${r.sourceCount} oyundan derlenmiştir.</div>`
            : '');

    // ---- Ücretsiz kademe: kilitli premium bölümü ----
    const lockedList = [
        'Maarif kazanımlarına göre çalışılan gelişim alanları',
        'Gelişim profili (5 beceri boyutu)',
        'En çok oynanan oyunlar ve başarı dağılımı',
        'Güçlü yönler değerlendirmesi',
        'Eve özel etkinlik önerileri',
        'Uzman değerlendirme notu',
    ];
    const lockedSection = `
    <section class="sec">
      <div class="locked">
        <div class="locked-lock">🔒</div>
        <div class="locked-kicker">Premium Rapor</div>
        <h3 class="locked-title">Detaylı Gelişim Analizi</h3>
        <p class="locked-desc">Çocuğunuzun Maarif kazanımlarına göre ayrıntılı analizini, gelişim profilini ve eve özel önerileri Premium raporda bulabilirsiniz.</p>
        <ul class="locked-list">${lockedList.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="locked-badge">Premium&apos;a Geçin</div>
      </div>
    </section>`;

    // ---- Bölümleri sıraya diz ----
    let sections = dailySection;
    if (premium) {
        if (r.skillAreas.length) sections += sec('Çalışılan Gelişim Alanları · Maarif Modeli', skillInner);
        if (r.dimensions.length) sections += sec('Gelişim Profili', dimInner);
        if (r.topGames.length) sections += sec('En Çok Oynanan Oyunlar', gamesInner);
        if (r.strengths.length) sections += sec('Güçlü Yönler', strengthsInner);
        if (r.homeActivities.length) sections += sec('Evde Ne Yapabilirsiniz?', homeInner);
        if (r.aiNote) sections += sec('Uzman Değerlendirme Notu', `<div class="ai">${esc(r.aiNote).replace(/\n/g, '<br/>')}</div>`);
    } else {
        sections += lockedSection;
    }

    const tierTag = premium
        ? `<span class="tier tier-p">Premium Rapor</span>`
        : `<span class="tier tier-f">Özet Rapor</span>`;

    return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Haftalık Gelişim Raporu — ${esc(r.childName)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0}
  @page{size:A4;margin:11mm}
  :root{--navy:#12172b;--navy2:#20263f;--gold:#c8a45c;--gold-l:#e6ce94;--ink:#2a2f45;--muted:#7a7f8d;--line:#e9e5d9;--serif:Georgia,'Times New Roman',serif}
  body{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:#e7e9ef;line-height:1.5}
  .sheet{max-width:800px;margin:0 auto;background:#fff}
  /* Toolbar (yazdırılmaz) */
  .toolbar{position:sticky;top:0;z-index:10;display:flex;gap:12px;align-items:center;justify-content:center;padding:13px;background:var(--navy)}
  .toolbar button{cursor:pointer;border:0;border-radius:3px;padding:10px 20px;font-size:14px;font-weight:700;font-family:inherit;letter-spacing:.5px}
  .btn-print{background:var(--gold);color:var(--navy)}
  .btn-close{background:rgba(255,255,255,.12);color:#fff}
  .toolbar .hint{font-size:11.5px;color:rgba(255,255,255,.6)}
  @media print{.toolbar{display:none}body{background:#fff}}
  /* Masthead */
  .gold-top{height:5px;background:linear-gradient(90deg,var(--gold),var(--gold-l),var(--gold))}
  .mast{background:var(--navy);color:#fff;padding:26px 34px;display:flex;align-items:center;gap:20px}
  .monogram{width:62px;height:62px;border-radius:50%;border:2px solid var(--gold);background:rgba(200,164,92,.14);display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-size:28px;color:#fff;flex:0 0 auto}
  .mast-main{flex:1}
  .kicker{font-size:10.5px;letter-spacing:3.5px;text-transform:uppercase;color:var(--gold);font-weight:700}
  .mast-name{font-family:var(--serif);font-size:26px;font-weight:700;margin-top:4px;letter-spacing:.3px}
  .mast-brand{font-size:11.5px;color:rgba(255,255,255,.6);margin-top:5px;letter-spacing:.6px}
  .mast-right{text-align:right;flex:0 0 auto}
  .mast-right .lbl{font-size:9.5px;letter-spacing:2px;text-transform:uppercase;color:var(--gold)}
  .mast-right .val{font-family:var(--serif);font-size:13.5px;margin-top:3px;color:#fff;max-width:150px}
  .tier{display:inline-block;margin-top:8px;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;padding:3px 9px;border-radius:2px}
  .tier-p{background:var(--gold);color:var(--navy)}
  .tier-f{background:rgba(255,255,255,.14);color:var(--gold-l);border:1px solid rgba(200,164,92,.5)}
  /* Meta strip */
  .meta{display:flex;border-bottom:1px solid var(--line);background:#faf9f5}
  .meta > div{flex:1;padding:11px 20px;font-size:11px;color:var(--muted);border-right:1px solid var(--line)}
  .meta > div:last-child{border-right:0}
  .meta b{display:block;color:var(--navy);font-size:12.5px;margin-top:2px;font-weight:700}
  /* Highlight */
  .hl{margin:20px 34px 0;border-left:3px solid var(--gold);background:#faf7ef;padding:13px 18px;display:flex;gap:14px;align-items:center}
  .hl-em{font-size:26px}
  .hl-t{font-family:var(--serif);font-size:16px;color:var(--navy);font-weight:700}
  .hl-d{font-size:12.5px;color:#6c6f5f;margin-top:2px}
  .empty{margin:18px 34px 0;padding:11px 16px;border:1px solid #e6d9b8;background:#fbf6e8;color:#8a6d2f;font-size:12px}
  /* Stats */
  .stats{display:flex;margin:20px 34px 0;border:1px solid var(--line)}
  .stat{flex:1;padding:16px 8px;text-align:center;border-right:1px solid var(--line)}
  .stat:last-child{border-right:0}
  .stat-num{font-family:var(--serif);font-size:27px;color:var(--navy);font-weight:700;line-height:1}
  .stat-rule{width:22px;height:2px;background:var(--gold);margin:8px auto 0}
  .stat-lbl{font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin-top:7px}
  /* Sections */
  .sec{padding:22px 34px 0}
  .sec-h{display:flex;align-items:center;gap:11px;margin-bottom:14px}
  .sec-n{font-family:var(--serif);font-size:13px;color:var(--gold);font-weight:700;letter-spacing:1px}
  .sec-t{font-size:12.5px;letter-spacing:2px;text-transform:uppercase;color:var(--navy);font-weight:700}
  .sec-rule{flex:1;height:1px;background:var(--line)}
  .cap{font-size:10.5px;color:var(--muted);margin-top:9px;font-style:italic}
  .bar{height:9px;border-radius:6px;background:#eef0f4;overflow:hidden}
  .bar.sm{height:7px}
  .fill{height:100%;border-radius:6px;background:var(--navy)}
  .fill.gold{background:linear-gradient(90deg,var(--gold),var(--gold-l))}
  /* Skill rows */
  .row{margin-bottom:13px}
  .row-h{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
  .row-name{font-size:14px;font-weight:700;color:var(--navy)}
  .row-count{font-size:11px;color:var(--muted)}
  .codes{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}
  .code{font-size:9.5px;font-weight:700;letter-spacing:.5px;color:#a07d2f;border:1px solid #dcc79a;border-radius:3px;padding:2px 7px}
  /* Daily */
  .daily{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;height:92px;padding:4px 2px 0}
  .day{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
  .day-wrap{flex:1;display:flex;align-items:flex-end}
  .day-bar{width:24px;border-radius:4px 4px 2px 2px;background:var(--navy);display:flex;align-items:flex-start;justify-content:center;min-height:3px}
  .day-bar span{color:var(--gold-l);font-size:10.5px;font-weight:800;margin-top:3px}
  .day-lbl{font-size:10px;color:var(--muted);margin-top:6px;letter-spacing:.5px}
  /* Games */
  .grow{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f2f1ea}
  .grow:last-child{border-bottom:0}
  .gem{font-size:21px;width:28px;text-align:center}
  .gmain{flex:1}
  .gname{font-size:13.5px;font-weight:700;color:var(--navy);margin-bottom:4px}
  .gmeta{text-align:right;min-width:52px}
  .gc{display:block;font-family:var(--serif);font-size:15px;font-weight:700;color:var(--navy)}
  .gs{font-size:10.5px;color:var(--muted)}
  /* Dimensions */
  .drow{display:flex;align-items:center;gap:12px;margin-bottom:9px}
  .dlabel{width:118px;font-size:12.5px;font-weight:600;color:var(--ink);flex:0 0 auto}
  .drow .bar{flex:1}
  .dval{width:30px;text-align:right;font-family:var(--serif);font-size:13px;font-weight:700;color:var(--navy)}
  /* Strengths */
  .strengths{display:flex;flex-direction:column;gap:8px}
  .strength{display:flex;gap:10px;align-items:flex-start;background:#faf9f5;border-left:3px solid var(--gold);padding:9px 13px;font-size:13px;color:var(--ink)}
  .tick{color:var(--gold);font-weight:800}
  /* Home */
  .home{display:flex;gap:12px;border:1px solid var(--line);border-radius:4px;padding:12px;margin-bottom:9px}
  .hem{font-size:24px}
  .ht{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
  .htitle{font-size:13.5px;font-weight:700;color:var(--navy)}
  .hdur{font-size:10px;font-weight:700;color:#a07d2f;border:1px solid #dcc79a;border-radius:3px;padding:2px 7px}
  .hdesc{font-size:12px;color:#5f6470}
  /* Encourage */
  .encourage{margin:22px 34px 0;font-family:var(--serif);font-style:italic;font-size:15px;color:var(--navy);text-align:center;padding:16px 24px;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .ai{background:#faf9f5;border:1px solid var(--line);border-radius:4px;padding:14px;font-size:12.5px;color:var(--ink);line-height:1.65}
  /* Locked */
  .locked{border:1px solid #e6d9b8;background:linear-gradient(180deg,#fbfaf5,#f4edda);border-radius:4px;padding:26px 26px;text-align:center}
  .locked-lock{font-size:30px}
  .locked-kicker{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-top:8px}
  .locked-title{font-family:var(--serif);font-size:20px;color:var(--navy);margin-top:5px}
  .locked-desc{font-size:12.5px;color:#6c6f5f;max-width:460px;margin:9px auto 0;line-height:1.6}
  .locked-list{list-style:none;max-width:420px;margin:15px auto 0;text-align:left}
  .locked-list li{font-size:12.5px;color:var(--ink);padding:6px 0 6px 24px;position:relative;border-bottom:1px dashed #e6d9b8}
  .locked-list li:before{content:'✦';position:absolute;left:2px;color:var(--gold)}
  .locked-badge{display:inline-block;margin-top:18px;background:var(--navy);color:var(--gold-l);border:1px solid var(--gold);border-radius:2px;padding:10px 26px;font-size:11.5px;letter-spacing:2px;text-transform:uppercase;font-weight:700}
  /* Footer */
  .foot{margin-top:24px}
  .foot .rule{height:3px;background:linear-gradient(90deg,var(--gold),var(--gold-l),var(--gold))}
  .foot-in{background:var(--navy);color:#fff;padding:18px 34px;text-align:center}
  .foot .maarif{font-size:11px;color:rgba(255,255,255,.62);max-width:620px;margin:0 auto 9px;line-height:1.55}
  .foot .brand{font-family:var(--serif);font-size:15px;font-weight:700;color:#fff}
  .foot .site{font-size:10.5px;color:rgba(255,255,255,.5);margin-top:3px}
  .foot .gen{font-size:10px;color:var(--gold);margin-top:9px;letter-spacing:.5px}
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">Yazdır / PDF Kaydet</button>
    <button class="btn-close" onclick="window.close()">Kapat</button>
    <span class="hint">İpucu: “Hedef → PDF olarak kaydet” seçin.</span>
  </div>
  <div class="sheet">
    <div class="gold-top"></div>
    <div class="mast">
      <div class="monogram">${initial}</div>
      <div class="mast-main">
        <div class="kicker">Haftalık Gelişim Raporu</div>
        <div class="mast-name">${esc(r.childName)}</div>
        <div class="mast-brand">CHILDHOODTECH AKADEMİ · Erken Çocukluk Gelişim Takibi</div>
      </div>
      <div class="mast-right">
        <div class="lbl">Rapor Dönemi</div>
        <div class="val">${esc(r.rangeLabel)}</div>
        ${tierTag}
      </div>
    </div>

    <div class="meta">
      <div>Yaş<b>${esc(r.ageLabel)}</b></div>
      <div>Gelişim Dönemi<b>${esc(r.period)}</b></div>
      <div>Rapora Giren Oyun<b>${r.sourceCount}</b></div>
    </div>

    ${highlight}
    ${emptyBanner}
    ${statStrip}
    ${sections}
    ${encourage}

    <div class="foot">
      <div class="rule"></div>
      <div class="foot-in">
        <div class="maarif">${esc(r.maarifNote)}</div>
        <div class="brand">ChildhoodTech Ekibi</div>
        <div class="site">childhoodtech.com · Çocuğunuzun gelişimini birlikte takip ediyoruz</div>
        <div class="gen">Oluşturulma: ${esc(r.generatedLabel)}</div>
      </div>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 450);
    });
  </script>
</body>
</html>`;
}
