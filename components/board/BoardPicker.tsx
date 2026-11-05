import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BOARD_AGE_GROUPS, boardAreas, filterByArea, teacherTierFor, type BoardAgeGroup, type BoardGame } from '../../lib/boardMode';
import PlayerSheet, { useAgeText } from './PlayerSheet';
import type { BoardPlayerPicker } from './types';

/**
 * Tahta Modu oyun seçici. Bu ekran da tahtada görünür (büyütme katmanının DIŞINDA), bu yüzden yazı ve dokunma
 * hedefleri pencere genişliğine göre büyür: 1280 px = 1x, 1920 px = 1,5x (en çok 2x).
 * Sınıf paketi öğretmeninde "Kim oynuyor?" düğmesi çıkar (components/board/PlayerSheet.tsx); çocuk seçiliyse oyun
 * onun yaşına göre açılır ve yaş grubu çipleri yerine çocuğun yaşı gösterilir.
 */

interface Props {
    games: BoardGame[];
    ageGroup: BoardAgeGroup;
    onAgeGroup: (group: BoardAgeGroup) => void;
    onPick: (game: BoardGame) => void;
    onClose: () => void;
    fullscreen: boolean;
    fullscreenSupported: boolean;
    onToggleFullscreen: () => void;
    picker: BoardPlayerPicker;
}

const NOTE_MS = 4000;

export default function BoardPicker({ games, ageGroup, onAgeGroup, onPick, onClose, fullscreen, fullscreenSupported, onToggleFullscreen, picker }: Props) {
    const { t } = useTranslation();
    const { width } = useWindowDimensions();
    const ageText = useAgeText();
    const [area, setArea] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const childAge = picker.player?.ageMonths ?? null;

    useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);

    const u = Math.min(2, Math.max(1, width / 1280));
    const pad = 24 * u;
    const gap = 14 * u;
    const columns = Math.max(2, Math.floor((width - 2 * pad + gap) / (190 * u + gap)));
    const tileW = Math.floor((width - 2 * pad - gap * (columns - 1)) / columns);
    const tileH = Math.round(tileW * 0.8);

    const areas = useMemo(() => boardAreas(games), [games]);
    const shown = useMemo(() => filterByArea(games, area), [games, area]);

    const showLocked = (game: BoardGame) => {
        const tier = t(`teacher.tier.${teacherTierFor(game.minTier)}`);
        setNote(t('board.lockedNote', { game: game.title, tier }));
        if (noteTimer.current) clearTimeout(noteTimer.current);
        noteTimer.current = setTimeout(() => setNote(null), NOTE_MS);
    };

    const areaLabel = (alan: string) => t(`institution.area.${alan}`, { defaultValue: alan });

    return (
        <SafeAreaView style={styles.root}>
            <View style={[styles.header, { paddingHorizontal: pad, paddingVertical: 10 * u }]}>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('board.backToPanel')} style={[styles.headerBtn, { paddingHorizontal: 14 * u, paddingVertical: 10 * u }]}>
                    <Ionicons name="arrow-back" size={26 * u} color="#584B40" />
                    <Text style={[styles.headerBtnText, { fontSize: 17 * u }]}>{t('board.backToPanel')}</Text>
                </Pressable>
                <Text style={[styles.title, { fontSize: 32 * u }]} accessibilityRole="header">📺 {t('board.title')}</Text>
                {fullscreenSupported ? (
                    <Pressable onPress={onToggleFullscreen} accessibilityRole="button" accessibilityLabel={fullscreen ? t('board.exitFullscreen') : t('board.fullscreen')} style={[styles.headerBtn, { paddingHorizontal: 14 * u, paddingVertical: 10 * u }]}>
                        <Ionicons name={fullscreen ? 'contract' : 'expand'} size={26 * u} color="#584B40" />
                        <Text style={[styles.headerBtnText, { fontSize: 17 * u }]}>{fullscreen ? t('board.exitFullscreen') : t('board.fullscreen')}</Text>
                    </Pressable>
                ) : <View style={{ width: 120 * u }} />}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 60 * u }}>
                <Text style={[styles.subtitle, { fontSize: 18 * u }]}>{t('board.subtitle')}</Text>

                {picker.phase !== 'off' && (
                    <View style={[styles.chipRow, { gap: 10 * u, marginTop: 14 * u }]}>
                        <Pressable onPress={() => setSheetOpen(true)} accessibilityRole="button" accessibilityLabel={t('board.picker.whoPlays')}
                            style={[styles.playerPill, { paddingHorizontal: 22 * u, paddingVertical: 12 * u, gap: 10 * u }, picker.player && styles.playerPillOn]}>
                            <Text style={{ fontSize: 24 * u }}>👤</Text>
                            <Text style={[styles.playerPillText, { fontSize: 21 * u }, picker.player && styles.playerPillTextOn]}>
                                {picker.player ? picker.player.name : t('board.picker.whoPlays')}
                            </Text>
                            {childAge != null && <Text style={[styles.playerPillAge, { fontSize: 16 * u }]}>{ageText(childAge)}</Text>}
                            <Ionicons name="chevron-down" size={22 * u} color={picker.player ? '#FFFFFF' : '#584B40'} />
                        </Pressable>
                    </View>
                )}

                {childAge == null && (
                    <View style={[styles.chipRow, { gap: 10 * u, marginTop: 14 * u }]}>
                        <Text style={[styles.chipLabel, { fontSize: 17 * u }]}>{t('board.ageLabel')}</Text>
                        {BOARD_AGE_GROUPS.map((group) => (
                            <Pressable key={group} onPress={() => onAgeGroup(group)} accessibilityRole="button" accessibilityState={{ selected: group === ageGroup }}
                                style={[styles.chip, { paddingHorizontal: 20 * u, paddingVertical: 10 * u }, group === ageGroup && styles.chipOn]}>
                                <Text style={[styles.chipText, { fontSize: 18 * u }, group === ageGroup && styles.chipTextOn]}>{t('board.age', { age: group })}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View style={[styles.chipRow, { gap: 10 * u, marginTop: 12 * u, marginBottom: 16 * u }]}>
                    <Pressable onPress={() => setArea(null)} accessibilityRole="button" accessibilityState={{ selected: area === null }}
                        style={[styles.chip, { paddingHorizontal: 20 * u, paddingVertical: 10 * u }, area === null && styles.chipOn]}>
                        <Text style={[styles.chipText, { fontSize: 18 * u }, area === null && styles.chipTextOn]}>{t('board.allAreas')} · {games.length}</Text>
                    </Pressable>
                    {areas.map(({ alan, count }) => (
                        <Pressable key={alan} onPress={() => setArea(alan)} accessibilityRole="button" accessibilityState={{ selected: area === alan }}
                            style={[styles.chip, { paddingHorizontal: 20 * u, paddingVertical: 10 * u }, area === alan && styles.chipOn]}>
                            <Text style={[styles.chipText, { fontSize: 18 * u }, area === alan && styles.chipTextOn]}>{areaLabel(alan)} · {count}</Text>
                        </Pressable>
                    ))}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                    {shown.map((game) => (
                        <Pressable
                            key={game.routeKey}
                            onPress={() => (game.locked ? showLocked(game) : onPick(game))}
                            accessibilityRole="button"
                            accessibilityLabel={game.title}
                            style={[styles.tile, { width: tileW, height: tileH, borderColor: game.color, borderRadius: 22 * u }, game.locked && styles.tileLocked]}
                        >
                            <Text style={{ fontSize: 46 * u }}>{game.emoji}</Text>
                            <Text style={[styles.tileTitle, { fontSize: 19 * u }]} numberOfLines={2}>{game.title}</Text>
                            {!!game.subtitle && <Text style={[styles.tileSub, { fontSize: 13 * u }]} numberOfLines={1}>{game.subtitle}</Text>}
                            {game.locked && <Text style={[styles.lock, { fontSize: 22 * u }]}>🔒</Text>}
                        </Pressable>
                    ))}
                </View>
            </ScrollView>

            {note && (
                <View style={[styles.note, { bottom: 24 * u, paddingHorizontal: 24 * u, paddingVertical: 14 * u }]} accessibilityLiveRegion="polite">
                    <Text style={[styles.noteText, { fontSize: 18 * u }]}>{note}</Text>
                </View>
            )}

            {sheetOpen && (
                <PlayerSheet
                    picker={picker}
                    onPick={(player) => { picker.onPlayer(player); setSheetOpen(false); }}
                    onClose={() => setSheetOpen(false)}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FAF2E4' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFFCC', borderRadius: 16 },
    headerBtnText: { color: '#584B40', fontWeight: '700' },
    title: { color: '#584B40', fontWeight: '900' },
    subtitle: { color: '#756753', fontWeight: '600', textAlign: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    playerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 3, borderColor: '#3F7D72' },
    playerPillOn: { backgroundColor: '#3F7D72' },
    playerPillText: { color: '#3F342A', fontWeight: '900' },
    playerPillTextOn: { color: '#FFFFFF' },
    playerPillAge: { color: '#D9F0EA', fontWeight: '700' },
    chipLabel: { color: '#756753', fontWeight: '800' },
    chip: { backgroundColor: '#EFE7D9', borderRadius: 999 },
    chipOn: { backgroundColor: '#3F7D72' },
    chipText: { color: '#584B40', fontWeight: '800' },
    chipTextOn: { color: '#FFFFFF' },
    tile: { backgroundColor: '#FFFFFF', borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 8 },
    tileLocked: { opacity: 0.5 },
    tileTitle: { color: '#3F342A', fontWeight: '800', textAlign: 'center', marginTop: 6 },
    tileSub: { color: '#8A7A63', textAlign: 'center', marginTop: 2 },
    lock: { position: 'absolute', top: 6, right: 8 },
    note: { position: 'absolute', alignSelf: 'center', backgroundColor: '#3F342A', borderRadius: 18 },
    noteText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
});
