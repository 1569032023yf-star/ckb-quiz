import pymupdf, os
from rapidocr_onnxruntime import RapidOCR
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-政治"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
engine = RapidOCR()
MAX = 2600
for y in [2020, 2021, 2024, 2025]:
    d = pymupdf.open(os.path.join(base, f"{y}年专升本真题及答案解析（政治）.pdf"))
    parts = []
    for i, pg in enumerate(d):
        z = min(1.0, MAX / max(pg.rect.width, pg.rect.height))
        pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z))
        img = os.path.join(out, f"_q{y}_{i+1}.png")
        pix.save(img)
        res, _ = engine(img)
        os.remove(img)
        items = []
        if res:
            W = pix.width
            for box, txt, score in res:
                xs = [p[0] for p in box]; ys = [p[1] for p in box]
                cx = sum(xs) / 4; cy = sum(ys) / 4
                items.append((0 if cx < W / 2 else 1, cy, txt))
            items.sort(key=lambda t: (t[0], t[1]))
        txt = "\n".join(t[2] for t in items)
        parts.append(f"\n===== PAGE {i+1} =====\n" + txt)
        print(y, i + 1, "lines:", len(items), flush=True)
    open(os.path.join(out, f"{y}_ocr2.txt"), "w", encoding="utf-8").write("\n".join(parts))
    print("DONE", y, flush=True)
