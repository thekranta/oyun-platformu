import type { BoardStageProps } from './types';

/**
 * Tahta sahnesinin native karşılığı: Tahta Modu yalnız tarayıcıda (sınıf tahtasındaki bilgisayar) çalışır; sayfa
 * (app/tahta.tsx) native'de bu bileşeni hiç çizmez. Gerçek uygulama: BoardStage.web.tsx.
 */
export default function BoardStage(_props: BoardStageProps) {
    return null;
}
