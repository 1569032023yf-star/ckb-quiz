# -*- coding: utf-8 -*-
"""2025 英语真题 OCR v2：裁页边 + 二值化滤掉背面透印，再 OCR。
输出 _tmp/en2025_ocr_clean.txt
"""
import pymupdf, os, io
import numpy as np
import cv2
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

base = r"C:/Users/yf/Desktop/成考（专升本）考前资料-理工经管&药学类/【1】2020-2025年真题卷/成考（专升本）历年真题-英语"
out = r"C:/Users/yf/WorkBuddy/学习/成考刷题App/_tmp"
eng = RapidOCR()

pad_l, pad_r, pad_t, pad_b = 52, 88, 26, 30
THRESH = 150          # 低于该灰度视为印刷字，反之为透印/纸底


def binarize(pix):
    img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")
    a = np.array(img)
    b = np.where(a < THRESH, 0, 255).astype(np.uint8)
    return b


def to_lines(items):
    items = sorted(items, key=lambda t: t[0])
    gaps = [b[0] - a[0] for a, b in zip(items, items[1:]) if b[0] - a[0] > 0.5]
    if gaps:
        gaps.sort()
        G = gaps[len(gaps) // 2]
        tol = max(10.0, min(34.0, 0.45 * G))
    else:
        tol = 20.0
    rows, cur = [], []
    for it in items:
        if not cur:
            cur = [it]
            continue
        if it[0] - cur[0][0] <= tol:
            cur.append(it)
        else:
            rows.append(cur)
            cur = [it]
    if cur:
        rows.append(cur)
    return ["  ".join(t[2] for t in sorted(r, key=lambda x: x[1])) for r in rows]


d = pymupdf.open(os.path.join(base, "2025年专升本真题及答案解析（英语）.pdf"))
parts = []
for i, pg in enumerate(d):
    W, H = pg.rect.width, pg.rect.height
    if W > H:
        halves = [("L", pymupdf.Rect(pad_l, pad_t, W / 2, H - pad_b)),
                  ("R", pymupdf.Rect(W / 2, pad_t, W - pad_r, H - pad_b))]
    else:
        halves = [("F", pymupdf.Rect(pad_l, pad_t, W - pad_r, H - pad_b))]
    for side, clip in halves:
        z = min(2.6, 1750.0 / clip.width)
        pix = pg.get_pixmap(matrix=pymupdf.Matrix(z, z), clip=clip)
        bw = binarize(pix)
        tmp = os.path.join(out, "_oe25_bw.png")
        Image.fromarray(bw).save(tmp)
        res, _ = eng(tmp)
        items = []
        if res:
            for box, txt, sc in res:
                cy = sum(p[1] for p in box) / 4
                cx = sum(p[0] for p in box) / 4
                items.append((cy, cx, txt))
        parts.append(f"\n===== P{i+1}{side} =====\n" + "\n".join(to_lines(items)))
    print("page", i + 1, flush=True)
open(os.path.join(out, "en2025_ocr_clean.txt"), "w", encoding="utf-8").write("\n".join(parts))
print("DONE", flush=True)
