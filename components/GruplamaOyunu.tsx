import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

const GRUPLAMA_SORULARI = [
    { nesne: '🍎', kategori: 'Meyve' },
    { nesne: '🐶', kategori: 'Hayvan' },
    { nesne: '🍌', kategori: 'Meyve' },
    { nesne: '🐱', kategori: 'Hayvan' },
    { nesne: '🍇', kategori: 'Meyve' },
    { nesne: '🐭', kategori: 'Hayvan' },
];

interface GruplamaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

export default function GruplamaOyunu({ onGameEnd }: GruplamaOyunuProps) {
    const [sorular, setSorular] = useState<any[]>([]);
    const [suankiSoruIndex, setSuankiSoruIndex] = useState(0);
    const [dogruSayisi, setDogruSayisi] = useState(0);
    const [hamle, setHamle] = useState(0);
    const [hataSayisi, setHataSayisi] = useState(0);
    const [baslangicZamani] = useState(new Date());

    // Confetti Ref
    const confettiRef = useRef<ConfettiCannon>(null);

    useEffect(() => {
        baslat();
    }, []);

    const baslat = () => {
        const karisik = [...GRUPLAMA_SORULARI].sort(() => Math.random() - 0.5);
        setSorular(karisik);
        setSuankiSoruIndex(0);
        setDogruSayisi(0);
    };

    const kategoriSec = (secilenKategori: string) => {
        if (sorular.length === 0) return;

        const mevcutSoru = sorular[suankiSoruIndex];
        const yeniHamle = hamle + 1;
        setHamle(yeniHamle);

        if (secilenKategori === mevcutSoru.kategori) {
            // Doğru
            const yeniDogru = dogruSayisi + 1;
            setDogruSayisi(yeniDogru);

            if (suankiSoruIndex + 1 < sorular.length) {
                setSuankiSoruIndex(i => i + 1);
            } else {
                // Game Complete
                if (confettiRef.current) {
                    confettiRef.current.start();
                }

                setTimeout(() => {
                    const bitisZamani = new Date();
                    const sure = Math.round((bitisZamani.getTime() - baslangicZamani.getTime()) / 1000);
                    onGameEnd('gruplama', sure, yeniHamle, hataSayisi);
                }, 2000);
            }
        } else {
            // Yanlış
            const yeniHata = hataSayisi + 1;
            setHataSayisi(yeniHata);
            alert("Yanlış kutu! Tekrar dene.");
        }
    };

    if (sorular.length === 0) return null;

    const soru = sorular[suankiSoruIndex];

    return (
        <DynamicBackground>
            <View style={styles.topBar}>
                <ProgressBar current={suankiSoruIndex + 1} total={sorular.length} />
            </View>

            <View style={styles.merkezContainer}>
                <View style={styles.header}><Text style={styles.baslik}>🍎 Gruplama</Text></View>
                <Text style={styles.bilgi}>Bu nesne hangisi?</Text>

                {/* Ortadaki Nesne */}
                <View style={styles.buyukNesneKutusu}>
                    <Text style={{ fontSize: 80 }}>{soru.nesne}</Text>
                </View>

                {/* Şıklar */}
                <View style={styles.secenekContainer}>
                    <TouchableOpacity style={[styles.secenekButon, { backgroundColor: '#EF5350' }]} onPress={() => kategoriSec('Meyve')}>
                        <Text style={styles.secenekYazi}>🍎 Meyve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.secenekButon, { backgroundColor: '#8D6E63' }]} onPress={() => kategoriSec('Hayvan')}>
                        <Text style={styles.secenekYazi}>🐶 Hayvan</Text>
                    </TouchableOpacity>
                </View>
            </View>

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
    merkezContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { marginBottom: 20 },
    baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
    buyukNesneKutusu: { width: 150, height: 150, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderRadius: 20, marginBottom: 40, elevation: 5 },
    secenekContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    secenekButon: { flex: 0.48, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 3 },
    secenekYazi: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
