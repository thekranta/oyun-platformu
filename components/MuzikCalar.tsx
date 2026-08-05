import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { asset } from '../lib/assetMap';
import {
    Animated,
    Easing,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const MP_USE_NATIVE = Platform.OS !== 'web';

// Calarken zıplayan ekolayzer çubukları.
function EqualizerBars({ active, color = '#fff' }: { active: boolean; color?: string }) {
    const vals = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.3))).current;
    useEffect(() => {
        const loops = vals.map((v, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(v, { toValue: 1, duration: 380 + i * 90, useNativeDriver: MP_USE_NATIVE }),
                    Animated.timing(v, { toValue: 0.3, duration: 380 + i * 90, useNativeDriver: MP_USE_NATIVE }),
                ]),
            ),
        );
        if (active) loops.forEach((l) => l.start());
        return () => loops.forEach((l) => l.stop());
    }, [active, vals]);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 24, gap: 5, marginVertical: 8 }}>
            {vals.map((v, i) => (
                <Animated.View
                    key={i}
                    style={{ width: 6, height: 22, borderRadius: 4, backgroundColor: color, opacity: 0.9, transform: [{ scaleY: active ? v : 0.3 }] }}
                />
            ))}
        </View>
    );
}

const MP_CATS: { key: 'tumu' | 'yeniler' | 'degerler' | 'matematik' | 'fen' | 'sosyal-duygusal'; label: string }[] = [
    { key: 'tumu', label: '🎵 Tümü' },
    { key: 'yeniler', label: '✨ Yeni' },
    { key: 'matematik', label: '🔢 Matematik' },
    { key: 'fen', label: '🔬 Fen' },
    { key: 'degerler', label: '❤️ Değerler' },
    { key: 'sosyal-duygusal', label: '💜 Sosyal' },
];

export interface Song {
    id: string;
    title: string;
    artist: string;
    source: any;
    coverColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    category?: 'genel' | 'degerler' | 'matematik' | 'fen' | 'sosyal-duygusal' | 'yeniler';
}

export const SONGS: Song[] = [
    {
        id: '1',
        title: 'ChildhoodTech Şarkısı V1',
        artist: 'Web Sitemiz İçin',
        source: asset('/sounds/songs/CHILDHOODTECH_SARKISI_V1.mp3'),
        coverColor: '#FFD54F', // Sarı
        icon: 'musical-notes',
    },
    {
        id: '2',
        title: 'ChildhoodTech Şarkısı V2',
        artist: 'Tanıtım Müziği',
        source: asset('/sounds/songs/CHILDHOODTECH_SARKISI_V2.mp3'),
        coverColor: '#4ECDC4', // Turkuaz
        icon: 'planet',
    },
    {
        id: '3',
        title: 'Adil Oyun, Güzel Oyun',
        artist: 'Değerler Eğitimi',
        source: asset('/sounds/songs/ADIL_OYUN_GUZEL_OYUN.mp3'),
        coverColor: '#FF7043', // Turuncu
        icon: 'heart',
    },
    {
        id: '4',
        title: 'Paylaşınca Güzel',
        artist: 'Sosyal-Duygusal - Paylaşma',
        source: asset('/sounds/songs/PAYLASINCA_GUZEL.mp3'),
        coverColor: '#AB47BC', // Mor
        icon: 'people',
        category: 'sosyal-duygusal',
    },
    {
        id: '5',
        title: 'Çalışkan Arı Gibi',
        artist: 'Sorumluluk',
        source: asset('/sounds/songs/CALISKAN_ARI_GIBI.mp3'),
        coverColor: '#66BB6A', // Yeşil
        icon: 'leaf',
    },
    {
        id: '6',
        title: 'Doğru Söylerim',
        artist: 'Dürüstlük',
        source: asset('/sounds/songs/DOGRU_SOYLERIM.mp3'),
        coverColor: '#42A5F5', // Mavi
        icon: 'checkmark-circle',
    },
    {
        id: '7',
        title: 'Biz Bir Aileyiz',
        artist: 'Aile Sevgisi',
        source: asset('/sounds/songs/BIZ_BIR_AILEYIZ.mp3'),
        coverColor: '#EC407A', // Pembe
        icon: 'home',
    },
    {
        id: '8',
        title: 'Beklerim Sakince',
        artist: 'Sosyal-Duygusal - Sabır',
        source: asset('/sounds/songs/BEKLERIM_SAKINCE.mp3'),
        coverColor: '#78909C', // Gri Mavi
        icon: 'hourglass',
        category: 'sosyal-duygusal',
    },
    {
        id: '9',
        title: 'Benim Özel Alanım',
        artist: 'Mahremiyet',
        source: asset('/sounds/songs/BENIM_OZEL_ALANIM.mp3'),
        coverColor: '#BA68C8', // Mor
        icon: 'lock-closed',
    },
    {
        id: '10',
        title: 'Güzeli Görürüm',
        artist: 'Sosyal-Duygusal - Pozitif Bakış',
        source: asset('/sounds/songs/GUZELI_GURURUM.mp3'),
        coverColor: '#26A69A', // Yeşil
        icon: 'eye',
        category: 'sosyal-duygusal',
    },
    {
        id: '11',
        title: 'Kalbim Duyarlı',
        artist: 'Sosyal-Duygusal - Duyarlılık',
        source: asset('/sounds/songs/KALBIM_DUYARLI.mp3'),
        coverColor: '#FF7043', // Turuncu
        icon: 'heart-circle',
        category: 'sosyal-duygusal',
    },
    {
        id: '12',
        title: 'Sadece Yaptım',
        artist: 'Alçakgönüllülük',
        source: asset('/sounds/songs/SADECE_YAPTIM.mp3'),
        coverColor: '#5C6BC0', // İndigo
        icon: 'star',
    },
    {
        id: '13',
        title: 'Seçerim, Söylerim',
        artist: 'İfade Özgürlüğü',
        source: asset('/sounds/songs/SECERIM_SOYLERIM.mp3'),
        coverColor: '#FFA726', // Sarı Turuncu
        icon: 'mic',
    },
    {
        id: '14',
        title: 'Yumuşacık Merhamet',
        artist: 'Sosyal-Duygusal - Merhamet',
        source: asset('/sounds/songs/YUMUSACIK_MERHAMET.mp3'),
        coverColor: '#F06292', // Açık Pembe
        icon: 'rose',
        category: 'sosyal-duygusal',
    },
    {
        id: '15',
        title: 'Çıtır Çıtır Dostluk',
        artist: 'Sosyal-Duygusal - Dostluk',
        source: asset('/sounds/songs/CITIR_CITIR_DOSTLUK.mp3'),
        coverColor: '#8D6E63', // Kahverengi
        icon: 'people-circle',
        category: 'sosyal-duygusal',
    },
    {
        id: '16',
        title: 'Az Az Kullanırım',
        artist: 'Teknoloji Kullanımı',
        source: asset('/sounds/songs/AZ_AZ_KULLANIRIM.mp3'),
        coverColor: '#9575CD', // Açık Mor
        icon: 'phone-portrait',
    },
    {
        id: '17',
        title: 'Benim Görevim',
        artist: 'Sorumluluk',
        source: asset('/sounds/songs/BENIM_GOREVIM.mp3'),
        coverColor: '#4DB6AC', // Turkuaz
        icon: 'clipboard',
    },
    {
        id: '18',
        title: 'Kalbimde Sevgi Var',
        artist: 'Sosyal-Duygusal - Sevgi',
        source: asset('/sounds/songs/KALBIMDE_SEVGI_VAR.mp3'),
        coverColor: '#E91E63', // Kırmızı Pembe
        icon: 'heart',
        category: 'sosyal-duygusal',
    },
    {
        id: '19',
        title: 'Lütfen, Teşekkür',
        artist: 'Nezaket',
        source: asset('/sounds/songs/LUTFEN_TESEKKUR.mp3'),
        coverColor: '#81C784', // Yeşil
        icon: 'happy',
    },
    {
        id: '20',
        title: 'Sağlıklı Yaşam',
        artist: 'Sağlık',
        source: asset('/sounds/songs/SAGLIKLI_YASAM.mp3'),
        coverColor: '#4CAF50', // Yeşil
        icon: 'fitness',
    },
    {
        id: '21',
        title: 'Yurdumu Severim',
        artist: 'Vatan Sevgisi',
        source: asset('/sounds/songs/YURDUMU_SEVERIM.mp3'),
        coverColor: '#E53935', // Kırmızı
        icon: 'flag',
    },
    {
        id: '22',
        title: 'Şıp Şıp Tertemiz',
        artist: 'Temizlik',
        source: asset('/sounds/songs/SIP_SIP_TERTEMIZ.mp3'),
        coverColor: '#29B6F6', // Açık Mavi
        icon: 'water',
    },
    // === MATEMATİK ŞARKILARI ===
    {
        id: '23',
        title: 'Bir Bakışta Kaç?',
        artist: 'Matematik - Subitizing',
        source: asset('/sounds/songs/BIR_BAKISTA_KAC.mp3'),
        coverColor: '#7E57C2', // Mor
        icon: 'eye',
    },
    {
        id: '24',
        title: 'Birden Ona Ritmim Var',
        artist: 'Matematik - 1\'den 10\'a',
        source: asset('/sounds/songs/BIRDEN_ONA_RITMIM_VAR.mp3'),
        coverColor: '#26C6DA', // Cyan
        icon: 'musical-notes',
    },
    {
        id: '25',
        title: 'Birer Birer Say!',
        artist: 'Matematik - Sayma',
        source: asset('/sounds/songs/BIRER_BIRER_SAY.mp3'),
        coverColor: '#66BB6A', // Yeşil
        icon: 'calculator',
    },
    {
        id: '26',
        title: 'On Birden Yirmiye Tren',
        artist: 'Matematik - 11\'den 20\'ye',
        source: asset('/sounds/songs/ON_BIRDEN_YIRMIYE_TREN.mp3'),
        coverColor: '#EF5350', // Kırmızı
        icon: 'train',
    },
    {
        id: '27',
        title: 'Sayıdan Başla!',
        artist: 'Matematik - İleriye Sayma',
        source: asset('/sounds/songs/SAYIDAN_BASLA.mp3'),
        coverColor: '#FFA726', // Turuncu
        icon: 'arrow-forward',
    },
    {
        id: '28',
        title: 'Çok mu, Az mı?',
        artist: 'Matematik - Karşılaştırma',
        source: asset('/sounds/songs/COK_MU_AZ_MI.mp3'),
        coverColor: '#42A5F5', // Mavi
        icon: 'scale',
    },
    {
        id: '29',
        title: 'Nerede Bu Elma?',
        artist: 'Matematik - Arama',
        source: asset('/sounds/songs/NEREDE_BU_ELMA.mp3'),
        coverColor: '#E53935', // K??rm??z??
        icon: 'search',
    },
    {
        id: '29b',
        title: 'Nerede Bu Elma? (V2)',
        artist: 'Yeni - Matematik - Arama',
        source: asset('/sounds/songs/NEREDE_BU_ELMA_V2.mp3'),
        coverColor: '#EC407A', // Pembe
        icon: 'sparkles',
        category: 'yeniler',
    },
    {
        id: '30',
        title: 'Bir, İki, Üç, Dört Derken',
        artist: 'Matematik - Sayma',
        source: asset('/sounds/songs/BIR_IKI_UC_DORT_DERKEN.mp3'),
        coverColor: '#9C27B0', // Mor
        icon: 'footsteps',
    },
    {
        id: '31',
        title: 'Kare Derler Adıma',
        artist: 'Matematik - Şekiller',
        source: asset('/sounds/songs/KARE_DERLER_ADIMA.mp3'),
        coverColor: '#00BCD4', // Cyan
        icon: 'shapes',
    },
    {
        id: '32',
        title: 'Örüntü Treni',
        artist: 'Matematik - Örüntü',
        source: asset('/sounds/songs/ORUNTU_TRENI.mp3'),
        coverColor: '#FF5722', // Turuncu
        icon: 'train',
    },
    // === FEN EĞİTİMİ ŞARKILARI ===
    {
        id: '33',
        title: 'Beş Duyum',
        artist: 'Fen - Duyu Organları',
        source: asset('/sounds/songs/BES_DUYUM.mp3'),
        coverColor: '#8BC34A', // Yeşil
        icon: 'body',
    },
    {
        id: '34',
        title: 'Geri Dönüşüm',
        artist: 'Fen - Çevre',
        source: asset('/sounds/songs/GERI_DONUSUM_KAHRAMANLARI.mp3'),
        coverColor: '#4CAF50', // Koyu Yeşil
        icon: 'leaf',
    },
    {
        id: '35',
        title: 'Canlıların Evi',
        artist: 'Fen - Yaşam Alanları',
        source: asset('/sounds/songs/CANLILARIN_EVI.mp3'),
        coverColor: '#009688', // Teal
        icon: 'earth',
        category: 'fen',
    },
    // === SOSYAL-DUYGUSAL GELİŞİM ŞARKILARI ===
    {
        id: '36',
        title: 'Ben Biriciğim',
        artist: 'Sosyal-Duygusal - Özgüven',
        source: asset('/sounds/songs/BEN_BIRICIGIM.mp3'),
        coverColor: '#E91E63', // Pembe
        icon: 'star',
        category: 'sosyal-duygusal',
    },
    {
        id: '37',
        title: 'Duygu Ormanı',
        artist: 'Sosyal-Duygusal - Duygular',
        source: asset('/sounds/songs/DUYGU_ORMANI.mp3'),
        coverColor: '#4CAF50', // Yeşil
        icon: 'leaf',
        category: 'sosyal-duygusal',
    },
    {
        id: '38',
        title: 'Nefes Al ve Dur',
        artist: 'Sosyal-Duygusal - Öz Düzenleme',
        source: asset('/sounds/songs/NEFES_AL_VE_DUR.mp3'),
        coverColor: '#00BCD4', // Cyan
        icon: 'cloudy',
        category: 'sosyal-duygusal',
    },
    {
        id: '39',
        title: 'Lütfen ve Teşekkürler',
        artist: 'Sosyal-Duygusal - Nezaket',
        source: asset('/sounds/songs/LUTFEN_VE_TESEKKURLER.mp3'),
        coverColor: '#FFC107', // Sarı
        icon: 'happy',
        category: 'sosyal-duygusal',
    },
    {
        id: '40',
        title: 'Senin Gözünle',
        artist: 'Sosyal-Duygusal - Empati',
        source: asset('/sounds/songs/SENIN_GOZUNLE.mp3'),
        coverColor: '#9C27B0', // Mor
        icon: 'eye',
        category: 'sosyal-duygusal',
    },
    {
        id: '41',
        title: 'Çözüm Bulalım',
        artist: 'Sosyal-Duygusal - Problem Çözme',
        source: asset('/sounds/songs/COZUM_BULALIM.mp3'),
        coverColor: '#FF5722', // Turuncu
        icon: 'bulb',
        category: 'sosyal-duygusal',
    },
];

interface MuzikCalarProps {
    onExit: () => void;
    initialSongIndex?: number;
}

export default function MuzikCalar({ onExit, initialSongIndex = 0 }: MuzikCalarProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    // Yetim-ses koruması: hızlı şarkı değiştirmede eski createAsync sonucu sızmasın diye
    // token; unmount temizliği her zaman güncel Sound'u tutan ref üzerinden yapılır
    // (MuzikDuruncaDon ile aynı desen).
    const soundRef = useRef<Audio.Sound | null>(null);
    const loadTokenRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSongIndex, setCurrentSongIndex] = useState(initialSongIndex);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [selectedCategory, setSelectedCategory] = useState<'tumu' | 'yeniler' | 'degerler' | 'matematik' | 'fen' | 'sosyal-duygusal'>('tumu');

    // handleSongFinish, ses callback'i icinde eski closure'dan calisir; guncel degerleri
    // ref'lerden okuyoruz (yoksa oto-gecis yanlis sarkiya gider, tekrar modu ulasmaz).
    const currentSongIndexRef = useRef(currentSongIndex);
    currentSongIndexRef.current = currentSongIndex;
    const repeatModeRef = useRef(repeatMode);
    repeatModeRef.current = repeatMode;

    const currentSong = SONGS[currentSongIndex];

    // Calarken donen plak
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: MP_USE_NATIVE }),
        );
        if (isPlaying) {
            spin.setValue(0);
            loop.start();
        }
        return () => loop.stop();
    }, [isPlaying, spin]);
    const discRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    // Kategori filtreleme
    const filteredSongs = selectedCategory === 'tumu'
        ? SONGS
        : SONGS.filter(song => {
            if (selectedCategory === 'yeniler') {
                return song.category === 'yeniler';
            }
            if (selectedCategory === 'sosyal-duygusal') {
                return song.category === 'sosyal-duygusal';
            }
            if (selectedCategory === 'matematik') {
                return song.category === 'matematik' || song.artist.toLowerCase().includes('matematik');
            }
            if (selectedCategory === 'fen') {
                return song.category === 'fen' || song.artist.toLowerCase().includes('fen');
            }
            if (selectedCategory === 'degerler') {
                // Değerler: kategori atanmamış şarkılar (ChildhoodTech hariç) ve category='degerler' olanlar
                // Sosyal-duygusal, matematik, fen hariç
                const isSosyalDuygusal = song.category === 'sosyal-duygusal';
                const isMatematik = song.category === 'matematik' || song.artist.toLowerCase().includes('matematik');
                const isFen = song.category === 'fen' || song.artist.toLowerCase().includes('fen');
                const isChildhoodTech = song.id === '1' || song.id === '2';

                return !isSosyalDuygusal && !isMatematik && !isFen && !isChildhoodTech;
            }
            return true;
        });

    useEffect(() => {
        // Load the initial song when component mounts
        loadSound(initialSongIndex);
        return () => {
            // Uçuştaki createAsync sonuçlarını geçersiz kıl + güncel sesi boşalt
            loadTokenRef.current += 1;
            soundRef.current?.unloadAsync().catch(() => { });
            soundRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSound = async (index: number) => {
        const token = ++loadTokenRef.current;
        try {
            if (soundRef.current) {
                const prev = soundRef.current;
                soundRef.current = null;
                await prev.unloadAsync().catch(() => { });
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                SONGS[index].source,
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            // Bu yükleme sırasında yenisi istendiyse/çıkıldıysa: yetim bırakma, boşalt
            if (token !== loadTokenRef.current) {
                newSound.unloadAsync().catch(() => { });
                return;
            }

            soundRef.current = newSound;
            setSound(newSound);
            setIsPlaying(true);
            setCurrentSongIndex(index);
        } catch (error) {
            console.error('Ses yükleme hatası:', error);
        }
    };

    const handleSongFinish = async () => {
        // Guncel degerler ref'lerden (callback eski closure tutar)
        const repeat = repeatModeRef.current;
        const songIndex = currentSongIndexRef.current;
        if (repeat === 'one') {
            // Repeat current song
            if (sound) {
                await sound.setPositionAsync(0);
                await sound.playAsync();
            }
        } else if (repeat === 'all') {
            // Play next song, loop to beginning if at end
            const nextIndex = (songIndex + 1) % SONGS.length;
            loadSound(nextIndex);
        } else {
            // No repeat - play next if available
            if (songIndex < SONGS.length - 1) {
                loadSound(songIndex + 1);
            } else {
                setIsPlaying(false);
            }
        }
    };

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 1);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                handleSongFinish();
            }
        }
    };

    const togglePlayback = async () => {
        if (!sound) {
            await loadSound(currentSongIndex);
        } else {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        }
    };

    const playNext = () => {
        const nextIndex = (currentSongIndex + 1) % SONGS.length;
        loadSound(nextIndex);
    };

    const playPrevious = () => {
        const prevIndex = (currentSongIndex - 1 + SONGS.length) % SONGS.length;
        loadSound(prevIndex);
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const progress = position / duration;

    return (
        <View style={styles.mpContainer}>
            <View style={styles.mpHeader}>
                <TouchableOpacity style={styles.mpBack} onPress={onExit} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#3a1d6e" />
                </TouchableOpacity>
                <Text style={styles.mpTitle}>🎵 Müzik Kutusu</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.mpScroll} showsVerticalScrollIndicator={false}>
                {/* Now Playing */}
                <View style={[styles.mpNow, { backgroundColor: currentSong.coverColor }]}>
                    <Animated.View style={[styles.mpDisc, { transform: [{ rotate: discRotate }] }]}>
                        <View style={styles.mpDiscHole} />
                        <Ionicons name={currentSong.icon} size={52} color="#fff" />
                    </Animated.View>
                    <Text style={styles.mpNowTitle} numberOfLines={1}>{currentSong.title}</Text>
                    <Text style={styles.mpNowArtist} numberOfLines={1}>{currentSong.artist}</Text>

                    <EqualizerBars active={isPlaying} />

                    <View style={styles.mpBarBg}>
                        <View style={[styles.mpBarFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} />
                    </View>
                    <View style={styles.mpTimes}>
                        <Text style={styles.mpTime}>{formatTime(position)}</Text>
                        <Text style={styles.mpTime}>{formatTime(duration)}</Text>
                    </View>

                    <View style={styles.mpControls}>
                        <TouchableOpacity style={styles.mpCtrlSm} onPress={playPrevious} activeOpacity={0.8}>
                            <Ionicons name="play-skip-back" size={30} color={currentSong.coverColor} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mpPlay} onPress={togglePlayback} activeOpacity={0.85}>
                            <Ionicons name={isPlaying ? 'pause' : 'play'} size={48} color={currentSong.coverColor} style={{ marginLeft: isPlaying ? 0 : 5 }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mpCtrlSm} onPress={playNext} activeOpacity={0.8}>
                            <Ionicons name="play-skip-forward" size={30} color={currentSong.coverColor} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.mpRepeatRow}>
                        <TouchableOpacity
                            onPress={() => setRepeatMode(repeatMode === 'one' ? 'none' : 'one')}
                            style={[styles.mpRepeat, repeatMode === 'one' && styles.mpRepeatOn]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="repeat" size={18} color="#fff" />
                            <Text style={styles.mpRepeatText}>Şarkı</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setRepeatMode(repeatMode === 'all' ? 'none' : 'all')}
                            style={[styles.mpRepeat, repeatMode === 'all' && styles.mpRepeatOn]}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="sync" size={18} color="#fff" />
                            <Text style={styles.mpRepeatText}>Liste</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Kategori filtreleri */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mpChips}>
                    {MP_CATS.map((c) => (
                        <TouchableOpacity
                            key={c.key}
                            onPress={() => setSelectedCategory(c.key)}
                            style={[styles.mpChip, selectedCategory === c.key && styles.mpChipOn]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.mpChipText, selectedCategory === c.key && styles.mpChipTextOn]}>{c.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Şarkı listesi */}
                <View style={styles.mpList}>
                    {filteredSongs.map((song) => {
                        const songIndex = SONGS.findIndex((s) => s.id === song.id);
                        const on = songIndex === currentSongIndex;
                        return (
                            <TouchableOpacity
                                key={song.id}
                                onPress={() => loadSound(songIndex)}
                                style={[styles.mpRow, on && styles.mpRowOn]}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.mpCover, { backgroundColor: song.coverColor }]}>
                                    <Ionicons name={song.icon} size={22} color="#fff" />
                                </View>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={[styles.mpRowTitle, on && { color: '#2a2350' }]} numberOfLines={1}>{song.title}</Text>
                                    <Text style={styles.mpRowArtist} numberOfLines={1}>{song.artist}</Text>
                                </View>
                                <Ionicons name={on && isPlaying ? 'volume-high' : 'play'} size={22} color={on ? '#ff3d81' : '#b0a7d6'} />
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
  // ===== Eğlenceli medya çalar =====
  mpContainer: { flex: 1, backgroundColor: '#EDE7FF' },
  mpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 12 },
  mpBack: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  mpTitle: { fontSize: 22, fontWeight: '900', color: '#3a1d6e' },
  mpScroll: { padding: 16, paddingBottom: 44, alignItems: 'center' },

  mpNow: { width: '100%', maxWidth: 460, borderRadius: 28, padding: 20, alignItems: 'center', marginBottom: 16, backgroundColor: '#A24BFF', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 8 },
  mpDisc: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 8, borderColor: 'rgba(0,0,0,0.18)', marginBottom: 12 },
  mpDiscHole: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.9)' },
  mpNowTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2 },
  mpNowArtist: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700', marginTop: 2 },
  mpBarBg: { width: '100%', height: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden', marginTop: 4 },
  mpBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 8 },
  mpTimes: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 6, marginBottom: 12 },
  mpTime: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },
  mpControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  mpCtrlSm: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 4 },
  mpPlay: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 1, elevation: 5 },
  mpRepeatRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  mpRepeat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.2)' },
  mpRepeatOn: { backgroundColor: 'rgba(255,255,255,0.45)' },
  mpRepeatText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  mpChips: { gap: 8, paddingVertical: 4, paddingHorizontal: 2 },
  mpChip: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 999, backgroundColor: 'rgba(122,43,214,0.12)' },
  mpChipOn: { backgroundColor: '#3a1d6e' },
  mpChipText: { fontSize: 13, fontWeight: '800', color: '#3a1d6e' },
  mpChipTextOn: { color: '#fff' },

  mpList: { width: '100%', maxWidth: 460, marginTop: 12, gap: 10 },
  mpRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 18, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  mpRowOn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#FF6AA9' },
  mpCover: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mpRowTitle: { fontWeight: '800', color: '#3a3357', fontSize: 15 },
  mpRowArtist: { fontSize: 12, color: '#8a85a3', marginTop: 1 },

    container: {
        flex: 1,
        backgroundColor: '#FFF9C4', // Krem/Pastel sarı arka plan
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
    },
    backButton: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#546E7A',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    coverContainer: {
        marginTop: 20,
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    coverContainerSmall: {
        marginTop: 12,
        marginBottom: 20,
    },
    coverCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 6,
        borderColor: '#fff',
    },
    noteDecor: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 8,
        borderRadius: 20,
        elevation: 4,
    },
    infoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    songTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#37474F',
        textAlign: 'center',
        marginBottom: 5,
    },
    artistName: {
        fontSize: 16,
        color: '#78909C',
        fontWeight: '500',
    },
    progressContainer: {
        width: '100%',
        marginBottom: 30,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        width: '100%',
        overflow: 'visible', // Knob için
        justifyContent: 'center',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressKnob: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#fff',
        marginLeft: -10, // Merkezi hizala
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    timeText: {
        fontSize: 12,
        color: '#90A4AE',
        fontWeight: 'bold',
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        flexWrap: 'wrap',
        marginBottom: 40,
    },
    controlButtonSmall: {
        position: 'relative',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 2,
        marginBottom: 8,
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: '#fff',
    },
    listTitle: {
        alignSelf: 'flex-start',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#546E7A',
        marginBottom: 10,
    },
    listContainer: {
        width: '100%',
        flex: 1,
    },
    songItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 10,
        elevation: 1,
    },
    songIconSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    songItemInfo: {
        flex: 1,
    },
    songItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#455A64',
    },
    songItemArtist: {
        fontSize: 12,
        color: '#90A4AE',
    },
    repeatBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        fontSize: 10,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: '#FF5722',
        width: 14,
        height: 14,
        borderRadius: 7,
        textAlign: 'center',
        lineHeight: 14,
        overflow: 'hidden',
    },
    skipLabel: {
        position: 'absolute',
        bottom: 2,
        right: 5,
        fontSize: 8,
        fontWeight: 'bold',
        color: '#546E7A',
    },
    categoryTabsContainer: {
        marginBottom: 12,
        maxHeight: 45,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 20,
        marginRight: 8,
    },
    categoryTabActive: {
        backgroundColor: '#546E7A',
    },
    categoryTabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#546E7A',
    },
    categoryTabTextActive: {
        color: '#fff',
    },
});
