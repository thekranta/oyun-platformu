/**
 * ReportEngine - Çok Katmanlı Raporlama Motoru
 * 3 farklı hedef kitle için özelleştirilmiş raporlar üretir
 * 
 * Kullanım:
 * import { ReportEngine } from '../services/ReportEngine';
 * const parentReport = await ReportEngine.generateParentReport(childName, games);
 * const teacherReport = await ReportEngine.generateTeacherReport(childName, games, classAverage);
 * const adminReport = ReportEngine.generateAdminReport(games);
 */

// ============== TYPES ==============
export interface GameData {
    id: number;
    created_at: string;
    oyun_turu: string;
    correct_answers?: number;
    hata_sayisi: number;
    sure: number;                       // Duration in seconds
    response_time?: number;             // Average response time in ms
    visual_attention_score?: number;
    cognitive_speed_score?: number;
    distance_effect?: number;
    seviye?: number;
    round_history?: any[];
}

export interface ParentReport {
    summary: string;
    radarChartData: RadarChartPoint[];
    strengths: string[];
    homeActivities: HomeActivity[];
    encouragingMessage: string;
}

export interface TeacherReport {
    summary: string;
    errorDistribution: ErrorDistribution[];
    classComparison: ClassComparison;
    interventionStrategies: string[];
    maarifCodes: string[];
}

export interface AdminReport {
    rawMetrics: RawMetrics;
    hesitationAnalysis: HesitationData[];
    levelTransitions: LevelTransition[];
    exportData: ExportableData;
}

export interface RadarChartPoint {
    category: string;
    value: number;          // 0-100
    label: string;
}

export interface HomeActivity {
    title: string;
    description: string;
    emoji: string;
    duration: string;       // e.g., "10-15 dk"
}

export interface ErrorDistribution {
    gameType: string;
    errorCount: number;
    errorRate: number;
    commonMistakes: string[];
}

export interface ClassComparison {
    childScore: number;
    classAverage: number;
    percentile: number;
}

export interface RawMetrics {
    avgResponseTimeMs: number;
    minResponseTimeMs: number;
    maxResponseTimeMs: number;
    avgHesitationMs: number;
    totalErrors: number;
    totalAttempts: number;
    avgLevelReached: number;
}

export interface HesitationData {
    gameId: number;
    hesitationMs: number;
    category: 'fast' | 'normal' | 'slow';
}

export interface LevelTransition {
    fromLevel: number;
    toLevel: number;
    reason: string;
    timestamp: string;
}

export interface ExportableData {
    csv: string;
    json: object;
}

// ============== GAME NAME MAPPING ==============
const GAME_NAMES: Record<string, string> = {
    'mutfak-dedektifi': 'Mutfak Dedektifi',
    'uzay-bloklari': 'Uzay Blokları',
    'golge-dedektifi': 'Gölge Dedektifi',
    'hafiza-oyunu': 'Hafıza Oyunu',
    'sihirli-siseler': 'Sihirli Şişeler',
    'renkli-baglantalar': 'Renkli Bağlantılar',
    'sayi-komsulari': 'Sayı Komşuları',
    'siralama-oyunu': 'Sıralama Oyunu',
    'tarti-dengesi': 'Tartı Dengesi',
    'kodlama-oyunu': 'Kodlama Oyunu',
    'gruplama-oyunu': 'Gruplama Oyunu',
    'eksik-sayi-bul': 'Eksik Sayı Bul',
    'diziyi-tamamla': 'Diziyi Tamamla',
    'onluk-cerceve': 'Onluk Çerçeve',
    'miktar-karsilastirma': 'Miktar Avcısı',
};

// ============== RADAR CHART CATEGORIES ==============
const RADAR_CATEGORIES = [
    { key: 'visualAttention', label: 'Görsel Dikkat', emoji: '👁️' },
    { key: 'responseSpeed', label: 'Tepki Hızı', emoji: '⚡' },
    { key: 'errorTolerance', label: 'Hata Toleransı', emoji: '🎯' },
    { key: 'persistence', label: 'Sürdürülebilirlik', emoji: '💪' },
    { key: 'problemSolving', label: 'Problem Çözme', emoji: '🧩' },
];

// ============== REPORT ENGINE ==============
export class ReportEngine {
    // ============== PARENT VIEW ==============
    /**
     * Generate positive, graph-heavy report for parents
     * Focus: Strengths, home activities, encouragement
     */
    static generateParentReport(
        childName: string,
        games: GameData[]
    ): ParentReport {
        if (games.length === 0) {
            return {
                summary: `${childName} henüz oyun oynamadı.`,
                radarChartData: [],
                strengths: [],
                homeActivities: [],
                encouragingMessage: 'Haydi ilk oyunumuzu oynayalım! 🎮',
            };
        }

        // Calculate radar chart data
        const radarChartData = this.calculateRadarData(games);

        // Find strengths (top 2 categories)
        const sortedCategories = [...radarChartData].sort((a, b) => b.value - a.value);
        const strengths = sortedCategories.slice(0, 2).map(c =>
            `${c.label} alanında güçlü performans gösteriyor!`
        );

        // Generate home activities based on weaker areas
        const homeActivities = this.generateHomeActivities(sortedCategories);

        // Encouraging message
        const avgScore = radarChartData.reduce((sum, d) => sum + d.value, 0) / radarChartData.length;
        const encouragingMessage = this.getEncouragingMessage(childName, avgScore);

        // Summary
        const summary = `${childName}, son ${games.length} oyunda harika bir performans sergiledi! ` +
            `En güçlü alanı: ${sortedCategories[0]?.label || 'Keşfediliyor'}.`;

        return {
            summary,
            radarChartData,
            strengths,
            homeActivities,
            encouragingMessage,
        };
    }

    /**
     * Calculate radar chart data from game history
     */
    private static calculateRadarData(games: GameData[]): RadarChartPoint[] {
        // Visual Attention - from visual_attention_score or error rate
        const visualGames = games.filter(g => g.visual_attention_score !== undefined);
        const visualScore = visualGames.length > 0
            ? visualGames.reduce((sum, g) => sum + (g.visual_attention_score || 0), 0) / visualGames.length
            : this.calculateFromErrorRate(games, true);

        // Response Speed - from response_time (lower is better)
        const responseGames = games.filter(g => g.response_time !== undefined);
        const avgResponseTime = responseGames.length > 0
            ? responseGames.reduce((sum, g) => sum + (g.response_time || 0), 0) / responseGames.length
            : 3000; // default 3 seconds
        const responseScore = Math.max(0, 100 - (avgResponseTime / 50)); // 5000ms = 0, 0ms = 100

        // Error Tolerance - inverse of error rate
        const errorTolerance = this.calculateFromErrorRate(games, true);

        // Persistence - based on game completion and time
        const persistence = this.calculatePersistence(games);

        // Problem Solving - based on level progression
        const problemSolving = this.calculateProblemSolving(games);

        return [
            { category: 'visualAttention', value: Math.round(visualScore), label: 'Görsel Dikkat' },
            { category: 'responseSpeed', value: Math.round(responseScore), label: 'Tepki Hızı' },
            { category: 'errorTolerance', value: Math.round(errorTolerance), label: 'Hata Toleransı' },
            { category: 'persistence', value: Math.round(persistence), label: 'Sürdürülebilirlik' },
            { category: 'problemSolving', value: Math.round(problemSolving), label: 'Problem Çözme' },
        ];
    }

    private static calculateFromErrorRate(games: GameData[], inverse: boolean): number {
        const totalErrors = games.reduce((sum, g) => sum + (g.hata_sayisi || 0), 0);
        const totalAttempts = games.reduce((sum, g) => sum + (g.correct_answers || 0) + (g.hata_sayisi || 0), 0);
        if (totalAttempts === 0) return 50;

        const errorRate = totalErrors / totalAttempts;
        return inverse ? Math.max(0, 100 - errorRate * 100) : errorRate * 100;
    }

    private static calculatePersistence(games: GameData[]): number {
        // Based on average game duration and completion
        const avgDuration = games.reduce((sum, g) => sum + (g.sure || 0), 0) / games.length;
        // Assume 30-60 seconds is ideal, too short = gave up, too long = struggled
        if (avgDuration < 15) return 40; // Too quick, may have given up
        if (avgDuration > 180) return 60; // Struggled but persisted
        return Math.min(100, 70 + (avgDuration / 3)); // Ideal range
    }

    private static calculateProblemSolving(games: GameData[]): number {
        // Based on level progression
        const levelGames = games.filter(g => g.seviye !== undefined);
        if (levelGames.length === 0) return 50;

        const avgLevel = levelGames.reduce((sum, g) => sum + (g.seviye || 1), 0) / levelGames.length;
        return Math.min(100, avgLevel * 20); // Level 5 = 100
    }

    private static generateHomeActivities(sortedCategories: RadarChartPoint[]): HomeActivity[] {
        const weakestCategory = sortedCategories[sortedCategories.length - 1];
        const activities: HomeActivity[] = [];

        // Activity suggestions based on weak areas
        const activityMap: Record<string, HomeActivity> = {
            visualAttention: {
                title: 'Resimde Farkı Bul',
                description: 'İki benzer resmi karşılaştırıp farklılıkları bulmak görsel dikkati güçlendirir.',
                emoji: '🔍',
                duration: '10-15 dk',
            },
            responseSpeed: {
                title: 'Top Yakala Oyunu',
                description: 'Yumuşak bir topla yakala-at oynayın, tepki hızını artırır.',
                emoji: '⚽',
                duration: '15-20 dk',
            },
            errorTolerance: {
                title: 'Puzzle Yapma',
                description: 'Basit puzzlelar yapın, hata yapmanın öğrenmenin parçası olduğunu konuşun.',
                emoji: '🧩',
                duration: '15-20 dk',
            },
            persistence: {
                title: 'Hikaye Okuma',
                description: 'Birlikte uzun bir hikaye okuyun, odaklanma süresini artırır.',
                emoji: '📚',
                duration: '20-30 dk',
            },
            problemSolving: {
                title: 'Blok Yapı',
                description: 'Legolarla veya bloklarla yapılar inşa edin, problem çözme becerisi gelişir.',
                emoji: '🏗️',
                duration: '20-30 dk',
            },
        };

        if (weakestCategory && activityMap[weakestCategory.category]) {
            activities.push(activityMap[weakestCategory.category]);
        }

        // Add a general activity
        activities.push({
            title: 'Doğa Yürüyüşü',
            description: 'Dışarıda yürürken nesneleri sayın veya renklere göre gruplandırın.',
            emoji: '🌳',
            duration: '30 dk',
        });

        return activities;
    }

    private static getEncouragingMessage(childName: string, avgScore: number): string {
        if (avgScore >= 80) {
            return `Harika gidiyorsun ${childName}! Süper bir öğrenme yolculuğundasın! 🌟`;
        } else if (avgScore >= 60) {
            return `Çok iyi ilerliyorsun ${childName}! Her gün biraz daha güçleniyorsun! 💪`;
        } else if (avgScore >= 40) {
            return `${childName}, öğrenmek zaman alır ve sen harika gidiyorsun! 🌈`;
        } else {
            return `Her büyük yolculuk küçük adımlarla başlar ${childName}! Seninle gurur duyuyoruz! ❤️`;
        }
    }

    // ============== TEACHER VIEW ==============
    /**
     * Generate pedagogical report for teachers
     * Focus: Error distribution, class comparison, intervention strategies
     */
    static generateTeacherReport(
        childName: string,
        games: GameData[],
        classAverageScore?: number
    ): TeacherReport {
        if (games.length === 0) {
            return {
                summary: `${childName} henüz veri üretmedi.`,
                errorDistribution: [],
                classComparison: { childScore: 0, classAverage: 0, percentile: 0 },
                interventionStrategies: [],
                maarifCodes: [],
            };
        }

        // Error distribution by game type
        const errorDistribution = this.calculateErrorDistribution(games);

        // Class comparison
        const childScore = this.calculateOverallScore(games);
        const classComparison: ClassComparison = {
            childScore,
            classAverage: classAverageScore || 70,
            percentile: classAverageScore
                ? Math.round((childScore / classAverageScore) * 50)
                : 50,
        };

        // Intervention strategies based on weak areas
        const interventionStrategies = this.generateInterventionStrategies(errorDistribution);

        // Maarif curriculum codes
        const maarifCodes = this.getMaarifCodes(games);

        // Summary
        const summary = `${childName}: ${games.length} oyun, ` +
            `Ortalama başarı: %${Math.round(childScore)}, ` +
            `Sınıf ortalamasına göre: ${childScore >= (classAverageScore || 70) ? 'üstünde' : 'altında'}`;

        return {
            summary,
            errorDistribution,
            classComparison,
            interventionStrategies,
            maarifCodes,
        };
    }

    private static calculateErrorDistribution(games: GameData[]): ErrorDistribution[] {
        const gameGroups = new Map<string, GameData[]>();

        games.forEach(g => {
            const type = g.oyun_turu;
            if (!gameGroups.has(type)) {
                gameGroups.set(type, []);
            }
            gameGroups.get(type)!.push(g);
        });

        const distribution: ErrorDistribution[] = [];
        gameGroups.forEach((groupGames, type) => {
            const totalErrors = groupGames.reduce((sum, g) => sum + (g.hata_sayisi || 0), 0);
            const totalAttempts = groupGames.reduce((sum, g) =>
                sum + (g.correct_answers || 0) + (g.hata_sayisi || 0), 0);

            distribution.push({
                gameType: GAME_NAMES[type] || type,
                errorCount: totalErrors,
                errorRate: totalAttempts > 0 ? totalErrors / totalAttempts : 0,
                commonMistakes: this.identifyCommonMistakes(type, groupGames),
            });
        });

        return distribution.sort((a, b) => b.errorRate - a.errorRate);
    }

    private static identifyCommonMistakes(gameType: string, games: GameData[]): string[] {
        // This would ideally analyze round_history for specific mistake patterns
        // For now, return general observations based on error rate
        const avgErrorRate = games.reduce((sum, g) => {
            const total = (g.correct_answers || 0) + (g.hata_sayisi || 0);
            return sum + (total > 0 ? (g.hata_sayisi || 0) / total : 0);
        }, 0) / games.length;

        if (avgErrorRate > 0.5) {
            return ['Görev anlaşılmamış olabilir', 'Önceki kavram eksikliği'];
        } else if (avgErrorRate > 0.3) {
            return ['Dikkat dağınıklığı', 'Acele karar'];
        } else {
            return ['Minimal hata'];
        }
    }

    private static calculateOverallScore(games: GameData[]): number {
        const totalCorrect = games.reduce((sum, g) => sum + (g.correct_answers || 0), 0);
        const totalAttempts = games.reduce((sum, g) =>
            sum + (g.correct_answers || 0) + (g.hata_sayisi || 0), 0);

        return totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
    }

    private static generateInterventionStrategies(errorDist: ErrorDistribution[]): string[] {
        const strategies: string[] = [];
        const highErrorGames = errorDist.filter(e => e.errorRate > 0.3);

        if (highErrorGames.length > 0) {
            strategies.push(`${highErrorGames[0].gameType} oyununda birebir destek sağlanmalı.`);
        }

        if (errorDist.some(e => e.commonMistakes.includes('Dikkat dağınıklığı'))) {
            strategies.push('Oyun öncesi dikkat toplama egzersizi yapılabilir.');
        }

        if (errorDist.some(e => e.commonMistakes.includes('Acele karar'))) {
            strategies.push('Düşünme süresi için sözlü hatırlatma eklenebilir.');
        }

        if (strategies.length === 0) {
            strategies.push('Performans iyi seviyede, mevcut aktivitelere devam edilebilir.');
        }

        return strategies;
    }

    private static getMaarifCodes(games: GameData[]): string[] {
        // Map game types to Maarif curriculum codes
        const codeMap: Record<string, string> = {
            'mutfak-dedektifi': 'BİSD-3: Sınıflandırma ve Gruplama',
            'golge-dedektifi': 'BİSD-4: Görsel Eşleştirme',
            'hafiza-oyunu': 'BİSD-5: Kısa Süreli Bellek',
            'miktar-karsilastirma': 'MAT-1: Miktar Karşılaştırma',
            'sayi-komsulari': 'MAT-2: Sayı İlişkileri',
            'siralama-oyunu': 'MAT-3: Sıralama ve Dizilim',
        };

        const uniqueTypes = [...new Set(games.map(g => g.oyun_turu))];
        return uniqueTypes
            .map(type => codeMap[type])
            .filter(code => code !== undefined);
    }

    // ============== ADMIN VIEW ==============
    /**
     * Generate raw metrics report for academics/researchers
     * Focus: Ms-level data, hesitation analysis, export capability
     */
    static generateAdminReport(games: GameData[]): AdminReport {
        if (games.length === 0) {
            return {
                rawMetrics: {
                    avgResponseTimeMs: 0,
                    minResponseTimeMs: 0,
                    maxResponseTimeMs: 0,
                    avgHesitationMs: 0,
                    totalErrors: 0,
                    totalAttempts: 0,
                    avgLevelReached: 0,
                },
                hesitationAnalysis: [],
                levelTransitions: [],
                exportData: { csv: '', json: {} },
            };
        }

        // Raw metrics calculation
        const responseTimes = games
            .filter(g => g.response_time !== undefined)
            .map(g => g.response_time!);

        const rawMetrics: RawMetrics = {
            avgResponseTimeMs: responseTimes.length > 0
                ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
                : 0,
            minResponseTimeMs: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
            maxResponseTimeMs: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
            avgHesitationMs: 0, // Would need round_history to calculate
            totalErrors: games.reduce((sum, g) => sum + (g.hata_sayisi || 0), 0),
            totalAttempts: games.reduce((sum, g) =>
                sum + (g.correct_answers || 0) + (g.hata_sayisi || 0), 0),
            avgLevelReached: games.filter(g => g.seviye).length > 0
                ? games.filter(g => g.seviye).reduce((sum, g) => sum + (g.seviye || 1), 0) /
                games.filter(g => g.seviye).length
                : 1,
        };

        // Hesitation analysis
        const hesitationAnalysis: HesitationData[] = games
            .filter(g => g.response_time !== undefined)
            .map(g => ({
                gameId: g.id,
                hesitationMs: g.response_time!,
                category: g.response_time! < 1500 ? 'fast' as const :
                    g.response_time! < 4000 ? 'normal' as const : 'slow' as const,
            }));

        // Level transitions
        const levelTransitions: LevelTransition[] = [];
        const sortedGames = [...games].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        for (let i = 1; i < sortedGames.length; i++) {
            const prev = sortedGames[i - 1];
            const curr = sortedGames[i];
            if (prev.seviye !== undefined && curr.seviye !== undefined && prev.seviye !== curr.seviye) {
                levelTransitions.push({
                    fromLevel: prev.seviye,
                    toLevel: curr.seviye,
                    reason: curr.seviye > prev.seviye ? 'Başarılı tamamlama' : 'Zorluk azaltıldı',
                    timestamp: curr.created_at,
                });
            }
        }

        // Export data
        const exportData = this.generateExportData(games, rawMetrics);

        return {
            rawMetrics,
            hesitationAnalysis,
            levelTransitions,
            exportData,
        };
    }

    private static generateExportData(games: GameData[], metrics: RawMetrics): ExportableData {
        // CSV format
        const headers = ['ID', 'Tarih', 'Oyun', 'Süre(s)', 'Hata', 'Doğru', 'Tepki(ms)', 'Seviye'];
        const rows = games.map(g => [
            g.id,
            g.created_at,
            g.oyun_turu,
            g.sure,
            g.hata_sayisi,
            g.correct_answers || 0,
            g.response_time || '',
            g.seviye || '',
        ].join(','));

        const csv = [headers.join(','), ...rows].join('\n');

        // JSON format
        const json = {
            exportDate: new Date().toISOString(),
            summary: metrics,
            games: games.map(g => ({
                id: g.id,
                date: g.created_at,
                gameType: g.oyun_turu,
                duration: g.sure,
                errors: g.hata_sayisi,
                correctAnswers: g.correct_answers,
                responseTimeMs: g.response_time,
                level: g.seviye,
            })),
        };

        return { csv, json };
    }
}

export default ReportEngine;
