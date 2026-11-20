import * as fs from 'fs';
import * as path from 'path';
import { MAARIF_CIKTILAR_2026 } from '../constants/maarifCurriculum2026';
import { MAARIF_MAP } from '../constants/maarifMap';

/**
 * 2026-11-20 KAZANIM DENETİMİ: 162 oyun, oyunun gerçekte yaptığıyla Maarif kodu karşılaştırıldı (9 denetçi + 3 bağımsız
 * çürütme turu). Bu test o turda alınan kararları sabitler: biri bir kodu "eski haline" çevirirse ya da yeni bir oyunda
 * var olmayan kod yazılırsa burada kırmızı olur. Kararın gerekçesi: oyunun ANA etkileşimi kodun çıktı cümlesindeki
 * davranışı yaptırmalı (ör. Sıralama karşılaştırma değil sayı sırası → MAB.1).
 */

const KARARLAR: Array<[string, string, string]> = [
    // [oyun_turu, kod, alan]
    ['siralama', 'MAB.1', 'Matematik'],
    ['eksik-sayi-bul', 'MAB.1', 'Matematik'],
    ['eksik-sayi-bul-2', 'MAB.1', 'Matematik'],
    ['akilli-eksik-sayi', 'MAB.1', 'Matematik'],
    ['minik-market', 'MAB.1', 'Matematik'], // SAB.14 yalnız Türk kültürü/Atatürk; alışveriş sayma+nicelik eşleme
    ['akilli-hafiza-sekil', 'MAB.10', 'Matematik'],
    ['sekil-deligi', 'MAB.9', 'Matematik'],
    ['tarti-dengesi', 'MAB.10', 'Matematik'],
    ['renkli-baglantalar', 'FAB.2', 'Fen'],
    ['ayni-farkli', 'FAB.2', 'Fen'],
    ['hava-kiyafet', 'FAB.3', 'Fen'],
    ['buyuyunce', 'FAB.3', 'Fen'],
    ['bunu-soyle', 'TAKB.3', 'Türkçe'],
    ['kucuk-anlatici', 'TAKB.2', 'Türkçe'],
    ['aile-sepeti', 'SDB.4', 'Sosyal-Duygusal'],
    ['duygu-yuzleri', 'SDB.5', 'Sosyal-Duygusal'],
    ['ceviz-macera', 'SDB.7', 'Sosyal-Duygusal'],
];

describe('kazanım denetimi 2026-11-20 kararları', () => {
    it.each(KARARLAR)('%s → %s (%s)', (oyun, kod, alan) => {
        expect(MAARIF_MAP[oyun].cikti).toBe(kod);
        expect(MAARIF_MAP[oyun].alan).toBe(alan);
    });

    it('denetimde KORUNAN kodlar (iki turda da eski hâli daha doğru bulundu) geri değişmez', () => {
        expect(MAARIF_MAP['akilli-miktar'].cikti).toBe('MAB.1');
        expect(MAARIF_MAP['sayi-boya'].cikti).toBe('SNAB.4');
        expect(MAARIF_MAP['davul-ustasi'].cikti).toBe('MÇB.2');
        expect(MAARIF_MAP['duyularimiz'].cikti).toBe('HSAB.4');
        expect(MAARIF_MAP['meslekler'].cikti).toBe('SAB.14');
        expect(MAARIF_MAP['ne-ise-yarar'].cikti).toBe('MAB.4');
        expect(MAARIF_MAP['hafiza-3'].cikti).toBe('SDB.1');
    });

    it('Duygu Çiftleri açıklaması duygu ADLANDIRMA iddiası taşımaz (oyun yalnız eşleştirir)', () => {
        expect(MAARIF_MAP['hafiza-3'].ciktiAciklama).not.toMatch(/tanıma ve adlandırma/);
    });
});

describe('oyun bileşenlerinin veritabanına yazdığı kazanimOdagi etiketleri', () => {
    const dir = path.join(__dirname, '..', 'components');
    const dosyalar = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    const kodRe = /\b(MAB|FAB|HSAB|SAB|TADB|TAKB|TAEOB|TAOB|MDB|MSB|MÇB|MHB|MYB|SNAB|SDB)\.(\d+)/g;

    it('etikette geçen her kod 2026 programında var (eski/uydurma kod yazılmaz)', () => {
        const kotu: string[] = [];
        for (const f of dosyalar) {
            const kaynak = fs.readFileSync(path.join(dir, f), 'utf8');
            for (const m of kaynak.matchAll(/kazanimOdagi:\s*(['"`])((?:(?!\1).)*)\1/g)) {
                for (const k of m[2].matchAll(kodRe)) {
                    const kod = k[1] + '.' + k[2];
                    if (!MAARIF_CIKTILAR_2026[kod]) kotu.push(`${f}: "${m[2]}" -> ${kod}`);
                }
            }
        }
        expect(kotu).toEqual([]);
    });
});

describe('yönetici panelindeki AI rapor istemi', () => {
    const kaynak = fs.readFileSync(path.join(__dirname, '..', 'app', 'admin.tsx'), 'utf8');

    it('SDB (platform içi) kodu rapora kod olarak yazdırılmaz ve modele "SDB uydurma" diye çelişkili talimat verilmez', () => {
        expect(kaynak).not.toMatch(/SDB veya başka kod UYDURMA/);
        expect(kaynak).not.toMatch(/\$\{oyunBilgisi\.cikti\}\s*-\s*\$\{oyunBilgisi\.ciktiAciklama\}/);
        expect(kaynak).toMatch(/ciktiEtiketi/);
    });
});
