// Yalnız GÖRÜNTÜ hesaplaması: gerçek aşama sunucudan (private.reward_stage) gelir, burada
// yalnız "bir sonraki aşamaya ne kadar kaldı" göstergesi (3 nokta) türetilir. Eşikler
// supabase_migrations/add_class_rewards.sql'deki private.reward_stage ile AYNI olmalı.
import type { RewardStage } from './types';

const STAGE_STARTS: Record<RewardStage, number> = { 0: 0, 1: 1, 2: 3, 3: 6 };

export function pipsForStage(todayCount: number, stage: RewardStage): number {
    if (stage === 3) return 3;
    const start = STAGE_STARTS[stage];
    return Math.max(0, Math.min(3, todayCount - start));
}
