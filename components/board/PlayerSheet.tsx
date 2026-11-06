import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ageParts, type BoardPlayer } from '../../lib/boardRoster';
import type { BoardPlayerPicker } from './types';

/**
 * "Sıra kimde?" penceresi: sınıf (Meşe'de birden çok olabilir) ve büyük isim kartları. Tahtada görünür; yazı ve dokunma
 * hedefleri pencere genişliğine göre büyür (1280 px = 1x, 1920 px = 1,5x, en çok 2x). Tahtada yalnız ilk ad görünür.
 * Seçilen çocuğun yaşı oyuna uygulanır, kimin sırası olduğu tahtada gösterilir. Kayıt açıksa (sınıf paketi + sunucu
 * fonksiyonu) oyun bitince "kaydedilsin mi?" sorulur (BoardStage); kaydedilen çocuğun kartında "✓ Kaydedildi" yazar.
 */

interface Props {
    picker: BoardPlayerPicker;
    /** Seçim: çocuk ya da null (tüm sınıf). Kapatmayı ve oyunu yeniden başlatmayı çağıran karar verir. */
    onPick: (player: BoardPlayer | null) => void;
    onClose: () => void;
}

/** Ay sayısını "4 yaş 6 ay" / "4 yaş" olarak yazan işlev (seçici ve sahne aynı biçimi kullanır). */
export function useAgeText(): (months: number) => string {
    const { t } = useTranslation();
    return (months) => {
        const { years, months: rest } = ageParts(months);
        return rest === 0 ? t('board.picker.ageYears', { years }) : t('board.picker.age', { years, months: rest });
    };
}

export default function PlayerSheet({ picker, onPick, onClose }: Props) {
    const { t } = useTranslation();
    const { width, height } = useWindowDimensions();
    const u = Math.min(2, Math.max(1, width / 1280));
    const cardWidth = 200 * u;
    const gap = 12 * u;
    const single = picker.classes.length === 1 ? picker.classes[0] : null;

    return (
        <View style={[StyleSheet.absoluteFill, styles.backdrop]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('board.picker.close')} />
            <View
                accessibilityViewIsModal
                style={[styles.sheet, { width: Math.min(width - 32, 1100 * u), maxHeight: height * 0.9, borderRadius: 28 * u, padding: 24 * u, gap: 14 * u }]}
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.title, { fontSize: 32 * u }]} accessibilityRole="header">👤 {t('board.picker.title')}</Text>
                    <Pressable onPress={onClose} accessibilityRole="button" style={[styles.closeBtn, { paddingHorizontal: 18 * u, paddingVertical: 10 * u }]}>
                        <Text style={[styles.closeText, { fontSize: 18 * u }]}>✕  {t('board.picker.close')}</Text>
                    </Pressable>
                </View>

                {picker.classes.length > 1 && (
                    <View style={[styles.row, { gap: 10 * u }]}>
                        {picker.classes.map((c) => {
                            const on = c.id === picker.classId;
                            return (
                                <Pressable key={c.id} onPress={() => picker.onClass(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
                                    style={[styles.chip, { paddingHorizontal: 20 * u, paddingVertical: 10 * u }, on && styles.chipOn]}>
                                    <Text style={[styles.chipText, { fontSize: 18 * u }, on && styles.chipTextOn]}>{c.name || t('board.picker.classFallback')}</Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
                {single && <Text style={[styles.classLine, { fontSize: 18 * u }]}>{single.name || t('board.picker.classFallback')}</Text>}

                <ScrollView style={styles.scroll} contentContainerStyle={{ gap: 14 * u }}>
                    {picker.phase === 'loading' && (
                        <View style={[styles.stateBox, { gap: 12 * u, padding: 24 * u }]}>
                            <ActivityIndicator size="large" color="#3F7D72" />
                            <Text style={[styles.stateText, { fontSize: 20 * u }]}>{t('board.picker.loading')}</Text>
                        </View>
                    )}

                    {picker.phase === 'error' && (
                        <View style={[styles.stateBox, { gap: 14 * u, padding: 24 * u }]}>
                            <Text style={[styles.stateText, { fontSize: 20 * u }]}>{t('board.picker.error')}</Text>
                            <Pressable onPress={picker.onRetry} accessibilityRole="button" style={[styles.retryBtn, { paddingHorizontal: 28 * u, paddingVertical: 14 * u }]}>
                                <Text style={[styles.retryText, { fontSize: 20 * u }]}>{t('board.picker.retry')}</Text>
                            </Pressable>
                        </View>
                    )}

                    {picker.phase === 'ready' && picker.classes.length === 0 && (
                        <Text style={[styles.stateText, { fontSize: 20 * u, padding: 24 * u }]}>{t('board.picker.noClasses')}</Text>
                    )}

                    {picker.phase === 'ready' && picker.classes.length > 0 && (
                        <>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
                                <Pressable onPress={() => onPick(null)} accessibilityRole="button" accessibilityState={{ selected: picker.player === null }}
                                    style={[styles.card, { width: cardWidth, minHeight: 84 * u, borderRadius: 20 * u }, picker.player === null && styles.cardOn]}>
                                    <Text style={[styles.cardName, { fontSize: 22 * u }, picker.player === null && styles.cardNameOn]} numberOfLines={1}>👥 {t('board.picker.guest')}</Text>
                                    <Text style={[styles.cardHint, { fontSize: 14 * u }, picker.player === null && styles.cardHintOn]} numberOfLines={1}>{t('board.picker.guestHint')}</Text>
                                </Pressable>

                                {picker.players.map((p) => {
                                    const on = picker.player?.id === p.id;
                                    const done = picker.played.has(p.id);
                                    const kept = picker.saved.has(p.id);
                                    return (
                                        <Pressable key={p.id} onPress={() => onPick(p)} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: on }}
                                            style={[styles.card, { width: cardWidth, minHeight: 84 * u, borderRadius: 20 * u }, on && styles.cardOn]}>
                                            <Text style={[styles.cardName, { fontSize: 26 * u }, on && styles.cardNameOn]} numberOfLines={1}>{p.name}</Text>
                                            {(kept || done) && <Text style={[styles.cardHint, { fontSize: 14 * u }, on && styles.cardHintOn]}>✓ {kept ? t('board.picker.savedMark') : t('board.picker.played')}</Text>}
                                        </Pressable>
                                    );
                                })}
                            </View>

                            {picker.players.length === 0 && <Text style={[styles.note, { fontSize: 17 * u }]}>{t('board.picker.empty')}</Text>}
                        </>
                    )}
                </ScrollView>

                {picker.phase === 'ready' && picker.excluded > 0 && <Text style={[styles.note, { fontSize: 15 * u }]}>{t('board.picker.excluded', { n: picker.excluded })}</Text>}
                <Text style={[styles.note, { fontSize: 15 * u }]}>{picker.canSave ? t('board.picker.saveNote') : t('board.picker.noSaveNote')}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    backdrop: { backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    sheet: { backgroundColor: '#FAF2E4' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    title: { color: '#3F342A', fontWeight: '900', flexShrink: 1 },
    closeBtn: { backgroundColor: '#EFE7D9', borderRadius: 16 },
    closeText: { color: '#584B40', fontWeight: '800' },
    row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    chip: { backgroundColor: '#EFE7D9', borderRadius: 999 },
    chipOn: { backgroundColor: '#3F7D72' },
    chipText: { color: '#584B40', fontWeight: '800' },
    chipTextOn: { color: '#FFFFFF' },
    classLine: { color: '#756753', fontWeight: '700' },
    scroll: { flexGrow: 0 },
    stateBox: { alignItems: 'center', justifyContent: 'center' },
    stateText: { color: '#584B40', fontWeight: '700', textAlign: 'center' },
    retryBtn: { backgroundColor: '#3F7D72', borderRadius: 16 },
    retryText: { color: '#FFFFFF', fontWeight: '800' },
    card: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#E3D8C4', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
    cardOn: { backgroundColor: '#3F7D72', borderColor: '#2E5F56' },
    cardName: { color: '#3F342A', fontWeight: '900', textAlign: 'center' },
    cardNameOn: { color: '#FFFFFF' },
    cardHint: { color: '#8A7A63', fontWeight: '700', textAlign: 'center' },
    cardHintOn: { color: '#D9F0EA' },
    note: { color: '#756753', fontWeight: '600', textAlign: 'center' },
});
