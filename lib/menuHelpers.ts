import { GAME_CATALOG, GameCatalogStatus } from '@/constants/gameCatalog';
import { Ionicons } from '@expo/vector-icons';

export const GAME_CARD_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; displayTitle?: string; subtitle?: string }> = {
  'hafiza': { color: '#64B5F6', icon: 'grid', displayTitle: 'Çiftini Bul', subtitle: 'Hafıza ve dikkat' },
  'hafiza-2': { color: '#4DD0E1', icon: 'paw', displayTitle: 'Hayvan Çiftleri', subtitle: 'Hafıza (hayvanlar)' },
  'siralama': { color: '#FFB74D', icon: 'list', displayTitle: 'Sıralama', subtitle: 'Sayıları diz' },
  'eksik-sayi-bul': { color: '#FF8A65', icon: 'help-circle', displayTitle: 'Eksik Sayı', subtitle: 'Eksik rakamı tamamla' },
  'eksik-sayi-bul-2': { color: '#FF7043', icon: 'help-circle', displayTitle: 'Eksik Sayı 6-10', subtitle: '6-10 arası eksik' },
  'akilli-sayi-avi': { color: '#FB8C00', icon: 'trending-up', displayTitle: 'Akıllı Sayı Avı', subtitle: 'Uyarlanır zorluk' },
  'akilli-miktar': { color: '#1E88E5', icon: 'bar-chart', displayTitle: 'Akıllı Miktar', subtitle: 'Uyarlanır zorluk' },
  'akilli-oruntu': { color: '#7E57C2', icon: 'color-palette', displayTitle: 'Akıllı Örüntü', subtitle: 'Uyarlanır zorluk' },
  'akilli-eksik-sayi': { color: '#66BB6A', icon: 'help-circle', displayTitle: 'Akıllı Eksik Sayı', subtitle: 'Uyarlanır zorluk' },
  'akilli-siralama': { color: '#26A69A', icon: 'swap-vertical', displayTitle: 'Akıllı Sıralama', subtitle: 'Uyarlanır zorluk' },
  'akilli-toplama': { color: '#EF6C00', icon: 'add-circle', displayTitle: 'Akıllı Toplama', subtitle: 'Uyarlanır zorluk' },
  'akilli-farkli': { color: '#00ACC1', icon: 'color-filter', displayTitle: 'Akıllı Farklı', subtitle: 'Uyarlanır zorluk' },
  'akilli-cikarma': { color: '#8D6E63', icon: 'remove-circle', displayTitle: 'Akıllı Çıkarma', subtitle: 'Uyarlanır zorluk' },
  'akilli-hafiza': { color: '#5C6BC0', icon: 'grid', displayTitle: 'Akıllı Hafıza', subtitle: 'Uyarlanır zorluk' },
  'akilli-harf': { color: '#EC407A', icon: 'text', displayTitle: 'Akıllı Harf', subtitle: 'Uyarlanır zorluk' },
  'akilli-siniflandir': { color: '#43A047', icon: 'file-tray-stacked', displayTitle: 'Akıllı Sınıflandır', subtitle: 'Uyarlanır zorluk' },
  'akilli-once-sonra': { color: '#7E57C2', icon: 'hourglass', displayTitle: 'Akıllı Önce-Sonra', subtitle: 'Uyarlanır zorluk' },
  'dunya-bayraklari': { color: '#00897B', icon: 'flag', displayTitle: 'Dünya Bayrakları', subtitle: 'Kültürleri keşfet' },
  'dunya-selamlari': { color: '#00ACC1', icon: 'hand-left', displayTitle: 'Dünya Selamları', subtitle: 'Merhaba de' },
  'dunya-yapilari': { color: '#6D4C41', icon: 'business', displayTitle: 'Dünya Yapıları', subtitle: 'Anıtları tanı' },
  'dunya-yiyecekleri': { color: '#F4511E', icon: 'restaurant', displayTitle: 'Dünya Yiyecekleri', subtitle: 'Lezzetleri keşfet' },
  'bayrak-boya': { color: '#EC407A', icon: 'color-palette', displayTitle: 'Bayrak Boya', subtitle: 'Bayrakları boya' },
  'gruplama': { color: '#81C784', icon: 'basket', displayTitle: 'Gruplama', subtitle: 'Sınıflandırma' },
  'mutfak-dedektifi': { color: '#FF6B6B', icon: 'restaurant-outline', displayTitle: 'Mutfak Dedektifi', subtitle: 'Görsel dikkat' },
  'miktar-karsilastirma': { color: '#1E88E5', icon: 'bar-chart-outline', displayTitle: 'Miktar Avcısı', subtitle: 'Hangisi daha çok?' },
  'miktar-avcisi-2': { color: '#039BE5', icon: 'fish', displayTitle: 'Deniz Avcısı', subtitle: 'Hangisi daha çok?' },
  'sayi-komsulari': { color: '#FFA726', icon: 'train-outline', displayTitle: 'Sayı Komşuları', subtitle: 'Sayı ilişkileri' },
  'diziyi-tamamla': { color: '#BA68C8', icon: 'extension-puzzle', displayTitle: 'Diziyi Tamamla', subtitle: 'Örüntü' },
  'diziyi-tamamla-2': { color: '#9575CD', icon: 'star', displayTitle: 'Örüntü Ustası', subtitle: 'İleri örüntü' },
  'bunu-soyle': { color: '#F06292', icon: 'mic', displayTitle: 'Bunu Söyle', subtitle: 'Sözlü ifade' },
  'kodlama': { color: '#00ACC1', icon: 'map', displayTitle: 'Minik Kaşif', subtitle: 'Kodlama' },
  'rakam-yazma': { color: '#4DB6AC', icon: 'pencil', displayTitle: 'Rakam Yazma', subtitle: 'Rakam tanıma' },
  'rakam-yazma-2': { color: '#26A69A', icon: 'pencil', displayTitle: 'Rakam Yazma 6-10', subtitle: 'Büyük rakamlar' },
  'kutuyu-bul': { color: '#7E57C2', icon: 'cube', displayTitle: 'Kutuyu Bul', subtitle: 'Görsel takip' },
  'sayilari-birlestir': { color: '#26A69A', icon: 'git-network', displayTitle: 'Sayıları Birleştir', subtitle: 'Sayı sırası' },
  'yapboz': { color: '#E91E63', icon: 'apps', displayTitle: 'Yapboz', subtitle: 'Parça-bütün' },
  'golge-dedektifi': { color: '#1565C0', icon: 'eye-outline', displayTitle: 'Gölge Dedektifi', subtitle: 'Eşleştirme' },
  'golge-dedektifi-2': { color: '#0D47A1', icon: 'eye', displayTitle: 'Gölge: Uzman', subtitle: 'Zor eşleştirme' },
  'onluk-cerceve': { color: '#FF7043', icon: 'grid-outline', displayTitle: 'Onluk Çerçeve', subtitle: 'Onluk sistem' },
  'onluk-cerceve-2': { color: '#FFB300', icon: 'star', displayTitle: 'Yıldız Çerçevesi', subtitle: '6-10 yıldız' },
  'tarti-dengesi': { color: '#AB47BC', icon: 'color-filter-outline', displayTitle: 'Tartı Dengesi', subtitle: 'Eşitlik' },
  'sihirli-siseler': { color: '#4CAF50', icon: 'flask-outline', displayTitle: 'Sihirli Şişeler', subtitle: 'Renkleri grupla' },
  'sihirli-tuval': { color: '#3F51B5', icon: 'color-palette-outline', displayTitle: 'Sihirli Tuval', subtitle: 'Görsel dikkat' },
  'uzay-bloklari': { color: '#1a1a4e', icon: 'planet-outline', displayTitle: 'Uzay Blokları', subtitle: 'Uzamsal düşünme' },
  'renkli-baglantalar': { color: '#6366F1', icon: 'git-merge-outline', displayTitle: 'Renkli Bağlantılar', subtitle: 'Bağlantı kurma' },
  'ceviz-macera': { color: '#795548', icon: 'leaf', displayTitle: 'Ceviz Macerası', subtitle: 'Seçim ve sonuç' },
  'aile-sepeti-macerasi': { color: '#8D6E63', icon: 'basket-outline', displayTitle: 'Aile Sepeti', subtitle: 'İş birliği' },
  'adalet-hikayesi': { color: '#9C27B0', icon: 'scale-outline', displayTitle: 'Adalet Hikayesi', subtitle: 'Paylaşım' },
  'sevgi-hikayesi': { color: '#E0359A', icon: 'heart', displayTitle: 'Küçük Kalpler', subtitle: 'Sevgi ve empati' },
  'duygu-yuzleri': { color: '#FF8FB1', icon: 'happy', displayTitle: 'Duygu Yüzleri', subtitle: 'Duyguları tanı' },
  'renk-sepetleri': { color: '#57D971', icon: 'color-palette', displayTitle: 'Renk Sepetleri', subtitle: 'Renkleri ayır' },
  'zitlari-eslestir': { color: '#FF8A00', icon: 'swap-horizontal', displayTitle: 'Zıtları Eşleştir', subtitle: 'Zıt kavramlar' },
  'sekil-treni': { color: '#FF7043', icon: 'triangle', displayTitle: 'Şekil Treni', subtitle: 'Şekilleri tanı' },
  'ayi-ailesi': { color: '#8D6E63', icon: 'resize', displayTitle: 'Ayı Ailesi', subtitle: 'Küçükten büyüğe' },
  'ciftlikte-sayalim': { color: '#66BB6A', icon: 'calculator', displayTitle: 'Çiftlikte Sayalım', subtitle: 'Saymayı öğren' },
  'ayni-farkli': { color: '#7E57C2', icon: 'search', displayTitle: 'Aynı mı Farklı mı?', subtitle: 'Ayırt et' },
  'hangisi-farkli': { color: '#00ACC1', icon: 'funnel', displayTitle: 'Hangisi Farklı?', subtitle: 'Uymayanı bul' },
  'buyuk-orta-kucuk': { color: '#8D6E63', icon: 'expand', displayTitle: 'Büyük-Orta-Küçük', subtitle: 'Boyutu bul' },
  'neredeyim': { color: '#6D4C41', icon: 'cube-outline', displayTitle: 'Neredeyim?', subtitle: 'Nerede? Konum' },
  'once-sonra': { color: '#26A69A', icon: 'hourglass', displayTitle: 'Önce-Sonra', subtitle: 'Sıraya koy' },
  'sayiyi-bul': { color: '#1E88E5', icon: 'keypad', displayTitle: 'Sayıyı Bul', subtitle: 'Rakam-nicelik' },
  'en-uzun': { color: '#F97316', icon: 'resize-outline', displayTitle: 'En Uzun Hangisi?', subtitle: 'Uzunluk' },
  'dogru-kutu': { color: '#8D6E63', icon: 'file-tray-stacked', displayTitle: 'Doğru Kutu', subtitle: 'Kutulara ayır' },
  'ikizleri-bul': { color: '#EC407A', icon: 'copy', displayTitle: 'İkizleri Bul', subtitle: 'Aynısını bul' },
  'ne-ise-yarar': { color: '#26A69A', icon: 'link', displayTitle: 'Ne İşe Yarar?', subtitle: 'İlişkili ikili' },
  'renk-oruntusu': { color: '#8E24AA', icon: 'ellipsis-horizontal', displayTitle: 'Renk Örüntüsü', subtitle: 'Sıradaki renk' },
  'nokta-say': { color: '#00ACC1', icon: 'ellipse', displayTitle: 'Nokta Say', subtitle: 'Noktaları say' },
  'canli-cansiz': { color: '#7CB342', icon: 'leaf-outline', displayTitle: 'Canlı mı Cansız mı?', subtitle: 'Canlı/cansız' },
  'yuzer-batar': { color: '#039BE5', icon: 'water', displayTitle: 'Yüzer mi Batar mı?', subtitle: 'Tahmin et' },
  'duygu-eslestir': { color: '#EC407A', icon: 'heart-half', displayTitle: 'Duygu Eşleştir', subtitle: 'Aynı duygu' },
  'sirayi-hatirla': { color: '#5E35B1', icon: 'flash', displayTitle: 'Sırayı Hatırla', subtitle: 'Belleği çalıştır' },
  'agir-hafif': { color: '#8D6E63', icon: 'barbell', displayTitle: 'En Ağır Hangisi?', subtitle: 'Ağırlık' },
  'gunduz-gece': { color: '#5C6BC0', icon: 'partly-sunny', displayTitle: 'Gündüz mü Gece mi?', subtitle: 'Zaman' },
  'kac-oldu': { color: '#00897B', icon: 'add-circle', displayTitle: 'Kaç Oldu?', subtitle: 'Toplama' },
  'renkleri-karistir': { color: '#8E24AA', icon: 'color-fill', displayTitle: 'Renkleri Karıştır', subtitle: 'Renk karışımı' },
  'sekil-deligi': { color: '#546E7A', icon: 'shapes', displayTitle: 'Şekil Deliği', subtitle: 'Şekli yerleştir' },
  'az-cok-sirala': { color: '#43A047', icon: 'stats-chart', displayTitle: 'Az → Çok Sırala', subtitle: 'Nicelik sırası' },
  'ilk-harf': { color: '#C2185B', icon: 'text', displayTitle: 'İlk Harf', subtitle: 'Harfle başlayan' },
  'iyilik-yap': { color: '#E0359A', icon: 'heart-circle', displayTitle: 'İyilik Yap', subtitle: 'Nazik davran' },
  'ne-degisti': { color: '#00838F', icon: 'eye', displayTitle: 'Ne Değişti?', subtitle: 'Değişeni bul' },
  'kac-kaldi': { color: '#00897B', icon: 'remove-circle', displayTitle: 'Kaç Kaldı?', subtitle: 'Çıkarma' },
  'buyuk-sayi': { color: '#1E88E5', icon: 'swap-vertical', displayTitle: 'Büyük Sayı Hangisi?', subtitle: 'Karşılaştır' },
  'cizim-sayfalari': { color: '#26A69A', icon: 'brush', displayTitle: 'Çizim Sayfaları', subtitle: 'Kılavuzla çiz' },
  'simetri-cizim': { color: '#7E57C2', icon: 'git-compare', displayTitle: 'Simetri Çizim', subtitle: 'Aynalı çiz' },
  'damga-sanati': { color: '#00ACC1', icon: 'sparkles', displayTitle: 'Damga Sanatı', subtitle: 'Süsle' },
  'boyama-kitabi': { color: '#AB47BC', icon: 'color-fill', displayTitle: 'Boyama Kitabı', subtitle: 'Bölgeleri boya' },
  'nokta-birlestir': { color: '#26A69A', icon: 'git-network', displayTitle: 'Nokta Birleştir', subtitle: 'Sırayla birleştir' },
  'sayi-boya': { color: '#8E24AA', icon: 'grid', displayTitle: 'Sayı-Boya', subtitle: 'Numarayla boya' },
  'mandala': { color: '#5E35B1', icon: 'flower', displayTitle: 'Mandala', subtitle: 'Simetrik çiz' },
  'nokta-boyama': { color: '#118ab2', icon: 'ellipsis-horizontal-circle', displayTitle: 'Nokta Boyama', subtitle: 'Noktalarla boya' },
  'cizimi-canlandir': { color: '#EC407A', icon: 'play-circle', displayTitle: 'Çizimini Canlandır', subtitle: 'Çiz, oynasın' },
  'yuz-yap': { color: '#FB8C00', icon: 'happy', displayTitle: 'Yüz Yap', subtitle: 'Karakter oluştur' },
  'yarisini-tamamla': { color: '#7E57C2', icon: 'contract', displayTitle: 'Yarısını Tamamla', subtitle: 'Diğer yarısını çiz' },
  'kum-boyasi': { color: '#F57C00', icon: 'color-fill', displayTitle: 'Kum Boyası', subtitle: 'Akan renkler' },
  'adim-adim': { color: '#00ACC1', icon: 'footsteps', displayTitle: 'Adım Adım Çizim', subtitle: 'Rehberli çiz' },
  'sayi-boya-2': { color: '#5E35B1', icon: 'apps', displayTitle: 'Sayı-Boya 2', subtitle: 'Detaylı boyama' },
  'vucudum': { color: '#EF5350', icon: 'body', displayTitle: 'Vücudum', subtitle: 'Organları göster' },
  'duyularimiz': { color: '#8E24AA', icon: 'eye', displayTitle: 'Duyularımız', subtitle: 'Hangi duyu?' },
  'saglikli-yiyecek': { color: '#43A047', icon: 'nutrition', displayTitle: 'Sağlıklı mı?', subtitle: 'Sağlıklıyı seç' },
  'temizlik-zamani': { color: '#039BE5', icon: 'water', displayTitle: 'Temizlik Zamanı', subtitle: 'Temiz kal' },
  'guvende-kal': { color: '#FB8C00', icon: 'shield-checkmark', displayTitle: 'Güvende Kal', subtitle: 'Güvenli davran' },
  'hava-kiyafet': { color: '#0288D1', icon: 'partly-sunny', displayTitle: 'Hava & Kıyafet', subtitle: 'Havaya göre giyin' },
  'labirent': { color: '#795548', icon: 'git-network', displayTitle: 'Labirent', subtitle: 'Yolu bul' },
  'hayvan-evi': { color: '#43A047', icon: 'home', displayTitle: 'Hayvan Evi', subtitle: 'Nerede yaşar?' },
  'meslekler': { color: '#7E57C2', icon: 'briefcase', displayTitle: 'Meslekler', subtitle: 'Ne kullanır?' },
  'buyuyunce': { color: '#00897B', icon: 'trending-up', displayTitle: 'Büyüyünce Ne Olur?', subtitle: 'Yaşam döngüsü' },
  'geri-donusum': { color: '#66BB6A', icon: 'sync-circle', displayTitle: 'Geri Dönüşüm', subtitle: 'Doğru kutuya' },
  'esit-paylastir': { color: '#8D6E63', icon: 'pie-chart', displayTitle: 'Eşit Paylaştır', subtitle: 'Adil böl' },
  'araclar': { color: '#1E88E5', icon: 'car-sport', displayTitle: 'Araçlar Nerede Gider?', subtitle: 'Kara/deniz/hava' },
  'ne-yer': { color: '#FB8C00', icon: 'fast-food', displayTitle: 'Ne Yer?', subtitle: 'Hayvan besini' },
  'ne-nerede': { color: '#00ACC1', icon: 'home', displayTitle: 'Ne Nerede?', subtitle: 'Hangi oda?' },
  'gunum': { color: '#26A69A', icon: 'time', displayTitle: 'Günüm', subtitle: 'Günü sırala' },
  'renk-tonlari': { color: '#8E24AA', icon: 'contrast', displayTitle: 'Renk Tonları', subtitle: 'Açıktan koyuya' },
  'sicak-soguk': { color: '#EF5350', icon: 'thermometer', displayTitle: 'Sıcak mı Soğuk mu?', subtitle: 'Sıcaklığı ayır' },
  'kafiye-bahcesi': { color: '#EC407A', icon: 'flower', displayTitle: 'Kafiye Bahçesi', subtitle: 'Kafiyeyi bul' },
  'resimde-ne-ters': { color: '#5C6BC0', icon: 'search', displayTitle: 'Resimde Ne Ters?', subtitle: 'Yanlışı bul' },
  'sonra-ne-olur': { color: '#5E35B1', icon: 'sparkles', displayTitle: 'Sonra Ne Olur?', subtitle: 'Sonrasını tahmin et' },
  'minik-market': { color: '#43A047', icon: 'cart', displayTitle: 'Minik Market', subtitle: 'Alışveriş yap' },
  'hazine-haritasi': { color: '#8D6E63', icon: 'map', displayTitle: 'Hazine Haritası', subtitle: 'Haritayı takip et' },
  'grafik-ustasi': { color: '#1E88E5', icon: 'bar-chart', displayTitle: 'Grafik Ustası', subtitle: 'Grafiği oku' },
  'yaratici-cizim': { color: '#ff9f1c', icon: 'brush', displayTitle: 'Hayal Defteri', subtitle: 'Yaratıcı ifade' },
  'muzik-calar': { color: '#EC407A', icon: 'musical-notes-outline', displayTitle: 'Müzik Kutusu', subtitle: 'Şarkı ve ritim' },
};

// Her oyun icin cocuk dostu buyuk emoji (secim ekraninda animasyonlu gorsel).
export const GAME_EMOJI: Record<string, string> = {
  hafiza: '🧠', siralama: '🔢', 'eksik-sayi-bul': '❓', gruplama: '🧺', 'mutfak-dedektifi': '🍳',
  'miktar-karsilastirma': '📊', 'sayi-komsulari': '🚂', 'diziyi-tamamla': '🔁', 'bunu-soyle': '🎤',
  kodlama: '🗺️', 'rakam-yazma': '✏️', 'rakam-yazma-2': '🔟', 'kutuyu-bul': '📦', 'sayilari-birlestir': '🔗', yapboz: '🧩',
  'golge-dedektifi': '🕵️', 'onluk-cerceve': '🔟', 'tarti-dengesi': '⚖️', 'sihirli-siseler': '🧪',
  'sihirli-tuval': '🖼️', 'uzay-bloklari': '🚀', 'renkli-baglantalar': '🔀',
  'ceviz-macera': '🌰', 'aile-sepeti-macerasi': '👨‍👩‍👧', 'adalet-hikayesi': '🤝', 'sevgi-hikayesi': '❤️', 'duygu-yuzleri': '😊',
  'yaratici-cizim': '🖍️', 'muzik-calar': '🎵',
  'renk-sepetleri': '🌈', 'zitlari-eslestir': '↔️', 'sekil-treni': '🔷', 'ayi-ailesi': '🐻', 'ciftlikte-sayalim': '🐔',
  'ayni-farkli': '🟰', 'hangisi-farkli': '🔎', 'buyuk-orta-kucuk': '🧸', neredeyim: '📦', 'once-sonra': '⏳',
  'sayiyi-bul': '3️⃣', 'en-uzun': '📏', 'dogru-kutu': '🗂️', 'ikizleri-bul': '👯', 'ne-ise-yarar': '🛠️',
  'renk-oruntusu': '🔴', 'nokta-say': '⚫', 'canli-cansiz': '🌱', 'yuzer-batar': '🌊', 'duygu-eslestir': '🥰',
  'sirayi-hatirla': '💡', 'agir-hafif': '🏋️', 'gunduz-gece': '🌗', 'kac-oldu': '➕', 'renkleri-karistir': '🎨',
  'sekil-deligi': '🔺', 'az-cok-sirala': '📈',
  'ilk-harf': '🔤', 'iyilik-yap': '💛', 'ne-degisti': '🔍', 'kac-kaldi': '➖', 'buyuk-sayi': '💯', 'cizim-sayfalari': '🖌️',
  vucudum: '🧒', duyularimiz: '👀', 'saglikli-yiyecek': '🍎', 'temizlik-zamani': '🧼', 'guvende-kal': '🚦',
  'hava-kiyafet': '🌦️', labirent: '🐭', 'hayvan-evi': '🏡', meslekler: '👷', buyuyunce: '🐛', 'geri-donusum': '♻️',
  'esit-paylastir': '🍪', araclar: '🚗', 'ne-yer': '🥕', 'ne-nerede': '🏠', gunum: '⏰', 'renk-tonlari': '🌗',
  'sicak-soguk': '🌡️',
  'simetri-cizim': '🦋', 'damga-sanati': '✨', 'boyama-kitabi': '🎨', 'nokta-birlestir': '✏️',
  'sayi-boya': '🔢', 'mandala': '🌀', 'nokta-boyama': '🔵', 'cizimi-canlandir': '💫',
  'yuz-yap': '😀', 'yarisini-tamamla': '🪞', 'kum-boyasi': '🏖️', 'adim-adim': '📝', 'sayi-boya-2': '🖼️',
  // Temalı varyantlar
  'hafiza-2': '🐾', 'eksik-sayi-bul-2': '❔', 'miktar-avcisi-2': '🐟', 'diziyi-tamamla-2': '✨', 'golge-dedektifi-2': '🔦', 'onluk-cerceve-2': '⭐',
  // Adaptif oyunlar
  'akilli-sayi-avi': '🔢', 'akilli-miktar': '⚖️', 'akilli-oruntu': '🔵',
  'akilli-eksik-sayi': '❓', 'akilli-siralama': '📊', 'akilli-toplama': '➕', 'akilli-farkli': '🔎',
  'akilli-cikarma': '➖', 'akilli-hafiza': '🧠',
  'akilli-harf': '🔤', 'akilli-siniflandir': '🗂️', 'akilli-once-sonra': '⏳',
  // Kültür / Montessori
  'dunya-bayraklari': '🌍', 'dunya-selamlari': '👋', 'dunya-yapilari': '🏛️', 'dunya-yiyecekleri': '🍽️',
  'bayrak-boya': '🎨',
  // Yeni oyunlar (Türkçe / Fen)
  'kafiye-bahcesi': '🌸', 'resimde-ne-ters': '🖼️', 'sonra-ne-olur': '🔮',
  // Yeni oyunlar (Sosyal / Matematik)
  'minik-market': '🛒', 'hazine-haritasi': '🗺️', 'grafik-ustasi': '📊',
};

export const getCatalogGames = (status: GameCatalogStatus) => GAME_CATALOG.filter((game) => game.status === status);

// Ana menu kategori hub'i: her kategori katalogdaki `domain` alanina karsilik gelir.
export interface MenuCategory {
  domain: string;
  label: string;
  emoji: string;
  color: string;      // duz renk (native fallback)
  gradient: [string, string]; // web gradient (from, to)
  shadow: string;     // 3B alt golge rengi
}

export const MENU_CATEGORIES: MenuCategory[] = [
  { domain: 'Matematik', label: 'Matematik', emoji: '🔢', color: '#2E86FF', gradient: ['#4FACFE', '#1E6FE0'], shadow: '#1552B0' },
  { domain: 'Bilissel', label: 'Dikkat', emoji: '🧠', color: '#9B59F6', gradient: ['#C07BFF', '#7A2BD6'], shadow: '#5A1BA8' },
  { domain: 'Kavram', label: 'Kavramlar', emoji: '🌈', color: '#12B5C9', gradient: ['#3AD7E5', '#0E9DB5'], shadow: '#0A7A8C' },
  { domain: 'Saglik', label: 'Sağlığım', emoji: '💪', color: '#EF5350', gradient: ['#FF8A75', '#E53935'], shadow: '#B71C1C' },
  { domain: 'Dil', label: 'Konuşma', emoji: '💬', color: '#FF5E9A', gradient: ['#FF8FB1', '#FF3D7F'], shadow: '#C72862' },
  { domain: 'Sosyal-duygusal', label: 'Duygular', emoji: '💛', color: '#FF9130', gradient: ['#FFB14E', '#FF7A18'], shadow: '#C85B0C' },
  { domain: 'Sanat', label: 'Çizim', emoji: '🎨', color: '#25C685', gradient: ['#5BE7A9', '#12B36A'], shadow: '#0A8F52' },
  { domain: 'Muzik', label: 'Müzik', emoji: '🎵', color: '#F158B7', gradient: ['#FF7BD5', '#E0359A'], shadow: '#B01F76' },
  { domain: 'Kultur', label: 'Dünya', emoji: '🌍', color: '#00ACC1', gradient: ['#26C6DA', '#00838F'], shadow: '#006064' },
];

export const getGamesByDomain = (domain: string) => GAME_CATALOG.filter((game) => game.domain === domain);

export const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDailyGamePlan = (ageMonths: number, dayKey: string) => {
  const coreGames = getCatalogGames('core').map((game) => game.routeKey);
  if (coreGames.length <= 3) return coreGames;

  // Deterministic daily rotation based on day + age bucket
  const ageBucket = Math.max(0, Math.floor((ageMonths - 24) / 12));
  const seed = dayKey.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + ageBucket * 17;
  const shift = seed % coreGames.length;
  const rotated = [...coreGames.slice(shift), ...coreGames.slice(0, shift)];
  return rotated.slice(0, 3);
};

export const slugifyName = (name: string) => {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'ogrenci';
};

// Beklenen format: DD/MM/YYYY, DD-MM-YYYY veya YYYY-MM-DD
export const calculateAgeInMonths = (dateString: string): number | null => {
  let day, month, year;

  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }
  } else if (dateString.includes('-')) {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      }
    }
  }

  if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
    return null;
  }

  const birthDate = new Date(year, month - 1, day);
  const today = new Date();

  const months = (today.getFullYear() - birthDate.getFullYear()) * 12 +
    (today.getMonth() - birthDate.getMonth());

  return months;
};
