// Sınıf Bahçesi: öğretmenin ödül panosu bölümü. supabase_migrations/add_class_rewards.sql
// RPC'lerini kullanır (teacher_class_reward_summary / teacher_award_reward /
// teacher_set_reward_theme). Öğrenci adı için teacher_class_roster'ı (zaten
// TeacherDashboard'da çekiliyor) TEKRAR ÇAĞIRMAK yerine, ad/durumu prop olarak alır —
// tek bir yerde (TeacherDashboard.fetchStudents) okunan veri iki kez çekilmesin diye.
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { REWARD_CONCEPT_LIST, getRewardConcept } from './conceptRegistry';
import RewardCard from './RewardCard';
import type { RewardConceptId, RewardStage } from './types';

const isMissingFunction = (error: { code?: string; message?: string } | null | undefined) =>
    !!error && (error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || ''));

interface RosterEntry {
    id: string;
    child_name: string;
    status?: 'pending' | 'accepted' | 'suspended';
    hidden?: boolean;
}

interface TeacherRewardBoardProps {
    classId: string;
    initialTheme: string;
    roster: RosterEntry[];
}

interface SummaryRow {
    student_id: string;
    today_count: number;
    stage: RewardStage;
}

export default function TeacherRewardBoard({ classId, initialTheme, roster }: TeacherRewardBoardProps) {
    const [theme, setTheme] = useState<RewardConceptId>((initialTheme as RewardConceptId) || 'bitki');
    const [summary, setSummary] = useState<Record<string, SummaryRow>>({});
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [dayOverlayOpen, setDayOverlayOpen] = useState(false);
    const [shuffledIds, setShuffledIds] = useState<string[]>([]);

    useEffect(() => {
        setTheme((initialTheme as RewardConceptId) || 'bitki');
    }, [initialTheme, classId]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('teacher_class_reward_summary', { p_class_id: classId });
            if (error) {
                if (!isMissingFunction(error)) console.error('Ödül panosu yüklenirken hata:', error);
                setUnavailable(isMissingFunction(error));
                return;
            }
            const map: Record<string, SummaryRow> = {};
            (data as SummaryRow[] | null)?.forEach((row) => { map[row.student_id] = row; });
            setSummary(map);
            setUnavailable(false);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classId]);

    const visibleStudents = useMemo(
        () => roster.filter((s) => (!s.status || s.status === 'accepted') && !s.hidden),
        [roster],
    );

    const handleAward = async (studentId: string) => {
        // İyimser güncelleme: RPC dönene kadar da kart tepki versin.
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

    if (unavailable) return null;

    const concept = getRewardConcept(theme);

    return (
        <View style={styles.section}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>🌱 Sınıf Bahçesi</Text>
                <TouchableOpacity style={styles.dayBtn} onPress={openDayOverlay}>
                    <Ionicons name="time-outline" size={15} color="#333" />
                    <Text style={styles.dayBtnText}>Günü kapat</Text>
                </TouchableOpacity>
            </View>

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

            {!!notice && <Text style={styles.noticeText}>{notice}</Text>}

            {visibleStudents.length === 0 ? (
                <Text style={styles.emptyText}>Onaylı öğrenci olduğunda bahçe burada görünecek.</Text>
            ) : (
                <View style={styles.grid}>
                    {visibleStudents.map((s) => {
                        const row = summary[s.id];
                        return (
                            <RewardCard
                                key={s.id}
                                name={s.child_name || '—'}
                                stage={(row?.stage ?? 0) as RewardStage}
                                todayCount={row?.today_count ?? 0}
                                concept={concept}
                                onAward={() => handleAward(s.id)}
                            />
                        );
                    })}
                </View>
            )}

            <Modal visible={dayOverlayOpen} transparent animationType="fade" onRequestClose={() => setDayOverlayOpen(false)}>
                <View style={styles.overlayBg}>
                    <View style={styles.overlayCard}>
                        <Text style={styles.overlayTitle}>Bugün bahçemiz böyle görünüyor</Text>
                        <Text style={styles.overlaySub}>Sınıfın ortak bahçesi — her bitki kendi hızında büyüdü.</Text>
                        <View style={styles.miniGrid}>
                            {shuffledIds.map((id) => {
                                const row = summary[id];
                                const Art = concept.Art;
                                return <Art key={id} stage={(row?.stage ?? 0) as RewardStage} size={44} />;
                            })}
                        </View>
                        <TouchableOpacity style={styles.overlayCloseBtn} onPress={() => setDayOverlayOpen(false)}>
                            <Text style={styles.overlayCloseText}>Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginTop: 8 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 18, fontWeight: '700', color: '#333' },
    dayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
    dayBtnText: { fontSize: 12.5, fontWeight: '700', color: '#333' },
    segmented: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 999, padding: 3, alignSelf: 'flex-start', marginBottom: 12, gap: 2 },
    segBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
    segBtnText: { fontSize: 12.5, fontWeight: '700', color: '#666' },
    segBtnTextActive: { color: '#fff' },
    noticeText: { color: '#C0392B', fontSize: 12.5, marginBottom: 8 },
    emptyText: { color: '#888', fontSize: 13.5, fontStyle: 'italic' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    overlayBg: { flex: 1, backgroundColor: 'rgba(20,42,40,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    overlayCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 480, alignItems: 'center' },
    overlayTitle: { fontSize: 19, fontWeight: '700', color: '#333', marginBottom: 4, textAlign: 'center' },
    overlaySub: { fontSize: 13, color: '#888', marginBottom: 16, textAlign: 'center' },
    miniGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 18 },
    overlayCloseBtn: { backgroundColor: '#4ECDC4', paddingHorizontal: 26, paddingVertical: 11, borderRadius: 999 },
    overlayCloseText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
