import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { getMaarif } from '../constants/maarifMap';
import { supabase } from '../lib/supabase';

// ============================================
// 🎨 ÖĞRETMEN: ÖĞRENCİNİN ÇİZİMLERİ
// Yalnız OKUNABİLİR (onaylı, tek çocuklu) kayıtta sunucu çizim listesi döndürür (teacher_student_drawings);
// görüntüler özel 'cizimler' kovasından 1 saatlik imzalı URL ile gelir (öğretmen okuma politikası:
// supabase_migrations/add_teacher_drawings.sql). Sunucu fonksiyonu/politikası henüz yoksa bileşen
// sessizce hiçbir şey göstermez. Kurum yöneticisi bu bileşeni görmez (çizim paneline hiç girmez).
// ============================================

interface Props {
    studentId: string;
    studentName: string;
    demo?: boolean;
}

interface DrawingItem {
    scoreId: number;
    createdAt: string;
    oyunTuru: string;
    url: string;
}

// Demo (satış gösterisi): basit SVG çizimler — yalnız web'de gösterilir (native Image SVG data URI çözmez).
const demoSvg = (inner: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="#fffef9"/>${inner}</svg>`;
    // base64: RN-web Image yüklemesi için en güvenilir veri adresi biçimi (yalnız web'de çağrılır).
    return `data:image/svg+xml;base64,${typeof btoa === 'function' ? btoa(svg) : ''}`;
};
const DEMO_ITEMS: DrawingItem[] = [
    { scoreId: -1, createdAt: new Date(Date.now() - 86400000).toISOString(), oyunTuru: 'yaratici-cizim', url: demoSvg('<circle cx="160" cy="150" r="70" fill="#ffd166"/><circle cx="135" cy="135" r="9" fill="#333"/><circle cx="185" cy="135" r="9" fill="#333"/><path d="M125 170 Q160 205 195 170" stroke="#ef476f" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M160 80 L160 40 M100 100 L70 70 M220 100 L250 70" stroke="#f78c6b" stroke-width="8" stroke-linecap="round"/>') },
    { scoreId: -2, createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), oyunTuru: 'adim-adim', url: demoSvg('<circle cx="160" cy="215" r="62" fill="#fff" stroke="#118ab2" stroke-width="8"/><circle cx="160" cy="135" r="46" fill="#fff" stroke="#118ab2" stroke-width="8"/><circle cx="160" cy="75" r="30" fill="#fff" stroke="#118ab2" stroke-width="8"/><circle cx="150" cy="70" r="5" fill="#333"/><circle cx="170" cy="70" r="5" fill="#333"/><path d="M160 80 L184 86 L160 92 Z" fill="#f78c6b"/>') },
];

export default function TeacherDrawings({ studentId, studentName, demo }: Props) {
    const { t } = useTranslation();
    const [items, setItems] = useState<DrawingItem[] | null>(null);
    const [open, setOpen] = useState<DrawingItem | null>(null);
    // Cizim tuvali ekran oranindadir (genelde genis): buyuk gorunum cizimin gercek oranini kullanir, kirpma/bosluk olmasin.
    const [bigAspect, setBigAspect] = useState(1);
    const { height: winH } = useWindowDimensions();

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setBigAspect(1);
        Image.getSize(open.url, (w, h) => { if (!cancelled && w > 0 && h > 0) setBigAspect(w / h); }, () => { });
        return () => { cancelled = true; };
    }, [open]);

    useEffect(() => {
        let cancelled = false;
        setItems(null);
        setOpen(null);
        (async () => {
            if (demo) {
                if (!cancelled) setItems(Platform.OS === 'web' ? DEMO_ITEMS : []);
                return;
            }
            try {
                const { data, error } = await supabase.rpc('teacher_student_drawings', { p_student_id: studentId, p_limit: 12 });
                if (error || !Array.isArray(data) || data.length === 0) { if (!cancelled) setItems([]); return; }
                const rows = data as { score_id: number; created_at: string; oyun_turu: string; image_path: string }[];
                const signed = await supabase.storage.from('cizimler').createSignedUrls(rows.map((r) => r.image_path), 3600);
                const urlByPath = new Map<string, string>();
                for (const s of signed.data ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
                const out: DrawingItem[] = [];
                for (const r of rows) {
                    const url = urlByPath.get(r.image_path);
                    if (url) out.push({ scoreId: Number(r.score_id), createdAt: r.created_at, oyunTuru: r.oyun_turu, url });
                }
                if (!cancelled) setItems(out);
            } catch {
                if (!cancelled) setItems([]);
            }
        })();
        return () => { cancelled = true; };
    }, [studentId, demo]);

    if (items === null) {
        return <View style={styles.loading}><ActivityIndicator size="small" color="#FF6B6B" /></View>;
    }
    if (items.length === 0) return null;

    const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR');

    return (
        <View style={styles.wrap}>
            <Text style={styles.title}>{t('teacher.drawingsTitle')}</Text>
            <Text style={styles.hint}>{t('teacher.drawingsHint', { name: studentName })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {items.map((it) => (
                    <TouchableOpacity
                        key={`${it.scoreId}-${it.url.slice(-12)}`}
                        style={styles.thumbWrap}
                        onPress={() => setOpen(it)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel={t('teacher.drawingOpen', { game: getMaarif(it.oyunTuru).displayName, date: dateText(it.createdAt) })}
                    >
                        <Image source={{ uri: it.url }} style={styles.thumb} resizeMode="contain" />
                        <Text style={styles.thumbCaption} numberOfLines={1}>{dateText(it.createdAt)}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Modal visible={!!open} transparent animationType="fade" onRequestClose={() => setOpen(null)}>
                <View style={styles.backdrop}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setOpen(null)} accessibilityLabel={t('teacher.drawingClose')} />
                    {open && (
                        <View style={styles.sheet}>
                            <Image source={{ uri: open.url }} style={[styles.big, { aspectRatio: bigAspect, maxHeight: Math.max(220, winH * 0.7) }]} resizeMode="contain" />
                            <Text style={styles.bigCaption}>{getMaarif(open.oyunTuru).displayName} · {dateText(open.createdAt)}</Text>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(null)} accessibilityRole="button" accessibilityLabel={t('teacher.drawingClose')}>
                                <Ionicons name="close" size={22} color="#333" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    loading: { paddingVertical: 10, alignItems: 'flex-start' },
    wrap: { marginBottom: 14 },
    title: { fontSize: 16, fontWeight: '800', color: '#333' },
    hint: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 10 },
    row: { gap: 12, paddingRight: 8 },
    thumbWrap: { width: 124 },
    thumb: { width: 124, height: 124, borderRadius: 16, backgroundColor: '#FFF8E7', borderWidth: 2, borderColor: '#FFE5E5' },
    thumbCaption: { fontSize: 12, color: '#777', marginTop: 5, textAlign: 'center', fontWeight: '600' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    sheet: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 22, padding: 14, alignItems: 'center' },
    big: { width: '100%', borderRadius: 14, backgroundColor: '#FFFEF9' },
    bigCaption: { fontSize: 14, fontWeight: '700', color: '#555', marginTop: 10 },
    closeBtn: { position: 'absolute', top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F1F1', alignItems: 'center', justifyContent: 'center' },
});
