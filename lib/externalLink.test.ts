import { LEGAL_URLS, LEGAL_URLS_EN, legalUrl } from './externalLink';

describe('legalUrl (yasal sayfa dile göre)', () => {
    it('İngilizce arayüzde /en/ sayfaları, Türkçe ve bilinmeyen dilde Türkçe asıl', () => {
        expect(legalUrl('privacy', 'en')).toBe(LEGAL_URLS_EN.privacy);
        expect(legalUrl('terms', 'en-US')).toBe(LEGAL_URLS_EN.terms);
        expect(legalUrl('privacy', 'tr')).toBe(LEGAL_URLS.privacy);
        expect(legalUrl('terms', 'de')).toBe(LEGAL_URLS.terms);
        expect(legalUrl('terms', undefined)).toBe(LEGAL_URLS.terms);
    });

    it('adresler childhoodtech.com altında ve https', () => {
        for (const u of [...Object.values(LEGAL_URLS), ...Object.values(LEGAL_URLS_EN)]) expect(u).toMatch(/^https:\/\/childhoodtech\.com\//);
    });
});
