// Sahip paneli görsel dili — components/admin/theme.ts'teki iç/profesyonel
// token'ları yeniden kullanır (admin.tsx'in dosyasına dokunulmaz, sıfır risk).
export { C, F, S, R, codeColor } from '../admin/theme';
import { C } from '../admin/theme';
import type { ActivityRole } from '../../lib/owner/activityFeed';

export const ROLE_LABELS: Record<ActivityRole, string> = {
  cocuk_veli: 'Çocuk / Veli',
  ogretmen: 'Öğretmen',
  uzman: 'Uzman',
};

export const ROLE_ICONS: Record<ActivityRole, string> = {
  cocuk_veli: '👶',
  ogretmen: '👩‍🏫',
  uzman: '🧑‍⚕️',
};

export const ROLE_COLORS: Record<ActivityRole, string> = {
  cocuk_veli: C.veliInk,
  ogretmen: C.revize,
  uzman: C.accent,
};

export const ROLE_BG: Record<ActivityRole, string> = {
  cocuk_veli: C.veliBg,
  ogretmen: C.revizeBg,
  uzman: C.accentSoft,
};
