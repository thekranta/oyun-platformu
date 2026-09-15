import { parseSignupError } from './teamManagement';

describe('parseSignupError', () => {
    it("'already registered' içeren mesajı Türkçe özel mesaja çevirir", () => {
        expect(parseSignupError({ msg: 'User already registered' })).toBe(
            'Bu e-posta zaten kayıtlı. Yeni hesap oluşturulamaz.'
        );
        expect(parseSignupError({ error_description: 'already registered' })).toBe(
            'Bu e-posta zaten kayıtlı. Yeni hesap oluşturulamaz.'
        );
    });

    it("'invalid' içeren mesajı format hatasına çevirir", () => {
        expect(parseSignupError({ msg: 'Unable to validate email address: invalid format' })).toBe(
            'Geçersiz e-posta formatı.'
        );
    });

    it("'password' içeren mesajı büyük/küçük harften bağımsız zayıf şifre mesajına çevirir", () => {
        expect(parseSignupError({ msg: 'Password should be at least 6 characters' })).toBe(
            'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.'
        );
    });

    it('bilinmeyen mesajı olduğu gibi geçirir', () => {
        expect(parseSignupError({ msg: 'Something unexpected happened' })).toBe('Something unexpected happened');
    });

    it('boş/undefined girişte varsayılan mesajı döner', () => {
        expect(parseSignupError(undefined)).toBe('Hesap oluşturulamadı.');
        expect(parseSignupError({})).toBe('Hesap oluşturulamadı.');
    });
});
