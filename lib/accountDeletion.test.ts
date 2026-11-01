import { clearLocalUserData, failureFromResponse, KEEP_STORAGE_KEYS } from './accountDeletion';

function fakeStore(initial: string[], failOn?: 'getAllKeys' | 'multiRemove') {
    const keys = new Set(initial);
    return {
        keys,
        getAllKeys: async () => {
            if (failOn === 'getAllKeys') throw new Error('okunamadı');
            return [...keys];
        },
        multiRemove: async (list: string[]) => {
            if (failOn === 'multiRemove') throw new Error('silinemedi');
            list.forEach((k) => keys.delete(k));
        },
    };
}

describe('clearLocalUserData', () => {
    it('kullanıcıya ait her anahtarı siler, dil tercihini korur', async () => {
        const store = fakeStore([
            'app-language',
            'oyunPlatformu.bekleyenSonuclar.v1',
            'aiConsent.v1:u-1',
            'supabase.auth.token',
            'sb-abc-auth-token',
        ]);
        await clearLocalUserData(store);
        expect([...store.keys]).toEqual(['app-language']);
    });

    it('korunacak anahtar listesi yalnız dil tercihini içerir', () => {
        expect(KEEP_STORAGE_KEYS).toEqual(['app-language']);
    });

    it('depo hata verse bile fırlatmaz (hesap sunucuda zaten silindi)', async () => {
        await expect(clearLocalUserData(fakeStore(['a'], 'getAllKeys'))).resolves.toBeUndefined();
        await expect(clearLocalUserData(fakeStore(['a'], 'multiRemove'))).resolves.toBeUndefined();
    });

    it('silinecek anahtar yoksa multiRemove çağrılmaz', async () => {
        const store = fakeStore(['app-language']);
        const spy = jest.spyOn(store, 'multiRemove');
        await clearLocalUserData(store);
        expect(spy).not.toHaveBeenCalled();
    });
});

describe('failureFromResponse', () => {
    it('sunucu yanıtını kullanıcıya gösterilecek nedene çevirir', () => {
        expect(failureFromResponse(403, { error: 'reauth_required' })).toBe('reauth_required');
        expect(failureFromResponse(401, { error: 'unauthorized' })).toBe('reauth_required');
        expect(failureFromResponse(403, { error: 'admin_account' })).toBe('admin_account');
        expect(failureFromResponse(500, { error: 'not_configured' })).toBe('not_configured');
        expect(failureFromResponse(500, { error: 'deletion_failed' })).toBe('server');
        expect(failureFromResponse(502, null)).toBe('server');
    });
});
