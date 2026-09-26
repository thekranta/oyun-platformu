// Sınıf Bahçesi — TAM EKRAN, öğrenci yönetim panelinden tamamen ayrı bir "sunum" ekranı
// (akıllı tahtaya/projeksiyona yansıtılabilecek bir görünüm hedeflenir; bkz. memory:
// sinif-bahcesi-uygulama — ilk sürüm TeacherDashboard içine küçük bir bölüm olarak
// gömülüydü, kullanıcı geri bildirimiyle ayrı tam ekrana taşındı).
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { REWARD_CONCEPT_LIST, getRewardConcept } from './conceptRegistry';
import RewardCard from './RewardCard';
import type { RewardConceptId, RewardStage } from './types';

const isMissingFunction = (error: { code?: string; message?: string } | null | undefined) =>
    !!error && (error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || ''));

const GRADIENTS: Record<RewardConceptId, [string, string]> = {
    bitki: ['#FFF7E8', '#E9F6EC'],
    gokyuzu: ['#EAF6FD', '#CDEAFB'],
};

interface RosterEntry {
    id: string;
    child_name: string;
    status?: 'pending' | 'accepted' | 'suspended';
    hidden?: boolean;
}

interface SummaryRow {
    student_id: string;
    today_count: number;
    stage: RewardStage;
}

interface SinifBahcesiScreenProps {
    visible: boolean;
    classId: string;
    className: string;
    classEmoji?: string;
    initialTheme: string;
    roster: RosterEntry[];
    onClose: () => void;
}

export default function SinifBahcesiScreen({ visible, classId, className, classEmoji, initialTheme, roster, onClose }: SinifBahcesiScreenProps) {
    const { width } = useWindowDimensions();
    const [theme, setTheme] = useState<RewardConceptId>((initialTheme as RewardConceptId) || 'bitki');
    const [summary, setSummary] = useState<Record<string, SummaryRow>>({});
    const [unavailable, setUnavailable] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [presentation, setPresentation] = useState(false);
    const [dayOverlayOpen, setDayOverlayOpen] = useState(false);
    const [shuffledIds, setShuffledIds] = useState<string[]>([]);

    useEffect(() => {
        if (visible) setTheme((initialTheme as RewardConceptId) || 'bitki');
    }, [visible, initialTheme, classId]);

    const loadSummary = async () => {
        const { data, error } = await supabase.rpc('teacher_class_reward_summary', { p_class_id: classId });
        if (error) {
            if (!isMissingFunction(error)) console.error('Sınıf Bahçesi yüklenirken hata:', error);
            setUnavailable(isMissingFunction(error));
            return;
        }
        const map: Record<string, SummaryRow> = {};
        (data as SummaryRow[] | null)?.forEach((row) => { map[row.student_id] = row; });
        setSummary(map);
        setUnavailable(false);
    };

    useEffect(() => {
        if (visible) loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, classId]);

    const visibleStudents = useMemo(
        () => roster.filter((s) => (!s.status || s.status === 'accepted') && !s.hidden),
        [roster],
    );

    const handleAward = async (studentId: string) => {
        setSummary((prev) => {
            const cur = prev[studentId] || { student_id: studentId, today_count: 0, stage: 0 as RewardStage };
            return { ...prev, [studentId]: { ...cur, today_count: cur.today_count + 1 } };
        });
        const { data, error } = await supabase.rpc('teacher_award_reward', { p_student_id: studentId });
        if (error) {
            setNotice('Ödül verilemedi, tekrar dene.');
            loadSummary();
            return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
            setSummary((prev) => ({ ...prev, [studentId]: { student_id: studentId, today_count: row.today_count, stage: row.stage } }));
        }
    };

    const handleThemeChange = async (id: RewardConceptId) => {
        if (id === theme) return;
        const prev = theme;
        setTheme(id);
        const { error } = await supabase.rpc('teacher_set_reward_theme', { p_class_id: classId, p_theme: id });
        if (error) {
            setTheme(prev);
            setNotice('Konsept değiştirilemedi, tekrar dene.');
        }
    };

    const openDayOverlay = () => {
        setShuffledIds([...visibleStudents.map((s) => s.id)].sort(() => Math.random() - 0.5));
        setDayOverlayOpen(true);
    };

    const concept = getRewardConcept(theme);
    const [gradFrom, gradTo] = GRADIENTS[theme] ?? GRADIENTS.bitki;

    // Genişliğe göre sütun sayısı + kart bahçe-sanatı boyutu. Sunum modunda AZ sütun + tam
    // genişlik kullanılır (uzaktan/akıllı tahtadan bakınca büyük, seçilebilir bitkiler için) —
    // normal modda daha çok, daha küçük sütun (yönetim ekranı gibi taranabilir).
    const columns = presentation
        ? (width > 1200 ? 3 : width > 700 ? 2 : 1)
        : (width > 1000 ? 4 : width > 720 ? 3 : width > 460 ? 2 : 1);
    const gap = 20;
    const horizontalPadding = 24;
    const usableWidth = presentation ? width : Math.min(width, 1400);
    const cardOuter = Math.floor((usableWidth - horizontalPadding * 2 - gap * (columns - 1)) / columns);
    const artSize = Math.max(90, Math.min(presentation ? 340 : 200, cardOuter - 32));

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
            <View style={styles.root}>
                <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                    <Defs>
                        <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={gradFrom} />
                            <Stop offset="1" stopColor={gradTo} />
                        </LinearGradient>
                    </Defs>
                    <Rect x={0} y={0} width="100%" height="100%" fill="url(#bg)" />
                </Svg>

                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat">
                        <Ionicons name="close" size={22} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.headerTitle}>{classEmoji ? `${classEmoji} ` : '🌱 '}{className}</Text>
                        <Text style={styles.headerSubtitle}>Sınıf Bahçesi</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.iconBtn, presentation && styles.iconBtnActive]}
                        onPress={() => setPresentation((p) => !p)}
                        accessibilityRole="button"
                        accessibilityLabel="Sunum modu"
                    >
                        <Ionicons name={presentation ? 'contract' : 'expand'} size={20} color={presentation ? '#fff' : '#333'} />
                    </TouchableOpacity>
                </View>

                {!presentation && (
                    <View style={styles.controlsRow}>
                        <View style={styles.segmented}>
                            {REWARD_CONCEPT_LIST.map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.segBtn, theme === c.id && { backgroundColor: c.accentColor }]}
                                    onPress={() => handleThemeChange(c.id)}
                                    accessibilityRole="button"
                                >
                                    <Text style={[styles.segBtnText, theme === c.id && styles.segBtnTextActive]}>{c.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TouchableOpacity style={styles.dayBtn} onPress={openDayOverlay}>
                            <Ionicons name="time-outline" size={16} color="#333" />
                            <Text style={styles.dayBtnText}>Günü kapat</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!!notice && <Text style={styles.noticeText}>{notice}</Text>}

                {/* ScrollView + flexGrow:1 justifyContent:'center': az öğrenci varken bahçe ekranın
                    ortasında toplu durur (tek kart boş ekranda kaybolmaz), çok öğrenci varken
                    normal şekilde kaydırılır (önceki sürümde kaydırma YOKTU — sınıf büyüdükçe
                    kartlar ekranın altından taşardı). */}
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {unavailable ? (
                        <Text style={styles.emptyText}>Sınıf Bahçesi henüz kurulmadı.</Text>
                    ) : visibleStudents.length === 0 ? (
                        <Text style={styles.emptyText}>Onaylı öğrenci olduğunda bahçe burada görünecek.</Text>
                    ) : (
                        <View style={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}>
                            {visibleStudents.map((s) => {
                                const row = summary[s.id];
                                return (
                                    <RewardCard
                                        key={s.id}
                                        name={s.child_name || '—'}
                                        stage={(row?.stage ?? 0) as RewardStage}
                                        todayCount={row?.today_count ?? 0}
                                        concept={concept}
                                        artSize={artSize}
                                        presentation={presentation}
                                        onAward={() => handleAward(s.id)}
                                    />
                                );
                            })}
                        </View>
                    )}
                </ScrollView>

                <Modal visible={dayOverlayOpen} transparent animationType="fade" onRequestClose={() => setDayOverlayOpen(false)}>
                    <View style={styles.overlayBg}>
                        <View style={styles.overlayCard}>
                            <Text style={styles.overlayTitle}>Bugün bahçemiz böyle görünüyor</Text>
                            <Text style={styles.overlaySub}>Sınıfın ortak bahçesi — her bitki kendi hızında büyüdü.</Text>
                            <View style={styles.miniGrid}>
                                {shuffledIds.map((id) => {
                                    const row = summary[id];
                                    const Art = concept.Art;
                                    return <Art key={id} stage={(row?.stage ?? 0) as RewardStage} size={48} />;
                                })}
                            </View>
                            <TouchableOpacity style={styles.overlayCloseBtn} onPress={() => setDayOverlayOpen(false)}>
                                <Text style={styles.overlayCloseText}>Kapat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
    },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    iconBtnActive: { backgroundColor: '#4ECDC4' },
    headerTitleWrap: { alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#333' },
    headerSubtitle: { fontSize: 12.5, color: '#888', marginTop: 2 },
    controlsRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, marginBottom: 16, flexWrap: 'wrap', gap: 10,
    },
    segmented: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999, padding: 3, gap: 2 },
    segBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    segBtnText: { fontSize: 13, fontWeight: '700', color: '#666' },
    segBtnTextActive: { color: '#fff' },
    dayBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)',
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    },
    dayBtnText: { fontSize: 13, fontWeight: '700', color: '#333' },
    noticeText: { color: '#C0392B', fontSize: 13, textAlign: 'center', marginBottom: 8 },
    emptyText: { color: '#888', fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 60 },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', paddingBottom: 40 },
    overlayBg: { flex: 1, backgroundColor: 'rgba(20,42,40,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    overlayCard: { backgroundColor: '#fff', borderRadius: 26, padding: 28, width: '100%', maxWidth: 560, alignItems: 'center' },
    overlayTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginBottom: 4, textAlign: 'center' },
    overlaySub: { fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' },
    miniGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 22 },
    overlayCloseBtn: { backgroundColor: '#4ECDC4', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 999 },
    overlayCloseText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
