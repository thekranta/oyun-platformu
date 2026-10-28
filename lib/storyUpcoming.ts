/**
 * Hikâye oyunlarında (AdaletHikayesi, AileSepetiMacerasi, CevizMacera) bir sahnede çocuk karar verirken önceden
 * indirilecek varlıklar — saf mantık (RN'e bağımlı değil, testli).
 *
 * Şimdiki sahne: soru sesi ve seçenek görselleri (anlatım bitince gerekir).
 * Sıradaki sahneler (seçeneklerin gittiği ve doğrusal `next`): arka plan, rozet, anlatım, soru sesi, seçenek görselleri/sesleri.
 * Varlık = require() sonucu: native'de sayı, web'de ses için metin adres, görsel için { uri, width, height } nesnesi.
 * null / boş / tanınmayan değerler atlanır. Derinlik 1: bir adım ötesi.
 */
export interface StoryNodeLike {
    bgImage?: unknown;
    badgeImage?: unknown;
    audio?: unknown;
    questionAudio?: unknown;
    next?: string;
    options?: { image?: unknown; audio?: unknown; next?: string }[];
}

/** Önceden indirilecek varlıklar (require() sonuçları olduğu gibi). */
export interface UpcomingAssets {
    images: unknown[];
    audio: unknown[];
}

/** Bir varlığın karşılaştırma anahtarı (tekrarı elemek için); varlık değilse undefined. */
export function assetKey(v: unknown): string | number | undefined {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return v || undefined;
    if (v && typeof v === 'object' && typeof (v as { uri?: unknown }).uri === 'string') return (v as { uri: string }).uri || undefined;
    return undefined;
}

export function upcomingAssets(nodes: Record<string, StoryNodeLike | undefined>, nodeId: string): UpcomingAssets {
    const images: unknown[] = [];
    const audio: unknown[] = [];
    const cur = nodes[nodeId];
    if (!cur) return { images, audio };

    const add = (list: unknown[], v: unknown) => {
        const k = assetKey(v);
        if (k !== undefined && !list.some((x) => assetKey(x) === k)) list.push(v);
    };
    const addNode = (n: StoryNodeLike) => {
        add(images, n.bgImage);
        add(images, n.badgeImage);
        add(audio, n.audio);
        add(audio, n.questionAudio);
        n.options?.forEach((o) => { add(images, o.image); add(audio, o.audio); });
    };

    // Şimdiki sahne: anlatımı zaten çalıyor; soru sesi ve seçenekler sırada.
    add(audio, cur.questionAudio);
    cur.options?.forEach((o) => { add(images, o.image); add(audio, o.audio); });

    // Sıradaki sahneler.
    const nextIds = [...(cur.options ?? []).map((o) => o.next), cur.next].filter((id): id is string => !!id && id !== nodeId);
    for (const id of new Set(nextIds)) {
        const n = nodes[id];
        if (n) addNode(n);
    }
    return { images, audio };
}
