import { GAME_CATALOG, GameCatalogStatus } from '@/constants/gameCatalog';
import { Ionicons } from '@expo/vector-icons';

export const GAME_CARD_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; displayTitle?: string; subtitle?: string }> = {
  'hafiza': { color: '#64B5F6', icon: 'grid', displayTitle: 'Çiftini Bul', subtitle: 'Hafıza ve dikkat' },
  'siralama': { color: '#FFB74D', icon: 'list', displayTitle: 'Sıralama', subtitle: 'Sayıları diz' },
  'eksik-sayi-bul': { color: '#FF8A65', icon: 'help-circle', displayTitle: 'Eksik Sayı', subtitle: 'Eksik rakamı tamamla' },
  'gruplama': { color: '#81C784', icon: 'basket', displayTitle: 'Gruplama', subtitle: 'Sınıflandırma' },
  'mutfak-dedektifi': { color: '#FF6B6B', icon: 'restaurant-outline', displayTitle: 'Mutfak Dedektifi', subtitle: 'Görsel dikkat' },
  'miktar-karsilastirma': { color: '#1E88E5', icon: 'bar-chart-outline', displayTitle: 'Miktar Avcısı', subtitle: 'Hangisi daha çok?' },
  'sayi-komsulari': { color: '#FFA726', icon: 'train-outline', displayTitle: 'Sayı Komşuları', subtitle: 'Sayı ilişkileri' },
  'diziyi-tamamla': { color: '#BA68C8', icon: 'extension-puzzle', displayTitle: 'Diziyi Tamamla', subtitle: 'Örüntü' },
  'bunu-soyle': { color: '#F06292', icon: 'mic', displayTitle: 'Bunu Söyle', subtitle: 'Sözlü ifade' },
  'kodlama': { color: '#00ACC1', icon: 'map', displayTitle: 'Minik Kaşif', subtitle: 'Kodlama' },
  'rakam-yazma': { color: '#4DB6AC', icon: 'pencil', displayTitle: 'Rakam Yazma', subtitle: 'Rakam tanıma' },
  'kutuyu-bul': { color: '#7E57C2', icon: 'cube', displayTitle: 'Kutuyu Bul', subtitle: 'Görsel takip' },
  'sayilari-birlestir': { color: '#26A69A', icon: 'git-network', displayTitle: 'Sayıları Birleştir', subtitle: 'Sayı sırası' },
  'yapboz': { color: '#E91E63', icon: 'apps', displayTitle: 'Yapboz', subtitle: 'Parça-bütün' },
  'golge-dedektifi': { color: '#1565C0', icon: 'eye-outline', displayTitle: 'Gölge Dedektifi', subtitle: 'Eşleştirme' },
  'onluk-cerceve': { color: '#FF7043', icon: 'grid-outline', displayTitle: 'Onluk Çerçeve', subtitle: 'Onluk sistem' },
  'tarti-dengesi': { color: '#AB47BC', icon: 'color-filter-outline', displayTitle: 'Tartı Dengesi', subtitle: 'Eşitlik' },
  'sihirli-siseler': { color: '#4CAF50', icon: 'flask-outline', displayTitle: 'Sihirli Şişeler', subtitle: 'Renkleri grupla' },
  'sihirli-tuval': { color: '#3F51B5', icon: 'color-palette-outline', displayTitle: 'Sihirli Tuval', subtitle: 'Görsel dikkat' },
  'uzay-bloklari': { color: '#1a1a4e', icon: 'planet-outline', displayTitle: 'Uzay Blokları', subtitle: 'Uzamsal düşünme' },
  'renkli-baglantalar': { color: '#6366F1', icon: 'git-merge-outline', displayTitle: 'Renkli Bağlantılar', subtitle: 'Bağlantı kurma' },
  'ceviz-macera': { color: '#795548', icon: 'leaf', displayTitle: 'Ceviz Macerası', subtitle: 'Seçim ve sonuç' },
  'aile-sepeti-macerasi': { color: '#8D6E63', icon: 'basket-outline', displayTitle: 'Aile Sepeti', subtitle: 'İş birliği' },
  'adalet-hikayesi': { color: '#9C27B0', icon: 'scale-outline', displayTitle: 'Adalet Hikayesi', subtitle: 'Paylaşım' },
  'yaratici-cizim': { color: '#ff9f1c', icon: 'brush', displayTitle: 'Hayal Defteri', subtitle: 'Yaratıcı ifade' },
  'muzik-calar': { color: '#EC407A', icon: 'musical-notes-outline', displayTitle: 'Müzik Kutusu', subtitle: 'Şarkı ve ritim' },
};

export const getCatalogGames = (status: GameCatalogStatus) => GAME_CATALOG.filter((game) => game.status === status);

// Ana menu kategori hub'i: her kategori katalogdaki `domain` alanina karsilik gelir.
export interface MenuCategory {
  domain: string;
  label: string;
  emoji: string;
  color: string;
}

export const MENU_CATEGORIES: MenuCategory[] = [
  { domain: 'Matematik', label: 'Matematik', emoji: '🔢', color: '#1E88E5' },
  { domain: 'Bilissel', label: 'Dikkat ve Zekâ', emoji: '🧠', color: '#7E57C2' },
  { domain: 'Dil', label: 'Dil ve Konuşma', emoji: '💬', color: '#F06292' },
  { domain: 'Sosyal-duygusal', label: 'Hikâyeler', emoji: '📖', color: '#8D6E63' },
  { domain: 'Sanat', label: 'Yaratıcılık', emoji: '🎨', color: '#FF9F1C' },
  { domain: 'Muzik', label: 'Müzik', emoji: '🎵', color: '#EC407A' },
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
