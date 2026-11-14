"""Eski Android için yedek emoji resimlerini üretir (bkz. assets/emoji/README.md).

Kullanım:  python scripts/gen_emoji_fallback.py
Gerekli : Pillow (pip install pillow), internet (unicode.org + fonts.gstatic.com).
Ne yapar: 1) kaynaklarda (components, constants, lib, services, app, hooks, locales) Emoji >= 12.0 olanları bulur,
          2) Noto Emoji 512 px PNG'yi indirip 128 px WebP olarak assets/emoji/'ye yazar,
          3) lib/emojiFallbackAssets.ts (anahtar -> require) ve lib/emojiNewCodepoints.ts (test koruması) dosyalarını yeniler.
"""
import glob, io, os, re, sys, urllib.request
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MIN_VERSION = 12.0
DIRS = ("components", "constants", "lib", "services", "app", "hooks", "locales")
SKIP = {"emojiFallbackAssets.ts", "emojiNewCodepoints.ts"}

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=30).read()

table = {}
text = fetch("https://unicode.org/Public/emoji/latest/emoji-test.txt").decode("utf-8")
for ln in text.splitlines():
    m = re.match(r"([0-9A-F ]+?)\s*;\s*([\w-]+)\s*#\s*(\S+)\s+E(\d+\.\d+)\s+(.*)", ln.strip())
    if not m: continue
    seq = "".join(chr(int(x, 16)) for x in m.group(1).split())
    table[seq] = float(m.group(4)); table[seq.replace("️", "")] = float(m.group(4))
maxlen = max(len(k) for k in table)

used = {}
for d in DIRS:
    for ext in ("*.ts", "*.tsx", "*.json"):
        for f in glob.glob(os.path.join(ROOT, d, "**", ext), recursive=True):
            if ".test." in f or os.path.basename(f) in SKIP: continue
            s = open(f, encoding="utf-8").read(); i = 0
            while i < len(s):
                if ord(s[i]) < 0x2190: i += 1; continue
                hit = next((s[i:i + L] for L in range(min(maxlen, len(s) - i), 0, -1) if s[i:i + L] in table), None)
                if hit and table[hit] >= MIN_VERSION: used[hit.replace("️", "")] = hit; i += len(hit)
                else: i += 1

out_dir = os.path.join(ROOT, "assets", "emoji"); os.makedirs(out_dir, exist_ok=True)
keys = []
for em in sorted(used):
    cps = [format(ord(c), "x") for c in em]
    key = "_".join(cps)
    dest = os.path.join(out_dir, key + ".webp")
    if not os.path.exists(dest):
        data = None
        for v in dict.fromkeys(["_".join(cps), "_".join(cps) + "_fe0f"]):
            try:
                data = fetch(f"https://fonts.gstatic.com/s/e/notoemoji/latest/{v}/512.png")
                if data[:4] == b"\x89PNG": break
            except Exception: data = None
        if not data: print("İNDİRİLEMEDİ:", em, key); continue
        Image.open(io.BytesIO(data)).convert("RGBA").resize((128, 128), Image.LANCZOS).save(dest, "WEBP", quality=90, method=6)
    keys.append((key, em))

lines = ["/**", " * Android'de eski sürümlerde (Emoji 12+ desteklemeyen cihazlar) kutu/yarım çıkan emojilerin yedek resimleri (Noto Emoji, Apache-2.0).",
         " * Anahtar: emojinin kod noktaları (FE0F hariç) onaltılık, '_' ile birleşik. Bkz. lib/emojiFallback.ts, assets/emoji/README.md.",
         " * Otomatik üretildi: scripts/gen_emoji_fallback.py", " */", "export const EMOJI_IMAGES: Record<string, number> = {"]
lines += [f"    '{k}': require('../assets/emoji/{k}.webp'), // {e}" for k, e in sorted(keys)] + ["};", ""]
open(os.path.join(ROOT, "lib", "emojiFallbackAssets.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(lines))

single, seqs = set(), set()
for ln in text.splitlines():
    m = re.match(r"([0-9A-F ]+?)\s*;\s*fully-qualified\s*#\s*(\S+)\s+E(\d+\.\d+)\s+(.*)", ln.strip())
    if not m or float(m.group(3)) < MIN_VERSION: continue
    cps = [int(x, 16) for x in m.group(1).split()]
    if any(0x1F3FB <= c <= 0x1F3FF for c in cps): continue
    base = [c for c in cps if c != 0xFE0F]
    (single.add(base[0]) if len(base) == 1 else seqs.add("_".join(format(c, "x") for c in base)))
out = ["/** Emoji 12.0 ve sonrası (eski Android'de çizilmeyenler): kod noktaları ve ten rengi olmayan diziler. Test koruması için (lib/emojiFallback.test.ts).",
       " *  Otomatik üretildi: scripts/gen_emoji_fallback.py (Unicode emoji-test.txt). */",
       "export const NEW_EMOJI_SINGLE: number[] = [" + ", ".join("0x%x" % c for c in sorted(single)) + "];",
       "export const NEW_EMOJI_SEQUENCES: string[] = [" + ", ".join("'%s'" % s for s in sorted(seqs)) + "];", ""]
open(os.path.join(ROOT, "lib", "emojiNewCodepoints.ts"), "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("tamam:", len(keys), "emoji resmi,", len(single), "tek kod noktası,", len(seqs), "dizi")
