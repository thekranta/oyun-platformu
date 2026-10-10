import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { asset } from '../lib/assetMap';
import {
    AttentionItem, ChildRow, ClassRow, DailyPoint, GameTypeRow, Health, InstitutionDataSource, InstitutionInfo, Overview,
    PeriodDays, accuracy, ageParts, areaMeta, buildAttention, childHealth, classHealth, groupByArea, percent,
    recencyOf, splitDuration, trendOf,
} from '../lib/institutionStats';

// ============================================
// 🏛️ KURUM YÖNETİM PANELİ (Meşe) — salt okunur, TOPLU özet
// Yönetici: etkin çocuk, oyun sayısı, süre, doğru cevap oranı, günlük etkinlik, gelişim alanları,
// dikkat gerektirenler, sınıf kartları ve sınıf içindeki çocukların özeti.
// ÇİZİM, YAPAY ZEKÂ YORUMU ve VELİ BİLGİSİ bu panelde YOKTUR (sunucu zaten döndürmez).
// Veri kaynağı: gerçek (RPC) ya da satış gösterisi (demo) — bkz. lib/institutionApi.ts, lib/institutionDemo.ts.
// ============================================

interface Props {
    institution: InstitutionInfo;
    source: InstitutionDataSource;
    onClose: () => void;
    /** Verilirse üst çubukta "Öğretmen Paneli" düğmesi çıkar. */
    onOpenTeacherPanel?: () => void;
}

interface DashData { overview: Overview | null; daily: DailyPoint[]; types: GameTypeRow[]; classes: ClassRow[] }

// Kurum paneline özgü sakin palet (öğretmen panelinin şeker pembesinden bilinçli olarak ayrı: yönetici ekranı).
const C = {
    bg: '#F3F6FA', card: '#FFFFFF', ink: '#1B2B45', muted: '#66758C', line: '#E3E9F1',
    primary: '#1F8F86', primaryDark: '#146A63', primarySoft: '#E3F4F2',
    good: '#2FA46F', goodSoft: '#E6F6EE', warn: '#C98A0B', warnSoft: '#FFF4D9', bad: '#D9485B', badSoft: '#FDE8EB',
    neutral: '#8A94A6', neutralSoft: '#EEF1F6', coral: '#FF6B6B',
};

const HEALTH_STYLE: Record<Health, { fg: string; bg: string }> = {
    good: { fg: C.good, bg: C.goodSoft },
    low: { fg: C.warn, bg: C.warnSoft },
    idle: { fg: C.bad, bg: C.badSoft },
    empty: { fg: C.neutral, bg: C.neutralSoft },
};

const CLASS_EMOJIS = ['🌸', '🦋', '⭐', '🐝', '🌈', '🧸', '🍀', '🌻', '🦄', '🐞'];
const classEmoji = (id: string): string => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return CLASS_EMOJIS[h % CLASS_EMOJIS.length];
};

const formatInt = (n: number, lang: string): string =>
    String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, lang.startsWith('tr') ? '.' : ',');

const parseDay = (iso: string): Date => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
};

export default function InstitutionDashboard({ institution, source, onClose, onOpenTeacherPanel }: Props) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language || 'tr';
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    const classCols = width >= 1100 ? 3 : width >= 700 ? 2 : 1;

    const [days, setDays] = useState<PeriodDays>(7);
    const [data, setData] = useState<DashData | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [pickedDay, setPickedDay] = useState<string | null>(null);
    const [now, setNow] = useState(() => new Date());
    const reqRef = useRef(0);

    const [openClass, setOpenClass] = useState<ClassRow | null>(null);
    const [kids, setKids] = useState<ChildRow[] | null>(null);
    const [kidsFailed, setKidsFailed] = useState(false);
    const [onlyPassive, setOnlyPassive] = useState(false);
    const kidsReq = useRef(0);

    const load = useCallback(async () => {
        const id = ++reqRef.current;
        setLoading(true);
        setFailed(false);
        try {
            const [overview, daily, types, classes] = await Promise.all([
                source.overview(days), source.daily(days), source.gamesByType(days), source.classes(days),
            ]);
            if (id !== reqRef.current) return;
            setNow(new Date());
            setData({ overview, daily, types, classes });
            setPickedDay(null);
        } catch {
            if (id === reqRef.current) setFailed(true);
        } finally {
            if (id === reqRef.current) setLoading(false);
        }
    }, [source, days]);

    useEffect(() => { load(); }, [load]);

    const openChildren = useCallback(async (cls: ClassRow) => {
        const id = ++kidsReq.current;
        setOpenClass(cls);
        setKids(null);
        setKidsFailed(false);
        setOnlyPassive(false);
        try {
            const rows = await source.classChildren(cls.id, days);
            if (id === kidsReq.current) setKids(rows);
        } catch {
            if (id === kidsReq.current) setKidsFailed(true);
        }
    }, [source, days]);

    const closeChildren = () => { kidsReq.current++; setOpenClass(null); setKids(null); };

    const overview = data?.overview ?? null;
    const classes = useMemo(() => data?.classes ?? [], [data]);
    const attention = useMemo(
        () => buildAttention(institution, overview, classes, now),
        [institution, overview, classes, now],
    );
    const areas = useMemo(() => groupByArea(data?.types ?? []), [data]);

    const wdLabel = (d: Date) => t(`institution.wd${d.getDay()}`);
    const dayLabel = (iso: string) => { const d = parseDay(iso); return `${wdLabel(d)} ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`; };
    const durationText = (seconds: number) => {
        const { hours, minutes } = splitDuration(seconds);
        return hours > 0 ? t('institution.durationHM', { h: hours, m: minutes }) : t('institution.durationM', { m: minutes });
    };
    const recencyText = (iso: string | null) => {
        const r = recencyOf(iso, now);
        if (r.kind === 'never') return t('institution.lastNever');
        if (r.kind === 'today') return t('institution.lastToday');
        return t('institution.lastDays', { count: r.days });
    };
    const ageText = (months: number | null) => {
        const p = ageParts(months);
        if (!p) return '';
        return p.months > 0 ? t('institution.ageYM', { years: p.years, months: p.months }) : t('institution.ageY', { years: p.years });
    };
    const trendLabel = (cur: number, prev: number) => {
        const tr = trendOf(cur, prev);
        if (tr.direction === 'none') return { text: t('institution.trendNone'), color: C.muted, bg: C.neutralSoft };
        if (tr.direction === 'flat') return { text: t('institution.trendFlat'), color: C.muted, bg: C.neutralSoft };
        return tr.direction === 'up'
            ? { text: t('institution.trendUp', { value: tr.value }), color: C.good, bg: C.goodSoft }
            : { text: t('institution.trendDown', { value: tr.value }), color: C.bad, bg: C.badSoft };
    };

    // ---------------------------------------------------------------- KPI
    const acc = overview ? accuracy(overview.correctTotal, overview.errorTotal) : null;
    const activePct = overview ? percent(overview.activeChildren, overview.childCount) : 0;
    const kpis = overview ? [
        {
            key: 'active', icon: 'people' as const, color: C.primary, bg: C.primarySoft, label: t('institution.kpiActive'),
            value: formatInt(overview.activeChildren, lang), unit: `%${activePct}`,
            sub: t('institution.kpiActiveSub', { total: formatInt(overview.childCount, lang) }),
            trend: trendLabel(overview.activeChildren, overview.prevActiveChildren), bar: activePct,
        },
        {
            key: 'games', icon: 'game-controller' as const, color: '#4F7DF0', bg: '#E8EFFE', label: t('institution.kpiGames'),
            value: formatInt(overview.gameCount, lang), unit: '',
            sub: t('institution.vsPrev'), trend: trendLabel(overview.gameCount, overview.prevGameCount), bar: null,
        },
        {
            key: 'time', icon: 'time' as const, color: '#8B64E0', bg: '#EFE9FC', label: t('institution.kpiTime'),
            value: durationText(overview.totalSeconds), unit: '',
            sub: overview.activeChildren > 0
                ? t('institution.perActiveChild', { value: durationText(overview.totalSeconds / overview.activeChildren) })
                : '', trend: null, bar: null,
        },
        {
            key: 'acc', icon: 'checkmark-circle' as const, color: C.good, bg: C.goodSoft, label: t('institution.kpiAccuracy'),
            value: acc === null ? '—' : `%${acc}`, unit: '',
            sub: acc === null ? t('institution.kpiAccuracyNone') : '', trend: null, bar: acc,
        },
    ] : [];

    // ---------------------------------------------------------------- günlük grafik
    const daily = data?.daily ?? [];
    const maxGames = Math.max(1, ...daily.map((d) => d.gameCount));
    const peak = daily.reduce<DailyPoint | null>((p, d) => (!p || d.gameCount > p.gameCount ? d : p), null);
    const picked = pickedDay ? daily.find((d) => d.day === pickedDay) ?? null : null;
    const CHART_H = 132;

    const attentionText = (item: AttentionItem): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; title: string; sub?: string; cls?: ClassRow } => {
        const byId = (id: string) => classes.find((c) => c.id === id);
        switch (item.kind) {
            case 'idleClass':
                return { icon: 'moon', color: C.bad, bg: C.badSoft, title: t('institution.idleClass', { name: item.className }), sub: item.teacherName ? t('institution.withTeacher', { name: item.teacherName }) : undefined, cls: byId(item.classId) };
            case 'lowClass':
                return { icon: 'trending-down', color: C.warn, bg: C.warnSoft, title: t('institution.lowClass', { name: item.className, active: item.active, total: item.total }), sub: item.teacherName ? t('institution.withTeacher', { name: item.teacherName }) : undefined, cls: byId(item.classId) };
            case 'passiveChildren':
                return { icon: 'person-remove', color: C.warn, bg: C.warnSoft, title: t('institution.passiveChildren', { count: item.count }) };
            case 'hiddenChildren':
                return { icon: 'lock-closed', color: C.neutral, bg: C.neutralSoft, title: t('institution.hiddenChildren', { count: item.count }) };
            default:
                return { icon: 'calendar', color: C.warn, bg: C.warnSoft, title: item.daysLeft === 0 ? t('institution.packageExpiringToday') : t('institution.packageExpiring', { days: item.daysLeft }) };
        }
    };

    // ---------------------------------------------------------------- render
    const content = (
        <>
            {/* KPI */}
            <View style={styles.kpiGrid}>
                {kpis.map((k) => (
                    <View key={k.key} style={[styles.kpiCard, { width: wide ? '24%' : '48%' }]}>
                        <View style={styles.kpiTop}>
                            <View style={[styles.kpiIcon, { backgroundColor: k.bg }]}><Ionicons name={k.icon} size={18} color={k.color} /></View>
                            <Text style={styles.kpiLabel} numberOfLines={2}>{k.label}</Text>
                        </View>
                        <View style={styles.kpiValueRow}>
                            <Text style={[styles.kpiValue, width < 500 && styles.kpiValueSmall]} numberOfLines={1}>{k.value}</Text>
                            {k.unit ? <Text style={[styles.kpiUnit, { color: k.color }]}>{k.unit}</Text> : null}
                        </View>
                        {k.bar !== null && (
                            <View style={styles.kpiTrack}><View style={[styles.kpiFill, { width: `${Math.min(100, k.bar)}%`, backgroundColor: k.color }]} /></View>
                        )}
                        <View style={styles.kpiFoot}>
                            {k.trend && <View style={[styles.trendChip, { backgroundColor: k.trend.bg }]}><Text style={[styles.trendText, { color: k.trend.color }]}>{k.trend.text}</Text></View>}
                            {k.sub ? <Text style={styles.kpiSub} numberOfLines={2}>{k.sub}</Text> : null}
                        </View>
                    </View>
                ))}
            </View>

            {/* Günlük etkinlik + gelişim alanları */}
            <View style={[styles.twoCol, wide && styles.twoColWide]}>
                <View style={[styles.card, wide && { flex: 3 }]}>
                    <Text style={styles.cardTitle}>{t('institution.dailyTitle')}</Text>
                    <Text style={styles.cardSub}>
                        {daily.every((d) => d.gameCount === 0) || !peak
                            ? t('institution.dailyEmpty')
                            : t('institution.dailySub', { games: formatInt(overview?.gameCount ?? 0, lang), peak: dayLabel(peak.day) })}
                    </Text>
                    <View style={[styles.chart, { height: CHART_H + 26 }]}>
                        <View style={[styles.gridLine, { bottom: 26 }]} />
                        <View style={[styles.gridLine, { bottom: 26 + CHART_H / 2 }]} />
                        <View style={[styles.gridLine, { bottom: 26 + CHART_H }]} />
                        <Text style={[styles.axisMax, { bottom: 26 + CHART_H + 2 }]}>{formatInt(maxGames, lang)}</Text>
                        <View style={styles.barsRow}>
                            {daily.map((d, idx) => {
                                const h = d.gameCount > 0 ? Math.max(6, Math.round((d.gameCount / maxGames) * CHART_H)) : 3;
                                const isToday = idx === daily.length - 1;
                                const isPicked = pickedDay === d.day;
                                const showLabel = days === 7 || idx % 5 === 0 || isToday;
                                const dt = parseDay(d.day);
                                return (
                                    <TouchableOpacity
                                        key={d.day}
                                        style={styles.barCol}
                                        activeOpacity={0.7}
                                        onPress={() => setPickedDay(isPicked ? null : d.day)}
                                        accessibilityRole="button"
                                        accessibilityLabel={t('institution.dailyBarLabel', { day: dayLabel(d.day), games: d.gameCount, active: d.activeChildren })}
                                    >
                                        <View style={styles.barSlot}>
                                            <View style={[
                                                styles.bar,
                                                { height: h, backgroundColor: d.gameCount === 0 ? C.line : isPicked || isToday ? C.primaryDark : C.primary, opacity: isPicked || !pickedDay ? 1 : 0.45 },
                                            ]} />
                                        </View>
                                        <Text style={[styles.barLabel, !showLabel && { opacity: 0 }, isToday && { color: C.primaryDark, fontWeight: '800' }]} numberOfLines={1}>
                                            {days === 7 ? wdLabel(dt) : `${dt.getDate()}.${dt.getMonth() + 1}`}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                    {picked ? (
                        <View style={styles.pickedBox}>
                            <Text style={styles.pickedText}>
                                {t('institution.dailyBarLabel', { day: dayLabel(picked.day), games: picked.gameCount, active: picked.activeChildren })}
                            </Text>
                        </View>
                    ) : <View style={styles.pickedSpacer} />}
                </View>

                <View style={[styles.card, wide && { flex: 2 }]}>
                    <Text style={styles.cardTitle}>{t('institution.areasTitle')}</Text>
                    <Text style={styles.cardSub}>{areas.length ? t('institution.areasSub') : t('institution.areasEmpty')}</Text>
                    {areas.map((a) => {
                        const meta = areaMeta(a.alan);
                        return (
                            <View key={a.alan} style={styles.areaRow}>
                                <Text style={styles.areaEmoji}>{meta.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.areaTop}>
                                        <Text style={styles.areaName} numberOfLines={1}>{t(`institution.area.${a.alan}`, { defaultValue: a.alan })}</Text>
                                        <Text style={styles.areaPct}>%{a.share}</Text>
                                    </View>
                                    <View style={styles.areaTrack}><View style={[styles.areaFill, { width: `${Math.max(2, a.share)}%`, backgroundColor: meta.color }]} /></View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Dikkat gerektirenler */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('institution.attentionTitle')}</Text>
                {attention.length === 0 ? (
                    <View style={styles.allGood}><Text style={styles.allGoodText}>{t('institution.attentionNone')}</Text></View>
                ) : (
                    <View style={{ gap: 8, marginTop: 10 }}>
                        {attention.map((item, idx) => {
                            const a = attentionText(item);
                            const inner = (
                                <>
                                    <View style={[styles.attIcon, { backgroundColor: a.bg }]}><Ionicons name={a.icon} size={18} color={a.color} /></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.attTitle}>{a.title}</Text>
                                        {a.sub ? <Text style={styles.attSub}>{a.sub}</Text> : null}
                                    </View>
                                    {a.cls ? <Ionicons name="chevron-forward" size={18} color={C.muted} /> : null}
                                </>
                            );
                            return a.cls ? (
                                <TouchableOpacity key={idx} style={styles.attRow} onPress={() => openChildren(a.cls!)} activeOpacity={0.7}>{inner}</TouchableOpacity>
                            ) : <View key={idx} style={styles.attRow}>{inner}</View>;
                        })}
                    </View>
                )}
            </View>

            {/* Sınıflar */}
            <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{t('institution.classesTitle')}</Text>
                <Text style={styles.sectionSub}>{t('institution.classesSub', { classes: classes.length, teachers: overview?.teacherCount ?? institution.teacherCount })}</Text>
            </View>
            {classes.length === 0 ? (
                <View style={[styles.card, styles.emptyCard]}>
                    <Image source={asset('/branding/mascot/uyuyor.webp')} style={styles.emptyMascot} />
                    <Text style={styles.emptyTitle}>{t('institution.classesEmptyTitle')}</Text>
                    <Text style={styles.emptyText}>{t('institution.classesEmptyText')}</Text>
                </View>
            ) : (
                <View style={styles.classGrid}>
                    {classes.map((c) => {
                        const h = classHealth(c);
                        const hs = HEALTH_STYLE[h];
                        const pct = percent(c.activeChildren, c.childCount);
                        return (
                            <TouchableOpacity
                                key={c.id}
                                activeOpacity={0.8}
                                onPress={() => openChildren(c)}
                                style={[styles.classCard, { width: classCols === 1 ? '100%' : classCols === 2 ? '48.8%' : '32.4%' }]}
                                accessibilityRole="button"
                            >
                                <View style={styles.classTop}>
                                    <View style={styles.classEmojiBox}><Text style={styles.classEmoji}>{classEmoji(c.id)}</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.className} numberOfLines={1}>{c.name}</Text>
                                        <Text style={styles.classTeacher} numberOfLines={1}>{c.teacherName ? t('institution.withTeacher', { name: c.teacherName }) : ' '}</Text>
                                    </View>
                                    <View style={[styles.healthChip, { backgroundColor: hs.bg }]}>
                                        <View style={[styles.healthDot, { backgroundColor: hs.fg }]} />
                                        <Text style={[styles.healthText, { color: hs.fg }]}>{t(`institution.health.${h}`)}</Text>
                                    </View>
                                </View>
                                <View style={styles.classTrack}><View style={[styles.classFill, { width: `${pct}%`, backgroundColor: hs.fg }]} /></View>
                                <View style={styles.classStats}>
                                    <Text style={styles.classStat}>{t('institution.activeOf', { active: c.activeChildren, total: c.childCount })}</Text>
                                    <Text style={styles.classStat}>{t('institution.gamesCount', { count: c.gameCount })}</Text>
                                </View>
                                <View style={styles.classFoot}>
                                    <Text style={styles.classLast}>{recencyText(c.lastPlayedAt)}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={C.muted} />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Alt not */}
            <View style={styles.footNote}>
                <Ionicons name="shield-checkmark" size={16} color={C.primary} />
                <Text style={styles.footNoteText}>
                    {t('institution.privacyNote')}
                    {overview && overview.hiddenCount > 0 ? ` ${t('institution.hiddenFootnote')}` : ''}
                </Text>
            </View>
        </>
    );

    const visibleKids = (kids ?? []).filter((k) => !onlyPassive || (!k.hidden && (k.gameCount ?? 0) === 0));

    return (
        <View style={styles.container}>
            {/* Üst çubuk */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('institution.back')}>
                    <Ionicons name="arrow-back" size={22} color={C.ink} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.eyebrow}>{t('institution.panelTitle').toLocaleUpperCase(lang.startsWith('tr') ? 'tr-TR' : 'en-US')}</Text>
                    <Text style={[styles.title, width < 500 && styles.titleSmall]} numberOfLines={2}>{institution.name}</Text>
                </View>
                {onOpenTeacherPanel && (
                    <TouchableOpacity onPress={onOpenTeacherPanel} style={styles.switchBtn} accessibilityRole="button" accessibilityLabel={t('institution.teacherPanel')}>
                        <Ionicons name="school" size={16} color={C.primaryDark} />
                        {width >= 520 && <Text style={styles.switchText}>{t('institution.teacherPanel')}</Text>}
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {source.isDemo && (
                    <View style={styles.demoBanner}>
                        <View style={styles.demoPill}><Text style={styles.demoPillText}>{t('institution.demoBadge')}</Text></View>
                        <Text style={styles.demoText}>{t('institution.demoNote')}</Text>
                    </View>
                )}

                {/* Dönem seçici */}
                <View style={styles.toolbar}>
                    <View style={styles.segment}>
                        {([7, 30] as PeriodDays[]).map((d) => (
                            <TouchableOpacity key={d} onPress={() => setDays(d)} style={[styles.segBtn, days === d && styles.segBtnOn]} accessibilityRole="button" accessibilityState={{ selected: days === d }}>
                                <Text style={[styles.segText, days === d && styles.segTextOn]}>{t(`institution.period${d}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {loading && data && <ActivityIndicator size="small" color={C.primary} />}
                </View>

                {failed ? (
                    <View style={[styles.card, styles.stateCard]}>
                        <Ionicons name="cloud-offline" size={36} color={C.muted} />
                        <Text style={styles.stateTitle}>{t('institution.errorTitle')}</Text>
                        <Text style={styles.stateText}>{t('institution.errorText')}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={load}><Text style={styles.retryText}>{t('institution.retry')}</Text></TouchableOpacity>
                    </View>
                ) : !data ? (
                    <View style={[styles.card, styles.stateCard]}>
                        <ActivityIndicator size="large" color={C.primary} />
                        <Text style={styles.stateText}>{t('institution.loading')}</Text>
                    </View>
                ) : (
                    <View style={loading ? { opacity: 0.55 } : undefined} pointerEvents={loading ? 'none' : 'auto'}>{content}</View>
                )}
            </ScrollView>

            {/* Sınıf ayrıntısı */}
            <Modal visible={!!openClass} transparent animationType="slide" onRequestClose={closeChildren}>
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeChildren} accessibilityLabel={t('institution.close')} />
                    <View style={[styles.sheet, width >= 700 && styles.sheetWide]}>
                        <View style={styles.sheetHead}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sheetTitle} numberOfLines={1}>{openClass ? `${classEmoji(openClass.id)} ${t('institution.childrenTitle', { name: openClass.name })}` : ''}</Text>
                                {openClass?.teacherName ? <Text style={styles.sheetSub}>{t('institution.withTeacher', { name: openClass.teacherName })}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={closeChildren} style={styles.sheetClose} accessibilityRole="button" accessibilityLabel={t('institution.close')}>
                                <Ionicons name="close" size={22} color={C.ink} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.filterRow}>
                            {[false, true].map((v) => (
                                <TouchableOpacity key={String(v)} style={[styles.filterChip, onlyPassive === v && styles.filterChipOn]} onPress={() => setOnlyPassive(v)}>
                                    <Text style={[styles.filterText, onlyPassive === v && styles.filterTextOn]}>{v ? t('institution.filterPassive') : t('institution.filterAll')}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 12 }}>
                            {kidsFailed ? (
                                <View style={styles.stateCardPlain}>
                                    <Text style={styles.stateTitle}>{t('institution.errorTitle')}</Text>
                                    <TouchableOpacity style={styles.retryBtn} onPress={() => openClass && openChildren(openClass)}><Text style={styles.retryText}>{t('institution.retry')}</Text></TouchableOpacity>
                                </View>
                            ) : kids === null ? (
                                <View style={styles.stateCardPlain}><ActivityIndicator color={C.primary} /></View>
                            ) : visibleKids.length === 0 ? (
                                <View style={styles.stateCardPlain}><Text style={styles.stateText}>{t('institution.childrenEmpty')}</Text></View>
                            ) : visibleKids.map((k) => {
                                const h = childHealth(k, now);
                                const hs = HEALTH_STYLE[h];
                                const a = accuracy(k.correctTotal, k.errorTotal);
                                const initial = (k.name ?? '?').trim().charAt(0).toLocaleUpperCase('tr-TR');
                                return (
                                    <View key={k.id} style={styles.kidRow}>
                                        <View style={[styles.avatar, { backgroundColor: hs.bg }]}>
                                            {k.hidden ? <Ionicons name="lock-closed" size={16} color={hs.fg} /> : <Text style={[styles.avatarText, { color: hs.fg }]}>{initial}</Text>}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.kidName} numberOfLines={1}>{k.hidden ? t('institution.childrenHidden') : k.name}{!k.hidden && k.ageMonths !== null ? <Text style={styles.kidAge}>{`  ·  ${ageText(k.ageMonths)}`}</Text> : null}</Text>
                                            <Text style={styles.kidMeta} numberOfLines={1}>{k.hidden ? t('institution.childrenHiddenNote') : recencyText(k.lastPlayedAt)}</Text>
                                        </View>
                                        {!k.hidden && (
                                            <View style={styles.kidRight}>
                                                <Text style={styles.kidGames}>{t('institution.gamesShort', { count: k.gameCount ?? 0 })}</Text>
                                                <Text style={[styles.kidAcc, a === null && { opacity: 0 }]}>{a === null ? ' ' : t('institution.accuracyShort', { value: a })}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const shadow = Platform.select({
    web: { boxShadow: '0 2px 10px rgba(27,43,69,0.07)' } as object,
    default: { shadowColor: '#1B2B45', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12,
        paddingTop: Platform.OS === 'web' ? 16 : 54, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.line,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.primary },
    title: { fontSize: 21, fontWeight: '800', color: C.ink, marginTop: 1 },
    titleSmall: { fontSize: 17, lineHeight: 21 },
    switchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: C.primarySoft },
    switchText: { fontSize: 13, fontWeight: '700', color: C.primaryDark },

    scroll: { padding: 16, paddingBottom: 40, maxWidth: 1240, width: '100%', alignSelf: 'center' },

    demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.warnSoft, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 },
    demoPill: { backgroundColor: C.warn, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    demoPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    demoText: { flex: 1, fontSize: 12.5, color: '#7A5A08', fontWeight: '600' },

    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, minHeight: 40 },
    segment: { flexDirection: 'row', backgroundColor: '#E6ECF3', borderRadius: 12, padding: 3 },
    segBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 9 },
    segBtnOn: { backgroundColor: C.card, ...(shadow as object) },
    segText: { fontSize: 13.5, fontWeight: '700', color: C.muted },
    segTextOn: { color: C.ink },

    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 14 },
    kpiCard: { backgroundColor: C.card, borderRadius: 18, padding: 14, ...(shadow as object) },
    kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    kpiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    kpiLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: C.muted, lineHeight: 15 },
    kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 10 },
    kpiValue: { fontSize: 28, fontWeight: '800', color: C.ink, flexShrink: 1 },
    kpiValueSmall: { fontSize: 22 },
    kpiUnit: { fontSize: 14, fontWeight: '800' },
    kpiTrack: { height: 6, borderRadius: 3, backgroundColor: C.neutralSoft, marginTop: 8, overflow: 'hidden' },
    kpiFill: { height: 6, borderRadius: 3 },
    kpiFoot: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8, minHeight: 22 },
    trendChip: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
    trendText: { fontSize: 11.5, fontWeight: '800' },
    kpiSub: { flex: 1, fontSize: 11.5, color: C.muted, fontWeight: '600' },

    twoCol: { gap: 12, marginBottom: 14 },
    twoColWide: { flexDirection: 'row', alignItems: 'stretch' },
    card: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 14, ...(shadow as object) },
    cardTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
    cardSub: { fontSize: 12.5, color: C.muted, marginTop: 3, fontWeight: '600' },

    chart: { marginTop: 14, position: 'relative' },
    gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: C.line },
    axisMax: { position: 'absolute', left: 0, fontSize: 10, color: C.muted, fontWeight: '700' },
    barsRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, paddingTop: 4 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barSlot: { height: 132, justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
    bar: { width: '72%', maxWidth: 34, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    barLabel: { fontSize: 10.5, color: C.muted, marginTop: 6, height: 16, fontWeight: '700' },
    pickedBox: { marginTop: 8, backgroundColor: C.primarySoft, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
    pickedText: { fontSize: 12.5, fontWeight: '700', color: C.primaryDark },
    pickedSpacer: { height: 8 },

    areaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
    areaEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
    areaTop: { flexDirection: 'row', justifyContent: 'space-between' },
    areaName: { fontSize: 13.5, fontWeight: '700', color: C.ink, flex: 1 },
    areaPct: { fontSize: 13, fontWeight: '800', color: C.ink },
    areaTrack: { height: 8, borderRadius: 4, backgroundColor: C.neutralSoft, marginTop: 5, overflow: 'hidden' },
    areaFill: { height: 8, borderRadius: 4 },

    allGood: { marginTop: 10, backgroundColor: C.goodSoft, borderRadius: 12, padding: 12 },
    allGoodText: { fontSize: 13.5, color: C.good, fontWeight: '700' },
    attRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 14, padding: 10 },
    attIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    attTitle: { fontSize: 13.5, fontWeight: '700', color: C.ink },
    attSub: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '600' },

    sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
    sectionTitle: { fontSize: 19, fontWeight: '800', color: C.ink },
    sectionSub: { fontSize: 12.5, color: C.muted, fontWeight: '600' },
    classGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 14 },
    classCard: { backgroundColor: C.card, borderRadius: 18, padding: 14, ...(shadow as object) },
    classTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    classEmojiBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    classEmoji: { fontSize: 24 },
    className: { fontSize: 16, fontWeight: '800', color: C.ink },
    classTeacher: { fontSize: 12.5, color: C.muted, marginTop: 2, fontWeight: '600' },
    healthChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
    healthDot: { width: 7, height: 7, borderRadius: 4 },
    healthText: { fontSize: 11.5, fontWeight: '800' },
    classTrack: { height: 7, borderRadius: 4, backgroundColor: C.neutralSoft, marginTop: 12, overflow: 'hidden' },
    classFill: { height: 7, borderRadius: 4 },
    classStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    classStat: { fontSize: 12.5, color: C.ink, fontWeight: '700' },
    classFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    classLast: { fontSize: 12, color: C.muted, fontWeight: '600' },

    emptyCard: { alignItems: 'center', paddingVertical: 28 },
    emptyMascot: { width: 90, height: 90, marginBottom: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
    emptyText: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center', maxWidth: 360 },

    footNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4, marginTop: 4 },
    footNoteText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 17, fontWeight: '600' },

    stateCard: { alignItems: 'center', paddingVertical: 36, gap: 8 },
    stateCardPlain: { alignItems: 'center', paddingVertical: 28, gap: 8 },
    stateTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
    stateText: { fontSize: 13.5, color: C.muted, textAlign: 'center', fontWeight: '600' },
    retryBtn: { marginTop: 6, backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
    retryText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,25,45,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 14, maxHeight: '86%' },
    sheetWide: { alignSelf: 'center', width: 640, borderRadius: 24, marginBottom: 24, maxHeight: '80%' },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    sheetTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
    sheetSub: { fontSize: 12.5, color: C.muted, marginTop: 2, fontWeight: '600' },
    sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    filterChip: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.bg },
    filterChipOn: { backgroundColor: C.primarySoft },
    filterText: { fontSize: 12.5, fontWeight: '700', color: C.muted },
    filterTextOn: { color: C.primaryDark },
    kidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '800' },
    kidName: { fontSize: 14.5, fontWeight: '800', color: C.ink },
    kidAge: { fontSize: 12.5, fontWeight: '600', color: C.muted },
    kidMeta: { fontSize: 12, color: C.muted, marginTop: 2, fontWeight: '600' },
    kidRight: { alignItems: 'flex-end' },
    kidGames: { fontSize: 13, fontWeight: '800', color: C.ink },
    kidAcc: { fontSize: 11.5, fontWeight: '700', color: C.good, marginTop: 2 },
});
