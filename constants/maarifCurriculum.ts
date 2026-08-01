/**
 * maarifCurriculum.ts — KANONİK Maarif çıktı kodları (tek doğruluk kaynağı)
 * ------------------------------------------------------------
 * Bu dosya, `raw_curriculum.txt` (Türkiye Yüzyılı Maarif Modeli okul öncesi
 * programı) belgesinden LİTERAL olarak çıkarılmış TÜM Öğrenme Çıktısı kodlarını
 * ve resmi açıklamalarını içerir. Amaç: Maarif'e yönelik UYDURMALARI önlemek.
 *
 * Kural: `constants/maarifMap.ts` içindeki her oyunun `cikti` kodu BURADA
 * bulunmalıdır. `isValidCikti(code)` ile doğrulanabilir. Burada olmayan bir kod
 * = uydurma; kullanılamaz.
 *
 * ⚠️ Yaşa göre değişen kodlar: Belgede bazı kodlar (HSAB.6–12, MAB.3–6/11–13,
 * MÇB.1–3, SAB.1–7) farklı yaş bantlarında FARKLI çıktıya karşılık gelir.
 * Bu kodlarda `yasaGoreDegisir: true` işaretlidir ve açıklama, yaş bandı
 * etiketleriyle birleşik verilmiştir. Kesin eşleme için yaş bandı da dikkate
 * alınmalıdır.
 *
 * Kaynak: raw_curriculum.txt (1496 satır). 92 kod. Uydurma/belirsiz kod yok.
 */

export interface MaarifCikti {
    code: string;
    alan: 'Fen' | 'Matematik' | 'Türkçe' | 'Hareket ve Sağlık' | 'Sosyal' | 'Müzik' | 'Sanat';
    aciklama: string;
    yasaGoreDegisir?: boolean;
}

export const MAARIF_CIKTILAR: Record<string, MaarifCikti> = {
    // ===== FEN ALANI (FAB) =====
    'FAB.1': { code: 'FAB.1', alan: 'Fen', aciklama: 'Günlük yaşamda fenle ilgili olaylara/olgulara ve durumlara yönelik bilimsel gözlem yapabilme' },
    'FAB.2': { code: 'FAB.2', alan: 'Fen', aciklama: 'Fene yönelik nesne, olayları/olguları benzerlik ve farklılıklarına göre sınıflandırabilme' },
    'FAB.3': { code: 'FAB.3', alan: 'Fen', aciklama: 'Günlük yaşamda fen olaylarına yönelik bilimsel gözleme dayalı tahminlerde bulunabilme' },
    'FAB.4': { code: 'FAB.4', alan: 'Fen', aciklama: 'Fene yönelik olay ve/veya olgulara yönelik bilimsel veriye dayalı tahminlerde bulunabilme' },
    'FAB.5': { code: 'FAB.5', alan: 'Fen', aciklama: 'Fene yönelik olay ve olguları operasyonel/işlevsel olarak tanımlayabilme' },
    'FAB.6': { code: 'FAB.6', alan: 'Fen', aciklama: 'Merak ettiği konular/olay/durum hakkında deneyler yapabilme' },
    'FAB.7': { code: 'FAB.7', alan: 'Fen', aciklama: 'Günlük hayatındaki fene yönelik olaylar hakkında gözlemlerine dayalı basit düzeyde bilimsel çıkarımlar yapabilme' },
    'FAB.8': { code: 'FAB.8', alan: 'Fen', aciklama: 'Fene yönelik olay ve/veya olguları açıklamak için basit düzeyde bilimsel modellerden faydalanabilme' },
    'FAB.9': { code: 'FAB.9', alan: 'Fen', aciklama: 'Bilimsel olayları/olguları açıklamak için kanıtlar kullanabilme' },
    'FAB.10': { code: 'FAB.10', alan: 'Fen', aciklama: 'Fene yönelik günlük hayatla ilişkili olay, olgu ve/veya durumlara yönelik bilimsel sorgulama yapabilme' },

    // ===== HAREKET VE SAĞLIK ALANI (HSAB) =====
    'HSAB.1': { code: 'HSAB.1', alan: 'Hareket ve Sağlık', aciklama: 'Farklı çevre ve fiziksel etkinliklerde büyük kas becerilerini etkin bir şekilde uygulayabilme' },
    'HSAB.2': { code: 'HSAB.2', alan: 'Hareket ve Sağlık', aciklama: 'Farklı ebat ve özellikteki nesneleri etkin bir şekilde kullanabilme' },
    'HSAB.3': { code: 'HSAB.3', alan: 'Hareket ve Sağlık', aciklama: 'Jimnastik, dans ve hareket etkinliklerinde ritmik beceriler sergileyebilme' },
    'HSAB.4': { code: 'HSAB.4', alan: 'Hareket ve Sağlık', aciklama: 'Beden farkındalığına dayalı hareket edebilme' },
    'HSAB.5': { code: 'HSAB.5', alan: 'Hareket ve Sağlık', aciklama: 'Kişisel ve genel alanın farkında olarak hareket edebilme' },
    'HSAB.6': { code: 'HSAB.6', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(36-48) Günlük yaşamında yeterli sıvı tüketme davranışları gösterebilme ‖ (48-60) Eşle/grupla hareket örüntüleri sergileyebilme ‖ (60-72) Eşle/grupla ahenk içinde hareket örüntüleri sergileyebilme' },
    'HSAB.7': { code: 'HSAB.7', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(36-48) Aktif ve sağlıklı yaşam için gereken zindelik becerilerinin neler olduğunu söyleyebilme ‖ (48-60,60-72) Günlük yaşamında sağlıklı beslenme davranışları gösterebilme' },
    'HSAB.8': { code: 'HSAB.8', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(36-48) Aktif ve sağlıklı yaşam için hareket edebilme ‖ (48-60,60-72) Aktif ve sağlıklı yaşam için gereken zindelik becerilerinin neler olduğunu söyleyebilme' },
    'HSAB.9': { code: 'HSAB.9', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(36-48) Sağlıklı yaşam için temizliğe ve düzene dikkat edebilme ‖ (48-60,60-72) Aktif ve sağlıklı yaşam için hareket edebilme' },
    'HSAB.10': { code: 'HSAB.10', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(36-48) Tehlike ve kaza durumlarına karşı kendini koruyabilme ‖ (48-60,60-72) Sağlıklı yaşam için temizliğe ve düzene dikkat edebilme' },
    'HSAB.11': { code: 'HSAB.11', alan: 'Hareket ve Sağlık', aciklama: 'Tehlike ve kaza durumlarına karşı kendini koruyabilme' },
    'HSAB.12': { code: 'HSAB.12', alan: 'Hareket ve Sağlık', yasaGoreDegisir: true, aciklama: '(48-60) Hareketli oyunlarda liderliği deneyimleme ‖ (60-72) Hareketli oyunların temel kurallarını açıklayabilme' },
    'HSAB.13': { code: 'HSAB.13', alan: 'Hareket ve Sağlık', aciklama: 'Hareketli oyunlara özgü basit taktik ve strateji geliştirebilme' },
    'HSAB.14': { code: 'HSAB.14', alan: 'Hareket ve Sağlık', aciklama: 'Hareketli oyunlarda liderliği deneyimleme' },

    // ===== MATEMATİK ALANI (MAB) =====
    'MAB.1': { code: 'MAB.1', alan: 'Matematik', aciklama: 'Ritmik ve algısal sayabilme' },
    'MAB.2': { code: 'MAB.2', alan: 'Matematik', aciklama: 'Matematiksel olgu, olay ve nesnelerin özelliklerini çözümleyebilme' },
    'MAB.3': { code: 'MAB.3', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(36-48) Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme ‖ (48-60,60-72) Matematiksel olgu, olay ve nesneleri yorumlayabilme' },
    'MAB.4': { code: 'MAB.4', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(36-48) Matematiksel problemler ve çözümlerine ilişkin açıklamalar ve stratejilerden yararlanabilme ‖ (48-60,60-72) Matematiksel olgu, olay ve nesnelere ilişkin çıkarım yapabilme' },
    'MAB.5': { code: 'MAB.5', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(36-48) Farklı matematiksel temsillerden yararlanabilme ‖ (48-60,60-72) Matematiksel problemleri çözümleyebilme' },
    'MAB.6': { code: 'MAB.6', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(36-48) Farklı matematiksel temsilleri değerlendirebilme ‖ (48-60,60-72) Matematiksel problemleri yorumlayabilme' },
    'MAB.7': { code: 'MAB.7', alan: 'Matematik', aciklama: 'Matematiksel problemler ve çözümlerine ilişkin açıklamalar ve stratejiler geliştirebilme' },
    'MAB.8': { code: 'MAB.8', alan: 'Matematik', aciklama: 'Matematiksel problemlerin çözümüne ilişkin deneyimlerini, çıkarımlarını ve değerlendirmelerini yansıtabilme' },
    'MAB.9': { code: 'MAB.9', alan: 'Matematik', aciklama: 'Farklı matematiksel temsillerden yararlanabilme' },
    'MAB.10': { code: 'MAB.10', alan: 'Matematik', aciklama: 'Farklı matematiksel temsilleri değerlendirebilme' },
    'MAB.11': { code: 'MAB.11', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(48-60) Elde ettiği/eriştiği verileri düzenleyebilme ‖ (60-72) Araştırılabilecek problemler belirleyebilme' },
    'MAB.12': { code: 'MAB.12', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(48-60) Problemlerin çözümüne yönelik bulgulara ulaşabilme ‖ (60-72) Elde ettiği/eriştiği verileri düzenleyebilme' },
    'MAB.13': { code: 'MAB.13', alan: 'Matematik', yasaGoreDegisir: true, aciklama: '(48-60) Problemlerin çözümüne ilişkin bulguları yorumlayabilme ‖ (60-72) Problemlerin çözümüne yönelik bulgulara ulaşabilme' },
    'MAB.14': { code: 'MAB.14', alan: 'Matematik', aciklama: 'Problemlerin çözümüne ilişkin bulguları yorumlayabilme' },

    // ===== MÜZİK ALANI (MDB/MSB/MÇB/MHB/MYB) =====
    'MÇB.1': { code: 'MÇB.1', alan: 'Müzik', yasaGoreDegisir: true, aciklama: '(36-48) Çalacağı çalgılara/ritimlere/ezgilere dair duygu ve düşüncelerini ifade edebilme ‖ (60-72) Duyduğu sesleri çalgıyla taklit edebilme' },
    'MÇB.2': { code: 'MÇB.2', alan: 'Müzik', yasaGoreDegisir: true, aciklama: '(36-48) Çaldığı ritimlerdeki özellikleri fark edebilme ‖ (60-72) Çalacağı çalgılara/ritimlere/ezgilere/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme' },
    'MÇB.3': { code: 'MÇB.3', alan: 'Müzik', yasaGoreDegisir: true, aciklama: '(36-48) Müziksel çalma becerilerini sergileyebilme ‖ (60-72) Çaldığı ritimlerdeki/ezgilerdeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme' },
    'MÇB.4': { code: 'MÇB.4', alan: 'Müzik', aciklama: 'Müziksel çalma becerilerini sergileyebilme' },
    'MDB.1': { code: 'MDB.1', alan: 'Müzik', aciklama: 'Çeşitli çocuk şarkılarını/çocuk şarkısı formlarını dinleyebilme' },
    'MDB.2': { code: 'MDB.2', alan: 'Müzik', aciklama: 'Dinlediği çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme' },
    'MDB.3': { code: 'MDB.3', alan: 'Müzik', aciklama: 'Duyduğu seslerin kaynağını anlayabilme' },
    'MDB.4': { code: 'MDB.4', alan: 'Müzik', aciklama: 'Dinlediği sözlü/sözsüz müzik eserlerindeki/çocuk şarkılarındaki özellikleri fark edebilme' },
    'MHB.1': { code: 'MHB.1', alan: 'Müzik', aciklama: 'Harekete ve dansa eşlik eden ritimlere/müzik eserlerine/çocuk şarkılarına/çocuk şarkısı formlarına dair duygu ve düşüncelerini ifade edebilme' },
    'MHB.2': { code: 'MHB.2', alan: 'Müzik', aciklama: 'Harekete ve dansa eşlik eden ritimlerdeki/müzik eserlerindeki/çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark edebilme' },
    'MHB.3': { code: 'MHB.3', alan: 'Müzik', aciklama: 'Müzik ve ritimlerle hareket ve dans edebilme' },
    'MSB.1': { code: 'MSB.1', alan: 'Müzik', aciklama: 'Duyduğu sesleri kendi sesiyle taklit edebilme' },
    'MSB.2': { code: 'MSB.2', alan: 'Müzik', aciklama: 'Çocuk şarkılarındaki/çocuk şarkısı formlarındaki özellikleri fark ederek söyleyebilme' },
    'MSB.3': { code: 'MSB.3', alan: 'Müzik', aciklama: 'Söyleme becerilerini sınıf içinde sergileyebilme' },
    'MYB.1': { code: 'MYB.1', alan: 'Müzik', aciklama: 'Müziksel deneyimlerinden yola çıkarak müziksel ürün ortaya koyabilme' },
    'MYB.2': { code: 'MYB.2', alan: 'Müzik', aciklama: 'Ürettiği müziksel ürünlerini sergileyebilme' },

    // ===== SOSYAL ALAN (SAB) =====
    'SAB.1': { code: 'SAB.1', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(36-48,48-60) Günlük hayatında zaman kavramını yerinde kullanabilme ‖ (60-72) Günlük hayatta olay/konu/durum/zamana ilişkin değişen ve benzerlik gösteren özellikleri karşılaştırabilme' },
    'SAB.2': { code: 'SAB.2', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(36-48) Toplumsal yaşama yönelik kültürel unsurları/durumları çözümleyebilme ‖ (48-60) Kendisine/ailesine/bir hikâyeye ait görselleri oluş sırasına göre sıralayabilme ‖ (60-72) Yakın çevresindeki olay/dönem/kavramları kronolojik olarak sıralayabilme' },
    'SAB.3': { code: 'SAB.3', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(48-60) Ailesi ve yakın çevresinde oluşan gruplarla sosyal temas oluşturabilme ‖ (60-72) Olay/dönem ve kavramları zamanla değişen ve benzerlik gösteren özelliklerine göre değerlendirebilme' },
    'SAB.4': { code: 'SAB.4', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(48-60) Günlük yaşamda merak ettiği coğrafi olay/olgu ve mekânlara/durumlara yönelik sorular sorabilme ‖ (60-72) Yakın çevresindeki yaşantılardan yola çıkarak merak ettiği konulara yönelik sorular sorabilme' },
    'SAB.5': { code: 'SAB.5', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(48-60) Nesnelerin veya kişilerin konumlarını algılayabilme ‖ (60-72) Merak ettiği konuya yönelik kaynakları inceleyebilme' },
    'SAB.6': { code: 'SAB.6', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(48-60) Toplumsal yaşama yönelik kültürel unsurları/durumları çözümleyebilme ‖ (60-72) Geçmişte veya günümüzde yakın çevresinde gerçekleşen bir olay/konu/durumla ilgili kaynaklardan dinlediklerini/izlediklerini kendi ifadeleriyle yorumlayabilme' },
    'SAB.7': { code: 'SAB.7', alan: 'Sosyal', yasaGoreDegisir: true, aciklama: '(48-60) İhtiyaçların karşılanabilmesi için bir gelire ihtiyaç olduğunu anlayabilme ‖ (60-72) Günlük hayatta karşılaştığı nesne/yer/toplum/olay/konu/durumlara ilişkin zaman içerisinde değişen ve benzerlik gösteren özellikleri karşılaştırabilme' },
    'SAB.8': { code: 'SAB.8', alan: 'Sosyal', aciklama: 'Yakın çevresinde oluşan gruplarla sosyal temas oluşturabilme' },
    'SAB.9': { code: 'SAB.9', alan: 'Sosyal', aciklama: 'Yakın çevresindeki coğrafi olay, nesne, mekân ve kişilerin konumunu algılayabilme' },
    'SAB.10': { code: 'SAB.10', alan: 'Sosyal', aciklama: 'Yakın çevresinde yer alan mekânın coğrafi koşullarını tanımlayabilme' },
    'SAB.11': { code: 'SAB.11', alan: 'Sosyal', aciklama: 'Merak ettiği coğrafi olay/olgu ve mekân/durumlara yönelik sorular sorabilme' },
    'SAB.12': { code: 'SAB.12', alan: 'Sosyal', aciklama: 'Coğrafi gözlem ve saha çalışmasını gerçekleştirebilmek için gerekli olan hazırlığı yapabilme' },
    'SAB.13': { code: 'SAB.13', alan: 'Sosyal', aciklama: 'Coğrafi gözlem ve çalışma sahasında planlanan çalışmaları uygulayabilme' },
    'SAB.14': { code: 'SAB.14', alan: 'Sosyal', aciklama: 'Coğrafi gözlem ve çalışma sahasından elde edilen sonuçları sözlü/görsel yolla raporlaştırabilme' },
    'SAB.15': { code: 'SAB.15', alan: 'Sosyal', aciklama: 'Yakın çevresi ile ilgili olarak hazırlanmış olan basit krokiyi okuyabilme' },
    'SAB.16': { code: 'SAB.16', alan: 'Sosyal', aciklama: 'Yakın çevresinde bulunan bir kişi/nesne/mekânın konumunu belirlemek üzere takip edeceği krokiyi çözümleyebilme' },
    'SAB.17': { code: 'SAB.17', alan: 'Sosyal', aciklama: 'Yakın çevresinde bulunan belirli bir kişi/nesne/mekânın konumunu gösteren kendi krokisini oluşturabilme' },
    'SAB.18': { code: 'SAB.18', alan: 'Sosyal', aciklama: 'Coğrafi içerikli tablo, grafik, şekil ve diyagramı okuyabilme ve yorumlayabilme' },
    'SAB.19': { code: 'SAB.19', alan: 'Sosyal', aciklama: 'Coğrafi içerikli tablo, grafik, şekil ve diyagramı hazırlayabilme' },
    'SAB.20': { code: 'SAB.20', alan: 'Sosyal', aciklama: 'Toplumsal yaşama yönelik nesne, olgu ve olayları çözümleyebilme' },
    'SAB.21': { code: 'SAB.21', alan: 'Sosyal', aciklama: 'Toplumsal yaşama yönelik merak ettiği konuyu sorgulayabilme' },
    'SAB.22': { code: 'SAB.22', alan: 'Sosyal', aciklama: 'İhtiyaçların karşılanabilmesi için bir gelire ihtiyaç olduğunu anlayabilme' },

    // ===== SANAT ALANI (SNAB) — kaynakta noktasız; tutarlılık için noktalı =====
    'SNAB.1': { code: 'SNAB.1', alan: 'Sanat', aciklama: 'Temel sanat kavramlarını ve türlerini anlayabilme' },
    'SNAB.2': { code: 'SNAB.2', alan: 'Sanat', aciklama: 'Sanat eseri inceleyebilme' },
    'SNAB.3': { code: 'SNAB.3', alan: 'Sanat', aciklama: 'Sanat eserlerine ve sanatçılara değer verebilme' },
    'SNAB.4': { code: 'SNAB.4', alan: 'Sanat', aciklama: 'Sanat etkinliği uygulayabilme' },

    // ===== TÜRKÇE ALANI (TADB/TAKB/TAEOB/TAOB) =====
    'TADB.1': { code: 'TADB.1', alan: 'Türkçe', aciklama: 'Dinleyecekleri/İzleyecekleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri yönetebilme' },
    'TADB.2': { code: 'TADB.2', alan: 'Türkçe', aciklama: 'Dinledikleri/İzledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ile ilgili yeni anlamlar oluşturabilme' },
    'TADB.3': { code: 'TADB.3', alan: 'Türkçe', aciklama: 'Dinledikleri/İzledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyalleri çözümleyebilme' },
    'TADB.4': { code: 'TADB.4', alan: 'Türkçe', aciklama: 'Dinledikleri/İzledikleri şiir, hikâye, tekerleme, video, tiyatro, animasyon gibi materyaller ve dinleme/izleme ortamına ilişkin görüşlerini yansıtabilme' },
    'TAEOB.1': { code: 'TAEOB.1', alan: 'Türkçe', aciklama: 'Yazı farkındalığına ilişkin becerileri gösterebilme' },
    'TAEOB.5': { code: 'TAEOB.5', alan: 'Türkçe', aciklama: 'Okuma öncesi becerileri kazanabilme' },
    'TAEOB.6': { code: 'TAEOB.6', alan: 'Türkçe', aciklama: 'Yazma öncesi becerileri kazanabilme' },
    'TAKB.1': { code: 'TAKB.1', alan: 'Türkçe', aciklama: 'Konuşma sürecini yönetebilme' },
    'TAKB.2': { code: 'TAKB.2', alan: 'Türkçe', aciklama: 'Konuşma sürecinin içeriğini oluşturabilme' },
    'TAOB.1': { code: 'TAOB.1', alan: 'Türkçe', aciklama: 'Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri seçebilme' },
    'TAOB.2': { code: 'TAOB.2', alan: 'Türkçe', aciklama: 'Görsel materyallerden anlamlar üretebilme' },
    'TAOB.3': { code: 'TAOB.3', alan: 'Türkçe', aciklama: 'Resimli öykü kitabı, dijital araçlar, afiş, broşür gibi görsel materyalleri çözümleyebilme' },
};

/** Bir çıktı kodu belgede (kanonik listede) var mı? false => uydurma. */
export function isValidCikti(code: string): boolean {
    return Object.prototype.hasOwnProperty.call(MAARIF_CIKTILAR, code);
}

/** Kodun resmi açıklaması (yoksa undefined). Yaşa göre değişen kodlarda birleşik metin döner. */
export function getResmiAciklama(code: string): string | undefined {
    return MAARIF_CIKTILAR[code]?.aciklama;
}

/** Verilen kod listesindeki GEÇERSİZ (belgede olmayan) kodları döndürür. Boş => hepsi geçerli. */
export function bulunmayanKodlar(codes: string[]): string[] {
    return [...new Set(codes)].filter(c => !isValidCikti(c));
}
