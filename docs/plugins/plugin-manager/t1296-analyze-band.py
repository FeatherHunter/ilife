# 票 #1296 验收取证：截图像素读数。
# 判据：书体外 2–4px 邻域（左 / 右 / 下三带）里，
# 不许有「显著暗于底色且中性（R≈G≈B，r-b<18）」的像素；金色光晕（r-b 大）不算投影。
# 书体矩形用书封 1px 金色描边（#d9ab3c，不透明，深浅底都精确可认）定位。
# 用法：python analyze-band.py <png...>
import json
import sys

from PIL import Image

BOOK_BORDER = (217, 171, 60)  # #d9ab3c


def is_book_border(p):
    r, g, b = p[:3]
    return r > 170 and 140 < g < 200 and b < 110 and (r - g) > 30


def lum(p):
    r, g, b = p[:3]
    return 0.299 * r + 0.587 * g + 0.114 * b


def analyze(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    px = im.load()
    bg = px[2, 2]
    bg_l = lum(bg)

    border = [(x, y) for y in range(h) for x in range(w) if is_book_border(px[x, y])]
    if not border:
        raise SystemExit("FAIL: no book border pixels found in " + path)
    xs = [p[0] for p in border]
    ys = [p[1] for p in border]
    left, right, top, bottom = min(xs), max(xs), min(ys), max(ys)

    def band(name, x0, x1, y0, y1):
        pts = []
        for y in range(max(0, y0), min(h, y1 + 1)):
            for x in range(max(0, x0), min(w, x1 + 1)):
                pts.append(px[x, y])
        lums = [lum(p) for p in pts]
        dark = [p for p in pts if lum(p) < bg_l - 12]
        dark_neutral = [p for p in dark if (p[0] - p[2]) < 18]
        return {
            "name": name,
            "n": len(pts),
            "min_lum": round(min(lums), 1) if lums else None,
            "dark_count": len(dark),
            "dark_neutral_count": len(dark_neutral),
            "dark_neutral_sample": [list(p) for p in dark_neutral[:4]],
        }

    # 左／右带只取书体上段（top+8..top+24）：腰封（.eaband，top:29、左右各外伸 4px）
    # 及其自身保留的 0 2px 4px #00000066 阴影落在 top+26 以下，不算「书体外」邻域。
    left_band = band("left", left - 4, left - 2, top + 8, top + 24)
    right_band = band("right", right + 2, right + 4, top + 8, top + 24)
    bottom_band = band("bottom", left + 8, right - 8, bottom + 2, bottom + 4)
    return {
        "path": path,
        "size": [w, h],
        "bg_rgb": list(bg),
        "book_bbox": {"left": left, "right": right, "top": top, "bottom": bottom},
        "bands": {"left": left_band, "right": right_band, "bottom": bottom_band},
        "pass": (
            left_band["dark_neutral_count"] == 0
            and right_band["dark_neutral_count"] == 0
            and bottom_band["dark_neutral_count"] == 0
        ),
    }


def main():
    results = [analyze(p) for p in sys.argv[1:]]
    print(json.dumps(results, ensure_ascii=False, indent=1))
    for r in results:
        b = r["bands"]
        print(
            "RESULT: %s bg=%s book=(%d,%d,%d,%d) "
            "left[min_lum=%s dn=%d] right[min_lum=%s dn=%d] bottom[min_lum=%s dn=%d] -> %s"
            % (
                r["path"].split("/")[-1].split("\\")[-1],
                r["bg_rgb"],
                r["book_bbox"]["left"],
                r["book_bbox"]["right"],
                r["book_bbox"]["top"],
                r["book_bbox"]["bottom"],
                b["left"]["min_lum"],
                b["left"]["dark_neutral_count"],
                b["right"]["min_lum"],
                b["right"]["dark_neutral_count"],
                b["bottom"]["min_lum"],
                b["bottom"]["dark_neutral_count"],
                "PASS" if r["pass"] else "FAIL",
            )
        )


if __name__ == "__main__":
    main()
