/**
 * Yapay zekâ yorumlarının HEDEF KİTLEYE göre ayrılması.
 *
 * Hem oyun bazlı yorum (oyun_skorlari.yapay_zeka_yorumu) hem kümülatif rapor
 * (kumulatif_ai_yorumu) TEK metinde iki kitleyi barındırır:
 *   1) akademik / öğretmen kısmı (Maarif kodlu, pedagojik terimli),
 *   2) "VELİ BİLGİLENDİRME NOTU" (samimi dil, evde etkinlik önerileri).
 * Her panel YALNIZ kendi kısmını göstermelidir: veli yalnız veli notunu, öğretmen yalnız akademik
 * kısmı görür. Aksi halde veli "(Öğretmen/Akademisyen İçin)" başlığını ve Maarif kodlarını, öğretmen
 * de velinin "Değerli Velimiz…" notunu görür.
 *
 * Desteklenen biçimler (bkz. lib/admin/parseAnalysis.ts, VeliDashboard analyzeWithAI istemi):
 *   oyun bazlı:  "**Başlık:** …\n\n---\n\n**VELİ BİLGİLENDİRME NOTU**\nDeğerli Velimiz, …"
 *   kümülatif:   "## BÖLÜM 1: … \n…\n---\n\n## BÖLÜM 2: VELİ BİLGİLENDİRME NOTU\n\nDeğerli Velimiz, …"
 * Ayırıcı, "VELİ BİLGİLENDİRME NOTU" ifadesinin geçtiği SATIRDIR; öncesi akademik, sonrası veli notudur.
 * Sunucu tarafındaki eşi: private.ai_academic_part (supabase_migrations/add_class_consent.sql).
 */

export interface AnalysisParts {
    /** Akademik/öğretmen kısmı; işaret yoksa metnin TAMAMI. */
    academic: string | null;
    /** Veli notu; işaret yoksa null. */
    parent: string | null;
    /** "VELİ BİLGİLENDİRME NOTU" işareti bulundu mu. */
    marked: boolean;
}

const PARENT_MARKER = /VEL[İIiı]\s+B[İIiı]LG[İIiı]LEND[İIiı]RME\s+NOTU/i;

// Boş satır, "---"/"***"/"___" ayırıcı satırı ya da tek başına duran "#" başlık işareti.
const DECORATION_LINE = /^\s*(?:[-*_]{3,}|#{1,6})?\s*$/;

/** Baştaki/sondaki boş, ayırıcı ve yalnız-"#" satırlarını atar. */
function trimDecoration(text: string): string {
    const lines = text.split('\n');
    let start = 0;
    let end = lines.length;
    while (start < end && DECORATION_LINE.test(lines[start])) start++;
    while (end > start && DECORATION_LINE.test(lines[end - 1])) end--;
    return lines.slice(start, end).join('\n').trim();
}

/** "(Öğretmen/Akademisyen İçin)" gibi kitle etiketlerini metinden temizler. */
export function stripAudienceLabels(text: string | null | undefined): string | null {
    if (!text) return null;
    const cleaned = text.replace(/[ \t]*\([^()\n]*(?:Öğretmen|Akademisyen)[^()\n]*\)/gi, '').trim();
    return cleaned || null;
}

export function splitAnalysis(text: string | null | undefined): AnalysisParts {
    const raw = (text ?? '').replace(/\r\n/g, '\n').trim();
    if (!raw) return { academic: null, parent: null, marked: false };

    const m = PARENT_MARKER.exec(raw);
    if (!m) return { academic: raw, parent: null, marked: false };

    const lineStart = raw.lastIndexOf('\n', m.index) + 1;          // işaretin bulunduğu satırın başı
    const lineEnd = raw.indexOf('\n', m.index + m[0].length);      // o satırın sonu (-1: metnin sonu)
    const before = raw.slice(0, lineStart);
    const sameLineRest = raw
        .slice(m.index + m[0].length, lineEnd === -1 ? undefined : lineEnd)
        .replace(/^[\s*:#_-]+/, '');                              // "**", ":" gibi başlık süsleri
    const after = lineEnd === -1 ? '' : raw.slice(lineEnd + 1);

    const academic = trimDecoration(before);
    const parent = trimDecoration([sameLineRest, after].filter(Boolean).join('\n'));
    return { academic: academic || null, parent: parent || null, marked: true };
}

/**
 * VELİYE gösterilecek metin: işaret varsa yalnız veli notu (yoksa null — akademik kısmı velinin önüne koyma);
 * işaret yoksa (eski/serbest metin) tamamı, ama öğretmen etiketleri temizlenmiş olarak.
 */
export function parentView(text: string | null | undefined): string | null {
    const p = splitAnalysis(text);
    return stripAudienceLabels(p.marked ? p.parent : p.academic);
}

/** ÖĞRETMENE gösterilecek metin: yalnız akademik kısım (işaret yoksa metnin tamamı). */
export function teacherView(text: string | null | undefined): string | null {
    return splitAnalysis(text).academic;
}
