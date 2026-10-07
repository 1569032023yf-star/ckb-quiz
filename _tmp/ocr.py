import pymupdf, os
from rapidocr_onnxruntime import RapidOCR
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-政治"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
engine = RapidOCR()
MAX = 1800
for y in [2020, 2021, 2024, 2025]:
    d = pymupdf.open(os.path.join(base, f"{y}年专升本真题及答案解析（政治）.pdf"))
    parts = []
    for i, pg in enumerate(d):
        z = min(1.0, MAX / max(pg.rect.width, pg.rect.height))
        pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z))
        img = os.path.join(out, f"_p{y}_{i+1}.png")
        pix.save(img)
        res, _ = engine(img)
        txt = "\n".join(r[1] for r in res) if res else ""
        parts.append(f"\n===== PAGE {i+1} =====\n" + txt)
        print(y, i + 1, "lines:", len(res) if res else 0, flush=True)
        os.remove(img)
    open(os.path.join(out, f"{y}_ocr.txt"), "w", encoding="utf-8").write("\n".join(parts))
    print("DONE", y, flush=True)
