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
    'onluk-cerceve': '🧮', 'tarti-dengesi': '⚖️', 'rakam-yazma': '✏️',
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

const DIM_COLORS = ['#1E88E5', '#26A69A', '#7E57C2', '#EF6C00', '#EC407A'];

export function buildWeeklyReportHTML(r: WeeklyReportData): string {
    const initial = esc((r.childName || '?').charAt(0).toUpperCase());

    const statTile = (emoji: string, value: string, label: string, color: string) => `
      <div class="stat">
        <div class="stat-emoji">${emoji}</div>
        <div class="stat-value" style="color:${color}">${esc(value)}</div>
        <div class="stat-label">${esc(label)}</div>
      </div>`;

    const skillRows = r.skillAreas.map(a => `
      <div class="skill-row">
        <div class="skill-head">
          <span class="skill-name">${esc(a.area)}</span>
          <span class="skill-count">${a.count} etkinlik</span>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${a.pct}%;background:linear-gradient(90deg,#1E88E5,#42A5F5)"></div></div>
        ${a.codes.length ? `<div class="codes">${a.codes.map(c => `<span class="code">${esc(c)}</span>`).join('')}</div>` : ''}
      </div>`).join('');

    const maxDay = Math.max(1, ...r.dailyActivity.map(d => d.count));
    const dailyBars = r.dailyActivity.map(d => {
        const h = d.count > 0 ? Math.max(14, Math.round((d.count / maxDay) * 68)) : 4;
        const active = d.count > 0;
        return `
      <div class="day">
        <div class="day-bar-wrap">
          <div class="day-bar" style="height:${h}px;background:${active ? '#1E88E5' : '#E3E8EF'}">${active ? `<span class="day-count">${d.count}</span>` : ''}</div>
        </div>
        <div class="day-label">${esc(d.label)}</div>
      </div>`;
    }).join('');

    const topGamesRows = r.topGames.map(g => `
      <div class="game-row">
        <div class="game-emoji">${g.emoji}</div>
        <div class="game-main">
          <div class="game-name">${esc(g.name)}</div>
          <div class="bar sm"><div class="bar-fill" style="width:${g.success}%;background:linear-gradient(90deg,#66BB6A,#43A047)"></div></div>
        </div>
        <div class="game-meta">
          <div class="game-count">${g.count}x</div>
          <div class="game-success">%${g.success}</div>
        </div>
      </div>`).join('');

    const dimRows = r.dimensions.map((d, i) => `
      <div class="dim-row">
        <div class="dim-label">${esc(d.label)}</div>
        <div class="bar"><div class="bar-fill" style="width:${d.value}%;background:${DIM_COLORS[i % DIM_COLORS.length]}"></div></div>
        <div class="dim-value">${d.value}</div>
      </div>`).join('');

    const strengthChips = r.strengths.map(s => `<div class="strength">✔ ${esc(s)}</div>`).join('');

    const homeCards = r.homeActivities.map(a => `
      <div class="home-card">
        <div class="home-emoji">${a.emoji}</div>
        <div class="home-body">
          <div class="home-top"><span class="home-title">${esc(a.title)}</span><span class="home-dur">${esc(a.duration)}</span></div>
          <div class="home-desc">${esc(a.description)}</div>
        </div>
      </div>`).join('');

    const emptyBanner = r.gamesCount === 0
        ? `<div class="empty">Bu hafta henüz oyun oynanmadı. Aşağıdaki özet, en son oynanan oyunlardan derlenmiştir.</div>`
        : (!r.hasWeekData
            ? `<div class="empty soft">Son 7 günde kayıt bulunmadığından özet, en son ${r.sourceCount} oyundan derlenmiştir.</div>`
            : '');

    const aiSection = r.aiNote ? `
      <div class="section">
        <div class="section-title">🧠 Uzman Değerlendirme Notu</div>
        <div class="ai-note">${esc(r.aiNote).replace(/\n/g, '<br/>')}</div>
      </div>` : '';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Haftalık Gelişim Raporu — ${esc(r.childName)}</title>
<style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0}
  @page{size:A4;margin:12mm}
  body{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#1f2a37;background:#eef1f6;line-height:1.45}
  .sheet{max-width:800px;margin:0 auto;background:#fff}
  /* Toolbar (yazdırılmaz) */
  .toolbar{position:sticky;top:0;z-index:10;display:flex;gap:12px;align-items:center;justify-content:center;padding:14px;background:#1f2a37;color:#fff}
  .toolbar button{cursor:pointer;border:0;border-radius:10px;padding:10px 18px;font-size:15px;font-weight:700;font-family:inherit}
  .btn-print{background:#66BB6A;color:#fff}
  .btn-close{background:rgba(255,255,255,.15);color:#fff}
  .toolbar .hint{font-size:12px;color:rgba(255,255,255,.7);font-weight:400}
  @media print{.toolbar{display:none}body{background:#fff}}
  /* Header */
  .hero{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:26px 30px;display:flex;align-items:center;gap:18px}
  .avatar{width:66px;height:66px;border-radius:50%;background:rgba(255,255,255,.22);border:3px solid rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;flex:0 0 auto}
  .hero-main{flex:1}
  .hero-kicker{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;opacity:.85;font-weight:700}
  .hero-title{font-size:25px;font-weight:800;margin-top:2px}
  .hero-sub{font-size:13px;opacity:.9;margin-top:4px}
  .hero-range{text-align:right;font-size:12px;opacity:.95}
  .hero-range b{display:block;font-size:14px;margin-top:2px}
  /* Child strip */
  .child{display:flex;flex-wrap:wrap;gap:10px 26px;padding:14px 30px;background:#f7f8fc;border-bottom:1px solid #eceff1;font-size:13px;color:#455a64}
  .child b{color:#1f2a37}
  /* Highlight */
  .highlight{margin:18px 30px 0;background:linear-gradient(135deg,#FFF8E1,#FFECB3);border:1px solid #FFE082;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px}
  .highlight .h-emoji{font-size:34px}
  .highlight .h-title{font-size:16px;font-weight:800;color:#8D6E00}
  .highlight .h-desc{font-size:13px;color:#795548}
  .empty{margin:16px 30px 0;padding:12px 14px;border-radius:12px;background:#FFF3E0;border:1px solid #FFCC80;color:#8D5A00;font-size:13px}
  .empty.soft{background:#E3F2FD;border-color:#90CAF9;color:#1565C0}
  /* Stats */
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 30px 4px}
  .stat{background:#fff;border:1px solid #eceff1;border-radius:14px;padding:14px 8px;text-align:center;box-shadow:0 2px 8px rgba(31,42,55,.05)}
  .stat-emoji{font-size:22px}
  .stat-value{font-size:24px;font-weight:800;margin-top:2px}
  .stat-label{font-size:11px;color:#78909C;margin-top:2px;font-weight:600}
  /* Sections */
  .section{padding:16px 30px 2px}
  .section-title{font-size:16px;font-weight:800;color:#263238;margin-bottom:12px;display:flex;align-items:center;gap:8px}
  .bar{height:12px;border-radius:8px;background:#eef1f6;overflow:hidden}
  .bar.sm{height:8px}
  .bar-fill{height:100%;border-radius:8px}
  .skill-row{margin-bottom:12px}
  .skill-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px}
  .skill-name{font-size:14px;font-weight:700;color:#37474F}
  .skill-count{font-size:12px;color:#78909C}
  .codes{margin-top:6px;display:flex;flex-wrap:wrap;gap:5px}
  .code{font-size:10px;font-weight:700;color:#5E35B1;background:#EDE7F6;border-radius:6px;padding:2px 7px}
  /* Daily */
  .daily{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;height:96px;padding:6px 4px 0}
  .day{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%}
  .day-bar-wrap{flex:1;display:flex;align-items:flex-end}
  .day-bar{width:26px;border-radius:7px 7px 3px 3px;display:flex;align-items:flex-start;justify-content:center;min-height:4px}
  .day-count{color:#fff;font-size:11px;font-weight:800;margin-top:3px}
  .day-label{font-size:11px;color:#78909C;margin-top:6px;font-weight:600}
  /* Games */
  .game-row{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #f2f4f7}
  .game-row:last-child{border-bottom:0}
  .game-emoji{font-size:22px;width:30px;text-align:center}
  .game-main{flex:1}
  .game-name{font-size:14px;font-weight:700;color:#37474F;margin-bottom:4px}
  .game-meta{text-align:right;min-width:52px}
  .game-count{font-size:14px;font-weight:800;color:#1E88E5}
  .game-success{font-size:11px;color:#78909C}
  /* Dimensions */
  .dim-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .dim-label{width:120px;font-size:13px;font-weight:600;color:#455a64;flex:0 0 auto}
  .dim-row .bar{flex:1}
  .dim-value{width:34px;text-align:right;font-size:13px;font-weight:800;color:#37474F}
  /* Strengths */
  .strengths{display:flex;flex-direction:column;gap:8px}
  .strength{background:#E8F5E9;border-left:4px solid #66BB6A;border-radius:8px;padding:9px 12px;font-size:13px;color:#2E7D32;font-weight:600}
  /* Home */
  .home-card{display:flex;gap:12px;background:#F1F8E9;border:1px solid #DCEDC8;border-radius:12px;padding:12px;margin-bottom:10px}
  .home-emoji{font-size:26px}
  .home-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px}
  .home-title{font-size:14px;font-weight:700;color:#33691E}
  .home-dur{font-size:11px;font-weight:700;color:#558B2F;background:#DCEDC8;border-radius:8px;padding:2px 8px}
  .home-desc{font-size:12.5px;color:#5b6b52}
  /* Encourage */
  .encourage{margin:6px 30px 0;background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-radius:14px;padding:16px;text-align:center;font-size:14.5px;font-weight:700;color:#6D4C41}
  .ai-note{background:#F3E5F5;border-radius:12px;padding:14px;font-size:13px;color:#4A148C;white-space:normal}
  /* Footer */
  .foot{margin-top:20px;background:#1f2a37;color:#fff;padding:18px 30px;text-align:center}
  .foot .maarif{font-size:11.5px;opacity:.8;max-width:620px;margin:0 auto 8px}
  .foot .brand{font-size:15px;font-weight:800}
  .foot .site{font-size:11px;opacity:.75;margin-top:2px}
  .foot .gen{font-size:10.5px;opacity:.6;margin-top:8px}
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">🖨️  Yazdır / PDF Kaydet</button>
    <button class="btn-close" onclick="window.close()">Kapat</button>
    <span class="hint">İpucu: Yazdır penceresinde “Hedef → PDF olarak kaydet” seçin.</span>
  </div>
  <div class="sheet">
    <div class="hero">
      <div class="avatar">${initial}</div>
      <div class="hero-main">
        <div class="hero-kicker">Haftalık Gelişim Raporu</div>
        <div class="hero-title">${esc(r.childName)}</div>
        <div class="hero-sub">ChildhoodTech Akademi • Erken Çocukluk Gelişim Takibi</div>
      </div>
      <div class="hero-range">Rapor Dönemi<b>${esc(r.rangeLabel)}</b></div>
    </div>

    <div class="child">
      <span>👶 <b>${esc(r.ageLabel)}</b></span>
      <span>📈 Gelişim Dönemi: <b>${esc(r.period)}</b></span>
      <span>🎮 Rapora giren oyun: <b>${r.sourceCount}</b></span>
    </div>

    <div class="highlight">
      <div class="h-emoji">${r.highlight.emoji}</div>
      <div>
        <div class="h-title">${esc(r.highlight.title)}</div>
        <div class="h-desc">${esc(r.highlight.description)}</div>
      </div>
    </div>

    ${emptyBanner}

    <div class="stats">
      ${statTile('🎮', String(r.gamesCount), r.hasWeekData ? 'Oyun' : 'Son Oyun', '#1E88E5')}
      ${statTile('📅', `${r.activeDays}/7`, 'Aktif Gün', '#66BB6A')}
      ${statTile('⏱️', `${r.totalMinutes} dk`, 'Toplam Süre', '#FF7043')}
      ${statTile('⭐', `%${r.avgSuccess}`, 'Başarı', '#FFB300')}
    </div>

    ${r.skillAreas.length ? `<div class="section">
      <div class="section-title">📚 Çalışılan Gelişim Alanları <span style="font-size:11px;font-weight:600;color:#9AA7B4">(Maarif Modeli)</span></div>
      ${skillRows}
    </div>` : ''}

    <div class="section">
      <div class="section-title">📅 Günlük Aktivite</div>
      <div class="daily">${dailyBars}</div>
    </div>

    ${r.topGames.length ? `<div class="section">
      <div class="section-title">🎯 En Çok Oynanan Oyunlar</div>
      ${topGamesRows}
    </div>` : ''}

    ${r.dimensions.length ? `<div class="section">
      <div class="section-title">🧭 Gelişim Profili</div>
      ${dimRows}
    </div>` : ''}

    ${r.strengths.length ? `<div class="section">
      <div class="section-title">💪 Güçlü Yönler</div>
      <div class="strengths">${strengthChips}</div>
    </div>` : ''}

    ${r.homeActivities.length ? `<div class="section">
      <div class="section-title">🏠 Evde Ne Yapabilirsiniz?</div>
      ${homeCards}
    </div>` : ''}

    <div class="encourage">${esc(r.encouragingMessage)}</div>

    ${aiSection}

    <div class="foot">
      <div class="maarif">${esc(r.maarifNote)}</div>
      <div class="brand">🎓 ChildhoodTech Ekibi</div>
      <div class="site">childhoodtech.com • Çocuğunuzun gelişimini birlikte takip ediyoruz 💜</div>
      <div class="gen">Oluşturulma: ${esc(r.generatedLabel)}</div>
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
