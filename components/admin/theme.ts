// İnceleme Masası — tek token bloğu.
// Önceki admin.tsx'te 47 gömülü hex, 10 font boyutu, 9 radius vardı (aynı kırmızı iki
// farklı yazımla). Alan renkleri (C.mab/fab/...) mevcut getCodeColor ile birebir aynı —
// uzmanın kas hafızası bozulmaz.
export const C = {
  bg: '#F4F6F8', panel: '#FFFFFF', panelAlt: '#FAFBFC', line: '#E3E8EF', hover: '#EEF2F6',
  ink: '#16202B', inkMid: '#5A6B7B', inkLight: '#8FA0B0',
  accent: '#1F3A5F', accentSoft: '#E8EDF3',
  onay: '#2E7D32', onayBg: '#E8F5E9',
  revize: '#E65100', revizeBg: '#FFF3E0',
  ret: '#C62828', retBg: '#FFEBEE',
  bayrak: '#B71C1C', bayrakBg: '#FFF5F5',
  danisma: '#B15B00', danismaBg: '#FFF3E0',
  bekle: '#8FA0B0', veliBg: '#FFF9E6', veliLine: '#EBC369', veliInk: '#6B5217',
  mab: '#1976D2', fab: '#388E3C', dil: '#D32F2F', hareket: '#FF7043', sosyal: '#8E24AA', muzik: '#00897B', varsayilan: '#607D8B',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const R = { chip: 6, card: 10, btn: 14 };
export const F = { meta: 11, small: 13, body: 15, head: 17, screen: 20, counter: 24 };

/** Maarif kod önekinden alan rengi (admin.tsx'teki eski getCodeColor ile birebir). */
export function codeColor(code: string): string {
  if (!code) return C.varsayilan;
  if (code.startsWith('MAB')) return C.mab;
  if (code.startsWith('FAB')) return C.fab;
  if (code.startsWith('TAKB') || code.startsWith('TAEOB') || code.startsWith('TADB') || code.startsWith('TAOB')) return C.dil;
  if (code.startsWith('HSAB')) return C.hareket;
  if (code.startsWith('SAB')) return C.sosyal;
  if (code.startsWith('MDB') || code.startsWith('MSB') || code.startsWith('MÇB') || code.startsWith('MHB') || code.startsWith('MYB')) return C.muzik;
  if (code.startsWith('SNAB')) return C.sosyal;
  return C.varsayilan;
}
