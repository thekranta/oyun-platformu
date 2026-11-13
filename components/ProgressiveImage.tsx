import React, { useCallback, useRef, useState } from 'react';
import { Animated, Image, ImageResizeMode, ImageSourcePropType, Platform, StyleProp, View, ViewStyle } from 'react-native';

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
 * Görsel kabı doldurur. StyleSheet.absoluteFill (yalnız top/left/right/bottom) KULLANILMAZ: yerel `require()` görsellerine
 * React Native (ve web'de RN-web) varsayılan olarak kendi piksel boyutunu (ör. 1280×1908) verir; width/height açıkça
 * yazılmazsa top/left ile birlikte right/bottom yok sayılır, görsel DOĞAL boyutta çizilir ve kap yalnızca sol üst köşesini
 * gösterir (Minik Müze sahnesinde tablo "çok yakınlaşmış doku" görünüyordu). Açık width/height yüzdesi bunu geçersiz kılar.
 */
const FILL = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } as const;

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
            {!done && <Image source={placeholder} style={FILL} resizeMode={resizeMode} accessibilityLabel={accessibilityLabel} />}
            <Animated.Image
                source={source}
                style={[FILL, { opacity: fade }]}
                resizeMode={resizeMode}
                onLoad={onLoad}
                accessibilityLabel={accessibilityLabel}
            />
        </View>
    );
}
