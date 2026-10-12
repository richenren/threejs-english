"""Convert scene JPGs and render glyph/grammar cards into vocabulary-assets WebP."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(r"C:\Users\bluce\.cursor\projects\d-E-project-codes-LLM-threejs-english\assets")
OUT = ROOT / "frontend/public/vocabulary-assets"
MANIFEST = ROOT / "data/vocabulary-assets-manifest.json"
META = ROOT / "scripts/_batch_231_260_meta.json"
SIZE = 512

FONT_EN = r"C:\Windows\Fonts\arialbd.ttf"
FONT_EN_REG = r"C:\Windows\Fonts\arial.ttf"
FONT_CN = r"C:\Windows\Fonts\msyh.ttc"


def load_font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size, index=index)
    except OSError:
        return ImageFont.truetype(path, size)


def fit_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    max_w: int,
    start: int,
    min_size: int = 18,
    index: int = 0,
) -> ImageFont.FreeTypeFont:
    size = start
    while size >= min_size:
        font = load_font(font_path, size, index)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_w:
            return font
        size -= 2
    return load_font(font_path, min_size, index)


def rounded_bg(kind: str) -> tuple[Image.Image, ImageDraw.ImageDraw, str]:
    img = Image.new("RGB", (SIZE, SIZE), "#F7F3EA")
    draw = ImageDraw.Draw(img)
    if kind == "grammar":
        accent, panel = "#2F6F8F", "#E8F2F7"
        tag = "语法卡"
    else:
        accent, panel = "#B8793A", "#F3E6D4"
        tag = "字卡"
    draw.rounded_rectangle((28, 28, SIZE - 28, SIZE - 28), radius=36, fill=panel, outline=accent, width=4)
    draw.rounded_rectangle((48, 48, 220, 92), radius=16, fill=accent)
    tag_font = load_font(FONT_CN, 22)
    tb = draw.textbbox((0, 0), tag, font=tag_font)
    tw = tb[2] - tb[0]
    draw.text((48 + (172 - tw) // 2, 58), tag, font=tag_font, fill="white")
    return img, draw, accent


def center_text(
    draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, y: int, fill: str
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    w = bbox[2] - bbox[0]
    draw.text(((SIZE - w) // 2, y), text, font=font, fill=fill)


def make_card(word: str, cn: str, example: str, kind: str) -> Image.Image:
    img, draw, accent = rounded_bg(kind)
    word_font = fit_text(draw, word, FONT_EN, SIZE - 100, 120 if len(word) <= 4 else 96)
    cn_font = fit_text(draw, cn, FONT_CN, SIZE - 100, 36, 20)
    ex_font = fit_text(draw, example, FONT_EN_REG, SIZE - 110, 28, 16)
    wb = draw.textbbox((0, 0), word, font=word_font)
    word_h = wb[3] - wb[1]
    center_text(draw, word, word_font, 160, "#1F2A37")
    center_text(draw, cn, cn_font, 160 + word_h + 28, "#4B5563")
    draw.line((90, 360, SIZE - 90, 360), fill=accent, width=2)
    center_text(draw, example, ex_font, 390, "#334155")
    return img


def ingest_scene(word: str) -> None:
    for name in (f"{word}-scene.jpg", f"{word}-scene.png"):
        src = SRC / name
        if src.exists():
            img = Image.open(src).convert("RGB").resize((SIZE, SIZE), Image.Resampling.LANCZOS)
            dest = OUT / f"{word}.webp"
            img.save(dest, "WEBP", quality=82, method=6)
            print("scene", word, dest.stat().st_size)
            return
    raise FileNotFoundError(word)


def main() -> None:
    meta_path = Path(sys.argv[1]) if len(sys.argv) > 1 else META
    items = json.loads(meta_path.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    by_word = {a["word"]: i for i, a in enumerate(manifest["assets"])}

    for item in items:
        word = item["word"]
        kind = item["kind"]
        if kind == "scene":
            ingest_scene(word)
            style = "photorealistic"
        else:
            img = make_card(word, item["cn"], item["example"], kind)
            dest = OUT / f"{word}.webp"
            img.save(dest, "WEBP", quality=86, method=6)
            print(kind, word, dest.stat().st_size)
            style = "programmatic-card"

        entry = {
            "word": word,
            "path": f"/vocabulary-assets/{word}.webp",
            "sourceType": "generated",
            "license": "project-generated",
            "status": "approved",
            "style": style,
            "assetKind": kind,
        }
        if word in by_word:
            manifest["assets"][by_word[word]] = entry
        else:
            manifest["assets"].append(entry)

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("manifest total", len(manifest["assets"]))


if __name__ == "__main__":
    main()
