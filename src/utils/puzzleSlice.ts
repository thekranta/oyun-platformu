/**
 * Puzzle Grid Slicer - NxN kare grid dilimleyici
 * Tek bir görseli kare grid şeklinde (3x3, 4x4, 5x5...) parçalara ayırır.
 */

export interface SliceOptions {
    cropMode?: 'center';
    outputType?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
}

export interface TileData {
    id: string;
    row: number;
    col: number;
    index: number;
    width: number;
    height: number;
    dataUrl: string;
}

export interface SliceResult {
    imageId: string;
    n: number;
    tileW: number;
    tileH: number;
    tiles: TileData[];
}

export interface PuzzleManifest {
    imageId: string;
    n: number;
    tileW: number;
    tileH: number;
    tiles: Array<{ id: string; row: number; col: number; index: number }>;
}

/**
 * Benzersiz görsel ID'si oluşturur
 */
function generateImageId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * URL veya File'dan Image nesnesi yükler
 */
async function loadImage(input: string | File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));

        if (typeof input === 'string') {
            img.src = input;
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Dosya okunamadı'));
            reader.readAsDataURL(input);
        }
    });
}

/**
 * Kare grid için merkez kırpma boyutlarını hesaplar
 * Görsel boyutu n'e tam bölünmüyorsa, en büyük bölünebilir alanı bulur
 */
function calculateCenterCrop(
    imgWidth: number,
    imgHeight: number,
    n: number
): { cropX: number; cropY: number; cropSize: number; tileSize: number } {
    // Kare grid için en küçük kenarı baz al
    const minDimension = Math.min(imgWidth, imgHeight);

    // n'e tam bölünebilen en büyük boyutu bul
    const tileSize = Math.floor(minDimension / n);
    const cropSize = tileSize * n;

    // Merkez kırpma için offset hesapla
    const cropX = Math.floor((imgWidth - cropSize) / 2);
    const cropY = Math.floor((imgHeight - cropSize) / 2);

    return { cropX, cropY, cropSize, tileSize };
}

/**
 * Görseli NxN kare grid parçalara ayırır
 * @param input - URL string veya File nesnesi
 * @param n - Grid boyutu (3 = 3x3, 4 = 4x4, vb.)
 * @param options - Dilim seçenekleri
 * @returns Dilim sonucu: imageId, n, tileW, tileH ve tile dizisi
 */
export async function sliceImageToGridTiles(
    input: string | File,
    n: number,
    options: SliceOptions = {}
): Promise<SliceResult> {
    const {
        cropMode = 'center',
        outputType = 'image/png',
        quality = 0.92,
    } = options;

    if (n < 2 || n > 10) {
        throw new Error('n değeri 2-10 arasında olmalı');
    }

    const img = await loadImage(input);
    const imageId = generateImageId();

    // Kırpma ve tile boyutlarını hesapla
    const { cropX, cropY, cropSize, tileSize } = calculateCenterCrop(
        img.width,
        img.height,
        n
    );

    const tiles: TileData[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Canvas context oluşturulamadı');
    }

    canvas.width = tileSize;
    canvas.height = tileSize;

    let index = 0;
    for (let row = 0; row < n; row++) {
        for (let col = 0; col < n; col++) {
            // Her tile için canvas'ı temizle
            ctx.clearRect(0, 0, tileSize, tileSize);

            // Kaynaktan ilgili bölümü çiz
            const srcX = cropX + col * tileSize;
            const srcY = cropY + row * tileSize;

            ctx.drawImage(
                img,
                srcX,
                srcY,
                tileSize,
                tileSize,
                0,
                0,
                tileSize,
                tileSize
            );

            const dataUrl = canvas.toDataURL(outputType, quality);
            const id = `${imageId}_p${n}x${n}_r${row}_c${col}`;

            tiles.push({
                id,
                row,
                col,
                index,
                width: tileSize,
                height: tileSize,
                dataUrl,
            });

            index++;
        }
    }

    return {
        imageId,
        n,
        tileW: tileSize,
        tileH: tileSize,
        tiles,
    };
}

/**
 * Dilim sonucundan manifest JSON oluşturur
 * (dataUrl'ler hariç, sadece metadata)
 */
export function buildPuzzleManifest(result: SliceResult): PuzzleManifest {
    return {
        imageId: result.imageId,
        n: result.n,
        tileW: result.tileW,
        tileH: result.tileH,
        tiles: result.tiles.map((tile) => ({
            id: tile.id,
            row: tile.row,
            col: tile.col,
            index: tile.index,
        })),
    };
}

/**
 * Demo fonksiyon: URL ile test et
 * @param url - Test edilecek görsel URL'si
 * @param n - Grid boyutu (varsayılan 3)
 */
export async function testSliceWithUrl(
    url: string,
    n: number = 3
): Promise<void> {
    console.log(`🧩 Puzzle Slice Test Başlıyor...`);
    console.log(`📎 URL: ${url}`);
    console.log(`📐 Grid: ${n}x${n}`);

    try {
        const result = await sliceImageToGridTiles(url, n);

        console.log(`\n✅ Dilim Tamamlandı!`);
        console.log(`🆔 Image ID: ${result.imageId}`);
        console.log(`📦 Toplam Tile: ${result.tiles.length}`);
        console.log(`📏 Tile Boyutu: ${result.tileW}x${result.tileH}px`);

        // İlk tile'ın önizlemesi
        if (result.tiles.length > 0) {
            const firstTile = result.tiles[0];
            console.log(`\n🎨 İlk Tile Önizleme:`);
            console.log(`   ID: ${firstTile.id}`);
            console.log(`   Position: row=${firstTile.row}, col=${firstTile.col}`);
            console.log(`   DataURL uzunluğu: ${firstTile.dataUrl.length} karakter`);

            // Console'da görsel önizleme (eğer tarayıcıda çalışıyorsa)
            console.log(`   Önizleme (console'da görüntülenebilir):`);
            console.log(`%c `, `
        font-size: 100px;
        background: url(${firstTile.dataUrl}) no-repeat center;
        background-size: contain;
      `);
        }

        // Manifest oluştur ve göster
        const manifest = buildPuzzleManifest(result);
        console.log(`\n📋 Manifest:`);
        console.log(JSON.stringify(manifest, null, 2));

    } catch (error) {
        console.error('❌ Dilim Hatası:', error);
    }
}
