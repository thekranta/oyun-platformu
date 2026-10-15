import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { shareText } from '../lib/shareText';
import { VeliTier } from '../lib/subscriptionTiers';
import {
    AlanSummary, alanSummary, buildClassGuide, buildGuide, classAlanSummary, filterGuide, GuideCode, GuideGame, guideAlanlar, missingCount, TIER_LABELS,
} from '../lib/teacherGameGuide';
import { buildParentMessage, Translate } from '../lib/teacherParentMessage';

// ============================================
// 📚 ÖĞRETMEN OYUN REHBERİ — oyunlar, Maarif Modeli 2026 kodu ve resmi metni (kazanıma göre gruplu).
// Üç görünüm: Genel (yalnız rehber), Öğrenci (çocuğun eksik kazanımları), Sınıf (sınıfta hiçbir çocuğun oynamadığı kazanımlar).
// Öğretmen oyunlara dokunup seçer ve "Veliye gönder" ile hazır mesajı paylaşır (lib/teacherParentMessage.ts).
// Veri: lib/teacherGameGuide.ts (katalogdan otomatik; yeni oyun kendiliğinden girer).
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
type Scope = 'all' | 'student' | 'class';

export interface GuideClassScope {
    name: string;
    loading: boolean;
    done: number;
    total: number;
    /** Verisi alınamayan çocuk sayısı. */
    failed: number;
    /** Çocuk başına oynanma sayıları; henüz yüklenmediyse null. */
    perStudent: Record<string, number>[] | null;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    /** Seçili öğrenci (yoksa Öğrenci görünümü yoktur). */
    student: { name: string } | null;
    /** Öğrencinin oyun başına oynanma sayısı; öğrenci yoksa null. */
    plays: Record<string, number> | null;
    playsLoading: boolean;
    /** Sayıma giren oyun kaydı adedi (bilgi satırı için). */
    playsTotal: number;
    /** Öğrencinin oyun geçmişi alınamadı. */
    loadFailed?: boolean;
    /** Seçili sınıf (yoksa Sınıf görünümü yoktur). */
    classScope?: GuideClassScope | null;
    /** Sınıf görünümüne ilk geçişte çağrılır (veri tembel yüklenir). */
    onRequestClass?: () => void;
}

export default function TeacherGameGuide({ visible, onClose, student, plays, playsLoading, playsTotal, loadFailed, classScope, onRequestClass }: Props) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [alan, setAlan] = useState<string | null>(null);
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [scope, setScope] = useState<Scope>('all');
    const [picked, setPicked] = useState<Set<string>>(new Set());
    const [notice, setNotice] = useState<string | null>(null);
    const listRef = useRef<FlatList<Row>>(null);
    const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Açılışta: öğrenci seçiliyse Öğrenci görünümü, değilse Genel; seçimler ve süzgeçler sıfırlanır.
    useEffect(() => {
        if (!visible) return;
        setScope(student ? 'student' : 'all');
        setPicked(new Set());
        setQuery('');
        setAlan(null);
        setOnlyMissing(false);
        setNotice(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

    const mode: Scope = scope === 'student' && student && plays ? 'student' : scope === 'class' && classScope?.perStudent ? 'class' : 'all';
    const baseGuide = useMemo(() => buildGuide(null), []);
    const guide = useMemo(
        () => (mode === 'student' ? buildGuide(plays) : mode === 'class' ? buildClassGuide(classScope!.perStudent!) : baseGuide),
        [mode, plays, classScope?.perStudent, baseGuide], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const alanlar = useMemo(() => guideAlanlar(guide), [guide]);
    const summary = useMemo(
        () => (mode === 'class' ? classAlanSummary(classScope!.perStudent!, guide) : alanSummary(guide)),
        [mode, guide, classScope?.perStudent], // eslint-disable-line react-hooks/exhaustive-deps
    );
    const eksik = useMemo(() => missingCount(guide), [guide]);
    const dataMode = mode !== 'all';
    const shown = useMemo(
        () => filterGuide(guide, { query, alan, onlyMissing: onlyMissing && dataMode }),
        [guide, query, alan, onlyMissing, dataMode],
    );
    const showOverview = !query && !onlyMissing;
    const classSize = classScope?.perStudent?.length ?? 0;

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

    const chooseScope = (next: Scope) => {
        setScope(next);
        setOnlyMissing(false);
        toTop();
        if (next === 'class' && !classScope?.perStudent && !classScope?.loading) onRequestClass?.();
    };

    const toggleGame = (id: string) => setPicked(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const flash = (text: string | null) => {
        setNotice(text);
        if (noticeTimer.current) clearTimeout(noticeTimer.current);
        if (text) noticeTimer.current = setTimeout(() => setNotice(null), 4500);
    };

    const sendToParent = async () => {
        const picks = baseGuide
            .map(c => ({ key: c.key, code: c.code, alan: c.alan, text: c.text, games: c.games.filter(g => picked.has(g.id)).map(g => ({ name: g.name, tier: g.tier })) }))
            .filter(p => p.games.length > 0);
        const message = buildParentMessage(picks, mode === 'student' ? student?.name : null, t as unknown as Translate);
        const result = await shareText(message);
        if (result === 'copied') flash(t('teacher.guide.shareCopied'));
        else if (result === 'shared') flash(t('teacher.guide.shareShared'));
        else if (result === 'failed') flash(t('teacher.guide.shareFailed'));
    };

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
        const tracked = s.izlenebilir ?? 0;
        let ratio: number;
        let pct: number | null = null;
        let info: string;
        if (mode === 'student') {
            ratio = tracked > 0 ? (s.oynanan ?? 0) / tracked : 0;
            pct = tracked > 0 ? Math.round(ratio * 100) : null;
            info = tracked > 0 ? t('teacher.guide.overviewRowStudent', { played: s.oynanan ?? 0, total: tracked }) : t('teacher.guide.notTracked');
        } else if (mode === 'class') {
            ratio = s.ortKapsama ?? 0;
            pct = s.ortKapsama !== null ? Math.round(ratio * 100) : null;
            info = tracked > 0 ? t('teacher.guide.overviewRowClass', { played: s.oynanan ?? 0, total: tracked }) : t('teacher.guide.notTracked');
        } else {
            ratio = maxKod > 0 ? s.kod / maxKod : 0;
            info = t('teacher.guide.overviewRowInfo', { kod: s.kod, oyun: s.oyun });
        }
        const missingText = dataMode && (s.eksik ?? 0) > 0
            ? t(mode === 'class' ? 'teacher.guide.overviewMissingClass' : 'teacher.guide.overviewMissing', { count: s.eksik })
            : null;
        return (
            <Pressable
                key={s.alan}
                onPress={() => pickAlan(alan === s.alan ? null : s.alan)}
                accessibilityRole="button"
                accessibilityLabel={`${s.alan}, ${info}${missingText ? ', ' + missingText : ''}`}
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
                {!!missingText && <Text style={styles.ovMissing}>{missingText}</Text>}
            </Pressable>
        );
    };

    const overview = showOverview ? (
        <View style={styles.overview}>
            <Text style={styles.ovTitle}>{'📊 ' + t('teacher.guide.overviewTitle')}</Text>
            <Text style={styles.ovHint}>
                {mode === 'student' ? t('teacher.guide.overviewHintStudent') : mode === 'class' ? t('teacher.guide.overviewHintClass') : t('teacher.guide.overviewHintInfo')}
            </Text>
            {summary.map(s => overviewRow(s, Math.max(...summary.map(x => x.kod))))}
        </View>
    ) : null;

    const gamePlaysLabel = (g: GuideGame): { text: string; tone: 'ok' | 'zero' | 'none' } | null => {
        if (mode === 'student') {
            return g.plays === null ? { text: t('teacher.guide.notTracked'), tone: 'none' }
                : g.plays === 0 ? { text: t('teacher.guide.notPlayed'), tone: 'zero' }
                    : { text: t('teacher.guide.playsCount', { count: g.plays }), tone: 'ok' };
        }
        if (mode === 'class') {
            return g.classPlayedBy === null ? { text: t('teacher.guide.notTracked'), tone: 'none' }
                : { text: t('teacher.guide.classGame', { count: g.classPlayedBy, size: classSize }), tone: g.classPlayedBy === 0 ? 'zero' : 'ok' };
        }
        return null;
    };

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
        const weak = mode === 'class' && item.missing === false && (item.classPlayedBy ?? 0) * 2 < classSize;
        return (
            <View style={[styles.card, { borderLeftColor: color }, item.missing === true && styles.cardMissing]}>
                <View style={styles.cardTop}>
                    {item.code
                        ? <View style={[styles.codeChip, { backgroundColor: color }]}><Text style={styles.codeText}>{item.code}</Text></View>
                        : <View style={[styles.codeChip, styles.codeChipSoft]}><Text style={[styles.codeText, styles.codeTextSoft]}>{t('teacher.guide.platformSkill')}</Text></View>}
                    <Text style={styles.alan} numberOfLines={1}>{item.alan}</Text>
                    {item.missing === true && <View style={styles.missTag}><Text style={styles.missTagText}>{mode === 'class' ? t('teacher.guide.nobodyTag') : t('teacher.guide.missingTag')}</Text></View>}
                    {item.missing === false && mode === 'student' && <View style={styles.okTag}><Text style={styles.okTagText}>{t('teacher.guide.playedTag', { count: item.playedGames ?? 0 })}</Text></View>}
                    {item.missing === false && mode === 'class' && (
                        <View style={weak ? styles.weakTag : styles.okTag}>
                            <Text style={weak ? styles.weakTagText : styles.okTagText}>{t('teacher.guide.classTag', { count: item.classPlayedBy ?? 0, size: classSize })}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.text}>{item.text}</Text>
                <View style={styles.gamesBox}>
                    {item.games.map((g) => {
                        const on = picked.has(g.id);
                        const label = gamePlaysLabel(g);
                        return (
                            <Pressable
                                key={g.id}
                                onPress={() => toggleGame(g.id)}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: on }}
                                accessibilityLabel={t('teacher.guide.pickGame', { name: g.name })}
                                style={[styles.gameRow, on && styles.gameRowOn]}
                            >
                                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? '#1E5FB4' : '#B0B7C3'} style={{ marginTop: 1 }} />
                                <View style={{ flex: 1 }}>
                                    <View style={styles.gameNameRow}>
                                        <Text style={styles.gameName}>{g.name}</Text>
                                        <View style={[styles.tierBadge, { backgroundColor: TIER_COLORS[g.tier].bg }]}>
                                            <Text style={[styles.tierText, { color: TIER_COLORS[g.tier].fg }]}>{TIER_LABELS[g.tier]}</Text>
                                        </View>
                                    </View>
                                    {!!g.detail && <Text style={styles.gameDetail}>{g.detail}</Text>}
                                </View>
                                {label && <Text style={[styles.plays, label.tone === 'zero' && styles.playsZero, label.tone === 'none' && styles.playsNone]}>{label.text}</Text>}
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        );
    };

    const infoText = (() => {
        if (scope === 'class') {
            if (!classScope || classScope.loading || !classScope.perStudent) return null;
            return classScope.perStudent.length === 0
                ? t('teacher.guide.classEmpty')
                : t('teacher.guide.classInfo', { name: classScope.name, count: classScope.perStudent.length, missing: eksik })
                + (classScope.failed > 0 ? ' ' + t('teacher.guide.classPartial', { count: classScope.failed }) : '');
        }
        if (scope === 'student') {
            if (playsLoading) return null;
            if (loadFailed && student) return t('teacher.guide.loadFailed');
            if (mode === 'student') return t('teacher.guide.studentInfo', { name: student!.name, count: playsTotal, missing: eksik });
        }
        return t('teacher.guide.noStudent');
    })();
    const infoLoading = (scope === 'student' && playsLoading)
        ? t('teacher.guide.loading')
        : (scope === 'class' && (!classScope?.perStudent || classScope.loading))
            ? t('teacher.guide.classLoading', { done: classScope?.done ?? 0, total: classScope?.total ?? 0 })
            : null;

    const pickedCount = picked.size;

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

                {(!!student || !!classScope) && (
                    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={t('teacher.guide.scopeLabel')}>
                        {([['all', t('teacher.guide.scopeAll'), true], ['student', student ? t('teacher.guide.scopeStudent', { name: student.name }) : '', !!student], ['class', classScope ? t('teacher.guide.scopeClass', { name: classScope.name }) : '', !!classScope]] as [Scope, string, boolean][])
                            .filter(([, , available]) => available)
                            .map(([key, label]) => (
                                <Pressable
                                    key={key}
                                    onPress={() => chooseScope(key)}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: scope === key, checked: scope === key }}
                                    accessibilityLabel={label}
                                    style={[styles.segItem, scope === key && styles.segItemOn]}
                                >
                                    <Text style={[styles.segText, scope === key && styles.segTextOn]} numberOfLines={1}>{label}</Text>
                                </Pressable>
                            ))}
                    </View>
                )}

                <View style={styles.infoCard}>
                    {infoLoading
                        ? <View style={styles.infoRow}><ActivityIndicator size="small" color="#FF6B6B" /><Text style={styles.infoText}>{infoLoading}</Text></View>
                        : <Text style={styles.infoText}>{infoText}</Text>}
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
                        {dataMode && chip('missing', t(mode === 'class' ? 'teacher.guide.nobodyChip' : 'teacher.guide.missingChip', { count: eksik }), onlyMissing, pickMissing, '#C0392B')}
                        {alanlar.map((a) => chip(a, `${a} (${summary.find(s => s.alan === a)?.kod ?? 0})`, alan === a && !onlyMissing, () => pickAlan(a), alanColor(a)))}
                    </ScrollView>
                </View>

                <FlatList
                    ref={listRef}
                    data={rows}
                    keyExtractor={(r) => (r.kind === 'alan' ? 'alan-' + r.alan : r.item.key)}
                    renderItem={renderRow}
                    extraData={picked}
                    contentContainerStyle={[styles.list, pickedCount > 0 && { paddingBottom: 130 }]}
                    keyboardShouldPersistTaps="handled"
                    initialNumToRender={8}
                    ListHeaderComponent={overview}
                    ListEmptyComponent={<Text style={styles.empty}>{onlyMissing ? t(mode === 'class' ? 'teacher.guide.noNobody' : 'teacher.guide.noMissing') : t('teacher.guide.noResults')}</Text>}
                    ListFooterComponent={<Text style={styles.footer}>{t('teacher.guide.footer')}</Text>}
                />

                {(pickedCount > 0 || !!notice) && (
                    <View style={styles.sendWrap} pointerEvents="box-none">
                        {!!notice && <View style={styles.toast} accessibilityLiveRegion="polite"><Text style={styles.toastText}>{notice}</Text></View>}
                        {pickedCount > 0 && (
                            <View style={styles.sendBar}>
                                <Text style={styles.sendCount}>{t('teacher.guide.pickedCount', { count: pickedCount })}</Text>
                                <Pressable onPress={() => setPicked(new Set())} accessibilityRole="button" accessibilityLabel={t('teacher.guide.clearPicks')} style={styles.sendClear}>
                                    <Text style={styles.sendClearText}>{t('teacher.guide.clearPicks')}</Text>
                                </Pressable>
                                <Pressable onPress={sendToParent} accessibilityRole="button" accessibilityLabel={t('teacher.guide.sendToParent')} style={styles.sendBtn}>
                                    <Ionicons name="share-social" size={18} color="#fff" />
                                    <Text style={styles.sendBtnText}>{t('teacher.guide.sendToParent')}</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>
                )}
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

    seg: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 10, padding: 4, borderRadius: 14, backgroundColor: '#F0EBE6', gap: 4 },
    segItem: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    segItemOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
    segText: { fontSize: 13, fontWeight: '600', color: '#7A6F66' },
    segTextOn: { color: '#1E4E8C', fontWeight: '800' },

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
    weakTag: { marginLeft: 'auto', backgroundColor: '#FFF1D6', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
    weakTagText: { color: '#B26A00', fontSize: 12, fontWeight: '700' },
    text: { fontSize: 14.5, color: '#333', lineHeight: 21, fontWeight: '600' },
    gamesBox: { gap: 4, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F2F2F2' },
    gameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },
    gameRowOn: { backgroundColor: '#EEF4FF' },
    gameNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    gameName: { fontSize: 15, fontWeight: '700', color: '#222' },
    tierBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
    tierText: { fontSize: 11, fontWeight: '800' },
    gameDetail: { fontSize: 12.5, color: '#777', lineHeight: 17, marginTop: 2 },
    plays: { fontSize: 12, fontWeight: '700', color: '#1E8449', maxWidth: 92, textAlign: 'right' },
    playsZero: { color: '#C0392B' },
    playsNone: { color: '#999', fontWeight: '500' },
    empty: { textAlign: 'center', color: '#888', fontSize: 14, paddingVertical: 30 },
    footer: { textAlign: 'center', color: '#888', fontSize: 12.5, lineHeight: 18, paddingTop: 14, paddingHorizontal: 12 },

    sendWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
    toast: { alignSelf: 'center', backgroundColor: '#2E7D32', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    sendBar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E4E8C', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
    sendCount: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
    sendClear: { paddingHorizontal: 8, paddingVertical: 8 },
    sendClearText: { color: '#CFE0FA', fontSize: 13, fontWeight: '600' },
    sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6B6B', borderRadius: 14, paddingHorizontal: 14, height: 40 },
    sendBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
