import pymupdf, os
from rapidocr_onnxruntime import RapidOCR
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
eng = RapidOCR()
jobs = []
for y in [2020, 2021, 2025]:
    jobs.append(("en", y, os.path.join(base, "成考（专升本）历年真题-英语", f"{y}年专升本真题及答案解析（英语）.pdf")))
for y in [2020, 2021, 2022, 2024, 2025]:
    jobs.append(("ma", y, os.path.join(base, "成考（专升本）历年真题-高等数学", f"{y}年专升本真题及答案解析（高数）.pdf")))
for tag, y, p in jobs:
    if not os.path.exists(p): print("缺", p); continue
    d = pymupdf.open(p)
    parts = []
    for i, pg in enumerate(d):
        W, H = pg.rect.width, pg.rect.height
        for side, clip in (("L", pymupdf.Rect(0,0,W/2,H)), ("R", pymupdf.Rect(W/2,0,W,H))):
            z = min(1.6, 2000/(W/2))
            pix = pg.get_pixmap(matrix=pymupdf.Matrix(z,z), clip=clip)
            img = os.path.join(out, f"_m{tag}{y}_{i+1}_{side}.png")
            pix.save(img)
            res, _ = eng(img)
            os.remove(img)
            items = []
            if res:
                for box, txt, sc in res:
                    cy = sum(q[1] for q in box)/4; cx = sum(q[0] for q in box)/4
                    items.append((round(cy/12), cx, txt))
                items.sort(key=lambda t:(t[0],t[1]))
            parts.append(f"\n===== P{i+1} {side} =====\n" + "\n".join(t[2] for t in items))
        print(tag, y, i+1, flush=True)
    open(os.path.join(out, f"{tag}{y}_blk.txt"),"w",encoding="utf-8").write("\n".join(parts))
    print("DONE", tag, y, flush=True)
