import { PlantConcept } from './concepts/PlantConcept';
import { SkyConcept } from './concepts/SkyConcept';
import type { RewardConcept, RewardConceptId } from './types';

export const REWARD_CONCEPTS: Record<RewardConceptId, RewardConcept> = {
    bitki: PlantConcept,
    gokyuzu: SkyConcept,
};

export const REWARD_CONCEPT_LIST: RewardConcept[] = Object.values(REWARD_CONCEPTS);

/** DB'den gelen tema bilinmiyorsa (henüz kodda yok / typo / eski demo verisi) güvenli varsayılana düş. */
export function getRewardConcept(id: string | null | undefined): RewardConcept {
    return REWARD_CONCEPTS[id as RewardConceptId] ?? PlantConcept;
}
