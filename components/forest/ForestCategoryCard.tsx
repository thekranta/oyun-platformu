import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ImageSourcePropType,
  Platform,
  Animated,
} from 'react-native';
import { ForestCategory } from '../../constants/discoveryForestCategories';
import { asset } from '../../lib/assetMap';

const USE_NATIVE = Platform.OS !== 'web';

// Web'de gercek CSS gradyani, native'de duz (tint'lenmis) renk — uygulamanin geri
// kalaninda zaten kullanilan desenle ayni (bkz. app/(tabs)/index.tsx gradientStyle).
const warmCardBg = (accentColor: string): any =>
  Platform.OS === 'web'
    ? { background: `linear-gradient(160deg, #FFFFFF 0%, ${accentColor}22 65%, ${accentColor}3D 100%)` }
    : { backgroundColor: accentColor + '1F' };

const ICON_MAP: Record<string, ImageSourcePropType> = {
  sayi_agaci: asset('/forest/sayi_agaci.png'),
  harf_cicegi: asset('/forest/harf_cicegi.png'),
  sekil_goleti: asset('/forest/sekil_goleti.png'),
  dikkat_dalgasi: asset('/forest/dikkat_dalgasi.png'),
  ani_kelebegi: asset('/forest/ani_kelebegi.png'),
  duygu_pinari: asset('/forest/duygu_pinari.png'),
  kosu_kirazi: asset('/forest/kosu_kirazi.png'),
  denge_dalgasi: asset('/forest/denge_dalgasi.png'),
  masal_kovugu: asset('/forest/masal_kovugu.png'),
  ritim_kelebegi: asset('/forest/ritim_kelebegi.png'),
  bulmaca_yolu: asset('/forest/bulmaca_yolu.png'),
  arkadas_cicegi: asset('/forest/arkadas_cicegi.png'),
  kesif_kucaklamasi: asset('/forest/kesif_kucaklamasi.png'),
};

// Henuz AI-uretimi kil-3D ikonu olmayan yeni kategoriler icin gecici emoji.
// Gercek gorsel gelince ICON_MAP'e eklenip buradan kaldirilir (bkz. ilerideki not).
const EMOJI_FALLBACK: Record<string, string> = {
  renk_cayiri: '🎨',
  can_elmasi: '🍎',
};

interface ForestCategoryCardProps {
  category: ForestCategory;
  onPress?: (category: ForestCategory) => void;
  size?: number;
  /** Bu kategorideki oyun sayısı — verilirse ikonun altında rozet olarak gösterilir. */
  gameCount?: number;
  /** Giriş animasyonu gecikmesi (ms) — grid'de sırayla "pop" etsinler diye. */
  delay?: number;
}

const AREA_TAG_COLOR: Record<string, string> = {
  'Bilişsel Alan': '#E3F2FD',
  'Sosyo-Duygusal Alan': '#FCE4EC',
  'Fiziksel Alan': '#E8F5E9',
  'Fiziksel & Bilişsel Alan': '#FFF8E1',
  'Fiziksel & Sosyo-Duygusal Alan': '#F3E5F5',
};

const AREA_TAG_TEXT_COLOR: Record<string, string> = {
  'Bilişsel Alan': '#1565C0',
  'Sosyo-Duygusal Alan': '#AD1457',
  'Fiziksel Alan': '#2E7D32',
  'Fiziksel & Bilişsel Alan': '#F57F17',
  'Fiziksel & Sosyo-Duygusal Alan': '#6A1B9A',
};

export const ForestCategoryCard: React.FC<ForestCategoryCardProps> = ({
  category,
  onPress,
  size,
  gameCount,
  delay = 0,
}) => {
  const iconSource = ICON_MAP[category.iconPath];
  const emojiFallback = EMOJI_FALLBACK[category.iconPath];

  // Girişte "pop" animasyonu — uygulamanın geri kalanındaki BouncyCard ile aynı yay değerleri.
  const anim = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 70, delay, useNativeDriver: USE_NATIVE }).start();
  }, [anim, delay]);
  const scale = Animated.multiply(anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), press);

  const cardStyle = [
    styles.card,
    warmCardBg(category.accentColor),
    { borderColor: category.accentColor + 'AA', shadowColor: category.accentColor },
    size ? { width: size } : undefined,
  ];

  // Kart boyutu buyudukce ikon alani da orantili buyusun (100px -> ~78px ikon plakasi).
  const iconPlate = size ? Math.round(size * 0.62) : 90;
  const glowSize = Math.round(iconPlate * 1.18);

  const glowStyle = [styles.glow, { width: glowSize, height: glowSize, borderRadius: glowSize / 2, backgroundColor: category.accentColor + '4D' }];

  const iconBgStyle = [
    styles.iconBg,
    { width: iconPlate, height: iconPlate, borderRadius: Math.round(iconPlate * 0.27), backgroundColor: '#FFFFFF', borderColor: category.accentColor + '55' },
  ];

  const tagBg = AREA_TAG_COLOR[category.maarifArea] ?? '#F5F5F5';
  const tagText = AREA_TAG_TEXT_COLOR[category.maarifArea] ?? '#333';

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale }] }}>
      <TouchableOpacity
        style={cardStyle}
        onPress={() => onPress?.(category)}
        onPressIn={() => Animated.spring(press, { toValue: 0.93, useNativeDriver: USE_NATIVE }).start()}
        onPressOut={() => Animated.spring(press, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start()}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={category.forestName}
      >
        <View style={styles.iconWrap}>
          <View style={glowStyle} pointerEvents="none" />
          <View style={iconBgStyle}>
            {iconSource ? (
              <Image
                source={iconSource}
                style={styles.icon}
                resizeMode="contain"
                accessibilityLabel={category.forestName + ' ikonu'}
              />
            ) : (
              <Text style={[styles.emojiIcon, { fontSize: Math.round(iconPlate * 0.46) }]} accessibilityLabel={category.forestName + ' ikonu'}>
                {emojiFallback ?? '🌟'}
              </Text>
            )}
          </View>
          {gameCount != null && (
            <View style={[styles.countPill, { backgroundColor: category.accentColor }]}>
              <Text style={styles.countPillText}>{gameCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.textArea}>
          <Text style={styles.forestName} numberOfLines={1}>
            {category.forestName}
          </Text>
          <View style={[styles.areaTag, { backgroundColor: tagBg }]}>
            <Text style={[styles.areaTagText, { color: tagText }]} numberOfLines={1}>
              {category.maarifArea}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    borderWidth: 2.5,
    margin: 6,
    flex: 1,
    minWidth: 100,
    maxWidth: 200,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 7,
      },
    }),
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 6,
  },
  glow: {
    position: 'absolute',
  },
  iconBg: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  icon: {
    width: '78%',
    height: '78%',
  },
  emojiIcon: {
    fontSize: 40,
  },
  countPill: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
  },
  textArea: {
    paddingHorizontal: 10,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 6,
  },
  forestName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3142',
    textAlign: 'center',
    lineHeight: 18,
  },
  areaTag: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  areaTagText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});