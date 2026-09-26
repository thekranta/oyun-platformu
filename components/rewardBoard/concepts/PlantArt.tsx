// "Bitki" konseptinin illüstrasyonu: scratchpad/sinif-bahcesi-prototip.html'deki onaylı
// SVG/CSS prototipin react-native-svg + react-native-reanimated worklet karşılığı.
// Yalnız çizim — buton/metin İÇERMEZ (bkz. RewardConceptArtProps).
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

const COLORS = {
    pot: '#d98a52',
    potEdge: '#b96d3a',
    potRim: '#e7a06b',
    soil: '#6b4a34',
    soilDark: '#4f3626',
    stem: '#3f8f4f',
    leaf1: '#7bc47f',
    leaf2: '#4a9a56',
    bloom: '#ff8fab',
    bloomLight: '#ffb6c9',
    sun: '#ffc857',
    droplet: '#6fc6ff',
};

// Pivot (60,132): saksının üst kenarı — büyüme/sallanma bu noktadan yükselir.
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
    color: i % 2 === 0 ? COLORS.sun : COLORS.bloomLight,
}));

function Spark({ progress, angle, dist, color }: { progress: SharedValue<number>; angle: number; dist: number; color: string }) {
    const animatedProps = useAnimatedProps(() => {
        const p = progress.value;
        return {
            cx: 60 + Math.cos(angle) * dist * p,
            cy: 30 + Math.sin(angle) * dist * p - 10 * p,
            opacity: 1 - p,
        };
    });
    return <AnimatedCircle animatedProps={animatedProps} r={3.2} fill={color} />;
}

export default function PlantArt({ stage, size, awardPulse = 0, celebrate = 0 }: RewardConceptArtProps) {
    // Sürekli "rüzgar sallanması": bitkiler balık gibi kendiliğinden hareket etmediği
    // için cansız durmasın diye ŞART (bkz. sinif-odul-panosu-arastirma memory notu).
    const sway = useSharedValue(0);
    useEffect(() => {
        sway.value = withRepeat(
            withSequence(
                withTiming(1.6, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
                withTiming(-1.6, { duration: 2300, easing: Easing.inOut(Easing.sin) }),
            ),
            -1,
            true,
        );
    }, [sway]);
    const swayProps = useAnimatedProps(() => ({
        transform: `${PIVOT} rotate(${sway.value}) ${UNPIVOT}`,
    }));

    const stage0 = useStageGroupProps(stage, 0);
    const stage1 = useStageGroupProps(stage, 1);
    const stage2 = useStageGroupProps(stage, 2);
    const stage3 = useStageGroupProps(stage, 3);

    // Ödül verildi mikro-etkileşimi: bir damla üstten sulamaya iner.
    const dropProgress = useSharedValue(1);
    useEffect(() => {
        if (awardPulse > 0) {
            dropProgress.value = 0;
            dropProgress.value = withTiming(1, { duration: 620, easing: Easing.in(Easing.quad) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awardPulse]);
    const dropAnimatedProps = useAnimatedProps(() => {
        const p = dropProgress.value;
        const opacity = p < 0.2 ? p / 0.2 : p > 0.85 ? (1 - p) / 0.15 : 1;
        return { transform: `translate(60 ${50 + p * 74})`, opacity };
    });

    // Aşama atladığında kıvılcım patlaması.
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
            <AnimatedG animatedProps={swayProps}>
                <Path d="M30 132 L90 132 L82 166 Q60 172 38 166 Z" fill={COLORS.pot} stroke={COLORS.potEdge} strokeWidth={3} strokeLinejoin="round" />
                <Ellipse cx={60} cy={132} rx={30} ry={7} fill={COLORS.potRim} />
                <Ellipse cx={60} cy={130} rx={25} ry={5} fill={COLORS.soil} />

                <AnimatedG animatedProps={stage0}>
                    <Ellipse cx={60} cy={127} rx={10} ry={4} fill={COLORS.soilDark} />
                    <Path d="M60 127 Q58 120 62 116" stroke={COLORS.stem} strokeWidth={4} fill="none" strokeLinecap="round" />
                </AnimatedG>

                <AnimatedG animatedProps={stage1}>
                    <Path d="M60 130 Q56 112 60 96" stroke={COLORS.stem} strokeWidth={5} fill="none" strokeLinecap="round" />
                    <Ellipse cx={50} cy={101} rx={12} ry={7} fill={COLORS.leaf1} transform="rotate(-24 50 101)" />
                    <Ellipse cx={70} cy={98} rx={12} ry={7} fill={COLORS.leaf2} transform="rotate(24 70 98)" />
                </AnimatedG>

                <AnimatedG animatedProps={stage2}>
                    <Path d="M60 130 Q52 90 60 50" stroke={COLORS.stem} strokeWidth={6} fill="none" strokeLinecap="round" />
                    <Ellipse cx={42} cy={101} rx={16} ry={9} fill={COLORS.leaf1} transform="rotate(-25 42 101)" />
                    <Ellipse cx={78} cy={97} rx={16} ry={9} fill={COLORS.leaf2} transform="rotate(25 78 97)" />
                    <Ellipse cx={46} cy={67} rx={14} ry={8} fill={COLORS.leaf2} transform="rotate(-16 46 67)" />
                    <Ellipse cx={74} cy={63} rx={14} ry={8} fill={COLORS.leaf1} transform="rotate(16 74 63)" />
                </AnimatedG>

                <AnimatedG animatedProps={stage3}>
                    <Path d="M60 130 Q50 90 60 30" stroke={COLORS.stem} strokeWidth={6} fill="none" strokeLinecap="round" />
                    <Ellipse cx={40} cy={101} rx={16} ry={9} fill={COLORS.leaf1} transform="rotate(-25 40 101)" />
                    <Ellipse cx={80} cy={97} rx={16} ry={9} fill={COLORS.leaf2} transform="rotate(25 80 97)" />
                    <Ellipse cx={44} cy={67} rx={14} ry={8} fill={COLORS.leaf2} transform="rotate(-16 44 67)" />
                    <Ellipse cx={76} cy={63} rx={14} ry={8} fill={COLORS.leaf1} transform="rotate(16 76 63)" />
                    <Ellipse cx={60} cy={12} rx={8} ry={11} fill={COLORS.bloom} />
                    <Ellipse cx={60} cy={40} rx={8} ry={11} fill={COLORS.bloom} />
                    <Ellipse cx={46} cy={26} rx={11} ry={8} fill={COLORS.bloom} />
                    <Ellipse cx={74} cy={26} rx={11} ry={8} fill={COLORS.bloom} />
                    <Ellipse cx={50} cy={16} rx={9} ry={7} fill={COLORS.bloomLight} transform="rotate(-30 50 16)" />
                    <Ellipse cx={70} cy={16} rx={9} ry={7} fill={COLORS.bloomLight} transform="rotate(30 70 16)" />
                    <Circle cx={60} cy={26} r={7} fill={COLORS.sun} />
                </AnimatedG>
            </AnimatedG>

            <AnimatedPath animatedProps={dropAnimatedProps} d="M0 0 C3 5 6 8 0 15 C-6 8 -3 5 0 0 Z" fill={COLORS.droplet} />

            {SPARKS.map((s, i) => (
                <Spark key={i} progress={burst} angle={s.angle} dist={s.dist} color={s.color} />
            ))}
        </Svg>
    );
}
