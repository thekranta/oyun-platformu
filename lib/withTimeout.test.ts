import { withTimeout } from './withTimeout';

describe('withTimeout', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('süre dolmadan biten isteğin sonucunu döndürür', async () => {
        const p = withTimeout(Promise.resolve(42), 1000);
        await expect(p).resolves.toBe(42);
    });

    it('takılan isteği süre dolunca reddeder', async () => {
        const never = new Promise<number>(() => { /* hiç bitmez */ });
        const p = withTimeout(never, 1000);
        const assertion = expect(p).rejects.toThrow('timeout');
        jest.advanceTimersByTime(1001);
        await assertion;
    });

    it('isteğin kendi hatasını olduğu gibi iletir', async () => {
        await expect(withTimeout(Promise.reject(new Error('ağ')), 1000)).rejects.toThrow('ağ');
    });
});
