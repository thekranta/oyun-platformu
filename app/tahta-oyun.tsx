import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import GameErrorBoundary from '../components/GameErrorBoundary';
import { GAME_RENDERERS } from '../components/gameRegistry';
import { useBoardAccess } from '../lib/boardAccess';
import {
    BOARD_CHILD_NAME,
    BOARD_EXCLUDED_ROUTES,
    boardMessage,
    parseBoardPlayParams,
    readBoardMessage,
    resultFromGameEnd,
    type BoardResult,
    type BoardToParentType,
} from '../lib/boardMode';
import { isRouteOpenForTier } from '../lib/gameAccess';
import { stopSpeech } from '../services/speechService';

/**
 * Tahta Modu OYUN PENCERESİ: app/tahta.tsx içindeki iframe bu sayfayı açar (aynı kaynak; oturum ve ses kilidi paylaşılır).
 * Seçilen oyunu çocuk oturumu OLMADAN çalıştırır: bu pencere HİÇBİR ŞEY KAYDETMEZ (onGameEnd sonucu yalnız üst sayfaya
 * iletir; kaydetme kararı ve çağrısı üst sayfadadır: öğretmen "Elif için kaydedilsin mi?" diye onaylarsa), çocuk adı/e-posta yok.
 * Erişim, adresteki bir parametreye değil ÖĞRETMENİN paketine göre denetlenir.
 * Üst sayfa ile iletişim: lib/boardMode.ts (ready / ended + sonuç / exit; silence / restart).
 */

function ReadyPing({ onReady }: { onReady: () => void }) {
    useEffect(() => { onReady(); }, [onReady]);
    return null;
}

function Spinner() {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#5B4B8A" />
        </View>
    );
}

export default function TahtaOyun() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ g?: string; yas?: string; dev?: string }>();
    const dev = __DEV__ && params.dev === '1';
    const { game, ageMonths } = parseBoardPlayParams(params);
    const { access } = useBoardAccess(dev);
    const [run, setRun] = useState(0);

    const post = useCallback((type: BoardToParentType, result?: BoardResult | null) => {
        try {
            if (typeof window !== 'undefined' && window.parent) window.parent.postMessage(boardMessage(type, result), window.location.origin);
        } catch {
            // üst sayfa yok (sayfa doğrudan açıldı)
        }
    }, []);

    // Üst sayfadan gelen komutlar: sesi kes (perde), oyunu baştan başlat.
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== window.parent) return;
            const type = readBoardMessage(event.data, ['silence', 'restart'] as const);
            if (type === 'silence') stopSpeech();
            else if (type === 'restart') {
                stopSpeech();
                setRun((n) => n + 1);
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    // Tahtada yanlışlıkla metin seçme / sayfa kaydırma / çift dokunmayla yakınlaştırma olmasın.
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;
        const style = document.body.style;
        const previous = { userSelect: style.userSelect, overscroll: style.overscrollBehavior, touchAction: style.touchAction };
        style.userSelect = 'none';
        style.setProperty('-webkit-user-select', 'none');
        style.overscrollBehavior = 'none';
        style.touchAction = 'manipulation';
        return () => {
            style.userSelect = previous.userSelect;
            style.overscrollBehavior = previous.overscroll;
            style.touchAction = previous.touchAction;
        };
    }, []);

    const sendReady = useCallback(() => post('ready'), [post]);
    const leave = useCallback(() => post('exit'), [post]);

    const render = game ? GAME_RENDERERS[game] : undefined;
    const playable = access.phase === 'ready' && !!game && !!render && !BOARD_EXCLUDED_ROUTES.has(game) && isRouteOpenForTier(access.tier, game);

    let content: React.ReactNode;
    if (access.phase === 'loading') {
        content = <Spinner />;
    } else if (access.phase !== 'ready' || !playable || !render || !game) {
        content = (
            <View style={styles.center}>
                <Text style={styles.title}>{t('board.game.unavailableTitle')}</Text>
                <Text style={styles.text}>{t('board.game.unavailableText')}</Text>
                <Pressable onPress={leave} accessibilityRole="button" style={styles.button}>
                    <Text style={styles.buttonText}>{t('board.game.backToGames')}</Text>
                </Pressable>
            </View>
        );
    } else {
        content = (
            <GameErrorBoundary key={`${game}-${run}`} gameName={game} onExit={leave}>
                <React.Suspense fallback={<Spinner />}>
                    {render({
                        onGameEnd: (oyunAdi, sure, hamle, hata, _kelime, extra) => post('ended', resultFromGameEnd(oyunAdi, sure, hamle, hata, extra)),
                        onExit: leave,
                        ad: BOARD_CHILD_NAME,
                        yas: String(ageMonths),
                        email: '',
                        selectedSongIndex: 0,
                        tier: access.tier,
                    })}
                    <ReadyPing onReady={sendReady} />
                </React.Suspense>
            </GameErrorBoundary>
        );
    }

    return (
        <View style={styles.root}>
            <Stack.Screen options={{ headerShown: false }} />
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
    title: { fontSize: 26, fontWeight: '900', color: '#263238', textAlign: 'center' },
    text: { fontSize: 18, color: '#607D8B', textAlign: 'center', lineHeight: 26, maxWidth: 520 },
    button: { backgroundColor: '#3F7D72', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, marginTop: 8 },
    buttonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
