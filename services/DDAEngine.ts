/**
 * DDAEngine - Dinamik Zorluk Ayarlama Motoru
 * Tüm oyunlarda tutarlı zorluk ayarlaması sağlar
 * 
 * Kullanım:
 * import { DDAEngine } from '../services/DDAEngine';
 * const dda = new DDAEngine({ gameId: 'mutfak-dedektifi' });
 * const nextLevel = dda.calculateNextLevel(currentLevel, completionTime, errorRate);
 */

import { supabase } from '../lib/supabase';

// ============== TYPES ==============
export interface DDAConfig {
    gameId: string;
    minLevel: number;
    maxLevel: number;
    // Level up thresholds
    levelUpTimeThreshold: number;      // Complete under this time (seconds) to level up
    levelUpErrorThreshold: number;     // Max error rate (0-1) to level up
    // Level down thresholds
    levelDownErrorThreshold: number;   // Error rate above this triggers level down
    levelDownTimeThreshold: number;    // Complete over this time triggers level down
    // Scaffolding
    scaffoldErrorThreshold: number;    // Errors before showing scaffold hints
}

export interface LevelData {
    level: number;
    completionTime: number;        // seconds
    errors: number;
    totalAttempts: number;
    timestamp: number;
}

export interface DDADecision {
    nextLevel: number;
    shouldScaffold: boolean;
    reason: string;
}

// ============== DEFAULT CONFIG ==============
const DEFAULT_CONFIG: Omit<DDAConfig, 'gameId'> = {
    minLevel: 1,
    maxLevel: 5,
    levelUpTimeThreshold: 20,          // Under 20 seconds
    levelUpErrorThreshold: 0.1,        // Under 10% error rate
    levelDownErrorThreshold: 0.4,      // Over 40% error rate
    levelDownTimeThreshold: 120,       // Over 2 minutes
    scaffoldErrorThreshold: 3,         // Show hints after 3 consecutive errors
};

// ============== GAME-SPECIFIC CONFIGS ==============
const GAME_CONFIGS: Record<string, Partial<DDAConfig>> = {
    'mutfak-dedektifi': {
        levelUpTimeThreshold: 25,
        maxLevel: 5,
    },
    'uzay-bloklari': {
        levelUpTimeThreshold: 30,
        maxLevel: 4,
    },
    'golge-dedektifi': {
        levelUpTimeThreshold: 15,
        levelUpErrorThreshold: 0.05,
        maxLevel: 10,
    },
    'hafiza-oyunu': {
        levelUpTimeThreshold: 40,
        maxLevel: 6,
    },
    'sihirli-siseler': {
        levelUpTimeThreshold: 45,
        maxLevel: 8,
    },
};

// ============== DDA ENGINE ==============
export class DDAEngine {
    private config: DDAConfig;
    private levelHistory: LevelData[] = [];
    private consecutiveErrors: number = 0;

    constructor(config: Partial<DDAConfig> & { gameId: string }) {
        // Merge default config with game-specific and user overrides
        const gameSpecific = GAME_CONFIGS[config.gameId] || {};
        this.config = {
            ...DEFAULT_CONFIG,
            ...gameSpecific,
            ...config,
        };
    }

    // ============== CORE FUNCTIONS ==============
    /**
     * Calculate next level based on performance
     */
    calculateNextLevel(
        currentLevel: number,
        completionTime: number,
        errors: number,
        totalAttempts: number
    ): DDADecision {
        const errorRate = totalAttempts > 0 ? errors / totalAttempts : 0;

        // Record this level's data
        this.levelHistory.push({
            level: currentLevel,
            completionTime,
            errors,
            totalAttempts,
            timestamp: Date.now(),
        });

        // Perfect performance → Level up
        if (
            completionTime < this.config.levelUpTimeThreshold &&
            errorRate <= this.config.levelUpErrorThreshold
        ) {
            const nextLevel = Math.min(currentLevel + 1, this.config.maxLevel);
            this.consecutiveErrors = 0;
            return {
                nextLevel,
                shouldScaffold: false,
                reason: nextLevel > currentLevel
                    ? 'Mükemmel performans! Seviye atladın!'
                    : 'Zaten en yüksek seviyedesin!',
            };
        }

        // Poor performance → Level down
        if (
            errorRate >= this.config.levelDownErrorThreshold ||
            completionTime >= this.config.levelDownTimeThreshold
        ) {
            const nextLevel = Math.max(currentLevel - 1, this.config.minLevel);
            return {
                nextLevel,
                shouldScaffold: true,
                reason: nextLevel < currentLevel
                    ? 'Biraz daha kolaylaştıralım.'
                    : 'En kolay seviyeye geçtik, yardım ediyorum.',
            };
        }

        // Normal performance → Stay at same level
        return {
            nextLevel: currentLevel,
            shouldScaffold: false,
            reason: 'Aynı seviyede devam et.',
        };
    }

    /**
     * Check if scaffold hints should be shown
     */
    shouldScaffold(currentErrors: number): boolean {
        return currentErrors >= this.config.scaffoldErrorThreshold;
    }

    /**
     * Track consecutive errors for real-time scaffolding
     */
    trackError(): boolean {
        this.consecutiveErrors++;
        return this.consecutiveErrors >= this.config.scaffoldErrorThreshold;
    }

    /**
     * Reset error tracking on correct answer
     */
    trackSuccess(): void {
        this.consecutiveErrors = 0;
    }

    /**
     * Get suggested level for new session based on history
     */
    async getSessionStartLevel(userId: string): Promise<number> {
        try {
            // Get last 5 game sessions for this user and game
            const { data, error } = await supabase
                .from('oyun_skorlari')
                .select('seviye, hata_sayisi, sure')
                .eq('user_id', userId)
                .eq('oyun_turu', this.config.gameId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error || !data || data.length === 0) {
                return this.config.minLevel; // Start at level 1 for new players
            }

            // Calculate average performance from recent sessions
            const avgLevel = data.reduce((sum, d) => sum + (d.seviye || 1), 0) / data.length;
            const avgErrors = data.reduce((sum, d) => sum + (d.hata_sayisi || 0), 0) / data.length;

            // If had many errors, start one level lower than average
            if (avgErrors > 5) {
                return Math.max(Math.floor(avgLevel) - 1, this.config.minLevel);
            }

            // Otherwise start at average level (rounded)
            return Math.min(Math.round(avgLevel), this.config.maxLevel);
        } catch (e) {
            console.warn('DDAEngine: Could not fetch session history', e);
            return this.config.minLevel;
        }
    }

    // ============== ANALYTICS ==============
    /**
     * Get performance metrics for admin dashboard
     */
    getPerformanceMetrics(): {
        avgCompletionTime: number;
        avgErrorRate: number;
        levelProgression: number[];
        totalSessions: number;
    } {
        if (this.levelHistory.length === 0) {
            return {
                avgCompletionTime: 0,
                avgErrorRate: 0,
                levelProgression: [],
                totalSessions: 0,
            };
        }

        const avgCompletionTime = this.levelHistory.reduce((sum, d) => sum + d.completionTime, 0) / this.levelHistory.length;
        const avgErrorRate = this.levelHistory.reduce((sum, d) =>
            sum + (d.totalAttempts > 0 ? d.errors / d.totalAttempts : 0), 0) / this.levelHistory.length;
        const levelProgression = this.levelHistory.map(d => d.level);

        return {
            avgCompletionTime: Math.round(avgCompletionTime),
            avgErrorRate: Math.round(avgErrorRate * 100) / 100,
            levelProgression,
            totalSessions: this.levelHistory.length,
        };
    }

    /**
     * Get hesitation time (time between first view and first action)
     * Useful for measuring cognitive processing speed
     */
    calculateHesitationScore(
        viewTime: number,      // When item was first shown (ms)
        actionTime: number     // When user took first action (ms)
    ): {
        hesitationMs: number;
        category: 'fast' | 'normal' | 'slow';
    } {
        const hesitationMs = actionTime - viewTime;

        let category: 'fast' | 'normal' | 'slow';
        if (hesitationMs < 1500) {
            category = 'fast';
        } else if (hesitationMs < 4000) {
            category = 'normal';
        } else {
            category = 'slow';
        }

        return { hesitationMs, category };
    }

    // ============== LEVEL GENERATION HELPERS ==============
    /**
     * Get difficulty multipliers for current level
     */
    getDifficultyMultipliers(level: number): {
        itemCount: number;
        timeMultiplier: number;
        distractorCount: number;
    } {
        const normalized = (level - this.config.minLevel) / (this.config.maxLevel - this.config.minLevel);

        return {
            itemCount: Math.floor(3 + normalized * 5),          // 3-8 items
            timeMultiplier: 1 - normalized * 0.3,               // 1.0x to 0.7x time
            distractorCount: Math.floor(normalized * 4),        // 0-4 distractors
        };
    }
}

// ============== HOOK: useDDA ==============
/**
 * React hook for easy DDA integration
 */
import { useCallback, useRef, useState } from 'react';

export function useDDA(gameId: string, userId?: string) {
    const ddaRef = useRef(new DDAEngine({ gameId }));
    const [currentLevel, setCurrentLevel] = useState(1);
    const [showScaffold, setShowScaffold] = useState(false);

    const initializeLevel = useCallback(async () => {
        if (userId) {
            const startLevel = await ddaRef.current.getSessionStartLevel(userId);
            setCurrentLevel(startLevel);
            return startLevel;
        }
        return 1;
    }, [userId]);

    const processLevelComplete = useCallback((
        completionTime: number,
        errors: number,
        totalAttempts: number
    ) => {
        const decision = ddaRef.current.calculateNextLevel(
            currentLevel,
            completionTime,
            errors,
            totalAttempts
        );

        setCurrentLevel(decision.nextLevel);
        setShowScaffold(decision.shouldScaffold);

        return decision;
    }, [currentLevel]);

    const trackError = useCallback(() => {
        const shouldShowHint = ddaRef.current.trackError();
        setShowScaffold(shouldShowHint);
        return shouldShowHint;
    }, []);

    const trackSuccess = useCallback(() => {
        ddaRef.current.trackSuccess();
        setShowScaffold(false);
    }, []);

    const getDifficultySettings = useCallback(() => {
        return ddaRef.current.getDifficultyMultipliers(currentLevel);
    }, [currentLevel]);

    return {
        currentLevel,
        showScaffold,
        initializeLevel,
        processLevelComplete,
        trackError,
        trackSuccess,
        getDifficultySettings,
        getMetrics: () => ddaRef.current.getPerformanceMetrics(),
    };
}

export default DDAEngine;
