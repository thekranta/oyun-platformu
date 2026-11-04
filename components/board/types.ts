import type { BoardGame } from '../../lib/boardMode';

/** Tahta sahnesi (oyun penceresi + alt kontrol çubuğu) bileşeninin props'ları; web ve yedek (native) dosya aynı yüzeyi paylaşır. */
export interface BoardStageProps {
    game: BoardGame;
    ageMonths: number;
    /** Geçerli büyütme (1-4, çeyrek adım). */
    zoom: number;
    canZoomIn: boolean;
    canZoomOut: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    /** Oyunlar listesine dön (öğretmen onayından sonra ya da oyun kendisi çıkış isterse). */
    onBackToGames: () => void;
    fullscreen: boolean;
    fullscreenSupported: boolean;
    onToggleFullscreen: () => void;
    /** Yalnız geliştirmede: öğretmen oturumu olmadan önizleme (`?dev=1`) oyun penceresine de iletilir. */
    dev?: boolean;
}
