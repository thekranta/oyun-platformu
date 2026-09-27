// Tüm oyunlarda standart çıkış/geri butonu — koyu dolgulu daire, yalnız ikon (yazı yok, okul
// öncesi çocuk henüz okumuyor). Önceden ~120 oyun kendi butonunu ayrı ayrı çiziyordu
// (konum/ikon/renk hepsi farklıydı — bkz. memory: Oyun_Test_Listesi.docx geri bildirimi).
//
// KASITLI OLARAK konum/safe-area YÖNETMEZ: her oyun kendi başlık satırına (flex row) ya da
// kendi absolute-konumlu sarmalayıcısına bu butonu KOYAR — yalnız butonun GÖRÜNÜMÜNÜ (ikon/renk/
// boyut) tek kaynağa taşır. Bunun nedeni: 120 dosyanın layout'unu (flex satır / absolute /
// safe-area) TEK bir geçişte yeniden yapılandırmak riskli olurdu; görsel tutarlılık (asıl
// şikayet) ile layout değişikliği (ayrı, daha riskli bir iş) birbirinden ayrıldı.
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GameExitButtonProps {
    onPress: () => void;
    /** Erişilebilirlik etiketi — varsayılan "Oyundan çık", gerekirse özelleştirilebilir
     * (ör. Yapboz'da seçim ekranına dönerken "Seçim ekranına dön"). */
    accessibilityLabel?: string;
    /** Çap (px) — varsayılan 44 (standart dokunma hedefi). Nadiren, bir oyunun mevcut
     * başlık satırına göre küçültmek gerekirse kullanılır. */
    size?: number;
    /** Konumlama için: bazı oyunlarda buton kendi başına absolute konumlanıyor (flex satırının
     * içinde değil) — bu durumda top/left gibi stiller buradan verilir. Standart: sol üst. */
    style?: StyleProp<ViewStyle>;
}

export default function GameExitButton({ onPress, accessibilityLabel = 'Oyundan çık', size = 44, style }: GameExitButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }, style]}
        >
            <Ionicons name="arrow-back" size={Math.round(size * 0.5)} color="#fff" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        backgroundColor: '#232838',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
});
