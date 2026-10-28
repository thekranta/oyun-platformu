import React, { useCallback, useRef, useState } from 'react';
import { Animated, Image, ImageResizeMode, ImageSourcePropType, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface Props {
    /** Küçük önizleme: anında görünür (ör. galeride zaten inmiş). */
    placeholder: ImageSourcePropType;
    /** Asıl (büyük) görsel: inince önizlemenin üstüne yumuşakça biner. */
    source: ImageSourcePropType;
    style?: StyleProp<ViewStyle>;
    resizeMode?: ImageResizeMode;
    accessibilityLabel?: string;
}

const USE_NATIVE = Platform.OS !== 'web';

/**
 * Önce küçük önizleme, asıl görsel inince onun üstüne geçiş: yavaş bağlantıda boş çerçeve yerine görsel hemen görünür
 * (Minik Müze sahnesi: tam boy tablo 0,3-1,7 MB). Asıl görsel yüklenemezse önizleme kalır (boş çerçeveden iyidir).
 * Görsel değişecekse bileşene `key` verin (durum sıfırlansın).
 */
export default function ProgressiveImage({ placeholder, source, style, resizeMode = 'cover', accessibilityLabel }: Props) {
    const fade = useRef(new Animated.Value(0)).current;
    const [done, setDone] = useState(false);

    const onLoad = useCallback(() => {
        Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: USE_NATIVE }).start(() => setDone(true));
    }, [fade]);

    return (
        <View style={style}>
            {!done && <Image source={placeholder} style={StyleSheet.absoluteFill} resizeMode={resizeMode} accessibilityLabel={accessibilityLabel} />}
            <Animated.Image
                source={source}
                style={[StyleSheet.absoluteFill, { opacity: fade }]}
                resizeMode={resizeMode}
                onLoad={onLoad}
                accessibilityLabel={accessibilityLabel}
            />
        </View>
    );
}
