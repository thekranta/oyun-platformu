import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SIRALAMA_SAYILARI = [1, 2, 3, 4, 5];

interface SiralamaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

export default function SiralamaOyunu({ onGameEnd }: SiralamaOyunuProps) {
    const [karisikSayilar, setKarisikSayilar] = useState<any[]>([]);
    const [beklenenSayi, setBeklenenSayi] = useState(1);
    const [hamle, setHamle] = useState(0);
    const [hataSayisi, setHataSayisi] = useState(0);
    const [baslangicZamani] = useState(new Date());

    useEffect(() => {
        baslat();
    }, []);

    const baslat = () => {
        const karisik = [...SIRALAMA_SAYILARI].sort(() => Math.random() - 0.5)
            .map((sayi, index) => ({ id: index, sayi, tiklandi: false }));
        setKarisikSayilar(karisik);
        setBeklenenSayi(1);
    };

    const sayiSec = (index: number, sayi: number) => {
        if (karisikSayilar[index].tiklandi) return;
        const yeniHamle = hamle + 1;
        setHamle(yeniHamle);

        if (sayi === beklenenSayi) {
            const yeniSayilar = [...karisikSayilar];
            yeniSayilar[index].tiklandi = true;
            setKarisikSayilar(yeniSayilar);
            if (beklenenSayi === 5) {
                const bitisZamani = new Date();
                const sure = Math.round((bitisZamani.getTime() - baslangicZamani.getTime()) / 1000);
                onGameEnd('siralama', sure, yeniHamle, hataSayisi);
            }
            else setBeklenenSayi(b => b + 1);
        } else {
            const yeniHata = hataSayisi + 1;
            setHataSayisi(yeniHata);
            alert("Dikkat! Sıradaki sayı bu değil.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.oyunContainer}>
            <View style={styles.header}><Text style={styles.baslik}>🔢 Sıralama</Text></View>
            <Text style={styles.bilgi}>Sıradaki: {beklenenSayi}</Text>
            <View style={styles.oyunAlani}>
                {karisikSayilar.map((item, index) => (
                    <TouchableOpacity key={index} style={[styles.sayiKutu, item.tiklandi ? styles.sayiSecildi : styles.sayiSecilmedi]} onPress={() => sayiSec(index, item.sayi)} disabled={item.tiklandi}>
                        <Text style={styles.sayiYazi}>{item.sayi}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    oyunContainer: { flexGrow: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
    header: { marginBottom: 20 },
    baslik: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
    bilgi: { fontSize: 18, marginBottom: 20, color: '#555' },
    oyunAlani: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 320 },
    sayiKutu: { width: 60, height: 60, margin: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 30, borderWidth: 2 },
    sayiSecilmedi: { backgroundColor: 'white', borderColor: '#FFA726' },
    sayiSecildi: { backgroundColor: '#ddd', borderColor: '#ccc' },
    sayiYazi: { fontSize: 24, fontWeight: 'bold', color: '#333' },
});
