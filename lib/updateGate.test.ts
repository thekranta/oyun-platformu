import { readFileSync } from 'fs';
import { join } from 'path';
import en from '../locales/en.json';
import tr from '../locales/tr.json';
import { compareVersions, evaluateRequirement } from './updateGate';

const URL_OK = 'https://play.google.com/store/apps/details?id=com.oyunprojesi.app';

describe('compareVersions', () => {
    it('sürümleri sayısal sıralar', () => {
        expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
        expect(compareVersions('1.2.0', '1.10.0')).toBe(-1);
        expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
        expect(compareVersions('1.0', '1.0.0')).toBe(0);
    });
    it('çözülemeyen sürümde null verir', () => {
        expect(compareVersions('abc', '1.0.0')).toBeNull();
    });
});

describe('evaluateRequirement', () => {
    const veri = { android: { minimum: '1.2.0', url: URL_OK }, ios: { minimum: '1.0.0', url: '' } };
    it('eski sürümde güncelleme ister', () => {
        expect(evaluateRequirement(veri, 'android', '1.1.9')).toEqual({ required: true, url: URL_OK });
    });
    it('eşit ve yeni sürümde istemez', () => {
        expect(evaluateRequirement(veri, 'android', '1.2.0').required).toBe(false);
        expect(evaluateRequirement(veri, 'android', '2.0.0').required).toBe(false);
    });
    it('fail-open: bozuk, eksik ya da güvensiz adresli veride ASLA engellemez', () => {
        expect(evaluateRequirement(null, 'android', '0.0.1').required).toBe(false);
        expect(evaluateRequirement({}, 'android', '0.0.1').required).toBe(false);
        expect(evaluateRequirement({ android: { minimum: 5, url: URL_OK } }, 'android', '0.0.1').required).toBe(false);
        expect(evaluateRequirement(veri, 'ios', '0.0.1').required).toBe(false); // adres boş
        expect(evaluateRequirement({ android: { minimum: '9.0.0', url: 'http://x.com' } }, 'android', '1.0.0').required).toBe(false);
        expect(evaluateRequirement({ android: { minimum: 'sürüm', url: URL_OK } }, 'android', '1.0.0').required).toBe(false);
    });
});

describe('yayınlanan public/surum.json', () => {
    const dosya = JSON.parse(readFileSync(join(__dirname, '..', 'public', 'surum.json'), 'utf8'));
    const app = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8'));
    it('mevcut sürümü ASLA engellemez (en düşük sürüm ≤ app.json sürümü)', () => {
        for (const os of ['android', 'ios']) {
            expect(evaluateRequirement(dosya, os, app.expo.version).required).toBe(false);
        }
    });
    it('Android adresi mağaza paketine işaret eder', () => {
        expect(dosya.android.url).toContain(app.expo.android.package);
    });
});

describe('güncelleme ekranı metinleri', () => {
    it('TR ve EN anahtarları eşit', () => {
        expect(Object.keys(tr.updateGate).sort()).toEqual(Object.keys(en.updateGate).sort());
    });
});
