import type { RewardConcept } from '../types';
import SkyArt from './SkyArt';

export const SkyConcept: RewardConcept = {
    id: 'gokyuzu',
    labelKey: 'rewardBoard.concepts.gokyuzu.label',
    stageLabelKeys: [
        'rewardBoard.concepts.gokyuzu.stage0',
        'rewardBoard.concepts.gokyuzu.stage1',
        'rewardBoard.concepts.gokyuzu.stage2',
        'rewardBoard.concepts.gokyuzu.stage3',
    ],
    accentColor: '#4FA8E0',
    Art: SkyArt,
};
