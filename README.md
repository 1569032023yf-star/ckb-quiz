# 成人专升本刷题 PWA

纯前端移动端刷题 App：**零后端、零数据库、零登录、零费用**。
所有数据（进度 / 错题本 / 收藏 / 正确率）存在浏览器 localStorage，支持离线使用、添加到手机主屏幕。

## 功能

- 三科题库：**政治 205 题 / 英语 145 题 / 高等数学 18 题**（共 368 题），来源为 2020-2025 真题 + 考前仿真卷
- 首页科目切换，统计 / 练习 / 错题本 / 收藏按科目独立
- 题型：单选、多选、判断、**填空**（等价写法判分，如 `e^-2` = `1/e^2`）、**主观题**（参考答案 + 自评）
- 高数公式 KaTeX 渲染（本地化，离线可用）
- 英语阅读/完形原文可折叠展开
- 顺序 / 随机 / 按章节 / 错题重刷 / 收藏题五种练法
- 答错自动进错题本，答对自动移出（也可手动移出）
- 导出 / 导入学习数据（JSON 文件），换手机可恢复
- PWA：可添加到主屏幕，Service Worker 离线缓存

## 目录结构

```
成考刷题App/
├── index.html            入口
├── app.js / style.css    逻辑与样式
├── questions.json        题库（所有科目合并）
├── manifest.webmanifest  PWA 配置
├── sw.js                 离线缓存（改动文件后记得升版本号 CACHE）
├── icons/                应用图标
├── vendor/katex/         数学公式渲染（本地）
├── tools/                题库转换脚本（见下）
└── _tmp/                 各来源中间数据
```

## 题目数据结构（questions.json）

```json
{
  "id": "politics-2022-1",          // 全局唯一
  "subject": "政治",                 // 政治 / 英语 / 高等数学（新增科目会自动出现在首页页签）
  "chapter": "政治 2022年真题",       // 章节名（按章节练习用）
  "type": "single",                  // single单选 / multiple多选 / judge判断 / fill填空 / essay主观
  "question": "题干……（可用 $LaTeX$ 公式）",
  "passage": "阅读原文（可选，仅阅读/完形题需要）",
  "options": [ {"key": "A", "text": "选项A"}, ... ],
  "answer": ["A"],                   // 数组；多选如 ["A","C"]；填空可给多个等价写法；主观题为 []
  "display": "$e^{-2}$",             // 填空题展示用的标准答案（可选）
  "explanation": "解析……（可用 $LaTeX$）"
}
```

## 如何替换 / 追加题库

1. **手动**：编辑 `questions.json`（JSON 数组，按上面结构），刷新页面即可（SW 会在后台更新缓存，第二次打开生效）。
2. **从 PDF 生成政治真题**：
   ```bash
   pip install pymupdf rapidocr-onnxruntime
   python tools/pdf_to_questions.py "真题PDF目录" questions.json
   ```
3. **三科仿真卷**：`node tools/sim_to_questions.js`（依赖本地 `../成考刷题/data/data-*.js`）
4. **英语真题**：`python tools/en_parse.py`
5. **合并所有来源**：`python tools/build_questions.py`（输出 `questions.json`）

## 本地运行

不要直接双击 index.html（file:// 无法请求题库）。在目录里执行：

```bash
python -m http.server 8765
# 手机浏览器访问 http://电脑IP:8765（同一 WiFi）
```

## 部署（GitHub Pages）

```bash
git init
git add .
git commit -m "成考刷题App"
git branch -M main
git remote add origin https://github.com/<你的用户名>/ckb-quiz.git
git push -u origin main
```

然后 GitHub 仓库 → Settings → Pages → Source 选 `main` / `(root)` → Save，
得到 `https://<用户名>.github.io/ckb-quiz/`，手机打开后「添加到主屏幕」。

## 已知限制

- 高数真题 PDF 是扫描件且公式复杂，OCR 无法可靠还原，目前高数仅有仿真卷 18 题（人工校对过公式）
- 英语 2020/2021 年 OCR 版无答案区，未导入；2022/2023 阅读原文无法从 PDF 可靠提取，仅导入语音/词汇部分
- OCR 个别字可能有误，刷到可疑题目对照原 PDF 核对即可
- iOS Safari 长期不用可能清理 localStorage，重要进度请定期「导出学习数据」
