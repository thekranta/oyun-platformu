import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BoardPicker from '../components/board/BoardPicker';
import BoardStage from '../components/board/BoardStage';
import type { BoardPlayerPicker } from '../components/board/types';
import { GAME_RENDERERS } from '../components/gameRegistry';
import { useBoardAccess } from '../lib/boardAccess';
import {
    autoZoom,
    buildBoardGames,
    DEFAULT_PREFS,
    offsetForZoom,
    parseBoardPrefs,
    stepZoom,
    ZOOM_MAX,
    ZOOM_MIN,
    zoomWithOffset,
    type BoardAgeGroup,
    type BoardGame,
    type BoardPrefs,
} from '../lib/boardMode';
import { fullscreenSupported, toggleFullscreen, useFullscreen } from '../lib/fullscreen';
import { playerAgeMonths, useBoardRoster, type BoardPlayer } from '../lib/boardRoster';
import { useWakeLock } from '../lib/screenWake';

/**
 * TAHTA MODU: öğretmen, sınıf tahtasındaki bilgisayarda (oyun.childhoodtech.com/tahta) bir oyun seçer; oyun tahtayı
 * dolduracak şekilde büyütülmüş olarak çalışır ve alttaki kontrol çubuğundan yönetilir. Sonuç KAYDEDİLMEZ, puan
 * gösterilmez. Sınıf paketi öğretmeni "Sıra kimde?" ile sınıf listesinden çocuk seçebilir: tahtada yalnız ilk ad
 * görünür, oyun çocuğun yaşıyla açılır (lib/boardRoster.ts). Yalnız öğretmen hesabı (lib/boardAccess.ts).
 * Tarayıcıda çalışır; native'de bilgi verir.
 */

const PREFS_KEY = 'board.prefs.v1';

function Notice({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: { label: string; onPress: () => void } }) {
    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.center}>
                <Text style={styles.emoji}>{emoji}</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.text}>{text}</Text>
                {action && (
                    <Pressable onPress={action.onPress} accessibilityRole="button" style={styles.button}>
                        <Text style={styles.buttonText}>{action.label}</Text>
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
}

export default function Tahta() {
    const { t } = useTranslation();
    const params = useLocalSearchParams<{ dev?: string }>();
    const dev = __DEV__ && params.dev === '1';
    const { access, retry } = useBoardAccess(dev);
    const { width, height } = useWindowDimensions();
    const fullscreen = useFullscreen();

    const [prefs, setPrefs] = useState<BoardPrefs>(DEFAULT_PREFS);
    const [prefsReady, setPrefsReady] = useState(false);
    const [selected, setSelected] = useState<BoardGame | null>(null);

    useWakeLock(access.phase === 'ready');

    useEffect(() => {
        AsyncStorage.getItem(PREFS_KEY)
            .then((raw) => setPrefs(parseBoardPrefs(raw)))
            .catch(() => { })
            .finally(() => setPrefsReady(true));
    }, []);

    const updatePrefs = useCallback((next: BoardPrefs) => {
        setPrefs(next);
        AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => { });
    }, []);

    const games = useMemo(() => (access.phase === 'ready' ? buildBoardGames(GAME_RENDERERS, access.tier) : []), [access]);

    // "Sıra kimde?": yalnız sınıf paketinde (access.students) ve tercihler okunduktan sonra (hatırlanan sınıf için) yüklenir.
    const roster = useBoardRoster({
        enabled: access.phase === 'ready' && access.students && prefsReady,
        userId: access.phase === 'ready' ? access.userId : null,
        dev,
        preferredClassId: prefs.classId,
    });
    const [player, setPlayer] = useState<BoardPlayer | null>(null);
    const [played, setPlayed] = useState<ReadonlySet<string>>(() => new Set());

    // Seçili çocuk yeni listede yoksa (sınıf değişti, veli çıkarttı) seçim kalkar.
    useEffect(() => {
        if (player && roster.phase === 'ready' && !roster.players.some((p) => p.id === player.id)) setPlayer(null);
    }, [player, roster.phase, roster.players]);

    const auto = autoZoom(width, height);
    const zoom = zoomWithOffset(auto, prefs.zoomOffset);
    const changeZoom = (direction: 1 | -1) => updatePrefs({ ...prefs, zoomOffset: offsetForZoom(auto, stepZoom(zoom, direction)) });
    const changeAge = (ageGroup: BoardAgeGroup) => updatePrefs({ ...prefs, ageGroup });
    const changeClass = (classId: string) => {
        roster.selectClass(classId);
        setPlayer(null);
        setPlayed(new Set());
        updatePrefs({ ...prefs, classId });
    };

    const picker: BoardPlayerPicker = {
        phase: roster.phase,
        classes: roster.classes,
        classId: roster.classId,
        onClass: changeClass,
        players: roster.players,
        excluded: roster.excluded,
        player,
        played,
        onPlayer: setPlayer,
        onPlayed: (id) => setPlayed((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
        onRetry: roster.retry,
        ageFor: (p) => playerAgeMonths(p, prefs.ageGroup),
    };

    const leave = () => {
        if (router.canGoBack()) router.back();
        else router.replace('/teacher-dashboard');
    };

    if (access.phase === 'web-only') {
        return <Notice emoji="📺" title={t('board.webOnlyTitle')} text={t('board.webOnlyText')} action={{ label: t('board.backToPanel'), onPress: leave }} />;
    }
    if (access.phase === 'no-teacher') {
        return <Notice emoji="👩‍🏫" title={t('board.needTeacherTitle')} text={t('board.needTeacherText')} action={{ label: t('board.goLogin'), onPress: () => router.replace('/teacher-dashboard') }} />;
    }
    if (access.phase === 'error') {
        return <Notice emoji="📡" title={t('board.errorTitle')} text={t('board.errorText')} action={{ label: t('board.retry'), onPress: retry }} />;
    }
    if (access.phase === 'loading' || !prefsReady) {
        return (
            <SafeAreaView style={styles.root}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#3F7D72" />
                    <Text style={styles.text}>{t('board.loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (selected) {
        return (
            <BoardStage
                game={selected}
                ageMonths={playerAgeMonths(player, prefs.ageGroup)}
                zoom={zoom}
                canZoomIn={zoom < ZOOM_MAX}
                canZoomOut={zoom > ZOOM_MIN}
                onZoomIn={() => changeZoom(1)}
                onZoomOut={() => changeZoom(-1)}
                onBackToGames={() => setSelected(null)}
                fullscreen={fullscreen}
                fullscreenSupported={fullscreenSupported()}
                onToggleFullscreen={toggleFullscreen}
                picker={picker}
                dev={dev}
            />
        );
    }

    return (
        <BoardPicker
            games={games}
            ageGroup={prefs.ageGroup}
            onAgeGroup={changeAge}
            onPick={setSelected}
            onClose={leave}
            fullscreen={fullscreen}
            fullscreenSupported={fullscreenSupported()}
            onToggleFullscreen={toggleFullscreen}
            picker={picker}
        />
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAF2E4' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
    emoji: { fontSize: 64 },
    title: { fontSize: 30, fontWeight: '900', color: '#584B40', textAlign: 'center' },
    text: { fontSize: 19, color: '#756753', textAlign: 'center', lineHeight: 28, maxWidth: 560 },
    button: { backgroundColor: '#3F7D72', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 18, marginTop: 10 },
    buttonText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
