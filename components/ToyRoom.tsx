import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Animated, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { GAME_CATALOG, GameCatalogItem } from '@/constants/gameCatalog';
import { TOY_ROOM_FIRST_GAMES, TOY_ROOM_GROUPS } from '@/constants/toyRoomLayout';
import { GAME_CARD_META, GAME_EMOJI } from '@/lib/menuHelpers';
import { GAME_RENDERERS } from '@/components/gameRegistry';
import { requiredVeliTierForGame, veliTierMeetsMinimum, VeliTier } from '@/lib/subscriptionTiers';

type Props = { name: string; muted: boolean; round: number; onShuffle: () => void; onMute: () => void; onGame: (route: string) => void; onLogout: () => void; subscriptionTier?: VeliTier };
type ToyKind = 'puzzle' | 'paint' | 'animal' | 'drum' | 'blocks' | 'train' | 'crayons' | 'rabbit' | 'xylophone' | 'rings' | 'gift' | 'bear';
const native = Platform.OS !== 'web';
const allPlayable = GAME_CATALOG.filter(g => !!GAME_RENDERERS[g.routeKey]);
const firstGames = TOY_ROOM_FIRST_GAMES;
const groups = TOY_ROOM_GROUPS;
const TIER_LABELS: Record<VeliTier, string> = { free: 'Ücretsiz', tohum: 'Tohum', filiz: 'Filiz', fidan: 'Fidan', orman: 'Orman' };
const PRICING_URL = 'https://childhoodtech.com/#pricing';
const kinds: ToyKind[] = ['puzzle', 'paint', 'animal', 'drum', 'blocks'];
// Keep the original set on opening; the gift alternates illustrated toy sets.
const alternateKinds: ToyKind[] = ['train', 'crayons', 'rabbit', 'xylophone', 'rings'];
const colors = ['#507C72', '#AD594F', '#8666A1', '#AA7940', '#487C9C'];
const title = (game: GameCatalogItem) => GAME_CARD_META[game.id]?.displayTitle || game.title;

/** Original vector toys: scalable on phones and tablets, no remote artwork. */
function ToyArt({ kind }: { kind: ToyKind }) {
  return <Svg width="100%" height="100%" viewBox="0 0 200 180">
    <Defs><LinearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#EBD5B4"/><Stop offset="1" stopColor="#C99F77"/></LinearGradient></Defs>
    <Ellipse cx="101" cy="161" rx="71" ry="10" fill="#876C51" opacity="0.13"/>
    {kind === 'puzzle' && <G rotation="-9" origin="100,95">
      <Rect x="24" y="24" width="154" height="137" rx="22" fill="#CA9F70"/>
      <Rect x="24" y="17" width="154" height="137" rx="22" fill="url(#wood)"/>
      <Path d="M38 32H100V53C74 40 75 79 100 67V91H79C92 115 53 116 65 91H38Z" fill="#75B6AE"/>
      <Path d="M104 32H162V91H140C153 67 116 65 128 91H104V71C80 83 80 46 104 58Z" fill="#EDB850"/>
      <Path d="M38 95H61C48 120 86 122 82 95H100V116C126 103 126 141 100 131V141H38Z" fill="#DF897A"/>
      <Path d="M105 95H128C116 69 151 71 138 95H162V141H105V135C130 147 132 107 105 113Z" fill="#91A5CF"/>
      <Path d="M45 39H72" stroke="#FFF" opacity="0.45" strokeWidth="5" strokeLinecap="round"/>
    </G>}
    {kind === 'paint' && <G rotation="-7" origin="100,100">
      <Path d="M47 33L142 27L166 155H29Z" fill="#C59B6E"/><Rect x="40" y="27" width="113" height="114" rx="9" fill="#FFFDF4"/>
      <Path d="M55 104Q88 35 132 91" fill="none" stroke="#E58C7D" strokeWidth="15" strokeLinecap="round"/>
      <Path d="M62 111Q93 57 128 99" fill="none" stroke="#EBC567" strokeWidth="12" strokeLinecap="round"/>
      <Path d="M70 116Q95 81 120 107" fill="none" stroke="#87BDB0" strokeWidth="11" strokeLinecap="round"/>
      <Circle cx="129" cy="49" r="9" fill="#EDBD5D"/>
      <Rect x="24" y="140" width="146" height="12" rx="6" fill="#D7AC7F"/>
      <G rotation="22" origin="165,90"><Rect x="161" y="55" width="9" height="103" rx="4" fill="#B081BA"/><Rect x="158" y="50" width="15" height="25" rx="3" fill="#E5DCD5"/><Path d="M158 51Q152 25 169 19Q163 36 175 50Z" fill="#56A899"/></G>
    </G>}
    {kind === 'animal' && <G>
      <Ellipse cx="101" cy="122" rx="55" ry="38" fill="#B59ACE"/>
      <Rect x="48" y="119" width="25" height="36" rx="10" fill="#A88CC3"/><Rect x="118" y="119" width="25" height="36" rx="10" fill="#A88CC3"/>
      <Circle cx="116" cy="78" r="43" fill="#C9B4DD"/><Ellipse cx="91" cy="86" rx="28" ry="34" fill="#A68ABE"/><Ellipse cx="90" cy="86" rx="19" ry="25" fill="#D8C6E7"/>
      <Path d="M143 89Q171 135 150 140Q137 143 140 127" fill="none" stroke="#C9B4DD" strokeWidth="23" strokeLinecap="round"/>
      <Circle cx="133" cy="73" r="4" fill="#493E53"/><Circle cx="135" cy="72" r="1" fill="#FFF"/><Ellipse cx="139" cy="88" rx="7" ry="4" fill="#DEAAC4"/>
      <Path d="M49 115Q27 101 32 89" fill="none" stroke="#B59ACE" strokeWidth="7" strokeLinecap="round"/>
    </G>}
    {kind === 'drum' && <G rotation="-5" origin="100,105">
      <Path d="M36 83V135C37 167 165 169 165 135V83" fill="#DC8973"/>
      <Path d="M42 95L63 146L87 102L111 150L139 100L159 141" stroke="#FFE1A4" strokeWidth="5" fill="none"/>
      <Ellipse cx="101" cy="86" rx="66" ry="25" fill="#F3CF80"/><Ellipse cx="101" cy="82" rx="60" ry="20" fill="#FFF0D4"/>
      <Path d="M36 137Q98 174 166 137" stroke="#E9B258" strokeWidth="9" fill="none"/>
      <Path d="M61 21L118 76M143 24L89 76" stroke="#A57C55" strokeWidth="8" strokeLinecap="round"/><Circle cx="61" cy="21" r="10" fill="#E9BB69"/><Circle cx="143" cy="24" r="10" fill="#E9BB69"/>
    </G>}
    {kind === 'blocks' && <G>
      <Rect x="29" y="92" width="69" height="66" rx="11" fill="#D48670"/><Rect x="29" y="85" width="69" height="66" rx="11" fill="#EAA38B"/>
      <Rect x="104" y="92" width="69" height="66" rx="11" fill="#5B9C97"/><Rect x="104" y="85" width="69" height="66" rx="11" fill="#80B9B0"/>
      <G rotation="9" origin="103,50"><Rect x="69" y="22" width="66" height="63" rx="11" fill="#D6A943"/><Rect x="69" y="16" width="66" height="63" rx="11" fill="#F2CC73"/><Path d="M94 36L105 29V64M94 65H116" stroke="#FFF8E6" strokeWidth="7" strokeLinecap="round" fill="none"/></G>
      <Circle cx="63" cy="118" r="17" fill="none" stroke="#FFF4DD" strokeWidth="7"/><Path d="M138 100L155 131H121Z" fill="#FFF4DD"/>
    </G>}
    {kind === 'train' && <G rotation="-4" origin="100,100">
      <Path d="M22 145H181" stroke="#AC805A" strokeWidth="7" strokeLinecap="round"/>
      <Rect x="27" y="85" width="59" height="51" rx="9" fill="#E5AD56"/>
      <Rect x="26" y="79" width="61" height="13" rx="5" fill="#F2CD7C"/>
      <Rect x="92" y="83" width="73" height="54" rx="13" fill="#70AAA0"/>
      <Rect x="94" y="43" width="44" height="66" rx="9" fill="#84BBB0"/>
      <Rect x="89" y="36" width="54" height="13" rx="6" fill="#5C9188"/>
      <Rect x="103" y="52" width="25" height="28" rx="5" fill="#FFF0D4"/>
      <Rect x="150" y="64" width="17" height="30" rx="3" fill="#D48473"/>
      <Rect x="146" y="58" width="25" height="11" rx="4" fill="#E6A18B"/>
      <Path d="M164 114L181 137H159Z" fill="#D48473"/>
      {[42, 73, 108, 147].map(x => <G key={x}><Circle cx={x} cy="141" r="14" fill="#836752"/><Circle cx={x} cy="141" r="8" fill="#F5DFBD"/><Circle cx={x} cy="141" r="3" fill="#B68E67"/></G>)}
      <Path d="M42 103H68M102 94H129" stroke="#FFF8E9" strokeWidth="4" strokeLinecap="round" opacity="0.6"/>
      <Circle cx="160" cy="42" r="8" fill="#F1DFCA"/><Circle cx="170" cy="24" r="11" fill="#F1DFCA"/>
    </G>}
    {kind === 'crayons' && <G rotation="-5" origin="100,100">
      {[{ x: 43, y: 38, c: '#DD8B79' }, { x: 73, y: 22, c: '#EDC264' }, { x: 103, y: 34, c: '#80B4A6' }, { x: 133, y: 17, c: '#AE97C7' }].map(({ x, y, c }) => <G key={x}>
        <Rect x={x} y={y + 22} width="22" height={126 - y} rx="5" fill={c}/>
        <Path d={`M${x} ${y + 27}L${x + 11} ${y}L${x + 22} ${y + 27}Z`} fill="#F2D8B1"/>
        <Path d={`M${x + 6} ${y + 12}L${x + 11} ${y}L${x + 16} ${y + 12}Z`} fill={c}/>
        <Path d={`M${x + 5} ${y + 36}V104`} stroke="#FFF8ED" strokeWidth="3" opacity="0.4" strokeLinecap="round"/>
      </G>)}
      <Rect x="33" y="106" width="131" height="53" rx="12" fill="#CDAB82"/>
      <Rect x="33" y="100" width="131" height="53" rx="12" fill="#E7CBA5"/>
      <Path d="M74 123Q98 97 122 123" stroke="#E49B86" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <Path d="M80 130Q98 111 116 130" stroke="#F4D583" strokeWidth="6" fill="none" strokeLinecap="round"/>
      <Path d="M88 135Q98 125 109 135" stroke="#84B6A4" strokeWidth="6" fill="none" strokeLinecap="round"/>
    </G>}
    {kind === 'rabbit' && <G>
      <Ellipse cx="81" cy="42" rx="15" ry="34" fill="#E4CFB6" rotation="-12" origin="81,42"/>
      <Ellipse cx="122" cy="42" rx="15" ry="34" fill="#E4CFB6" rotation="12" origin="122,42"/>
      <Ellipse cx="81" cy="39" rx="7" ry="23" fill="#DFA99D" rotation="-12" origin="81,42"/>
      <Ellipse cx="122" cy="39" rx="7" ry="23" fill="#DFA99D" rotation="12" origin="122,42"/>
      <Circle cx="145" cy="132" r="17" fill="#FFF2DF"/>
      <Ellipse cx="101" cy="126" rx="36" ry="34" fill="#E4CFB6"/>
      <Ellipse cx="101" cy="128" rx="22" ry="26" fill="#FFF2DF"/>
      <Ellipse cx="101" cy="80" rx="41" ry="33" fill="#EAD8C1"/>
      <Circle cx="85" cy="76" r="4" fill="#675246"/><Circle cx="117" cy="76" r="4" fill="#675246"/>
      <Path d="M96 85Q101 81 107 85L101 91Z" fill="#CF9286"/>
      <Path d="M93 95Q101 101 109 95" fill="none" stroke="#826350" strokeWidth="2.5" strokeLinecap="round"/>
      <Ellipse cx="74" cy="88" rx="7" ry="4" fill="#E5AF9E"/><Ellipse cx="128" cy="88" rx="7" ry="4" fill="#E5AF9E"/>
      <Ellipse cx="75" cy="153" rx="22" ry="12" fill="#DCC4A7"/><Ellipse cx="128" cy="153" rx="22" ry="12" fill="#DCC4A7"/>
      <Path d="M90 117L133 125L105 152Z" fill="#E8AA67"/><Path d="M132 124L148 117M131 122L139 108" stroke="#88AE83" strokeWidth="6" strokeLinecap="round"/>
      <Ellipse cx="77" cy="123" rx="12" ry="19" fill="#E4CFB6" rotation="-20" origin="77,123"/>
    </G>}
    {kind === 'xylophone' && <G rotation="-9" origin="100,100">
      <Rect x="28" y="69" width="146" height="71" rx="13" fill="#C9A67D"/>
      {['#D98777', '#EDBD60', '#8BB6A1', '#80B3BF', '#A294C3'].map((c, i) => <G key={c}>
        <Rect x={32 + i * 28} y={49 + i * 7} width="25" height={99 - i * 11} rx="7" fill={c}/>
        <Circle cx={44.5 + i * 28} cy={60 + i * 7} r="3" fill="#FFF4DB"/><Circle cx={44.5 + i * 28} cy={136 - i * 4} r="3" fill="#FFF4DB"/>
        <Path d={`M${38 + i * 28} ${72 + i * 7}V${116 - i * 4}`} stroke="#FFF9ED" strokeWidth="3" opacity="0.35" strokeLinecap="round"/>
      </G>)}
      <Path d="M52 23L132 84M145 22L101 64" stroke="#A57D55" strokeWidth="6" strokeLinecap="round"/><Circle cx="52" cy="23" r="11" fill="#E9C282"/><Circle cx="145" cy="22" r="11" fill="#E9C282"/>
    </G>}
    {kind === 'rings' && <G rotation="5" origin="100,100">
      <Rect x="35" y="143" width="132" height="17" rx="8" fill="#C6A27B"/><Ellipse cx="101" cy="142" rx="65" ry="11" fill="#E2C7A2"/>
      <Rect x="94" y="25" width="14" height="115" rx="7" fill="#C4A17D"/>
      {[{ y: 127, w: 113, c: '#82B2B8' }, { y: 107, w: 94, c: '#8CB7A1' }, { y: 87, w: 76, c: '#EAC575' }, { y: 67, w: 57, c: '#DF9987' }].map(({ y, w, c }) => <G key={y}>
        <Rect x={101 - w / 2} y={y - 10} width={w} height="21" rx="10" fill={c}/>
        <Ellipse cx="101" cy={y - 6} rx={w / 2 - 5} ry="7" fill="#FFF7E4" opacity="0.22"/>
      </G>)}
      <Circle cx="101" cy="42" r="16" fill="#B19AC9"/><Ellipse cx="97" cy="36" rx="6" ry="4" fill="#D8C8E5"/>
    </G>}
    {kind === 'gift' && <G rotation="-5" origin="100,100">
      <Rect x="44" y="72" width="116" height="83" rx="12" fill="#D98575"/><Rect x="39" y="57" width="126" height="27" rx="8" fill="#E9A08E"/>
      <Rect x="89" y="59" width="23" height="96" fill="#FFE0A1"/>
      <Path d="M99 59C23 61 61 2 99 52C131 3 176 52 105 59" fill="none" stroke="#F7D58D" strokeWidth="14" strokeLinecap="round"/>
      <Path d="M143 22L146 12M158 32L169 29M35 42L27 36" stroke="#E5B553" strokeWidth="4" strokeLinecap="round"/>
    </G>}
    {kind === 'bear' && <G>
      <Ellipse cx="101" cy="126" rx="40" ry="39" fill="#BF8C64"/><Ellipse cx="101" cy="130" rx="27" ry="29" fill="#E4BA8E"/>
      <Circle cx="67" cy="42" r="19" fill="#BF8C64"/><Circle cx="136" cy="42" r="19" fill="#BF8C64"/><Circle cx="67" cy="42" r="11" fill="#E4BA8E"/><Circle cx="136" cy="42" r="11" fill="#E4BA8E"/>
      <Ellipse cx="101" cy="70" rx="47" ry="39" fill="#C89871"/><Ellipse cx="101" cy="84" rx="23" ry="18" fill="#F0D5AF"/>
      <Circle cx="83" cy="67" r="4" fill="#4C3B32"/><Circle cx="120" cy="67" r="4" fill="#4C3B32"/><Ellipse cx="101" cy="79" rx="7" ry="5" fill="#4C3B32"/>
      <Path d="M94 91Q101 99 109 91" stroke="#4C3B32" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <Ellipse cx="72" cy="81" rx="8" ry="5" fill="#DFA68C"/><Ellipse cx="131" cy="81" rx="8" ry="5" fill="#DFA68C"/>
      <Ellipse cx="68" cy="151" rx="23" ry="16" fill="#BF8C64"/><Ellipse cx="134" cy="151" rx="23" ry="16" fill="#BF8C64"/>
      <Path d="M66 116Q36 127 45 96M135 114Q163 119 164 94" stroke="#BF8C64" strokeWidth="20" fill="none" strokeLinecap="round"/>
      <Path d="M83 105L100 115L119 103L117 122L100 115L85 123Z" fill="#6EABA0"/>
    </G>}
  </Svg>;
}

function Plaything({ kind, label, onPress, moving, size, color, replacement }: { kind: ToyKind; label: string; onPress: () => void; moving: boolean; size: number; color: string; replacement?: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving) { lift.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(lift, { toValue: -4, duration: 1800, useNativeDriver: native, isInteraction: false }),
      Animated.timing(lift, { toValue: 0, duration: 1800, useNativeDriver: native, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [lift, moving]);
  return <Animated.View style={{ width: size, transform: [{ translateY: lift }, { scale }] }}>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      onPressIn={() => { if (moving) Animated.spring(scale, { toValue: 0.9, useNativeDriver: native }).start(); }}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: native }).start()} style={styles.toy}>
      <View style={{ width: size, height: size * 0.9 }}>
        <ToyArt kind={kind}/>
        {replacement && <View style={[styles.replacement, { width: size * 0.31, height: size * 0.31 }]}><Text style={{ fontSize: size * 0.2 }}>{replacement}</Text></View>}
      </View>
      <Text numberOfLines={2} style={[styles.toyLabel, { color, fontSize: Math.max(11, Math.min(16, size * 0.105)) }]}>{label}</Text>
    </Pressable>
  </Animated.View>;
}

export default function ToyRoom({ name, muted, round, onShuffle, onMute, onGame, onLogout, subscriptionTier }: Props) {
  const { t } = useTranslation();
  // subscriptionTier verilmezse (ör. tasarım önizlemesi) kısıtlama uygulanmaz;
  // verildiğinde çocuğun paketinin karşılamadığı oyunlar (Akıllı/hikaye/müzik) hem
  // odada hem yetişkin aramasında hiç gösterilmez.
  const playable = subscriptionTier === undefined
    ? allPlayable
    : allPlayable.filter(g => veliTierMeetsMinimum(subscriptionTier, requiredVeliTierForGame(g)));
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const [adult, setAdult] = useState(false);
  const [locked, setLocked] = useState<{ game: string; tier: VeliTier } | null>(null);
  useEffect(() => { if (!adult) setLocked(null); }, [adult]);
  const [query, setQuery] = useState('');
  const [calm, setCalm] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (active) setReduceMotion(v); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  const games = groups.map((group, i) => {
    const pool = playable.filter(g => group.includes(g.forestCategory) && g.id !== firstGames[i]);
    // Sabit ilk oyun döngünün başında: round 0'da o görünür, sonra havuz dönerken tekrar sıraya girer
    // (yoksa küçük havuzlu ücretsiz pakette ilk oyunlar "Başka oyuncaklar"a basınca odadan kalıcı
    // kaybolurdu). Havuz boşsa odayı çökertmek yerine sabit oyunda kalır.
    const first = playable.find(g => g.id === firstGames[i]) ?? playable[0];
    const cycle = [first, ...pool];
    return cycle[round % cycle.length];
  });
  const portrait = bounds.height > bounds.width;
  const sceneWidth = portrait ? 400 : 1000;
  const sceneHeight = portrait ? 720 : 600;
  const scale = Math.min(bounds.width / sceneWidth, bounds.height / sceneHeight);
  const positions = portrait
    ? [{ x: 25, y: 180 }, { x: 235, y: 180 }, { x: 25, y: 355 }, { x: 235, y: 355 }, { x: 25, y: 530 }]
    : [{ x: 95, y: 145 }, { x: 413, y: 112 }, { x: 725, y: 145 }, { x: 195, y: 350 }, { x: 620, y: 350 }];
  const moving = !calm && !reduceMotion && !adult;
  const toySize = portrait ? 140 : 175;
  // Yetişkin arama TÜM kataloğu gösterir (tier'a göre gizlemez) — kilitli oyunlar
  // 🔒 ile işaretlenip hangi paketle açıldığı söylenir, böylece veli neyin kilitli
  // olduğunu görüp paket yükseltmeyi değerlendirebilir.
  const filtered = allPlayable.filter(g => title(g).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));
  return <View style={styles.root} onLayout={e => setBounds(e.nativeEvent.layout)}>
    {bounds.width > 0 && <View style={{ position: 'absolute', width: sceneWidth, height: sceneHeight, left: (bounds.width - sceneWidth) / 2, top: (bounds.height - sceneHeight) / 2, transform: [{ scale }] }}>
      <Svg width={sceneWidth} height={sceneHeight} style={StyleSheet.absoluteFill} viewBox={`0 0 ${sceneWidth} ${sceneHeight}`} pointerEvents="none">
        <Defs><LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><Stop stopColor="#FFF8EB"/><Stop offset="1" stopColor="#F4E8D6"/></LinearGradient></Defs>
        <Rect width={sceneWidth} height={sceneHeight} fill="url(#wall)"/>
        <Rect y={portrait ? 303 : 282} width={sceneWidth} height={sceneHeight} fill="#EAD3B6"/>
        <Path d={`M0 ${portrait ? 303 : 282}H${sceneWidth}`} stroke="#D7B897" strokeWidth="7"/>
        {[0.15, 0.37, 0.62, 0.86].map(x => <Path key={x} d={`M${sceneWidth * x} ${portrait ? 308 : 288}L${sceneWidth * (x * 1.3 - 0.15)} ${sceneHeight}`} stroke="#D6B794" strokeWidth="2" opacity="0.5"/>)}
        <Ellipse cx={sceneWidth / 2} cy={portrait ? 455 : 435} rx={sceneWidth * 0.44} ry={portrait ? 173 : 145} fill="#AFCAC0"/>
        <Ellipse cx={sceneWidth / 2} cy={portrait ? 455 : 435} rx={sceneWidth * 0.42} ry={portrait ? 164 : 134} fill="none" stroke="#DFE7D1" strokeWidth="3" strokeDasharray="3 7"/>
        <G opacity="0.8" transform={portrait ? 'translate(163 155) scale(0.5)' : 'translate(72 68)'}>
          <Rect width="148" height="115" rx="50" fill="#E6CEAA"/><Rect x="8" y="8" width="132" height="99" rx="43" fill="#C8E3E0"/>
          <Circle cx="104" cy="34" r="17" fill="#F9D585"/><Path d="M12 86Q45 43 78 86T137 78V102H12" fill="#A5C3A4"/>
          <Path d="M74 9V106M8 62H139" stroke="#FFF3DD" strokeWidth="7"/>
        </G>
        {!portrait && <G transform="translate(802 65)"><Path d="M0 0V85M78 0V65" stroke="#DCCCB5" strokeWidth="2"/><Path d="M0 67L6 79L19 82L8 91L10 105L0 98L-12 104L-9 90L-20 81L-6 78Z" fill="#E5BA65"/><Circle cx="78" cy="73" r="14" fill="#B6A6C9"/></G>}
      </Svg>
      <View style={[styles.heading, { top: portrait ? 62 : 21, left: portrait ? 20 : 265, right: portrait ? 20 : 265 }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.eyebrow, { fontSize: portrait ? 17 : 20, letterSpacing: name.trim() ? 0.5 : 3 }]}>{name.trim() ? t('toyRoom.greetingWithName', { name: name.trim() }) : t('toyRoom.greetingDefault')}</Text>
        <Text style={[styles.headline, { fontSize: portrait ? 29 : 38 }]}>{t('toyRoom.headline')}</Text>
        <Text style={styles.greeting}>{t('toyRoom.subtitle')}</Text>
      </View>
      {games.map((game, i) => <View key={`${round}-${i}`} style={{ position: 'absolute', left: positions[i].x, top: positions[i].y }}>
        <Plaything kind={(round % 2 === 0 ? kinds : alternateKinds)[i]} label={title(game)} color={colors[i]} size={toySize} moving={moving} onPress={() => onGame(game.routeKey)} replacement={round > 0 ? GAME_EMOJI[game.id] || '🧸' : undefined}/>
      </View>)}
      <View pointerEvents="none" style={{ position: 'absolute', left: portrait ? 148 : 425, top: portrait ? 380 : 329, width: portrait ? 104 : 155, height: portrait ? 100 : 155 }}><ToyArt kind="bear"/></View>
      <View style={{ position: 'absolute', left: portrait ? 238 : 825, top: portrait ? 530 : 415 }}>
        <Plaything kind="gift" label={t('toyRoom.moreToys')} color="#9A5B4B" moving={moving} size={portrait ? 132 : 140} onPress={onShuffle}/>
      </View>
    </View>}
    <View style={styles.controls}>
      <Pressable accessibilityRole="button" accessibilityLabel={muted ? t('toyRoom.muteOn') : t('toyRoom.muteOff')} onPress={onMute} style={styles.control}><Text style={styles.controlText}>{muted ? '🔇' : '🔊'}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('toyRoom.adultMenuLabel')} delayLongPress={1200} onLongPress={() => setAdult(true)} style={styles.control}><Text style={styles.controlText}>⚙</Text></Pressable>
    </View>
    <Modal visible={adult} transparent animationType="fade" onRequestClose={() => setAdult(false)}>
      <View style={styles.overlay}><View style={styles.adult} accessibilityViewIsModal>
        <View style={styles.adultHeader}><Text style={styles.adultTitle}>{t('toyRoom.adultTitle')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('toyRoom.backToRoom')} onPress={() => setAdult(false)} style={styles.control}><Text style={styles.controlText}>✕</Text></Pressable></View>
        <Text style={styles.adultNote}>{t('toyRoom.adultNote')}</Text>
        <View style={styles.adultActions}><Pressable onPress={() => setCalm(v => !v)} accessibilityRole="button" style={styles.adultButton}><Text>{calm ? t('toyRoom.animationsOn') : t('toyRoom.reduceMotion')}</Text></Pressable><Pressable accessibilityRole="button" onPress={onLogout} style={styles.adultButton}><Text>{t('toyRoom.logout')}</Text></Pressable></View>
        <TextInput accessibilityLabel={t('toyRoom.searchLabel')} placeholder={t('toyRoom.searchPlaceholder')} value={query} onChangeText={setQuery} style={styles.search}/>
        <ScrollView keyboardShouldPersistTaps="handled">{filtered.map(g => {
          const required = requiredVeliTierForGame(g);
          const isLocked = subscriptionTier !== undefined && !veliTierMeetsMinimum(subscriptionTier, required);
          return <Pressable key={g.id} accessibilityRole="button" onPress={() => {
            if (isLocked) { setLocked({ game: title(g), tier: required }); return; }
            setAdult(false); onGame(g.routeKey);
          }} style={[styles.gameRow, isLocked && styles.gameRowLocked]}>
            <Text style={[styles.gameText, isLocked && styles.gameTextLocked]}>{isLocked ? '🔒' : (GAME_EMOJI[g.id] || '🧩')}  {title(g)}</Text>
            <Text style={isLocked ? styles.lockedHint : undefined}>{isLocked ? t('toyRoom.lockedHint', { tier: TIER_LABELS[required] }) : '▶'}</Text>
          </Pressable>;
        })}{!filtered.length && <Text style={styles.adultNote}>{t('toyRoom.noGamesFound')}</Text>}</ScrollView>
      </View>
      {locked && <Pressable accessibilityLabel={t('toyRoom.lockedClose')} onPress={() => setLocked(null)} style={styles.upsellBackdrop}>
        <Pressable accessibilityViewIsModal onPress={() => {}} style={styles.upsellCard}>
          <Text style={styles.upsellIcon}>🔒</Text>
          <Text style={styles.upsellTitle}>{t('toyRoom.lockedAlertTitle')}</Text>
          <Text style={styles.upsellText}>{t('toyRoom.lockedAlertMessage', { game: locked.game, tier: TIER_LABELS[locked.tier] })}</Text>
          {!!t(`toyRoom.lockedBenefit.${locked.tier}`, { defaultValue: '' }) && <Text style={styles.upsellBenefit}>{t(`toyRoom.lockedBenefit.${locked.tier}`, { defaultValue: '' })}</Text>}
          <Pressable accessibilityRole="link" onPress={() => { Linking.openURL(PRICING_URL).catch(() => {}); }} style={styles.upsellPrimary}><Text style={styles.upsellPrimaryText}>{t('toyRoom.lockedPrimary')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setLocked(null)} style={styles.upsellSecondary}><Text style={styles.upsellSecondaryText}>{t('toyRoom.lockedClose')}</Text></Pressable>
        </Pressable>
      </Pressable>}
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF2E4', overflow: 'hidden' },
  heading: { position: 'absolute', alignItems: 'center' }, eyebrow: { color: '#A27D59', letterSpacing: 3, fontWeight: '800' }, headline: { color: '#584B40', fontWeight: '900', letterSpacing: -1.2, marginTop: 6 }, greeting: { color: '#887864', fontSize: 14, marginTop: 6, textAlign: 'center' },
  toy: { alignItems: 'center' }, toyLabel: { fontWeight: '800', textAlign: 'center', paddingHorizontal: 5, lineHeight: 20 }, replacement: { position: 'absolute', right: 0, bottom: 0, borderRadius: 40, backgroundColor: '#FFF5DD', alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', right: 10, top: 10, flexDirection: 'row', gap: 6 }, control: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFFCC', borderRadius: 22 }, controlText: { fontSize: 21, color: '#706452' },
  overlay: { flex: 1, backgroundColor: '#40372999', justifyContent: 'center', alignItems: 'center', padding: 20 }, adult: { backgroundColor: '#FFFCF5', borderRadius: 26, padding: 22, width: '100%', maxWidth: 590, maxHeight: '90%' }, adultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, adultTitle: { fontSize: 23, fontWeight: '800', color: '#584B40' }, adultNote: { fontSize: 14, color: '#756753', lineHeight: 22, marginVertical: 14 }, adultActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }, adultButton: { backgroundColor: '#EFE7D9', padding: 14, borderRadius: 15 }, search: { padding: 14, borderWidth: 1, borderColor: '#D7CBBA', borderRadius: 14, marginVertical: 16, fontSize: 16 }, gameRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#EEE6D9', gap: 8 }, gameText: { fontSize: 15, color: '#584B40', flexShrink: 1 },
  gameRowLocked: { opacity: 0.55 }, gameTextLocked: { color: '#8A7A63' }, lockedHint: { fontSize: 12, color: '#A07D2F', fontWeight: '700' },
  upsellBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2B2317B3', justifyContent: 'center', alignItems: 'center', padding: 24 },
  upsellCard: { backgroundColor: '#FFFCF5', borderRadius: 26, paddingVertical: 28, paddingHorizontal: 24, width: '100%', maxWidth: 380, alignItems: 'center' },
  upsellIcon: { fontSize: 44 }, upsellTitle: { fontSize: 22, fontWeight: '800', color: '#584B40', marginTop: 8, textAlign: 'center' },
  upsellText: { fontSize: 15, color: '#756753', lineHeight: 22, marginTop: 10, textAlign: 'center' },
  upsellBenefit: { fontSize: 14, color: '#A07D2F', fontWeight: '700', lineHeight: 20, marginTop: 10, textAlign: 'center' },
  upsellPrimary: { alignSelf: 'stretch', backgroundColor: '#3F7D72', paddingVertical: 14, borderRadius: 16, marginTop: 22, alignItems: 'center' },
  upsellPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  upsellSecondary: { alignSelf: 'stretch', paddingVertical: 12, marginTop: 6, alignItems: 'center' },
  upsellSecondaryText: { color: '#756753', fontSize: 15, fontWeight: '700' },
});
