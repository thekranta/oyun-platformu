import type { BoardGame, BoardResult } from '../../lib/boardMode';
import type { SaveOutcome } from '../../lib/boardResults';
import type { BoardClass, BoardPlayer, BoardRosterPhase } from '../../lib/boardRoster';

/**
 * "Sıra kimde?" durumu: sınıf listesi, seçili çocuk ve bu oturumda oynayanlar. Hem oyun seçici hem sahne aynı nesneyi
 * kullanır. `phase` 'off' ise (ücretsiz öğretmen) çocuk seçimi hiç gösterilmez.
 */
export interface BoardPlayerPicker {
    phase: BoardRosterPhase;
    classes: BoardClass[];
    classId: string | null;
    onClass: (id: string) => void;
    players: BoardPlayer[];
    /** Listede olmayan çocuk sayısı (veli onayı bekliyor ya da hesapta birden fazla çocuk var). */
    excluded: number;
    /** Sırası gelen çocuk; null = tüm sınıf (isimsiz). */
    player: BoardPlayer | null;
    /** Bu oturumda oyununu bitiren çocukların kimlikleri (sıra herkese gelsin diye işaretlenir). */
    played: ReadonlySet<string>;
    onPlayer: (player: BoardPlayer | null) => void;
    onPlayed: (id: string) => void;
    onRetry: () => void;
    /** Çocuğa göre oyun yaşı (ay): çocuğun yaşı yoksa sınıfın yaş grubu. */
    ageFor: (player: BoardPlayer | null) => number;
    /** Oyun bitince "Kaydedilsin mi?" sorulur mu? Sınıf paketinde ve sunucu fonksiyonu varken açık. */
    canSave: boolean;
    /** Bu oturumda sonucu çocuğun dosyasına kaydedilenler. */
    saved: ReadonlySet<string>;
    /** Sonucu çocuğun dosyasına kaydeder (öğretmen onayından sonra çağrılır). */
    onSave: (playerId: string, result: BoardResult) => Promise<SaveOutcome>;
}

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
    picker: BoardPlayerPicker;
    /** Yalnız geliştirmede: öğretmen oturumu olmadan önizleme (`?dev=1`) oyun penceresine de iletilir. */
    dev?: boolean;
}
