import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SIRALAMA_SAYILARI = [1, 2, 3, 4, 5];
const TOTAL_ROUNDS = 4;

interface SiralamaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

export default function SiralamaOyunu({ onGameEnd }: SiralamaOyunuProps) {
    const [karisikSayilar, setKarisikSayilar] = useState<any[]>([]);
    const [beklenenSayi, setBeklenenSayi] = useState(1);

    // Round State
    const [currentRound, setCurrentRound] = useState(1);

    // Cumulative Stats
    const [totalHamle, setTotalHamle] = useState(0);
    const [totalHata, setTotalHata] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [cumulativeTime, setCumulativeTime] = useState(0);

    useEffect(() => {
        baslat(true);
    }, []);

    const baslat = (isFirstStart: boolean = false) => {
        const karisik = [...SIRALAMA_SAYILARI].sort(() => Math.random() - 0.5)
            .map((sayi, index) => ({ id: index, sayi, tiklandi: false }));
        setKarisikSayilar(karisik);
        setBeklenenSayi(1);

        if (isFirstStart) {
            setStartTime(new Date());
            setTotalHamle(0);
            setTotalHata(0);
            setCumulativeTime(0);
            setCurrentRound(1);
        }
    };

    const sayiSec = (index: number, sayi: number) => {
        if (karisikSayilar[index].tiklandi) return;

        setTotalHamle(h => h + 1);

        if (sayi === beklenenSayi) {
            const yeniSayilar = [...karisikSayilar];
            yeniSayilar[index].tiklandi = true;
            setKarisikSayilar(yeniSayilar);

            if (beklenenSayi === 5) {
                // Round Complete
                if (currentRound < TOTAL_ROUNDS) {
                    // Next Round
                    setTimeout(() => {
                        setCurrentRound(r => r + 1);
                        baslat(false);
                    }, 500);
                } else {
                    // Game Complete
                    const now = new Date();
                    const totalDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
                    onGameEnd('siralama', totalDuration, totalHamle + 1, totalHata);
                }
            }
            else setBeklenenSayi(b => b + 1);
        } else {
            setTotalHata(h => h + 1);
            // Optional: Visual feedback for error
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.oyunContainer}>
            <View style={styles.header}>
                <Text style={styles.baslik}>🔢 Sıralama</Text>
                <Text style={styles.roundText}>Tur: {currentRound} / {TOTAL_ROUNDS}</Text>
            </View>

            <Text style={styles.bilgi}>Sıradaki: {beklenenSayi}</Text>

            <View style={styles.oyunAlani}>
                {karisikSayilar.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[styles.sayiKutu, item.tiklandi ? styles.sayiSecildi : styles.sayiSecilmedi]}
                        onPress={() => sayiSec(index, item.sayi)}
                        disabled={item.tiklandi}
                    >
                        <Text style={styles.sayiYazi}>{item.sayi}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    oyunContainer: { flexGrow: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
    header: { marginBottom: 20, alignItems: 'center' },
    baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#1565C0' },
    roundText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
    bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
    oyunAlani: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 320 },
    sayiKutu: { width: 60, height: 60, margin: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 30, borderWidth: 2 },
    sayiSecilmedi: { backgroundColor: 'white', borderColor: '#FFA726' },
    sayiSecildi: { backgroundColor: '#ddd', borderColor: '#ccc' },
    sayiYazi: { fontSize: 24, fontWeight: 'bold', color: '#333' },
});
