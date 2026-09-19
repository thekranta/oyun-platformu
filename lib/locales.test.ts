import en from '../locales/en.json';
import tr from '../locales/tr.json';

// Ürün paketleri Tohum/Filiz/Fidan/Orman (veli) ve Çınar/Meşe (kurumsal) — "Premium" diye
// bir paket yok. Kullanıcıya görünen hiçbir metin genel "Premium" demesin.
function collectStrings(node: unknown, path: string, out: { path: string; value: string }[]) {
    if (typeof node === 'string') out.push({ path, value: node });
    else if (Array.isArray(node)) node.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
    else if (node && typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => collectStrings(v, path ? `${path}.${k}` : k, out));
    }
}

describe.each([['tr', tr], ['en', en]])('locales/%s.json', (_lang, data) => {
    it('görünen metinlerde genel "Premium" ifadesi yok', () => {
        const all: { path: string; value: string }[] = [];
        collectStrings(data, '', all);
        const offenders = all.filter(x => /premium/i.test(x.value)).map(x => `${x.path}: ${x.value}`);
        expect(offenders).toEqual([]);
    });
});
