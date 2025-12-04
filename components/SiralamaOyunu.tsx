import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

const SIRALAMA_SAYILARI = [1, 2, 3, 4, 5];
const TOTAL_ROUNDS = 4;
const { width } = Dimensions.get('window');
const ITEM_SIZE = width > 600 ? 100 : 60; // Larger size for tablets/web
const FONT_SIZE = width > 600 ? 40 : 24;

interface SiralamaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
    onExit?: () => void;
}

export default function SiralamaOyunu({ onGameEnd, onExit }: SiralamaOyunuProps) {
    const [karisikSayilar, setKarisikSayilar] = useState<any[]>([]);
    const [beklenenSayi, setBeklenenSayi] = useState(1);

    // Round State
    const [currentRound, setCurrentRound] = useState(1);

    // Cumulative Stats
    const [totalHamle, setTotalHamle] = useState(0);
    const [totalHata, setTotalHata] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [cumulativeTime, setCumulativeTime] = useState(0);

    // Confetti Ref
    const confettiRef = useRef<ConfettiCannon>(null);

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
                if (confettiRef.current) {
                    confettiRef.current.start();
                }

                if (currentRound < TOTAL_ROUNDS) {
                    // Next Round
                    setTimeout(() => {
                        setCurrentRound(r => r + 1);
                        baslat(false);
                    }, 2000); // Increased delay for confetti
                } else {
                    // Game Complete
                    setTimeout(() => {
                        const now = new Date();
                        const totalDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
                        onGameEnd('siralama', totalDuration, totalHamle + 1, totalHata);
                    }, 2000);
                }
            }
            else setBeklenenSayi(b => b + 1);
        } else {
            setTotalHata(h => h + 1);
            // Optional: Visual feedback for error
        }
    };

    return (
        <DynamicBackground onExit={onExit}>
            <View style={styles.topBar}>
                <ProgressBar current={currentRound} total={TOTAL_ROUNDS} />
            </View>

            <ScrollView contentContainerStyle={styles.oyunContainer}>
                <View style={styles.header}>
                    <Text style={styles.baslik}>🔢 Sıralama</Text>
                    {/* Removed redundant round text since we have ProgressBar */}
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

            <ConfettiCannon
                count={200}
                origin={{ x: -10, y: 0 }}
                autoStart={false}
                ref={confettiRef}
                fadeOut={true}
            />
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    topBar: { width: '100%', paddingTop: 40, paddingBottom: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
    oyunContainer: { flexGrow: 1, alignItems: 'center', paddingTop: 20 },
    header: { marginBottom: 20, alignItems: 'center' },
    baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#1565C0' },
    bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
    oyunAlani: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '90%', maxWidth: 600 },
    sayiKutu: { width: ITEM_SIZE, height: ITEM_SIZE, margin: 10, justifyContent: 'center', alignItems: 'center', borderRadius: ITEM_SIZE / 2, borderWidth: 3 },
    sayiSecilmedi: { backgroundColor: 'white', borderColor: '#FFA726' },
    sayiSecildi: { backgroundColor: '#ddd', borderColor: '#ccc' },
    sayiYazi: { fontSize: FONT_SIZE, fontWeight: 'bold', color: '#333' },
});
