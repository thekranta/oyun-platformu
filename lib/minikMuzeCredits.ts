import type { Painting } from '../constants/minikMuze';

/** Wikimedia Commons dosya sayfasının adresi (dosya adındaki boşluk, virgül, kesme işareti vb. güvenle kodlanır). */
export function commonsPageUrl(commonsFile: string): string {
    return 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(commonsFile.replace(/ /g, '_'));
}

/** Künye satırı: eser, ressam, tarih, müze, kaynak ve lisans (mağaza telif beyanı ve künye ekranı için). */
export function creditLine(p: Pick<Painting, 'title' | 'artist' | 'yearLabel' | 'credit'>): string {
    return `${p.title} — ${p.artist}, ${p.yearLabel}. ${p.credit.museum}. Kaynak: ${p.credit.source} (${p.credit.license}).`;
}

/** Künye ekranının genel açıklaması. */
export const CREDITS_INTRO =
    'Minik Müze\'deki tüm tablolar kamu malıdır (ressamlarının vefatından yüzyıllar geçmiştir). '
    + 'Görseller Wikimedia Commons arşivinden alınmıştır. Sesli anlatım yapay zekâ destekli ses teknolojisiyle hazırlanmıştır.';
