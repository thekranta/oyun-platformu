import { enSlug, enKlipMetinleri } from '../constants/ingilizceKelimeler';
import { TTS } from './ttsAssets';
import * as fs from 'fs';
import * as path from 'path';
import { TR_YONERGELER as TR_BOYA } from './enBoya';
import { TR_YONERGELER as TR_DINLE } from './enDinleDokun';
import { TR_YONERGELER as TR_OGRETMEN } from './enOgretmenDerKi';
import { TR_YONERGELER as TR_SAYALIM } from './enSayalim';

/**
 * İngilizce ek etkinlik klipleri: oyunun söyleyeceği her İngilizce metnin hazır klibi (assets/sounds/tts/eng-*.mp3) olmalı;
 * yoksa konuşma SESSİZ geçer (Türkçe sese düşmez) ve çocuk oyunda sessizlik yaşar. Türkçe giriş yönergelerinin de klibi olmalı.
 */
describe('İngilizce klipler', () => {
    it('veri dosyasındaki slug kuralı speechService.enClipSlug ile aynı (eng- ön eki + ttsSlug)', () => {
        const kaynak = fs.readFileSync(path.join(__dirname, '..', 'services', 'speechService.ts'), 'utf8');
        expect(kaynak).toMatch(/return 'eng-' \+ ttsSlug\(text\);/);
        expect(enSlug('Paint the apple red.')).toBe('eng-paint-the-apple-red');
        expect(enSlug('Good job!')).toBe('eng-good-job');
    });

    it('her İngilizce metnin hazır klibi (eng-<slug>) var', () => {
        const eksik = enKlipMetinleri().filter((t) => TTS[enSlug(t)] == null).map((t) => `${t} → ${enSlug(t)}`);
        expect(eksik).toEqual([]);
    });

    it('İngilizce klip adları Türkçe klip adlarıyla ÇAKIŞMAZ (eng- ön eki Türkçe klip adlarında yok)', () => {
        const turkceEng = Object.keys(TTS).filter((k) => k.startsWith('eng-') && !enKlipMetinleri().some((t) => enSlug(t) === k));
        expect(turkceEng).toEqual([]);
    });

    it('İngilizce klip adları ham Türkçe slug ile (örn. "top", "red") aynı anahtarı paylaşmaz', () => {
        for (const t of enKlipMetinleri()) expect(enSlug(t).startsWith('eng-')).toBe(true);
    });

    it('beş oyunun Türkçe giriş yönergelerinin klibi var', () => {
        // Konuşan Çiftler'in girişi bileşen dosyasında (RN bağımlı; içe aktarılmaz): sabit kaynaktan okunur.
        const cift = fs.readFileSync(path.join(__dirname, '..', 'components', 'EnglishKonusanCiftler.tsx'), 'utf8').match(/const GIRIS_MESAJI = '([^']*)'/);
        expect(cift).not.toBeNull();
        const tum = [...TR_BOYA, ...TR_DINLE, cift![1], ...TR_OGRETMEN, ...TR_SAYALIM];
        expect(tum.length).toBe(5);
        const slug = (t: string) => t.replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's').replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const eksik = tum.filter((t) => TTS[slug(t)] == null);
        expect(eksik).toEqual([]);
    });
});
