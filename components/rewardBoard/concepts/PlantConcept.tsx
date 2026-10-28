import type { RewardConcept } from '../types';
import { lazyArt } from './lazyArt';

export const PlantConcept: RewardConcept = {
    id: 'bitki',
    labelKey: 'rewardBoard.concepts.bitki.label',
    stageLabelKeys: [
        'rewardBoard.concepts.bitki.stage0',
        'rewardBoard.concepts.bitki.stage1',
        'rewardBoard.concepts.bitki.stage2',
        'rewardBoard.concepts.bitki.stage3',
    ],
    accentColor: '#2e9e6b',
    Art: lazyArt('PlantArt'),
};
