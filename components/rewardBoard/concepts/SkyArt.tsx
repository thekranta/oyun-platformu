// "Gökyüzü" konsepti: aynı 4 eşik (0/1-2/3-5/6+), bitki yerine bulut→güneş→gökkuşağı
// sahnesi. Aynı viewBox (120x170), aynı prop sözleşmesi (RewardConceptArtProps) — yalnız
// sahne sanatı ve idle hareket (sallanma yerine süzülme) farklı. Maskot BURADA kullanılmaz
// (bkz. tasarım notu: maskot yalnız gün-sonu ekranında tek kopya cameo yapar, her çocuğun
// büyüyen nesnesi olmamalı — renk çakışması + kıyaslama riski).
import React, { useEffect } from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
    Easing,
    SharedValue,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import type { RewardConceptArtProps, RewardStage } from '../types';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// NOT: cloud saf beyaz (#FFFFFF) DEĞİLDİR — kart arka planı da beyaz olduğundan saf beyaz
// bulut görünmez oluyordu (bkz. kullanıcı ekran görüntüsü: güneş+gökkuşağı arasında bulutun
// olması gereken yerde boşluk). Hafif mavimsi ton + kontur her arka planda (beyaz kart, mavi
// gökyüzü degrade) okunur kalmasını sağlar.
const COLORS = {
    cloud: '#EAF6FE',
    cloudOutline: '#BFE0F2',
    cloudShade: '#CFE3EE',
    sun: '#FFC857',
    rainbow: ['#FF6F6F', '#FFC857', '#6BCB77', '#4D96FF', '#B388EB'],
    stardust: '#FFC857',
};

const PIVOT = 'translate(60 132)';
const UNPIVOT = 'translate(-60 -132)';

function useStageGroupProps(stage: RewardStage, index: RewardStage) {
    const opacity = useSharedValue(stage === index ? 1 : 0);
    const scale = useSharedValue(stage === index ? 1 : 0.45);
    useEffect(() => {
        const active = stage === index;
        opacity.value = withTiming(active ? 1 : 0, { duration: active ? 320 : 220 });
        scale.value = active
            ? withSpring(1, { damping: 9, stiffness: 140, mass: 0.6 })
            : withTiming(0.45, { duration: 220 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);
    return useAnimatedProps(() => ({
        opacity: opacity.value,
        transform: `${PIVOT} scale(${scale.value}) ${UNPIVOT}`,
    }));
}

const SPARK_COUNT = 10;
const SPARKS = Array.from({ length: SPARK_COUNT }, (_, i) => ({
    angle: (Math.PI * 2 * i) / SPARK_COUNT,
    dist: 28 + (i % 3) * 8,
    color: i % 2 === 0 ? COLORS.sun : COLORS.cloud,
}));

function Spark({ progress, angle, dist, color }: { progress: SharedValue<number>; angle: number; dist: number; color: string }) {
    const animatedProps = useAnimatedProps(() => {
        const p = progress.value;
        return {
            cx: 60 + Math.cos(angle) * dist * p,
            cy: 70 + Math.sin(angle) * dist * p - 10 * p,
            opacity: 1 - p,
        };
    });
    return <AnimatedCircle animatedProps={animatedProps} r={3.2} fill={color} />;
}

// 4 uçlu küçük parıltı şekli — merkez (0,0) etrafında, hem gün-sonu dekorunda hem de
// yükselen "yıldız tozu" mikro-etkileşiminde kullanılır.
const SPARKLE_D = 'M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z';

function RainbowArcs({ opacity }: { opacity: number }) {
    const cx = 60;
    const cy = 150;
    const radii = [46, 40, 34, 28, 22];
    return (
        <G opacity={opacity}>
            {radii.map((r, i) => (
                <Path
                    key={r}
                    d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
                    stroke={COLORS.rainbow[i]}
                    strokeWidth={6}
                    fill="none"
                    strokeLinecap="round"
                />
            ))}
        </G>
    );
}

export default function SkyArt({ stage, size, awardPulse = 0, celebrate = 0 }: RewardConceptArtProps) {
    // Sürekli idle hareket: bulutlar bitkinin aksine kendiliğinden süzülür — dönme değil öteleme.
    const driftT = useSharedValue(0);
    useEffect(() => {
        driftT.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
                withTiming(-1, { duration: 2750, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
        );
    }, [driftT]);
    const driftProps = useAnimatedProps(() => ({
        transform: `translate(${driftT.value * 6} ${driftT.value * -4})`,
    }));

    // Işınlar için çok hafif, sakin bir parıldama (twinkle değil, yavaş nabız).
    const rayPulse = useSharedValue(1);
    useEffect(() => {
        rayPulse.value = withRepeat(
            withSequence(
                withTiming(0.85, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
        );
    }, [rayPulse]);
    const rayProps = useAnimatedProps(() => ({ opacity: rayPulse.value }));

    const stage0 = useStageGroupProps(stage, 0);
    const stage1 = useStageGroupProps(stage, 1);
    const stage2 = useStageGroupProps(stage, 2);
    const stage3 = useStageGroupProps(stage, 3);

    // Ödül verildi mikro-etkileşimi: damla yerine yıldız tozu — YÜKSELİR (düşmez).
    const dustProgress = useSharedValue(1);
    useEffect(() => {
        if (awardPulse > 0) {
            dustProgress.value = 0;
            dustProgress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awardPulse]);
    const dustAnimatedProps = useAnimatedProps(() => {
        const p = dustProgress.value;
        const opacity = p < 0.2 ? p / 0.2 : p > 0.85 ? (1 - p) / 0.15 : 1;
        return { transform: `translate(60 ${124 - p * 74}) scale(${0.7 + p * 0.4})`, opacity };
    });

    const burst = useSharedValue(1);
    useEffect(() => {
        if (celebrate > 0) {
            burst.value = 0;
            burst.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [celebrate]);

    return (
        <Svg width={size} height={(size * 170) / 120} viewBox="0 0 120 170">
            {/* Aşama 0: Açık Gökyüzü — yalnız soluk bir ufuk çizgisi */}
            <AnimatedG animatedProps={stage0}>
                <Path d="M40 115 Q60 108 80 115" stroke={COLORS.cloudShade} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
            </AnimatedG>

            {/* Aşama 1: İlk Bulut — küçük, tek gövdeli */}
            <AnimatedG animatedProps={stage1}>
                <AnimatedG animatedProps={driftProps}>
                    <Ellipse cx={60} cy={110} rx={22} ry={5} fill={COLORS.cloudShade} opacity={0.5} />
                    <Ellipse cx={44} cy={104} rx={11} ry={9} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={76} cy={103} rx={12} ry={10} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={60} cy={100} rx={20} ry={13} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                </AnimatedG>
            </AnimatedG>

            {/* Aşama 2: Güneşli Bulut — güneş kısmen bulutun ARKASINDA */}
            <AnimatedG animatedProps={stage2}>
                <AnimatedPath animatedProps={rayProps} d="M82 50 L82 42 M96 56 L102 51 M100 72 L107 72" stroke={COLORS.sun} strokeWidth={3} strokeLinecap="round" />
                <Circle cx={82} cy={68} r={15} fill={COLORS.sun} />
                <AnimatedG animatedProps={driftProps}>
                    <Ellipse cx={55} cy={92} rx={23} ry={6} fill={COLORS.cloudShade} opacity={0.5} />
                    <Ellipse cx={58} cy={68} rx={15} ry={12} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={36} cy={87} rx={13} ry={10} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={76} cy={85} rx={14} ry={11} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={55} cy={82} rx={26} ry={16} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                </AnimatedG>
            </AnimatedG>

            {/* Aşama 3: Gökkuşağı Anı — güneş TAM görünür, gökkuşağı + bulut en dolgun */}
            <AnimatedG animatedProps={stage3}>
                <RainbowArcs opacity={1} />
                <AnimatedPath
                    animatedProps={rayProps}
                    d="M88 40 L88 30 M104 46 L112 40 M116 60 L126 60 M104 74 L112 80 M72 46 L64 40 M72 74 L64 80"
                    stroke={COLORS.sun}
                    strokeWidth={3.4}
                    strokeLinecap="round"
                />
                <Circle cx={88} cy={60} r={18} fill={COLORS.sun} />
                <Path d={SPARKLE_D} fill={COLORS.cloudOutline} transform="translate(18 96) scale(0.9)" />
                <Path d={SPARKLE_D} fill={COLORS.sun} transform="translate(100 100) scale(0.7)" />
                <AnimatedG animatedProps={driftProps}>
                    <Ellipse cx={55} cy={82} rx={26} ry={7} fill={COLORS.cloudShade} opacity={0.5} />
                    <Ellipse cx={58} cy={56} rx={17} ry={13} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={32} cy={78} rx={15} ry={11} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={80} cy={75} rx={16} ry={12} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                    <Ellipse cx={55} cy={72} rx={30} ry={18} fill={COLORS.cloud} stroke={COLORS.cloudOutline} strokeWidth={1.5} />
                </AnimatedG>
            </AnimatedG>

            <AnimatedPath animatedProps={dustAnimatedProps} d={SPARKLE_D} fill={COLORS.stardust} />

            {SPARKS.map((s, i) => (
                <Spark key={i} progress={burst} angle={s.angle} dist={s.dist} color={s.color} />
            ))}
        </Svg>
    );
}
