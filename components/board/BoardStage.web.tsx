import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { BOARD_BAR_HEIGHT, boardMessage, boardPlayHref, readBoardMessage, readBoardResult, virtualSize, zoomPercent, type BoardResult, type ParentToBoardType } from '../../lib/boardMode';
import type { SaveOutcome } from '../../lib/boardResults';
import type { BoardPlayer } from '../../lib/boardRoster';
import PlayerSheet from './PlayerSheet';
import type { BoardStageProps } from './types';

/**
 * Tahta sahnesi (web): oyun, tahtadan KÜÇÜK bir "sanal pencere" (iframe) içinde çalışır ve CSS ölçeğiyle sahneyi
 * doldurur. Oyun kendini pencerenin (iframe'in) boyutuna göre yerleştirir; yani tarayıcıyı %175-200 yakınlaştırmış gibi
 * görünür (oyunlar telefon boyutuna göre yazıldığı için tahtada küçük kalıyordu). Alt çubuktaki düğmeler öğretmen içindir.
 * Oyun penceresi: app/tahta-oyun.tsx (aynı kaynak: oturum ve ses kilidi paylaşılır). İletişim: lib/boardMode.ts iletileri.
 */

/** Oyun penceresi "hazır" demezse (ağ yavaş/ileti kayıp) yükleniyor perdesi bu süre sonra yine de kalkar. */
const LOAD_FALLBACK_MS = 12000;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function BarButton({ icon, label, onPress, disabled, showLabel }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; showLabel: boolean }) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.barBtn, disabled && styles.barBtnDisabled, pressed && styles.barBtnPressed]}
        >
            <Ionicons name={icon} size={28} color="#FFFFFF" />
            {showLabel && <Text style={styles.barBtnText}>{label}</Text>}
        </Pressable>
    );
}

export default function BoardStage({
    game, ageMonths, zoom, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onBackToGames, fullscreen, fullscreenSupported, onToggleFullscreen, picker, dev,
}: BoardStageProps) {
    const { t } = useTranslation();
    const { width: windowWidth } = useWindowDimensions();
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    // İleti dinleyicisi bir kez kurulur; güncel seçiciyi (hangi çocuk oynuyor) buradan okur.
    const pickerRef = useRef(picker);
    pickerRef.current = picker;

    const [size, setSize] = useState({ width: 0, height: 0 });
    const [ready, setReady] = useState(false);
    const [ended, setEnded] = useState(false);
    const [curtain, setCurtain] = useState(false);
    const [sheet, setSheet] = useState(false);
    const [confirm, setConfirm] = useState<null | 'exit' | 'restart'>(null);
    // Bitişte kaydedilmeyi bekleyen sonuç: KİM İÇİN olduğu bitiş anında sabitlenir (sonradan seçilen çocuk değil).
    const [pending, setPending] = useState<{ playerId: string; playerName: string; result: BoardResult } | null>(null);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'skipped' | SaveOutcome>('idle');
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const src = useMemo(() => boardPlayHref({ game: game.routeKey, ageMonths, dev }), [game.routeKey, ageMonths, dev]);
    const virtual = virtualSize(size.width, size.height, zoom);
    const showLabels = windowWidth >= 1100;

    const postToGame = useCallback((type: ParentToBoardType) => {
        try {
            iframeRef.current?.contentWindow?.postMessage(boardMessage(type), window.location.origin);
        } catch {
            // oyun penceresi henüz yüklenmedi
        }
    }, []);

    // Oyun penceresinden gelen iletiler: hazır / oyun bitti / çıkış istendi.
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
            const type = readBoardMessage(event.data, ['ready', 'ended', 'exit'] as const);
            if (type === 'ready') setReady(true);
            else if (type === 'ended') {
                setEnded(true);
                // Sıra kimdeyse onun bu oturumda oynadığı işaretlenir (sıra herkese gelsin).
                const { player, canSave, onPlayed } = pickerRef.current;
                if (player) onPlayed(player.id);
                // Çocuk seçiliyse ve kayıt açıksa sonuç "kaydedilsin mi?" sorusuna alınır (OTOMATİK KAYDEDİLMEZ).
                const result = readBoardResult(event.data);
                setPending(player && canSave && result ? { playerId: player.id, playerName: player.name, result } : null);
                setSaveState('idle');
            }
            // Oyunun kendi geri oku ya da hata ekrani çıkış isterse: öğretmen onaylasın (çocuk yanlışlıkla dokunabilir).
            else if (type === 'exit') setConfirm('exit');
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    // Onay kartı ya da perde açılınca "Sıra kimde?" penceresi kapanır (alt çubuk açıkken de çalışır; oyun çıkış isterse de):
    // onay kartı pencerenin arkasında kalıp "hiçbir şey olmuyor" gibi görünmesin.
    useEffect(() => {
        if (confirm || curtain) setSheet(false);
    }, [confirm, curtain]);

    // Oyun penceresi her (yeniden) yüklendiğinde (ilk açılış ya da çocuğun yaşı değişince): yükleniyor perdesi döner, bitiş kartı
    // kalkar; "hazır" iletisi gelmezse perde bu süre sonra yine de kalkar.
    useEffect(() => {
        setReady(false);
        setEnded(false);
        setPending(null);
        const id = setTimeout(() => setReady(true), LOAD_FALLBACK_MS);
        return () => clearTimeout(id);
    }, [src]);

    const restartNow = () => {
        setEnded(false);
        setPending(null);
        setConfirm(null);
        postToGame('restart');
    };

    // Öğretmen onayladıysa sonuç, bitiş anındaki çocuğun dosyasına kaydedilir. Hata olursa yeniden denenebilir.
    const save = async () => {
        if (!pending || saveState === 'saving') return;
        setSaveState('saving');
        let outcome: SaveOutcome = 'error';
        try {
            outcome = await pickerRef.current.onSave(pending.playerId, pending.result);
        } catch {
            outcome = 'error';
        }
        if (mounted.current) setSaveState(outcome);
    };

    // Kayıt sorusu açıkken (henüz karar verilmedi / hata) gezinme düğmeleri gizlenir: sonuç yanlışlıkla kaybolmasın.
    const asking = !!pending && (saveState === 'idle' || saveState === 'saving' || saveState === 'error');
    const saveLine = ((): string | null => {
        if (!pending || saveState === 'skipped') return null;
        if (saveState === 'idle' || saveState === 'saving') return t('board.ended.saveQuestion', { name: pending.playerName });
        if (saveState === 'saved') return `✓ ${t('board.ended.saved')}`;
        if (saveState === 'error') return t('board.ended.errorText');
        if (saveState === 'denied') return t('board.ended.deniedText');
        if (saveState === 'limit') return t('board.ended.limitText');
        return t('board.ended.unavailableText');
    })();

    const openCurtain = () => {
        setCurtain(true);
        postToGame('silence');
    };

    // "Sıra kimde?": seçerken oyunun sesi kesilir. Çocuk değişince oyun onun yaşıyla baştan başlar: yaş aynıysa oyun
    // yeniden başlatılır, farklıysa adres değiştiği için oyun penceresi yeni yaşla yeniden yüklenir.
    const openSheet = () => {
        postToGame('silence');
        setConfirm(null);
        setSheet(true);
    };

    const choose = (player: BoardPlayer | null) => {
        setSheet(false);
        if ((player?.id ?? null) === (picker.player?.id ?? null)) return;
        setEnded(false);
        setPending(null);
        const sameAge = picker.ageFor(player) === ageMonths;
        picker.onPlayer(player);
        if (sameAge) postToGame('restart');
    };

    const onStageLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSize({ width: Math.round(width), height: Math.round(height) });
    };

    return (
        <View style={styles.root}>
            <View style={styles.stage} onLayout={onStageLayout}>
                {size.width > 0 && React.createElement(
                    'div',
                    { style: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', backgroundColor: '#000' } },
                    React.createElement('iframe', {
                        key: src,
                        ref: iframeRef,
                        src,
                        title: game.title,
                        allow: 'autoplay; fullscreen',
                        style: {
                            width: virtual.width,
                            height: virtual.height,
                            border: 0,
                            display: 'block',
                            backgroundColor: '#FFFFFF',
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0',
                        },
                    }),
                )}

                {!ready && (
                    <View style={[StyleSheet.absoluteFill, styles.loading]} pointerEvents="none">
                        <ActivityIndicator size="large" color="#FFFFFF" />
                        <Text style={styles.loadingText}>{t('board.stage.gameLoading')}</Text>
                    </View>
                )}

                {ended && !curtain && !confirm && !sheet && (
                    <View style={styles.endedSheet} accessibilityLiveRegion="polite">
                        <Text style={styles.endedTitle}>{picker.player ? t('board.ended.titleNamed', { name: picker.player.name }) : t('board.ended.title')} 🎉</Text>
                        {saveLine !== null && <Text style={[styles.endedText, saveState === 'saved' && styles.endedTextOk]}>{saveLine}</Text>}
                        {asking ? (
                            <View style={styles.endedRow}>
                                <Pressable onPress={save} disabled={saveState === 'saving'} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnPrimary, saveState === 'saving' && styles.bigBtnDisabled]}>
                                    <Text style={styles.bigBtnText}>
                                        {saveState === 'saving' ? t('board.ended.saving') : saveState === 'error' ? `↻  ${t('board.ended.retry')}` : `✓  ${t('board.ended.save')}`}
                                    </Text>
                                </Pressable>
                                {saveState !== 'saving' && (
                                    <Pressable onPress={() => setSaveState('skipped')} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnGhost]}>
                                        <Text style={styles.bigBtnText}>{t('board.ended.skip')}</Text>
                                    </Pressable>
                                )}
                            </View>
                        ) : (
                            <View style={styles.endedRow}>
                                <Pressable onPress={restartNow} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnPrimary]}>
                                    <Text style={styles.bigBtnText}>↻  {t('board.ended.again')}</Text>
                                </Pressable>
                                {picker.phase !== 'off' && (
                                    <Pressable onPress={openSheet} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnPrimary]}>
                                        <Text style={styles.bigBtnText}>👤  {t('board.ended.next')}</Text>
                                    </Pressable>
                                )}
                                <Pressable onPress={onBackToGames} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnPrimary]}>
                                    <Text style={styles.bigBtnText}>{t('board.ended.other')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setEnded(false)} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnGhost]}>
                                    <Text style={styles.bigBtnText}>{t('board.ended.close')}</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}

                {curtain && (
                    <Pressable onPress={() => setCurtain(false)} accessibilityRole="button" accessibilityLabel={t('board.curtain.hint')} style={[StyleSheet.absoluteFill, styles.curtain]}>
                        <Text style={styles.curtainTitle}>🤫  {t('board.curtain.title')}</Text>
                        <Text style={styles.curtainHint}>{t('board.curtain.hint')}</Text>
                    </Pressable>
                )}

                {confirm && (
                    <View style={[StyleSheet.absoluteFill, styles.confirmWrap]}>
                        <View style={styles.confirmCard} accessibilityViewIsModal>
                            <Text style={styles.confirmTitle}>{confirm === 'exit' ? t('board.confirm.exitTitle') : t('board.confirm.restartTitle')}</Text>
                            <View style={styles.confirmRow}>
                                <Pressable onPress={confirm === 'exit' ? onBackToGames : restartNow} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnDanger]}>
                                    <Text style={styles.bigBtnText}>{confirm === 'exit' ? t('board.confirm.exitYes') : t('board.confirm.restartYes')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setConfirm(null)} accessibilityRole="button" style={[styles.bigBtn, styles.bigBtnNeutral]}>
                                    <Text style={styles.bigBtnText}>{t('board.confirm.cancel')}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}

                {sheet && <PlayerSheet picker={picker} onPick={choose} onClose={() => setSheet(false)} />}
            </View>

            <View style={styles.bar}>
                <BarButton icon="grid" label={t('board.stage.games')} onPress={() => setConfirm('exit')} showLabel={showLabels} />
                {picker.phase !== 'off' && <BarButton icon="people" label={t('board.stage.whoseTurn')} onPress={openSheet} showLabel={showLabels} />}
                <Text style={styles.barTitle} numberOfLines={1}>
                    {picker.player && <Text style={styles.barPlayer}>👤 {picker.player.name}  ·  </Text>}
                    {game.emoji}  {game.title}
                </Text>
                <BarButton icon="refresh" label={t('board.stage.restart')} onPress={() => setConfirm('restart')} showLabel={showLabels} />
                <BarButton icon="eye-off" label={t('board.stage.curtain')} onPress={openCurtain} showLabel={showLabels} />
                <BarButton icon="remove-circle" label={t('board.stage.zoomOut')} onPress={onZoomOut} disabled={!canZoomOut} showLabel={false} />
                <Text style={styles.zoomText} accessibilityLabel={t('board.stage.zoomLevel', { percent: zoomPercent(zoom) })}>%{zoomPercent(zoom)}</Text>
                <BarButton icon="add-circle" label={t('board.stage.zoomIn')} onPress={onZoomIn} disabled={!canZoomIn} showLabel={false} />
                {fullscreenSupported && (
                    <BarButton
                        icon={fullscreen ? 'contract' : 'expand'}
                        label={fullscreen ? t('board.exitFullscreen') : t('board.fullscreen')}
                        onPress={onToggleFullscreen}
                        showLabel={showLabels}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000000' },
    stage: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
    bar: { height: BOARD_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', backgroundColor: '#263238', paddingHorizontal: 12, gap: 8 },
    barBtn: { minWidth: 56, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#37474F' },
    barBtnDisabled: { opacity: 0.35 },
    barBtnPressed: { backgroundColor: '#455A64' },
    barBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
    barTitle: { flex: 1, color: '#ECEFF1', fontSize: 20, fontWeight: '800', textAlign: 'center', paddingHorizontal: 8 },
    barPlayer: { color: '#FFD54F' },
    zoomText: { color: '#CFD8DC', fontSize: 18, fontWeight: '800', minWidth: 62, textAlign: 'center' },
    loading: { alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#263238' },
    loadingText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
    endedSheet: { position: 'absolute', bottom: 24, alignSelf: 'center', alignItems: 'center', gap: 14, backgroundColor: 'rgba(38,50,56,0.94)', borderRadius: 28, paddingVertical: 20, paddingHorizontal: 28 },
    endedTitle: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
    endedText: { color: '#ECEFF1', fontSize: 24, fontWeight: '700', textAlign: 'center', maxWidth: 760 },
    endedTextOk: { color: '#A5D6A7' },
    endedRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
    bigBtn: { minHeight: 64, paddingHorizontal: 28, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    bigBtnPrimary: { backgroundColor: '#3F7D72' },
    bigBtnGhost: { backgroundColor: '#546E7A' },
    bigBtnDanger: { backgroundColor: '#B3392B' },
    bigBtnDisabled: { opacity: 0.5 },
    bigBtnNeutral: { backgroundColor: '#546E7A' },
    bigBtnText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
    curtain: { backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center', gap: 18 },
    curtainTitle: { color: '#FFFFFF', fontSize: 64, fontWeight: '900' },
    curtainHint: { color: '#BBD3F2', fontSize: 26, fontWeight: '700' },
    confirmWrap: { backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    confirmCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 32, alignItems: 'center', gap: 24, maxWidth: 760 },
    confirmTitle: { color: '#263238', fontSize: 32, fontWeight: '900', textAlign: 'center' },
    confirmRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
});
