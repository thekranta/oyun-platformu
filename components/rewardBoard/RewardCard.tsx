import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RewardConcept, RewardStage } from './types';
import { pipsForStage } from './stageMath';

interface RewardCardProps {
    name: string;
    stage: RewardStage;
    todayCount: number;
    concept: RewardConcept;
    onAward: () => Promise<void> | void;
    /** Bahçe sanatının piksel genişliği — Sınıf Bahçesi tam ekranında büyük, önizlemede küçük. */
    artSize?: number;
    /** Sunum modu: buton/pip/sayaç gizlenir, yalnız isim + büyümüş bahçe kalır (akıllı tahta için). */
    presentation?: boolean;
}

// Konsept ne olursa olsun SABİT kalan UI-chrome rengi (buton/odak halkası) — öğretmen
// günden güne konsept değiştirdiğinde "hangi buton neyi yapıyor" yeniden öğrenilmesin.
const AWARD_COLOR = '#4ECDC4';

export default function RewardCard({ name, stage, todayCount, concept, onAward, artSize = 110, presentation = false }: RewardCardProps) {
    const [awardPulse, setAwardPulse] = useState(0);
    const [celebrate, setCelebrate] = useState(0);
    const [busy, setBusy] = useState(false);
    const prevStage = useRef(stage);

    useEffect(() => {
        if (stage !== prevStage.current) {
            if (stage > prevStage.current) setCelebrate((c) => c + 1);
            prevStage.current = stage;
        }
    }, [stage]);

    const handlePress = async () => {
        if (busy) return;
        setBusy(true);
        setAwardPulse((p) => p + 1);
        try {
            await onAward();
        } finally {
            setBusy(false);
        }
    };

    const pips = pipsForStage(todayCount, stage);
    const Art = concept.Art;

    return (
        <View style={[styles.card, { borderColor: `${concept.accentColor}33` }, presentation && styles.cardPresentation]}>
            <Text style={[styles.name, presentation && styles.namePresentation]} numberOfLines={1}>{name}</Text>
            <Text style={[styles.stageLabel, presentation && styles.stageLabelPresentation, { color: concept.accentColor }]}>{concept.stageLabels[stage]}</Text>
            <View style={{ width: artSize, height: (artSize * 170) / 120, alignItems: 'center', justifyContent: 'center' }}>
                <Art stage={stage} size={artSize} awardPulse={awardPulse} celebrate={celebrate} />
            </View>
            {!presentation && (
                <>
                    <View style={styles.pips}>
                        {[0, 1, 2].map((i) => (
                            <View key={i} style={[styles.pip, i < pips && { backgroundColor: AWARD_COLOR }]} />
                        ))}
                    </View>
                    <TouchableOpacity style={styles.awardBtn} onPress={handlePress} disabled={busy} accessibilityRole="button" accessibilityLabel={`${name} için ödül ver`}>
                        {busy ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="water" size={14} color="#fff" />
                                <Text style={styles.awardBtnText}>Ödül ver</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.countLine}>Bugün: {todayCount}</Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: 150, backgroundColor: '#fff', borderRadius: 20, borderWidth: 2,
        alignItems: 'center', padding: 12, gap: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    cardPresentation: {
        width: 'auto', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 0,
        shadowOpacity: 0, elevation: 0, paddingVertical: 10,
    },
    name: { fontSize: 14.5, fontWeight: '700', color: '#333' },
    namePresentation: { fontSize: 18 },
    stageLabel: { fontSize: 11.5, fontWeight: '700' },
    stageLabelPresentation: { fontSize: 13.5 },
    pips: { flexDirection: 'row', gap: 4 },
    pip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E5E5' },
    awardBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AWARD_COLOR,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 2, minWidth: 96, justifyContent: 'center',
    },
    awardBtnText: { color: '#fff', fontWeight: '800', fontSize: 12.5 },
    countLine: { fontSize: 11, color: '#888' },
});
