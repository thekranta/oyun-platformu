import * as fs from 'fs';
import * as path from 'path';

/**
 * Animasyon sürücüsü karışması (2026-11-14, Android taraması: Akıllı Sınıflandır 2. soruda çöküyordu):
 *
 * React Native'de `useNativeDriver: true` ile başlayan bir animasyon, o değerin bağlı olduğu TÜM görünüm düğümünü (aynı
 * Animated.View'ın bütün stil değerleri dahil) "native'e taşır". Aynı görünümde JS sürücülü bir değer varsa (PanResponder ile
 * sürüklenen `pan` / ValueXY, JS yaylanma vb.) bir sonraki JS animasyonu şu hatayı verir ve oyun beyaz ekranda kalır:
 *   "Attempting to run JS driven animation on animated node that has been moved to native earlier ..."
 * Web'de yerel sürücü olmadığından bu hata YALNIZ telefonda çıkar. Kural: native ve JS değerleri AYRI Animated.View'larda olsun
 * (dıştaki yerel, içteki JS), ve bir değer iki sürücüyle birden oynatılmasın.
 */

const ROOT = path.resolve(__dirname, '..');

function tsxFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
        const rel = `${dir}/${name}`;
        if (fs.statSync(path.join(ROOT, rel)).isDirectory()) out.push(...tsxFiles(rel));
        else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(rel);
    }
    return out;
}

export function driversOf(src: string): { native: Set<string>; js: Set<string> } {
    const native = new Set<string>();
    const js = new Set<string>();
    const anim = /Animated\.(?:timing|spring|decay)\(\s*([A-Za-z_][\w.]*?)(?:\.current)?\s*,((?:(?!Animated\.(?:timing|spring|decay)\()[\s\S]){0,300}?)useNativeDriver:\s*(true|false)/g;
    for (const m of src.matchAll(anim)) (m[3] === 'true' ? native : js).add(m[1].split('.')[0]);
    for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*(?:useRef\()?\s*new Animated\.ValueXY/g)) js.add(m[1]);
    for (const m of src.matchAll(/Animated\.event\(\s*\[[^\]]*?(\w+)\.(?:x|y)/g)) js.add(m[1]);
    return { native, js };
}

/** `<Animated.View ...>` açılış etiketlerinin öznitelik metinleri (süslü parantez derinliğine bakarak). */
export function animatedTags(src: string): string[] {
    const tags: string[] = [];
    for (const m of src.matchAll(/<Animated\.(?:View|Image|Text|ScrollView)\b/g)) {
        let depth = 0;
        let i = m.index! + m[0].length;
        const start = i;
        for (; i < src.length; i++) {
            const c = src[i];
            if (c === '{') depth++;
            else if (c === '}') depth--;
            else if (c === '>' && depth === 0 && src[i - 1] !== '=') break;
        }
        tags.push(src.slice(start, i));
    }
    return tags;
}

export function mixedDriverProblems(src: string): string[] {
    const { native, js } = driversOf(src);
    const problems: string[] = [];
    for (const n of native) if (js.has(n)) problems.push(`${n}: aynı değer hem yerel hem JS sürücüyle oynatılıyor`);
    for (const tag of animatedTags(src)) {
        const words = new Set(tag.match(/[A-Za-z_]\w*/g) ?? []);
        const nat = [...native].filter((n) => words.has(n));
        const jsv = [...js].filter((j) => words.has(j));
        if (nat.length && jsv.length) problems.push(`aynı Animated.View'da yerel (${nat.join(',')}) + JS (${jsv.join(',')}) değerleri`);
    }
    return problems;
}

describe('animasyon sürücüsü karışması (yalnız telefonda çöker)', () => {
    it('algılayıcı: aynı görünümde yerel + JS değer → sorun; ayrı katmanlarda → sorun yok', () => {
        const bad = `
            const pan = useRef(new Animated.ValueXY()).current;
            const bump = useRef(new Animated.Value(1)).current;
            const back = () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
            Animated.timing(bump, { toValue: 1.15, duration: 140, useNativeDriver: true }).start();
            const v = <Animated.View style={[{ transform: [{ scale: bump }, ...pan.getTranslateTransform()] }]}><Text /></Animated.View>;`;
        const good = bad.replace(
            /<Animated\.View style=\{\[\{ transform: \[\{ scale: bump \}, \.\.\.pan\.getTranslateTransform\(\)\] \}\]\}>/,
            '<Animated.View style={{ transform: [{ scale: bump }] }}><Animated.View style={{ transform: [...pan.getTranslateTransform()] }}>',
        );
        expect(mixedDriverProblems(bad).length).toBeGreaterThan(0);
        expect(mixedDriverProblems(good)).toEqual([]);
    });

    it('aynı değer iki sürücüyle oynatılırsa yakalanır', () => {
        const src = `
            const x = useRef(new Animated.Value(0)).current;
            Animated.timing(x, { toValue: 1, useNativeDriver: true }).start();
            Animated.timing(x, { toValue: 0, useNativeDriver: false }).start();`;
        expect(mixedDriverProblems(src).length).toBeGreaterThan(0);
    });

    it('hiçbir bileşende yerel + JS sürücü karışmıyor', () => {
        const offenders: string[] = [];
        for (const file of [...tsxFiles('components'), ...tsxFiles('app')]) {
            const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
            if (!src.includes('useNativeDriver') && !src.includes('ValueXY')) continue;
            for (const p of mixedDriverProblems(src)) offenders.push(`${file}: ${p}`);
        }
        expect(offenders).toEqual([]);
    });
});
