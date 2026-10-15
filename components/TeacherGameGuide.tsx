import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VeliTier } from '../lib/subscriptionTiers';
import { AlanSummary, alanSummary, buildGuide, filterGuide, GuideCode, guideAlanlar, missingCount, TIER_LABELS } from '../lib/teacherGameGuide';

// ============================================
// 📚 ÖĞRETMEN OYUN REHBERİ — oyunlar, Maarif Modeli 2026 kodu ve resmi metni (kazanıma göre gruplu).
// Öğretmen bir beceri kazandırmak istediğinde "evde şu oyunu oynayın" diyebilsin diye; bir öğrenci seçiliyse
// henüz oynamadığı (eksik) kazanımlar işaretlenir. Veri: lib/teacherGameGuide.ts (katalogdan otomatik; yeni oyun kendiliğinden girer).
// Görsel dil: her alanın kendi rengi var (başlık, kart şeridi, çubuk); üstte alanlara göre özet çubukları.
// ============================================

const TIER_COLORS: Record<VeliTier, { bg: string; fg: string }> = {
    free: { bg: '#E8F5E9', fg: '#2E7D32' },
    tohum: { bg: '#FFF3E0', fg: '#BF5B00' },
    filiz: { bg: '#E3F2FD', fg: '#1565C0' },
    fidan: { bg: '#F3E5F5', fg: '#6A1B9A' },
    orman: { bg: '#F3E5F5', fg: '#6A1B9A' },
};

const ALAN_COLORS: Record<string, string> = {
    'Matematik': '#3B82F6',
    'Fen': '#10B981',
    'Türkçe': '#F59E0B',
    'Sosyal': '#14B8A6',
    'Sosyal-Duygusal': '#EC4899',
    'Sanat': '#8B5CF6',
    'Müzik': '#F97316',
    'Hareket ve Sağlık': '#EF4444',
};
const alanColor = (alan: string) => ALAN_COLORS[alan] ?? '#64748B';

type Row = { kind: 'alan'; alan: string; kod: number; oyun: number } | { kind: 'card'; item: GuideCode };

interface Props {
    visible: boolean;
    onClose: () => void;
    /** Seçili öğrenci (yoksa rehber yalnız bilgi amaçlıdır). */
    student: { name: string } | null;
    /** Öğrencinin oyun başına oynanma sayısı; öğrenci yoksa null. */
    plays: Record<string, number> | null;
    playsLoading: boolean;
    /** Sayıma giren oyun kaydı adedi (bilgi satırı için). */
    playsTotal: number;
    /** Öğrencinin oyun geçmişi alınamadı. */
    loadFailed?: boolean;
}

export default function TeacherGameGuide({ visible, onClose, student, plays, playsLoading, playsTotal, loadFailed }: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [alan, setAlan] = useState<string | null>(null);
    const [onlyMissing, setOnlyMissing] = useState(false);
    const listRef = useRef<FlatList<Row>>(null);

    const guide = useMemo(() => buildGuide(plays), [plays]);
    const alanlar = useMemo(() => guideAlanlar(guide), [guide]);
    const summary = useMemo(() => alanSummary(guide), [guide]);
    const eksik = useMemo(() => missingCount(guide), [guide]);
    const shown = useMemo(
        () => filterGuide(guide, { query, alan, onlyMissing: onlyMissing && plays !== null }),
        [guide, query, alan, onlyMissing, plays],
    );
    const hasStudent = !!student && plays !== null;
    const showOverview = !query && !onlyMissing;

    // Alan başlıkları: "Tümü" ve arama sonuçlarında alanlar arası geçiş açıkça görünsün (Tümü Matematik gibi görünmesin).
    const rows = useMemo<Row[]>(() => {
        const out: Row[] = [];
        let last = '';
        for (const item of shown) {
            if (!alan && item.alan !== last) {
                const s = summary.find(x => x.alan === item.alan);
                out.push({ kind: 'alan', alan: item.alan, kod: shown.filter(c => c.alan === item.alan).length, oyun: s?.oyun ?? 0 });
                last = item.alan;
            }
            out.push({ kind: 'card', item });
        }
        return out;
    }, [shown, alan, summary]);

    const toTop = () => listRef.current?.scrollToOffset({ offset: 0, animated: false });
    const pickAlan = useCallback((next: string | null) => { setAlan(next); setOnlyMissing(false); toTop(); }, []);
    const pickMissing = () => { setOnlyMissing(true); setAlan(null); toTop(); };

    const chip = (key: string, label: string, selected: boolean, onPress: () => void, color?: string) => (
        <Pressable
            key={key}
            onPress={onPress}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={label}
            style={[styles.chip, selected && styles.chipOn, selected && color ? { backgroundColor: color, borderColor: color } : null]}
        >
            {color && <View style={[styles.chipDot, { backgroundColor: selected ? '#fff' : color }]} />}
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
        </Pressable>
    );

    const overviewRow = (s: AlanSummary, maxKod: number) => {
        const color = alanColor(s.alan);
        const studentMode = s.izlenebilir !== null;
        const tracked = s.izlenebilir ?? 0;
        const ratio = studentMode ? (tracked > 0 ? (s.oynanan ?? 0) / tracked : 0) : (maxKod > 0 ? s.kod / maxKod : 0);
        const pct = studentMode && tracked > 0 ? Math.round(((s.oynanan ?? 0) / tracked) * 100) : null;
        const info = studentMode
            ? (tracked > 0 ? t('teacher.guide.overviewRowStudent', { played: s.oynanan ?? 0, total: tracked }) : t('teacher.guide.notTracked'))
            : t('teacher.guide.overviewRowInfo', { kod: s.kod, oyun: s.oyun });
        return (
            <Pressable
                key={s.alan}
                onPress={() => pickAlan(alan === s.alan ? null : s.alan)}
                accessibilityRole="button"
                accessibilityLabel={`${s.alan}, ${info}${studentMode && (s.eksik ?? 0) > 0 ? ', ' + t('teacher.guide.overviewMissing', { count: s.eksik }) : ''}`}
                style={styles.ovRow}
            >
                <View style={styles.ovTop}>
                    <View style={[styles.ovDot, { backgroundColor: color }]} />
                    <Text style={styles.ovAlan} numberOfLines={1}>{s.alan}</Text>
                    <Text style={styles.ovInfo} numberOfLines={1}>{info}</Text>
                    {pct !== null && <Text style={[styles.ovPct, { color }]}>{`%${pct}`}</Text>}
                </View>
                <View style={styles.ovTrack}>
                    <View style={[styles.ovFill, { width: `${Math.max(ratio > 0 ? 3 : 0, Math.round(ratio * 100))}%`, backgroundColor: color }]} />
                </View>
                {studentMode && (s.eksik ?? 0) > 0 && <Text style={styles.ovMissing}>{t('teacher.guide.overviewMissing', { count: s.eksik })}</Text>}
            </Pressable>
        );
    };

    const overview = showOverview ? (
        <View style={styles.overview}>
            <Text style={styles.ovTitle}>{'📊 ' + t('teacher.guide.overviewTitle')}</Text>
            <Text style={styles.ovHint}>{hasStudent ? t('teacher.guide.overviewHintStudent') : t('teacher.guide.overviewHintInfo')}</Text>
            {summary.map(s => overviewRow(s, Math.max(...summary.map(x => x.kod))))}
        </View>
    ) : null;

    const renderRow = ({ item: row }: { item: Row }) => {
        if (row.kind === 'alan') {
            const color = alanColor(row.alan);
            return (
                <View style={[styles.sectionHeader, { borderLeftColor: color }]} accessibilityRole="header">
                    <Text style={[styles.sectionTitle, { color }]}>{row.alan}</Text>
                    <Text style={styles.sectionInfo}>{t('teacher.guide.overviewRowInfo', { kod: row.kod, oyun: row.oyun })}</Text>
                </View>
            );
        }
        const item = row.item;
        const color = alanColor(item.alan);
        return (
            <View style={[styles.card, { borderLeftColor: color }, item.missing === true && styles.cardMissing]}>
                <View style={styles.cardTop}>
                    {item.code
                        ? <View style={[styles.codeChip, { backgroundColor: color }]}><Text style={styles.codeText}>{item.code}</Text></View>
                        : <View style={[styles.codeChip, styles.codeChipSoft]}><Text style={[styles.codeText, styles.codeTextSoft]}>{t('teacher.guide.platformSkill')}</Text></View>}
                    <Text style={styles.alan} numberOfLines={1}>{item.alan}</Text>
                    {item.missing === true && <View style={styles.missTag}><Text style={styles.missTagText}>{t('teacher.guide.missingTag')}</Text></View>}
                    {item.missing === false && <View style={styles.okTag}><Text style={styles.okTagText}>{t('teacher.guide.playedTag', { count: item.playedGames ?? 0 })}</Text></View>}
                </View>
                <Text style={styles.text}>{item.text}</Text>
                <View style={styles.gamesBox}>
                    {item.games.map((g) => (
                        <View key={g.id} style={styles.gameRow}>
                            <View style={{ flex: 1 }}>
                                <View style={styles.gameNameRow}>
                                    <Text style={styles.gameName}>{g.name}</Text>
                                    <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[g.tier].bg }]}>
                                        <Text style={[styles.tierText, { color: TIER_COLORS[g.tier].fg }]}>{TIER_LABELS[g.tier]}</Text>
                                    </View>
                                </View>
                                {!!g.detail && <Text style={styles.gameDetail}>{g.detail}</Text>}
                            </View>
                            {hasStudent && (
                                <Text style={[styles.plays, g.plays === 0 && styles.playsZero, g.plays === null && styles.playsNone]}>
                                    {g.plays === null ? t('teacher.guide.notTracked') : g.plays === 0 ? t('teacher.guide.notPlayed') : t('teacher.guide.playsCount', { count: g.plays })}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.root}>
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{'📚 ' + t('teacher.guide.title')}</Text>
                        <Text style={styles.subtitle}>{t('teacher.guide.subtitle')}</Text>
                    </View>
                    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('teacher.guide.close')} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color="#555" />
                    </Pressable>
                </View>

                <View style={styles.infoCard}>
                    {playsLoading
                        ? <View style={styles.infoRow}><ActivityIndicator size="small" color="#FF6B6B" /><Text style={styles.infoText}>{t('teacher.guide.loading')}</Text></View>
                        : loadFailed && student
                            ? <Text style={styles.infoText}>{t('teacher.guide.loadFailed')}</Text>
                            : hasStudent
                                ? <Text style={styles.infoText}>{t('teacher.guide.studentInfo', { name: student!.name, count: playsTotal, missing: eksik })}</Text>
                                : <Text style={styles.infoText}>{t('teacher.guide.noStudent')}</Text>}
                </View>

                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={(v) => { setQuery(v); toTop(); }}
                        placeholder={t('teacher.guide.searchPlaceholder')}
                        placeholderTextColor="#999"
                        accessibilityLabel={t('teacher.guide.searchPlaceholder')}
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => { setQuery(''); toTop(); }} accessibilityRole="button" accessibilityLabel={t('teacher.guide.clearSearch')} hitSlop={8}>
                            <Ionicons name="close-circle" size={18} color="#bbb" />
                        </Pressable>
                    )}
                </View>

                <View accessibilityRole="radiogroup" accessibilityLabel={t('teacher.guide.filterLabel')}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                        {chip('all', `${t('teacher.guide.all')} (${guide.length})`, alan === null && !onlyMissing, () => pickAlan(null))}
                        {hasStudent && chip('missing', t('teacher.guide.missingChip', { count: eksik }), onlyMissing, pickMissing, '#C0392B')}
                        {alanlar.map((a) => chip(a, `${a} (${summary.find(s => s.alan === a)?.kod ?? 0})`, alan === a && !onlyMissing, () => pickAlan(a), alanColor(a)))}
                    </ScrollView>
                </View>

                <FlatList
                    ref={listRef}
                    data={rows}
                    keyExtractor={(r) => (r.kind === 'alan' ? 'alan-' + r.alan : r.item.key)}
                    renderItem={renderRow}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    initialNumToRender={8}
                    ListHeaderComponent={overview}
                    ListEmptyComponent={<Text style={styles.empty}>{onlyMissing ? t('teacher.guide.noMissing') : t('teacher.guide.noResults')}</Text>}
                    ListFooterComponent={<Text style={styles.footer}>{t('teacher.guide.footer')}</Text>}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFF9F5' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8, gap: 12 },
    title: { fontSize: 22, fontWeight: '800', color: '#333' },
    subtitle: { fontSize: 13, color: '#777', marginTop: 2, lineHeight: 18 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
    infoCard: { marginHorizontal: 18, marginBottom: 10, padding: 12, borderRadius: 14, backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFE0B2' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoText: { fontSize: 13.5, color: '#8A5A00', lineHeight: 19, flexShrink: 1 },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 18, marginBottom: 10, paddingHorizontal: 12, height: 44, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
    searchInput: { flex: 1, fontSize: 15, color: '#333', paddingVertical: 0 },
    chips: { paddingHorizontal: 18, gap: 8, paddingBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e6e6e6' },
    chipOn: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
    chipDot: { width: 9, height: 9, borderRadius: 5 },
    chipText: { fontSize: 13.5, fontWeight: '600', color: '#555' },
    chipTextOn: { color: '#fff' },
    list: { paddingHorizontal: 18, paddingBottom: 40, gap: 12 },

    overview: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#F0F0F0', gap: 10, marginBottom: 4 },
    ovTitle: { fontSize: 16, fontWeight: '800', color: '#333' },
    ovHint: { fontSize: 12.5, color: '#777', lineHeight: 17 },
    ovRow: { gap: 5, paddingVertical: 2 },
    ovTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    ovDot: { width: 10, height: 10, borderRadius: 5 },
    ovAlan: { fontSize: 13.5, fontWeight: '700', color: '#333' },
    ovInfo: { flex: 1, fontSize: 12, color: '#777', textAlign: 'right' },
    ovPct: { fontSize: 13, fontWeight: '800', minWidth: 40, textAlign: 'right' },
    ovTrack: { height: 10, borderRadius: 5, backgroundColor: '#F1F1F1', overflow: 'hidden' },
    ovFill: { height: 10, borderRadius: 5 },
    ovMissing: { fontSize: 11.5, color: '#C0392B', fontWeight: '700' },

    sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderLeftWidth: 5, paddingLeft: 10, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '800' },
    sectionInfo: { fontSize: 12, color: '#888' },

    card: { backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1.5, borderColor: '#F0F0F0', borderLeftWidth: 5, gap: 8 },
    cardMissing: { backgroundColor: '#FFFAFA' },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    codeChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    codeChipSoft: { backgroundColor: '#EEF2F8' },
    codeText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
    codeTextSoft: { color: '#44546A', fontWeight: '700' },
    alan: { fontSize: 13, fontWeight: '700', color: '#2C4A73', flexShrink: 1 },
    missTag: { marginLeft: 'auto', backgroundColor: '#FFE3E3', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    missTagText: { color: '#C0392B', fontSize: 12, fontWeight: '800' },
    okTag: { marginLeft: 'auto', backgroundColor: '#E6F6EC', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    okTagText: { color: '#1E8449', fontSize: 12, fontWeight: '700' },
    text: { fontSize: 14.5, color: '#333', lineHeight: 21, fontWeight: '600' },
    gamesBox: { gap: 10, marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
    gameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    gameNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    gameName: { fontSize: 15, fontWeight: '700', color: '#222' },
    tierBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    tierText: { fontSize: 11, fontWeight: '800' },
    gameDetail: { fontSize: 12.5, color: '#777', lineHeight: 17, marginTop: 2 },
    plays: { fontSize: 12, fontWeight: '700', color: '#1E8449', maxWidth: 96, textAlign: 'right' },
    playsZero: { color: '#C0392B' },
    playsNone: { color: '#999', fontWeight: '500' },
    empty: { textAlign: 'center', color: '#888', fontSize: 14, paddingVertical: 30 },
    footer: { textAlign: 'center', color: '#888', fontSize: 12.5, lineHeight: 18, paddingTop: 14, paddingHorizontal: 12 },
});
