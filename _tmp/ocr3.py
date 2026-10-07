import pymupdf, os
from rapidocr_onnxruntime import RapidOCR
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-政治"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
eng = RapidOCR()
for y in [2020, 2021, 2024, 2025]:
    d = pymupdf.open(os.path.join(base, f"{y}年专升本真题及答案解析（政治）.pdf"))
    parts = []
    for i, pg in enumerate(d):
        W, H = pg.rect.width, pg.rect.height
        for tag, clip in (("LEFT", pymupdf.Rect(0, 0, W/2, H)), ("RIGHT", pymupdf.Rect(W/2, 0, W, H))):
            z = min(1.6, 2000 / (W/2))
            pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z), clip=clip)
            img = os.path.join(out, f"_c{y}_{i+1}_{tag}.png")
            pix.save(img)
            res, _ = eng(img)
            os.remove(img)
            items = []
            if res:
                for box, txt, sc in res:
                    cy = sum(p[1] for p in box) / 4
                    cx = sum(p[0] for p in box) / 4
                    items.append((round(cy / 12), cx, txt))
                items.sort(key=lambda t: (t[0], t[1]))
            parts.append(f"\n===== PAGE {i+1} {tag} =====\n" + "\n".join(t[2] for t in items))
        print(y, i+1, "ok", flush=True)
    open(os.path.join(out, f"{y}_blk.txt"), "w", encoding="utf-8").write("\n".join(parts))
    print("DONE", y, flush=True)
