// Gelişim radar grafiği: her ölçüt kendi rengini taşır (grafikte nokta/eksen, altında etiket aynı renk).
// Renkler birbirinden belirgin ayrışsın diye farklı tonlardan seçildi; ölçüt kimliği sabit olduğundan
// aynı ölçüt veli ve öğretmen panelinde hep aynı renkte görünür.

export const RADAR_COLORS: Record<string, string> = {
    visualAttention: '#1E88E5',   // mavi
    responseSpeed: '#F59E0B',     // turuncu-sarı
    errorTolerance: '#EC4899',    // pembe
    persistence: '#22A06B',       // yeşil
    problemSolving: '#8B5CF6',    // mor
};

/** Tanımsız bir ölçüt eklenirse sırasına göre yedek renk (grafik gri/tek renge düşmesin). */
const FALLBACK_COLORS = ['#14B8A6', '#EF4444', '#6366F1', '#84CC16', '#F97316'];

export function radarColorFor(category: string, index: number): string {
    return RADAR_COLORS[category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}
