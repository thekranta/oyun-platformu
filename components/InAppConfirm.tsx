import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface InAppConfirmState {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    /** true: onay düğmesi kırmızı (silme gibi geri alınamaz işlemler). */
    destructive?: boolean;
    onConfirm: () => void;
}

interface Props {
    state: InAppConfirmState | null;
    onClose: () => void;
}

/**
 * Uygulama içi onay kartı: tarayıcının window.confirm / Alert.alert penceresi yerine (amatör görünür,
 * web'de Alert.alert boş işlemdir). Silme gibi geri alınamaz işlemlerde kullanılır.
 */
export default function InAppConfirm({ state, onClose }: Props) {
    return (
        <Modal visible={!!state} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} accessibilityLabel={state?.cancelLabel} />
                {state && (
                    <View style={styles.card} accessibilityViewIsModal accessibilityRole="alert">
                        <Text style={styles.title}>{state.title}</Text>
                        <Text style={styles.message}>{state.message}</Text>
                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={onClose} accessibilityRole="button">
                                <Text style={styles.cancelText}>{state.cancelLabel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.btn, state.destructive ? styles.destructive : styles.primary]}
                                onPress={() => { const run = state.onConfirm; onClose(); run(); }}
                                accessibilityRole="button"
                            >
                                <Text style={styles.confirmText}>{state.confirmLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
        width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 22, padding: 20,
        ...Platform.select({ web: { boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }, default: { elevation: 8 } }),
    },
    title: { fontSize: 18, fontWeight: '800', color: '#333' },
    message: { fontSize: 14.5, lineHeight: 21, color: '#555', marginTop: 8 },
    row: { flexDirection: 'row', gap: 10, marginTop: 18 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center' },
    cancel: { backgroundColor: '#F1F1F1' },
    cancelText: { fontSize: 15, fontWeight: '700', color: '#555' },
    primary: { backgroundColor: '#4ECDC4' },
    destructive: { backgroundColor: '#FF6B6B' },
    confirmText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
