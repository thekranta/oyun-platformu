import React from 'react';
import { Text, View } from 'react-native';

// Dünya bayrakları — TEK KAYNAK. Bayraklar emoji DEĞİL, basit renkli View'larla
// çizilir → her cihaz/tarayıcıda aynı görünür (emoji bayrak 'TR' harf koduna
// düşmez). Kültür oyunları (Dünya Bayrakları, Dünya Selamları) bunu paylaşır.

export type FlagSpec =
    | { id: string; name: string; hello: string; render: 'v'; colors: string[] }
    | { id: string; name: string; hello: string; render: 'h'; colors: string[] }
    | { id: string; name: string; hello: string; render: 'circle'; bg: string; circle: string }
    | { id: string; name: string; hello: string; render: 'symbol'; bg: string; symbol: string; symbolColor: string }
    | { id: string; name: string; hello: string; render: 'maple'; band: string }
    | { id: string; name: string; hello: string; render: 'cross'; bg: string; cross: string };

export const FLAGS: FlagSpec[] = [
    { id: 'tr', name: 'Türkiye', hello: 'Merhaba', render: 'symbol', bg: '#E30A17', symbol: '☪', symbolColor: '#ffffff' },
    { id: 'jp', name: 'Japonya', hello: 'Konnichiwa', render: 'circle', bg: '#ffffff', circle: '#BC002D' },
    { id: 'fr', name: 'Fransa', hello: 'Bonjour', render: 'v', colors: ['#0055A4', '#ffffff', '#EF4135'] },
    { id: 'de', name: 'Almanya', hello: 'Hallo', render: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] },
    { id: 'it', name: 'İtalya', hello: 'Ciao', render: 'v', colors: ['#008C45', '#F4F5F0', '#CD212A'] },
    { id: 'nl', name: 'Hollanda', hello: 'Hoi', render: 'h', colors: ['#AE1C28', '#ffffff', '#21468B'] },
    { id: 'ie', name: 'İrlanda', hello: 'Dia duit', render: 'v', colors: ['#169B62', '#ffffff', '#FF883E'] },
    { id: 'be', name: 'Belçika', hello: 'Salut', render: 'v', colors: ['#000000', '#FAE042', '#ED2939'] },
    { id: 'at', name: 'Avusturya', hello: 'Grüß Gott', render: 'h', colors: ['#ED2939', '#ffffff', '#ED2939'] },
    { id: 'id', name: 'Endonezya', hello: 'Halo', render: 'h', colors: ['#FF0000', '#ffffff'] },
    { id: 'ng', name: 'Nijerya', hello: 'Sannu', render: 'v', colors: ['#008751', '#ffffff', '#008751'] },
    { id: 'ch', name: 'İsviçre', hello: 'Grüezi', render: 'cross', bg: '#D52B1E', cross: '#ffffff' },
    { id: 'ca', name: 'Kanada', hello: 'Hi', render: 'maple', band: '#FF0000' },
    { id: 'ru', name: 'Rusya', hello: 'Privet', render: 'h', colors: ['#ffffff', '#0039A6', '#D52B1E'] },
    { id: 'pl', name: 'Polonya', hello: 'Cześć', render: 'h', colors: ['#ffffff', '#DC143C'] },
    { id: 'ua', name: 'Ukrayna', hello: 'Pryvit', render: 'h', colors: ['#0057B7', '#FFD700'] },
    { id: 'ro', name: 'Romanya', hello: 'Bună', render: 'v', colors: ['#002B7F', '#FCD116', '#CE1126'] },
    { id: 'hu', name: 'Macaristan', hello: 'Szia', render: 'h', colors: ['#CD2A3E', '#ffffff', '#436F4D'] },
    { id: 'es', name: 'İspanya', hello: 'Hola', render: 'h', colors: ['#AA151B', '#F1BF00', '#AA151B'] },
    { id: 'bd', name: 'Bangladeş', hello: 'Nomoshkar', render: 'circle', bg: '#006A4E', circle: '#F42A41' },
    { id: 'bg', name: 'Bulgaristan', hello: 'Zdravei', render: 'h', colors: ['#ffffff', '#00966E', '#D62612'] },
    { id: 'ee', name: 'Estonya', hello: 'Tere', render: 'h', colors: ['#0072CE', '#000000', '#ffffff'] },
    { id: 'lt', name: 'Litvanya', hello: 'Labas', render: 'h', colors: ['#FDB913', '#006A44', '#C1272D'] },
    { id: 'ga', name: 'Gabon', hello: 'Mbolo', render: 'h', colors: ['#009E60', '#FCD116', '#3A75C4'] },
];

export function Flag({ spec, w }: { spec: FlagSpec; w: number }) {
    const h = Math.round(w * 0.66);
    const common = { width: w, height: h, borderRadius: 6, overflow: 'hidden' as const, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)' };

    if (spec.render === 'v') {
        return (
            <View style={[common, { flexDirection: 'row' }]}>
                {spec.colors.map((c, i) => (<View key={i} style={{ flex: 1, backgroundColor: c }} />))}
            </View>
        );
    }
    if (spec.render === 'h') {
        return (
            <View style={[common, { flexDirection: 'column' }]}>
                {spec.colors.map((c, i) => (<View key={i} style={{ flex: 1, backgroundColor: c }} />))}
            </View>
        );
    }
    if (spec.render === 'circle') {
        return (
            <View style={[common, { backgroundColor: spec.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <View style={{ width: h * 0.5, height: h * 0.5, borderRadius: h * 0.5, backgroundColor: spec.circle }} />
            </View>
        );
    }
    if (spec.render === 'symbol') {
        return (
            <View style={[common, { backgroundColor: spec.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ fontSize: h * 0.55, color: spec.symbolColor, lineHeight: h * 0.7 }}>{spec.symbol}</Text>
            </View>
        );
    }
    if (spec.render === 'cross') {
        const t = h * 0.18;
        return (
            <View style={[common, { backgroundColor: spec.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <View style={{ position: 'absolute', width: t, height: h * 0.6, backgroundColor: spec.cross }} />
                <View style={{ position: 'absolute', width: h * 0.6, height: t, backgroundColor: spec.cross }} />
            </View>
        );
    }
    // maple (Kanada): kırmızı-beyaz-kırmızı dikey + ortada yaprak
    return (
        <View style={[common, { flexDirection: 'row' }]}>
            <View style={{ flex: 1, backgroundColor: spec.band }} />
            <View style={{ flex: 2, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: h * 0.5 }}>🍁</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: spec.band }} />
        </View>
    );
}
