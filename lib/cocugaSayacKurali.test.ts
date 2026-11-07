import { readdirSync, readFileSync } from 'fs';
import { join, sep } from 'path';

// 2026-10-22 kullanıcı kararı: çocuğa Puan / Hata / Doğru sayısı GÖSTERİLMEZ (yalnız olumlu geri bildirim); ölçümler
// onGameEnd/extraData ile veli raporuna gider. Bu test oyun bileşenlerinde ekrana basılan sayaç kalıplarını yakalar.
// Yetişkin ekranları (paneller, yönetici, kurum, tahta) kapsam dışıdır.

const KAPSAM_DISI = /Dashboard|admin|owner|Institution|rewardBoard|board\/|PlayerSheet|Paywall|ParentGate|BunuSoyle/;

function bilesenler(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = join(dir, e.name);
        if (e.isDirectory()) return bilesenler(p);
        return e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx') ? [p] : [];
    });
}

describe('çocuğa sayaç gösterme kuralı', () => {
    it('oyun ekranlarında "Hata:", "Doğru:", "Puan:" ya da etiket+sayı sayacı yok', () => {
        const kok = join(__dirname, '..', 'components');
        const ihlal: string[] = [];
        for (const dosya of bilesenler(kok)) {
            const rel = dosya.slice(kok.length + 1).split(sep).join('/');
            if (KAPSAM_DISI.test(rel)) continue;
            const satirlar = readFileSync(dosya, 'utf8').split('\n');
            satirlar.forEach((satir, i) => {
                if (/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(satir)) return;            // yorum
                // JSX metni: ">Hata<", ">Hata: {", "Doğru: {x}", "Puan: {x}"
                if (/>\s*(⚠️\s*)?(Hata|Hatalar|Puan|Skor|Doğru)\s*:?\s*(<|\{)/.test(satir) || /(Hata|Doğru|Puan)\s*:\s*\{/.test(satir)) {
                    ihlal.push(`${rel}:${i + 1}: ${satir.trim().slice(0, 100)}`);
                }
            });
        }
        expect(ihlal).toEqual([]);
    });
});
