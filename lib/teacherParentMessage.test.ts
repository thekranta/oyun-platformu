import { buildParentMessage, MessagePick } from './teacherParentMessage';
import { shareText, ShareDeps } from './shareText';

// Gerçek çeviri yerine anahtar + parametreyi gösteren sahte çeviri: mesajın iskeleti ve sırası test edilir.
const t = (key: string, o?: Record<string, unknown>) => (key.endsWith('greeting') ? 'Merhaba' : key.endsWith('introNamed') ? `${o?.name} için:` : key.endsWith('intro') ? 'Evde:' : key.endsWith('tierOpens') ? `${o?.tier} ile açılır` : 'Teşekkürler');

const mat: MessagePick = { key: 'MAB.4', code: 'MAB.4', alan: 'Matematik', text: 'Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme', games: [{ name: 'Sıralama', tier: 'free' }, { name: 'Diziyi Tamamla', tier: 'tohum' }] };
const muz: MessagePick = { key: 'MÇB.2', code: 'MÇB.2', alan: 'Müzik', text: 'Çalgıları çalma becerilerini sergileyebilme', games: [{ name: 'Davul Ustası', tier: 'free' }] };
const sdb: MessagePick = { key: 'SDB.1', code: null, alan: 'Sosyal-Duygusal', text: 'Kendini Tanıma', games: [{ name: 'Duygu Çiftleri', tier: 'filiz' }] };

describe('veliye gönderilecek mesaj', () => {
    it('seçim yoksa boş; oyunsuz kazanım atlanır', () => {
        expect(buildParentMessage([], 'Ali', t)).toBe('');
        expect(buildParentMessage([{ ...mat, games: [] }], 'Ali', t)).toBe('');
    });

    it('selamlama, çocuk adı, kazanım satırı (kod + resmi metin), oyunlar ve kapanış', () => {
        const msg = buildParentMessage([mat], 'Ali', t);
        const lines = msg.split('\n');
        expect(lines[0]).toBe('Merhaba');
        expect(lines[1]).toBe('Ali için:');
        expect(msg).toContain('🎯 Matematik — MAB.4: Karşılaştırmaya ve tahmine dayalı çıkarım yapabilme');
        expect(msg).toContain('• Sıralama\n');                      // ücretsiz oyunda paket notu yok
        expect(msg).toContain('• Diziyi Tamamla (Tohum ile açılır)');
        expect(lines[lines.length - 1]).toBe('Teşekkürler');
    });

    it('ad verilmezse genel giriş; ad boşluktan ibaretse de genel', () => {
        expect(buildParentMessage([mat], null, t).split('\n')[1]).toBe('Evde:');
        expect(buildParentMessage([mat], '   ', t).split('\n')[1]).toBe('Evde:');
    });

    it('resmi olmayan (SDB) kodda kod yazılmaz, yalnız metin', () => {
        const msg = buildParentMessage([sdb], null, t);
        expect(msg).toContain('🎯 Sosyal-Duygusal — Kendini Tanıma');
        expect(msg).not.toContain('SDB');
        expect(msg).toContain('(Filiz ile açılır)');
    });

    it('kazanımlar alan sırasına, oyunlar ada göre dizilir (girdi sırası önemsiz)', () => {
        const a = buildParentMessage([muz, sdb, mat], null, t);
        const b = buildParentMessage([mat, muz, sdb], null, t);
        expect(a).toBe(b);
        expect(a.indexOf('Matematik')).toBeLessThan(a.indexOf('Sosyal-Duygusal'));
        expect(a.indexOf('Sosyal-Duygusal')).toBeLessThan(a.indexOf('Müzik'));
        expect(a.indexOf('Diziyi Tamamla')).toBeLessThan(a.indexOf('Sıralama'));
    });
});

describe('metin paylaşma', () => {
    const base = (over: Partial<ShareDeps>): ShareDeps => ({ os: 'web', ...over });

    it('native: sistem paylaşım sayfası; kapatılırsa iptal, hata olursa başarısız', async () => {
        expect(await shareText('x', base({ os: 'ios', nativeShare: async () => ({ action: 'sharedAction' }) }))).toBe('shared');
        expect(await shareText('x', base({ os: 'android', nativeShare: async () => ({ action: 'dismissedAction' }) }))).toBe('cancelled');
        expect(await shareText('x', base({ os: 'ios', nativeShare: async () => { throw new Error('x'); } }))).toBe('failed');
    });

    it('web: navigator.share varsa o; kullanıcı vazgeçerse iptal; desteklenmiyorsa panoya düşer', async () => {
        const writes: string[] = [];
        const clip = async (s: string) => { writes.push(s); };
        expect(await shareText('mesaj', base({ navShare: async () => {} }))).toBe('shared');
        expect(await shareText('mesaj', base({ navShare: async () => { throw Object.assign(new Error('a'), { name: 'AbortError' }); }, clipboardWrite: clip }))).toBe('cancelled');
        expect(writes).toEqual([]);
        expect(await shareText('mesaj', base({ navShare: async () => { throw new Error('NotAllowed'); }, clipboardWrite: clip }))).toBe('copied');
        expect(await shareText('mesaj', base({ clipboardWrite: clip }))).toBe('copied');
        expect(writes).toEqual(['mesaj', 'mesaj']);
    });

    it('web: ne paylaşım ne pano varsa ya da pano reddederse başarısız; boş metin başarısız', async () => {
        expect(await shareText('mesaj', base({}))).toBe('failed');
        expect(await shareText('mesaj', base({ clipboardWrite: async () => { throw new Error('denied'); } }))).toBe('failed');
        expect(await shareText('', base({ navShare: async () => {} }))).toBe('failed');
    });
});
