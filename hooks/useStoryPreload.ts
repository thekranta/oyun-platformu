import { useEffect } from 'react';
import { Platform } from 'react-native';
import { StoryNodeLike, upcomingAssets } from '../lib/storyUpcoming';
import { preloadStoryAssets } from '../services/storyPreload';

/** Sahne başladıktan bu kadar sonra sıradaki sahneler indirilir: şimdiki anlatım önce iner, ağ için yarışmaz. */
export const STORY_PRELOAD_DELAY_MS = 2500;

/**
 * Hikâye oyunlarında sahne değişince sıradaki sahnelerin görsel ve seslerini (web'de) önceden indirir.
 * `nodes` modül düzeyinde sabit olmalı (storyData). Bkz. services/storyPreload.ts.
 */
export function useStoryPreload(nodes: Record<string, StoryNodeLike | undefined>, nodeId: string) {
    useEffect(() => {
        if (Platform.OS !== 'web') return undefined;
        const timer = setTimeout(() => preloadStoryAssets(upcomingAssets(nodes, nodeId)), STORY_PRELOAD_DELAY_MS);
        return () => clearTimeout(timer);
    }, [nodes, nodeId]);
}
