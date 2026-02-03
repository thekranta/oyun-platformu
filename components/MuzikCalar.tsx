import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface Song {
    id: string;
    title: string;
    artist: string;
    source: any;
    coverColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    category?: 'genel' | 'degerler' | 'matematik' | 'fen' | 'sosyal-duygusal';
}

export const SONGS: Song[] = [
    {
        id: '1',
        title: 'ChildhoodTech Şarkısı V1',
        artist: 'Web Sitemiz İçin',
        source: { uri: '/sounds/songs/CHILDHOODTECH_SARKISI_V1.mp3' },
        coverColor: '#FFD54F', // Sarı
        icon: 'musical-notes',
    },
    {
        id: '2',
        title: 'ChildhoodTech Şarkısı V2',
        artist: 'Tanıtım Müziği',
        source: { uri: '/sounds/songs/CHILDHOODTECH_SARKISI_V2.mp3' },
        coverColor: '#4ECDC4', // Turkuaz
        icon: 'planet',
    },
    {
        id: '3',
        title: 'Adil Oyun, Güzel Oyun',
        artist: 'Değerler Eğitimi',
        source: { uri: '/sounds/songs/ADIL_OYUN_GUZEL_OYUN.mp3' },
        coverColor: '#FF7043', // Turuncu
        icon: 'heart',
    },
    {
        id: '4',
        title: 'Paylaşınca Güzel',
        artist: 'Sosyal-Duygusal - Paylaşma',
        source: { uri: '/sounds/songs/PAYLASINCA_GUZEL.mp3' },
        coverColor: '#AB47BC', // Mor
        icon: 'people',
        category: 'sosyal-duygusal',
    },
    {
        id: '5',
        title: 'Çalışkan Arı Gibi',
        artist: 'Sorumluluk',
        source: { uri: '/sounds/songs/CALISKAN_ARI_GIBI.mp3' },
        coverColor: '#66BB6A', // Yeşil
        icon: 'leaf',
    },
    {
        id: '6',
        title: 'Doğru Söylerim',
        artist: 'Dürüstlük',
        source: { uri: '/sounds/songs/DOGRU_SOYLERIM.mp3' },
        coverColor: '#42A5F5', // Mavi
        icon: 'checkmark-circle',
    },
    {
        id: '7',
        title: 'Biz Bir Aileyiz',
        artist: 'Aile Sevgisi',
        source: { uri: '/sounds/songs/BIZ_BIR_AILEYIZ.mp3' },
        coverColor: '#EC407A', // Pembe
        icon: 'home',
    },
    {
        id: '8',
        title: 'Beklerim Sakince',
        artist: 'Sosyal-Duygusal - Sabır',
        source: { uri: '/sounds/songs/BEKLERIM_SAKINCE.mp3' },
        coverColor: '#78909C', // Gri Mavi
        icon: 'hourglass',
        category: 'sosyal-duygusal',
    },
    {
        id: '9',
        title: 'Benim Özel Alanım',
        artist: 'Mahremiyet',
        source: { uri: '/sounds/songs/BENIM_OZEL_ALANIM.mp3' },
        coverColor: '#BA68C8', // Mor
        icon: 'lock-closed',
    },
    {
        id: '10',
        title: 'Güzeli Görürüm',
        artist: 'Sosyal-Duygusal - Pozitif Bakış',
        source: { uri: '/sounds/songs/GUZELI_GURURUM.mp3' },
        coverColor: '#26A69A', // Yeşil
        icon: 'eye',
        category: 'sosyal-duygusal',
    },
    {
        id: '11',
        title: 'Kalbim Duyarlı',
        artist: 'Sosyal-Duygusal - Duyarlılık',
        source: { uri: '/sounds/songs/KALBIM_DUYARLI.mp3' },
        coverColor: '#FF7043', // Turuncu
        icon: 'heart-circle',
        category: 'sosyal-duygusal',
    },
    {
        id: '12',
        title: 'Sadece Yaptım',
        artist: 'Alçakgönüllülük',
        source: { uri: '/sounds/songs/SADECE_YAPTIM.mp3' },
        coverColor: '#5C6BC0', // İndigo
        icon: 'star',
    },
    {
        id: '13',
        title: 'Seçerim, Söylerim',
        artist: 'İfade Özgürlüğü',
        source: { uri: '/sounds/songs/SECERIM_SOYLERIM.mp3' },
        coverColor: '#FFA726', // Sarı Turuncu
        icon: 'mic',
    },
    {
        id: '14',
        title: 'Yumuşacık Merhamet',
        artist: 'Sosyal-Duygusal - Merhamet',
        source: { uri: '/sounds/songs/YUMUSACIK_MERHAMET.mp3' },
        coverColor: '#F06292', // Açık Pembe
        icon: 'rose',
        category: 'sosyal-duygusal',
    },
    {
        id: '15',
        title: 'Çıtır Çıtır Dostluk',
        artist: 'Sosyal-Duygusal - Dostluk',
        source: { uri: '/sounds/songs/CITIR_CITIR_DOSTLUK.mp3' },
        coverColor: '#8D6E63', // Kahverengi
        icon: 'people-circle',
        category: 'sosyal-duygusal',
    },
    {
        id: '16',
        title: 'Az Az Kullanırım',
        artist: 'Teknoloji Kullanımı',
        source: { uri: '/sounds/songs/AZ_AZ_KULLANIRIM.mp3' },
        coverColor: '#9575CD', // Açık Mor
        icon: 'phone-portrait',
    },
    {
        id: '17',
        title: 'Benim Görevim',
        artist: 'Sorumluluk',
        source: { uri: '/sounds/songs/BENIM_GOREVIM.mp3' },
        coverColor: '#4DB6AC', // Turkuaz
        icon: 'clipboard',
    },
    {
        id: '18',
        title: 'Kalbimde Sevgi Var',
        artist: 'Sosyal-Duygusal - Sevgi',
        source: { uri: '/sounds/songs/KALBIMDE_SEVGI_VAR.mp3' },
        coverColor: '#E91E63', // Kırmızı Pembe
        icon: 'heart',
        category: 'sosyal-duygusal',
    },
    {
        id: '19',
        title: 'Lütfen, Teşekkür',
        artist: 'Nezaket',
        source: { uri: '/sounds/songs/LUTFEN_TESEKKUR.mp3' },
        coverColor: '#81C784', // Yeşil
        icon: 'happy',
    },
    {
        id: '20',
        title: 'Sağlıklı Yaşam',
        artist: 'Sağlık',
        source: { uri: '/sounds/songs/SAGLIKLI_YASAM.mp3' },
        coverColor: '#4CAF50', // Yeşil
        icon: 'fitness',
    },
    {
        id: '21',
        title: 'Yurdumu Severim',
        artist: 'Vatan Sevgisi',
        source: { uri: '/sounds/songs/YURDUMU_SEVERIM.mp3' },
        coverColor: '#E53935', // Kırmızı
        icon: 'flag',
    },
    {
        id: '22',
        title: 'Şıp Şıp Tertemiz',
        artist: 'Temizlik',
        source: { uri: '/sounds/songs/SIP_SIP_TERTEMIZ.mp3' },
        coverColor: '#29B6F6', // Açık Mavi
        icon: 'water',
    },
    // === MATEMATİK ŞARKILARI ===
    {
        id: '23',
        title: 'Bir Bakışta Kaç?',
        artist: 'Matematik - Subitizing',
        source: { uri: '/sounds/songs/BIR_BAKISTA_KAC.mp3' },
        coverColor: '#7E57C2', // Mor
        icon: 'eye',
    },
    {
        id: '24',
        title: 'Birden Ona Ritmim Var',
        artist: 'Matematik - 1\'den 10\'a',
        source: { uri: '/sounds/songs/BIRDEN_ONA_RITMIM_VAR.mp3' },
        coverColor: '#26C6DA', // Cyan
        icon: 'musical-notes',
    },
    {
        id: '25',
        title: 'Birer Birer Say!',
        artist: 'Matematik - Sayma',
        source: { uri: '/sounds/songs/BIRER_BIRER_SAY.mp3' },
        coverColor: '#66BB6A', // Yeşil
        icon: 'calculator',
    },
    {
        id: '26',
        title: 'On Birden Yirmiye Tren',
        artist: 'Matematik - 11\'den 20\'ye',
        source: { uri: '/sounds/songs/ON_BIRDEN_YIRMIYE_TREN.mp3' },
        coverColor: '#EF5350', // Kırmızı
        icon: 'train',
    },
    {
        id: '27',
        title: 'Sayıdan Başla!',
        artist: 'Matematik - İleriye Sayma',
        source: { uri: '/sounds/songs/SAYIDAN_BASLA.mp3' },
        coverColor: '#FFA726', // Turuncu
        icon: 'arrow-forward',
    },
    {
        id: '28',
        title: 'Çok mu, Az mı?',
        artist: 'Matematik - Karşılaştırma',
        source: { uri: '/sounds/songs/COK_MU_AZ_MI.mp3' },
        coverColor: '#42A5F5', // Mavi
        icon: 'scale',
    },
    {
        id: '29',
        title: 'Nerede Bu Elma?',
        artist: 'Matematik - Arama',
        source: { uri: '/sounds/songs/NEREDE_BU_ELMA.mp3' },
        coverColor: '#E53935', // Kırmızı
        icon: 'search',
    },
    {
        id: '30',
        title: 'Bir, İki, Üç, Dört Derken',
        artist: 'Matematik - Sayma',
        source: { uri: '/sounds/songs/BIR_IKI_UC_DORT_DERKEN.mp3' },
        coverColor: '#9C27B0', // Mor
        icon: 'footsteps',
    },
    {
        id: '31',
        title: 'Kare Derler Adıma',
        artist: 'Matematik - Şekiller',
        source: { uri: '/sounds/songs/KARE_DERLER_ADIMA.mp3' },
        coverColor: '#00BCD4', // Cyan
        icon: 'shapes',
    },
    {
        id: '32',
        title: 'Örüntü Treni',
        artist: 'Matematik - Örüntü',
        source: { uri: '/sounds/songs/ORUNTU_TRENI.mp3' },
        coverColor: '#FF5722', // Turuncu
        icon: 'train',
    },
    // === FEN EĞİTİMİ ŞARKILARI ===
    {
        id: '33',
        title: 'Beş Duyum',
        artist: 'Fen - Duyu Organları',
        source: { uri: '/sounds/songs/BES_DUYUM.mp3' },
        coverColor: '#8BC34A', // Yeşil
        icon: 'body',
    },
    {
        id: '34',
        title: 'Geri Dönüşüm',
        artist: 'Fen - Çevre',
        source: { uri: '/sounds/songs/GERI_DONUSUM_KAHRAMANLARI.mp3' },
        coverColor: '#4CAF50', // Koyu Yeşil
        icon: 'leaf',
    },
    {
        id: '35',
        title: 'Canlıların Evi',
        artist: 'Fen - Yaşam Alanları',
        source: { uri: '/sounds/songs/CANLILARIN_EVI.mp3' },
        coverColor: '#009688', // Teal
        icon: 'earth',
        category: 'fen',
    },
    // === SOSYAL-DUYGUSAL GELİŞİM ŞARKILARI ===
    {
        id: '36',
        title: 'Ben Biriciğim',
        artist: 'Sosyal-Duygusal - Özgüven',
        source: { uri: '/sounds/songs/BEN_BIRICIGIM.mp3' },
        coverColor: '#E91E63', // Pembe
        icon: 'star',
        category: 'sosyal-duygusal',
    },
    {
        id: '37',
        title: 'Duygu Ormanı',
        artist: 'Sosyal-Duygusal - Duygular',
        source: { uri: '/sounds/songs/DUYGU_ORMANI.mp3' },
        coverColor: '#4CAF50', // Yeşil
        icon: 'leaf',
        category: 'sosyal-duygusal',
    },
    {
        id: '38',
        title: 'Nefes Al ve Dur',
        artist: 'Sosyal-Duygusal - Öz Düzenleme',
        source: { uri: '/sounds/songs/NEFES_AL_VE_DUR.mp3' },
        coverColor: '#00BCD4', // Cyan
        icon: 'cloudy',
        category: 'sosyal-duygusal',
    },
    {
        id: '39',
        title: 'Lütfen ve Teşekkürler',
        artist: 'Sosyal-Duygusal - Nezaket',
        source: { uri: '/sounds/songs/LUTFEN_VE_TESEKKURLER.mp3' },
        coverColor: '#FFC107', // Sarı
        icon: 'happy',
        category: 'sosyal-duygusal',
    },
    {
        id: '40',
        title: 'Senin Gözünle',
        artist: 'Sosyal-Duygusal - Empati',
        source: { uri: '/sounds/songs/SENIN_GOZUNLE.mp3' },
        coverColor: '#9C27B0', // Mor
        icon: 'eye',
        category: 'sosyal-duygusal',
    },
    {
        id: '41',
        title: 'Çözüm Bulalım',
        artist: 'Sosyal-Duygusal - Problem Çözme',
        source: { uri: '/sounds/songs/COZUM_BULALIM.mp3' },
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSongIndex, setCurrentSongIndex] = useState(initialSongIndex);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [selectedCategory, setSelectedCategory] = useState<'tumu' | 'degerler' | 'matematik' | 'fen' | 'sosyal-duygusal'>('tumu');

    const currentSong = SONGS[currentSongIndex];

    // Kategori filtreleme
    const filteredSongs = selectedCategory === 'tumu'
        ? SONGS
        : SONGS.filter(song => {
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
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const loadSound = async (index: number) => {
        try {
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                SONGS[index].source,
                { shouldPlay: true },
                onPlaybackStatusUpdate
            );

            setSound(newSound);
            setIsPlaying(true);
            setCurrentSongIndex(index);
        } catch (error) {
            console.error('Ses yükleme hatası:', error);
        }
    };

    const handleSongFinish = async () => {
        if (repeatMode === 'one') {
            // Repeat current song
            if (sound) {
                await sound.setPositionAsync(0);
                await sound.playAsync();
            }
        } else if (repeatMode === 'all') {
            // Play next song, loop to beginning if at end
            const nextIndex = (currentSongIndex + 1) % SONGS.length;
            loadSound(nextIndex);
        } else {
            // No repeat - play next if available
            if (currentSongIndex < SONGS.length - 1) {
                loadSound(currentSongIndex + 1);
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

    // Skip forward 10 seconds
    const skipForward = async () => {
        if (sound) {
            const newPosition = Math.min(position + 10000, duration);
            await sound.setPositionAsync(newPosition);
        }
    };

    // Skip backward 10 seconds
    const skipBackward = async () => {
        if (sound) {
            const newPosition = Math.max(position - 10000, 0);
            await sound.setPositionAsync(newPosition);
        }
    };

    const progress = position / duration;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onExit}>
                    <Ionicons name="arrow-back" size={28} color="#546E7A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>🎵 Müzik Kutusu</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {/* Plak / Kapak Görseli */}
                <View style={styles.coverContainer}>
                    <View style={[styles.coverCircle, { backgroundColor: currentSong.coverColor }]}>
                        <Ionicons name={currentSong.icon} size={80} color="#fff" />
                    </View>
                    {isPlaying && (
                        <View style={styles.noteDecor}>
                            <Ionicons name="musical-note" size={24} color={currentSong.coverColor} />
                        </View>
                    )}
                </View>

                {/* Şarkı Bilgisi */}
                <View style={styles.infoContainer}>
                    <Text style={styles.songTitle}>{currentSong.title}</Text>
                    <Text style={styles.artistName}>{currentSong.artist}</Text>
                </View>

                {/* Progress Bar (Görsel) */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: currentSong.coverColor }]} />
                        <View style={[styles.progressKnob, { left: `${progress * 100}%`, backgroundColor: currentSong.coverColor }]} />
                    </View>
                    <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>{formatTime(position)}</Text>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>

                {/* Kontroller */}
                <View style={styles.controlsContainer}>
                    {/* Tekrar Dinleme Butonu (Tek Şarkı) */}
                    <TouchableOpacity
                        onPress={() => setRepeatMode(repeatMode === 'one' ? 'none' : 'one')}
                        style={[styles.controlButtonSmall, repeatMode === 'one' && { backgroundColor: currentSong.coverColor }]}
                    >
                        <Ionicons name="repeat" size={24} color={repeatMode === 'one' ? '#fff' : '#546E7A'} />
                        {repeatMode === 'one' && <Text style={styles.repeatBadge}>1</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playPrevious} style={styles.controlButtonSmall}>
                        <Ionicons name="play-skip-back" size={24} color="#546E7A" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={skipBackward} style={styles.controlButtonSmall}>
                        <Ionicons name="play-back" size={20} color="#546E7A" />
                        <Text style={styles.skipLabel}>10</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlayback} style={[styles.playButton, { backgroundColor: currentSong.coverColor }]}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#fff" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={skipForward} style={styles.controlButtonSmall}>
                        <Ionicons name="play-forward" size={20} color="#546E7A" />
                        <Text style={styles.skipLabel}>10</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext} style={styles.controlButtonSmall}>
                        <Ionicons name="play-skip-forward" size={24} color="#546E7A" />
                    </TouchableOpacity>

                    {/* Listeyi Tekrar Dinle Butonu */}
                    <TouchableOpacity
                        onPress={() => setRepeatMode(repeatMode === 'all' ? 'none' : 'all')}
                        style={[styles.controlButtonSmall, repeatMode === 'all' && { backgroundColor: currentSong.coverColor }]}
                    >
                        <Ionicons name="sync" size={24} color={repeatMode === 'all' ? '#fff' : '#546E7A'} />
                    </TouchableOpacity>
                </View>

                {/* Şarkı Listesi - Kategorili */}
                <Text style={styles.listTitle}>Şarkılar</Text>

                {/* Kategori Sekmeleri */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabsContainer}>
                    <TouchableOpacity
                        style={[styles.categoryTab, selectedCategory === 'tumu' && styles.categoryTabActive]}
                        onPress={() => setSelectedCategory('tumu')}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === 'tumu' && styles.categoryTabTextActive]}>🎵 Tümü</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.categoryTab, selectedCategory === 'sosyal-duygusal' && { backgroundColor: '#E91E63' }]}
                        onPress={() => setSelectedCategory('sosyal-duygusal')}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === 'sosyal-duygusal' && styles.categoryTabTextActive]}>💜 Sosyal-Duygusal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.categoryTab, selectedCategory === 'matematik' && { backgroundColor: '#7E57C2' }]}
                        onPress={() => setSelectedCategory('matematik')}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === 'matematik' && styles.categoryTabTextActive]}>🔢 Matematik</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.categoryTab, selectedCategory === 'fen' && { backgroundColor: '#4CAF50' }]}
                        onPress={() => setSelectedCategory('fen')}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === 'fen' && styles.categoryTabTextActive]}>🔬 Fen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.categoryTab, selectedCategory === 'degerler' && { backgroundColor: '#FF7043' }]}
                        onPress={() => setSelectedCategory('degerler')}
                    >
                        <Text style={[styles.categoryTabText, selectedCategory === 'degerler' && styles.categoryTabTextActive]}>❤️ Değerler</Text>
                    </TouchableOpacity>
                </ScrollView>

                <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
                    {filteredSongs.map((song) => {
                        const songIndex = SONGS.findIndex(s => s.id === song.id);
                        return (
                            <TouchableOpacity
                                key={song.id}
                                style={[
                                    styles.songItem,
                                    songIndex === currentSongIndex && { backgroundColor: '#F0F4C3', borderColor: song.coverColor, borderWidth: 1 }
                                ]}
                                onPress={() => loadSound(songIndex)}
                            >
                                <View style={[styles.songIconSmall, { backgroundColor: song.coverColor }]}>
                                    <Ionicons name={song.icon} size={20} color="#fff" />
                                </View>
                                <View style={styles.songItemInfo}>
                                    <Text style={[styles.songItemTitle, songIndex === currentSongIndex && { color: '#333', fontWeight: 'bold' }]}>
                                        {song.title}
                                    </Text>
                                    <Text style={styles.songItemArtist}>{song.artist}</Text>
                                </View>
                                {songIndex === currentSongIndex && isPlaying && (
                                    <Ionicons name="stats-chart" size={20} color={song.coverColor} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
        marginBottom: 40,
    },
    controlButtonSmall: {
        position: 'relative',
        padding: 12,
        backgroundColor: '#fff',
        borderRadius: 20,
        elevation: 2,
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
