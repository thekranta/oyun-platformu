import { MiniStorage, rememberResetReturn, takeResetReturn } from './resetReturn';

const memory = (): MiniStorage & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return {
        data,
        getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
        setItem: (k, v) => { data.set(k, v); },
        removeItem: (k) => { data.delete(k); },
    };
};

describe('şifre sıfırlama dönüş yolu', () => {
    it('kayıtlı izinli yolu döndürür ve bir kez kullanılınca siler', () => {
        const s = memory();
        rememberResetReturn('/kurum', s);
        expect(takeResetReturn(s)).toBe('/kurum');
        expect(takeResetReturn(s)).toBe('/');
    });

    it('izin listesi dışındaki (dış adres vb.) yolu hiç saklamaz ve geçersiz kaydı yok sayar', () => {
        const s = memory();
        rememberResetReturn('https://kotu.example.com', s);
        rememberResetReturn('//kotu.example.com', s);
        expect(s.data.size).toBe(0);
        s.setItem('password-reset-return', 'https://kotu.example.com');
        expect(takeResetReturn(s)).toBe('/');
    });

    it('depolama yoksa ya da hata verirse ana ekrana döner, çökmez', () => {
        expect(takeResetReturn(null)).toBe('/');
        expect(() => rememberResetReturn('/kurum', null)).not.toThrow();
        const bozuk: MiniStorage = {
            getItem: () => { throw new Error('engelli'); },
            setItem: () => { throw new Error('engelli'); },
            removeItem: () => { throw new Error('engelli'); },
        };
        expect(takeResetReturn(bozuk)).toBe('/');
        expect(() => rememberResetReturn('/kurum', bozuk)).not.toThrow();
    });
});
