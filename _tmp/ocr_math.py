import pymupdf, os, sys
from rapidocr_onnxruntime import RapidOCR
base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-高等数学"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
eng = RapidOCR()
for y in [2020, 2021, 2022, 2024, 2025]:
    p = os.path.join(base, f"{y}年专升本真题及答案解析（高数）.pdf")
    if not os.path.exists(p): print("缺", y, flush=True); continue
    d = pymupdf.open(p)
    parts = []
    for i, pg in enumerate(d):
        W, H = pg.rect.width, pg.rect.height
        for side, clip in (("L", pymupdf.Rect(0,0,W/2,H)), ("R", pymupdf.Rect(W/2,0,W,H))):
            z = min(1.6, 2000/(W/2))
            try:
                pix = pg.get_pixmap(matrix=pymupdf.Matrix(z,z), clip=clip)
                img = os.path.join(out, f"_mm{y}_{i+1}_{side}.png")
                pix.save(img)
                res, _ = eng(img)
                os.remove(img)
            except Exception as e:
                print("ERR", y, i+1, side, e, flush=True); res = None
            items = []
            if res:
                for box, txt, sc in res:
                    cy = sum(q[1] for q in box)/4; cx = sum(q[0] for q in box)/4
                    items.append((round(cy/12), cx, txt))
                items.sort(key=lambda t:(t[0],t[1]))
            parts.append(f"\n===== P{i+1} {side} =====\n" + "\n".join(t[2] for t in items))
        print("page", y, i+1, flush=True)
    open(os.path.join(out, f"ma{y}_blk.txt"),"w",encoding="utf-8").write("\n".join(parts))
    print("DONE", y, flush=True)
