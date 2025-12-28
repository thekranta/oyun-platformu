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

interface Song {
    id: string;
    title: string;
    artist: string;
    source: any;
    coverColor: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const SONGS: Song[] = [
    {
        id: '1',
        title: 'ChildhoodTech Şarkısı V1',
        artist: 'Web Sitemiz İçin',
        source: require('@/assets/sounds/songs/CHILDHOODTECH ŞARKISI V1.mp3'),
        coverColor: '#FFD54F', // Sarı
        icon: 'musical-notes',
    },
    {
        id: '2',
        title: 'ChildhoodTech Şarkısı V2',
        artist: 'Tanıtım Müziği',
        source: require('@/assets/sounds/songs/CHILDHOODTECH ŞARKISI v2.mp3'),
        coverColor: '#4ECDC4', // Turkuaz
        icon: 'planet',
    },
    {
        id: '3',
        title: 'Adil Oyun, Güzel Oyun',
        artist: 'Değerler Eğitimi',
        source: require('@/assets/sounds/songs/ADİL OYUN, GÜZEL OYUN.mp3'),
        coverColor: '#FF7043', // Turuncu
        icon: 'heart',
    },
    {
        id: '4',
        title: 'Paylaşınca Güzel',
        artist: 'Arkadaşlık',
        source: require('@/assets/sounds/songs/PAYLAŞINCA GÜZEL.mp3'),
        coverColor: '#AB47BC', // Mor
        icon: 'people',
    },
    {
        id: '5',
        title: 'Çalışkan Arı Gibi',
        artist: 'Sorumluluk',
        source: require('@/assets/sounds/songs/ÇALIŞKAN ARI GİBİ.mp3'),
        coverColor: '#66BB6A', // Yeşil
        icon: 'leaf',
    },
];

interface MuzikCalarProps {
    onExit: () => void;
}

export default function MuzikCalar({ onExit }: MuzikCalarProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1);

    const currentSong = SONGS[currentSongIndex];

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

    const onPlaybackStatusUpdate = (status: any) => {
        if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis || 1);
            setIsPlaying(status.isPlaying);

            if (status.didJustFinish) {
                setIsPlaying(false);
                // Otomatik sonraki şarkıya geç (opsiyonel)
                // playNext();
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
                    <TouchableOpacity onPress={playPrevious} style={styles.controlButtonSmall}>
                        <Ionicons name="play-skip-back" size={24} color="#546E7A" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlayback} style={[styles.playButton, { backgroundColor: currentSong.coverColor }]}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={40} color="#fff" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={playNext} style={styles.controlButtonSmall}>
                        <Ionicons name="play-skip-forward" size={24} color="#546E7A" />
                    </TouchableOpacity>
                </View>

                {/* Şarkı Listesi */}
                <Text style={styles.listTitle}>Diğer Şarkılar</Text>
                <ScrollView style={styles.listContainer} contentContainerStyle={{ paddingBottom: 20 }}>
                    {SONGS.map((song, index) => (
                        <TouchableOpacity
                            key={song.id}
                            style={[
                                styles.songItem,
                                index === currentSongIndex && { backgroundColor: '#F0F4C3', borderColor: song.coverColor, borderWidth: 1 }
                            ]}
                            onPress={() => loadSound(index)}
                        >
                            <View style={[styles.songIconSmall, { backgroundColor: song.coverColor }]}>
                                <Ionicons name={song.icon} size={20} color="#fff" />
                            </View>
                            <View style={styles.songItemInfo}>
                                <Text style={[styles.songItemTitle, index === currentSongIndex && { color: '#333', fontWeight: 'bold' }]}>
                                    {song.title}
                                </Text>
                                <Text style={styles.songItemArtist}>{song.artist}</Text>
                            </View>
                            {index === currentSongIndex && isPlaying && (
                                <Ionicons name="stats-chart" size={20} color={song.coverColor} />
                            )}
                        </TouchableOpacity>
                    ))}
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
        gap: 30,
        marginBottom: 40,
    },
    controlButtonSmall: {
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
});
