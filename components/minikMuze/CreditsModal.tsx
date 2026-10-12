import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PAINTINGS, Painting } from '../../constants/minikMuze';
import { CREDITS_INTRO, commonsPageUrl } from '../../lib/minikMuzeCredits';

// Minik Müze künye / kaynak ekranı: her tablonun ressamı, tarihi, müzesi, kaynağı ve lisansı (kamu malı).
// Mağaza telif beyanı ve veli şeffaflığı için. `only` verilirse yalnız o tablonun künyesi gösterilir.

interface Props {
    visible: boolean;
    onClose: () => void;
    only?: Painting | null;
}

export default function CreditsModal({ visible, onClose, only }: Props) {
    const list = only ? [only] : PAINTINGS;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.backdrop}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel="Künyeyi kapat" />
                <View style={styles.card} accessibilityViewIsModal>
                    <View style={styles.head}>
                        <Text style={styles.title}>{only ? 'Tablo künyesi' : 'Künye ve kaynaklar'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Kapat">
                            <Ionicons name="close" size={22} color="#F4E7CF" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
                        <Text style={styles.intro}>{CREDITS_INTRO}</Text>
                        {list.map((p) => (
                            <View key={p.id} style={[styles.item, { borderLeftColor: p.accent }]}>
                                <Text style={styles.itemTitle}>{p.title}</Text>
                                <Text style={styles.itemMeta}>{p.artist} · {p.yearLabel}</Text>
                                <Text style={styles.itemMeta}>{p.credit.museum}</Text>
                                <Text style={styles.itemMeta}>{p.credit.source} · {p.credit.license}</Text>
                                <TouchableOpacity
                                    onPress={() => { Linking.openURL(commonsPageUrl(p.credit.commonsFile)).catch(() => { }); }}
                                    accessibilityRole="link"
                                    accessibilityLabel={p.title + ' kaynak sayfasını aç'}
                                >
                                    <Text style={styles.link}>Kaynak sayfasını aç</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    card: { width: '100%', maxWidth: 520, maxHeight: '86%', backgroundColor: '#2B2119', borderRadius: 20, borderWidth: 2, borderColor: '#6B5538', padding: 16 },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    title: { fontSize: 19, fontWeight: '900', color: '#F4E7CF' },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3C2F23', alignItems: 'center', justifyContent: 'center' },
    scroll: { flexGrow: 0 },
    intro: { fontSize: 13, lineHeight: 19, color: '#CDB892', marginBottom: 12, fontWeight: '600' },
    item: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 14 },
    itemTitle: { fontSize: 16, fontWeight: '900', color: '#F4E7CF' },
    itemMeta: { fontSize: 12.5, color: '#CDB892', marginTop: 1, fontWeight: '600' },
    link: { fontSize: 13, color: '#FFD27A', fontWeight: '800', marginTop: 4, textDecorationLine: 'underline' },
});
