/**
 * useStoryPreload: sahne başladıktan 2,5 sn sonra sıradaki sahneler indirilir; sahne değişirse bekleyen plan iptal olur.
 */
import React from 'react';
// @ts-expect-error @types/react-test-renderer kurulu değil (projede başka kullanan test yok); aşağıdaki arayüz yeterli.
import renderer, { act } from 'react-test-renderer';

interface Rendered {
    update: (element: React.ReactElement) => void;
    unmount: () => void;
}

const mockPreload = jest.fn();
let mockPlatform = 'web';

jest.mock('react-native', () => ({ Platform: { get OS() { return mockPlatform; } } }));
jest.mock('../services/storyPreload', () => ({ preloadStoryAssets: (...a: unknown[]) => mockPreload(...a) }));

import { STORY_PRELOAD_DELAY_MS, useStoryPreload } from './useStoryPreload';

const NODES = {
    a: { options: [{ image: 1, next: 'b' }] },
    b: { bgImage: 2, audio: 3 },
};

function Probe({ id }: { id: string }) {
    useStoryPreload(NODES, id);
    return null;
}

describe('useStoryPreload', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockPreload.mockClear();
        mockPlatform = 'web';
    });
    afterEach(() => jest.useRealTimers());

    it('sahne başladıktan STORY_PRELOAD_DELAY_MS sonra sıradaki sahnelerin varlıklarını ister', () => {
        let r!: Rendered;
        act(() => { r = renderer.create(<Probe id="a" />); });
        jest.advanceTimersByTime(STORY_PRELOAD_DELAY_MS - 10);
        expect(mockPreload).not.toHaveBeenCalled();
        jest.advanceTimersByTime(20);
        expect(mockPreload).toHaveBeenCalledTimes(1);
        expect(mockPreload).toHaveBeenCalledWith({ images: [1, 2], audio: [3] });
        act(() => r.unmount());
    });

    it('sahne beklerken değişirse eski plan iptal olur, yalnız yeni sahne için istenir', () => {
        let r!: Rendered;
        act(() => { r = renderer.create(<Probe id="a" />); });
        jest.advanceTimersByTime(STORY_PRELOAD_DELAY_MS - 500);
        act(() => r.update(<Probe id="b" />));
        jest.advanceTimersByTime(STORY_PRELOAD_DELAY_MS + 10);
        expect(mockPreload).toHaveBeenCalledTimes(1);
        expect(mockPreload).toHaveBeenCalledWith({ images: [], audio: [] });   // b son sahne: sırada bir şey yok
        act(() => r.unmount());
    });

    it('ekrandan çıkılırsa (unmount) bekleyen plan iptal olur', () => {
        let r!: Rendered;
        act(() => { r = renderer.create(<Probe id="a" />); });
        act(() => r.unmount());
        jest.advanceTimersByTime(STORY_PRELOAD_DELAY_MS + 100);
        expect(mockPreload).not.toHaveBeenCalled();
    });

    it('native: hiçbir şey planlanmaz', () => {
        mockPlatform = 'ios';
        let r!: Rendered;
        act(() => { r = renderer.create(<Probe id="a" />); });
        jest.advanceTimersByTime(STORY_PRELOAD_DELAY_MS + 100);
        expect(mockPreload).not.toHaveBeenCalled();
        act(() => r.unmount());
    });
});
