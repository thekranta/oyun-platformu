import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSound } from './SoundContext';

interface OnlukCerceveProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

export default function OnlukCerceve({ onGameEnd, onExit }: OnlukCerceveProps) {
    const { isMuted, toggleMute, playSound } = useSound();
    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(0);
    const [currentCount, setCurrentCount] = useState(0);
    const [gridState, setGridState] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

    // Animasyonlar
    const scaleAnim = new Animated.Value(1);

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        // Round 1-4: 1-5 arası (Isınma)
        // Round 5-10: 1-10 arası (Zorlu - 6-10 ağırlıklı)
        let newTarget;
        if (round <= 4) {
            newTarget = Math.floor(Math.random() * 5) + 1; // 1-5
        } else {
            // 6-10 arası ağırlıklı, ama bazen küçük sayılar da gelebilir
            newTarget = Math.floor(Math.random() * 5) + 6; // 6-10
            if (newTarget > 10) newTarget = 10;
        }

        // Aynı sayı üst üste gelmesin (basit kontrol)
        if (newTarget === targetNumber && round > 1) {
            newTarget = newTarget === 10 ? 9 : newTarget + 1;
        }

        setTargetNumber(newTarget);
        setGridState(Array(10).fill(false));
        setCurrentCount(0);
        setFeedback(null);
    };

    const toggleCell = (index: number) => {
        if (feedback) return; // Geri bildirim sırasında işlem yapma

        playEffect('pop');
        const newState = [...gridState];
        newState[index] = !newState[index];
        setGridState(newState);
        setCurrentCount(newState.filter(Boolean).length);
    };

    const playEffect = async (type: 'success' | 'error' | 'pop') => {
        if (isMuted) return;
        // Ses efektleri burada çalınabilir (mevcut ses dosyaları kullanılarak)
        // Şimdilik sadece placeholder
    };

    const checkAnswer = () => {
        if (currentCount === targetNumber) {
            // Doğru
            setFeedback('correct');
            playEffect('success');

            // Veri kaydı
            const roundInfo = {
                round,
                target: targetNumber,
                result: 'success',
                mistakesInRound: 0 // Bu turdaki hata (basit versiyonda kontrol butonu ile tek hak gibi düşünebiliriz veya sayaç)
            };
            setRoundData([...roundData, roundInfo]);

            setTimeout(() => {
                if (round < 10) {
                    setRound(r => r + 1);
                } else {
                    finishGame();
                }
            }, 1500);
        } else {
            // Yanlış
            setFeedback('wrong');
            playEffect('error');
            setMistakes(m => m + 1);

            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
            ]).start();

            // Hatalı deneme verisi
            const roundInfo = {
                round,
                target: targetNumber,
                result: 'wrong',
                errorValue: currentCount // Kaç tane işaretlediği
            };
            // Hata verisini hemen eklemiyoruz, sadece genel hata sayacını artırıyoruz. 
            // Detaylı analiz için roundData'yı güncellemek daha karmaşık olabilir, şimdilik genel mistake sayıyoruz.
            // Ancak "hangi sayıda takıldı" istendiği için:
            setRoundData(prev => [...prev, { ...roundInfo, isError: true }]);

            setTimeout(() => setFeedback(null), 1000);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);

        // Hatalı olunan sayıları analiz et
        const errorCounts: Record<number, number> = {};
        roundData.filter(d => d.isError).forEach(d => {
            errorCounts[d.target] = (errorCounts[d.target] || 0) + 1;
        });

        // En çok hata yapılan sayı
        let mostErrorNumber = null;
        let maxErrors = 0;
        Object.entries(errorCounts).forEach(([num, count]) => {
            if (count > maxErrors) {
                maxErrors = count;
                mostErrorNumber = num;
            }
        });

        const extraData = {
            cizimVerisi: JSON.stringify({
                roundHistory: roundData,
                mostErrorNumber
            }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayı Kompozisyonu',
            algilananKelime: mostErrorNumber ? `${mostErrorNumber} sayısında zorlandı` : 'Başarılı'
        };

        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, extraData);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                    Çerçeveye <Text style={styles.targetNumber}>{targetNumber}</Text> tane elma yerleştir!
                </Text>
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                <Animated.View style={[styles.gridContainer, { transform: [{ scale: scaleAnim }] }]}>
                    {/* Ten Frame Grid: 2 rows of 5 */}
                    <View style={styles.gridRow}>
                        {[0, 1, 2, 3, 4].map(i => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.cell, gridState[i] && styles.cellActive]}
                                onPress={() => toggleCell(i)}
                                activeOpacity={0.8}
                            >
                                {gridState[i] && <Text style={styles.cellIcon}>🍎</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={styles.gridRow}>
                        {[5, 6, 7, 8, 9].map(i => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.cell, gridState[i] && styles.cellActive]}
                                onPress={() => toggleCell(i)}
                                activeOpacity={0.8}
                            >
                                {gridState[i] && <Text style={styles.cellIcon}>🍎</Text>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Animated.View>

                {/* Current Count Indicator */}
                <Text style={styles.countIndicator}>{currentCount}</Text>
            </View>

            {/* Controls */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.checkButton,
                        feedback === 'correct' ? styles.btnSuccess : feedback === 'wrong' ? styles.btnError : {}
                    ]}
                    onPress={checkAnswer}
                    disabled={!!feedback}
                >
                    <Text style={styles.checkButtonText}>
                        {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Tekrar Dene ❌' : 'Kontrol Et ✅'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');
const CELL_SIZE = width / 6.5;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E3F2FD', // Açık mavi (Gökyüzü teması)
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 20,
    },
    soundButton: {
        backgroundColor: '#2196F3',
        padding: 8,
        borderRadius: 20,
    },
    scoreContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 2,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    instructionContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    instructionText: {
        fontSize: 24,
        color: '#333',
        fontWeight: '600',
    },
    targetNumber: {
        fontSize: 32,
        color: '#E91E63',
        fontWeight: 'bold',
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContainer: {
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 16,
        elevation: 5,
        borderWidth: 4,
        borderColor: '#90CAF9',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 5,
        marginBottom: 5,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#BDBDBD',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellActive: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FF9800',
    },
    cellIcon: {
        fontSize: CELL_SIZE * 0.7,
    },
    countIndicator: {
        marginTop: 20,
        fontSize: 40,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
    },
    checkButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 4,
    },
    btnSuccess: { backgroundColor: '#66BB6A' },
    btnError: { backgroundColor: '#EF5350' },
    checkButtonText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
});
