// Çocuk oyuncak odasının düzeni (components/ToyRoom.tsx). Paket kilidi (lib/subscriptionTiers.ts
// FREE_GAME_IDS) bu düzene bağlı olduğu için ayrı dosyada: testler her pakette her grubun dolu
// kaldığını ve ilk açılışın sabit oyunlarının açık olduğunu buradan doğrular.

/** İlk açılışta (round 0) her oda grubunda sabit gösterilen oyun; grup sırasıyla eşleşir. */
export const TOY_ROOM_FIRST_GAMES = ['yapboz', 'yaratici-cizim', 'hafiza-2', 'davul-ustasi', 'siralama'];

/** Odadaki 5 oyuncak yuvasının hangi Keşif Ormanı kategorilerinden oyun çektiği. */
export const TOY_ROOM_GROUPS: string[][] = [
  ['bulmaca-yolu', 'dikkat-dalgasi', 'ani-kelebegi'],
  ['renk-cayiri', 'harf-cicegi', 'sekil-goleti'],
  ['kesif-kucaklamasi', 'masal-kovugu', 'arkadas-cicegi', 'duygu-pinari'],
  ['ritim-kelebegi', 'kosu-kirazi', 'denge-dalgasi', 'can-elmasi'],
  ['sayi-agaci'],
];
