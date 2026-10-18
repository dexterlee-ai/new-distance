# 新距離 The New Distance

dentsu《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》的互動閱讀作品：把全書 22 篇文章畫成一座可以走進去的世界。

> 品牌在岸上，人在中心；中間隔著一片由 AI 代理組成的海。越往中心，離人越近。

**線上版：<https://dexterlee-ai.github.io/new-distance/>**

![桌機畫面：從組織之岸望向人之核](media/preview-desktop.jpg)

讀者回答三題（角色、產業、最在意的事），鏡頭帶著讀者從組織之岸出發，經過代理之層與人心之地，最後停在中心的 People Model。每一區用一個裝置表達一篇（或一組）文章的核心概念，再進入全文閱讀。人的東西用鉛筆排線畫，機器的東西用 ASCII 字元畫，只有讀者注意力所在的地方才上 Riso 套色。

![手機畫面](media/preview-phone.jpg)

## 本機預覽

需要 Python 3，不需要安裝任何套件：

```bash
python tools/serve_world.py 5180
```

打開 <http://127.0.0.1:5180/>。也可以直接開 `#/map`（整張地圖）或 `#/index`（22 篇目錄）。

## 專案內容

| 路徑 | 內容 |
|---|---|
| [`world/`](world/) | 作品本身：純靜態網站，整個資料夾即可部署，沒有建置步驟與第三方執行期依賴 |
| [`world/README.md`](world/README.md) | 完整說明：世界觀、策展原則、架構、AI 工具、製作流程、部署、資安自評、無障礙 |
| [`world/docs/intro-script.md`](world/docs/intro-script.md) | 3 分鐘介紹的旁白稿與分鏡 |
| `tools/build_world.py` | 由逐字全文資料產生 `world/data`，並檢查引文、註解與用詞；全部通過才寫入 |
| `tools/world_curation/` | 策展層：每篇的核心概念、案例與產業標籤、分區文字、註解校正 |
| `tools/head_mesh.py`、`tools/subset_fonts.py` | 頭像網格處理、字型子集化 |
| `tools/serve_world.py` | 本機預覽伺服器 |
| `tools/deploy_pages.sh` | 把已提交的 `world/` 發布到 `gh-pages` 分支（GitHub Pages） |
| `media/` | 本說明用的截圖（不部署） |

`world/data` 已是建置好的資料，網站可以直接執行。重新建置需要原刊逐字全文資料（`site/data`），它來自另一個版本的資料管線，不在這個 repository 裡。

## 部署

線上版由 GitHub Pages 提供：`gh-pages` 分支只放 `world/` 的內容，提交後執行 `sh tools/deploy_pages.sh` 即可重新部署。GitHub Pages 的限制、改用 Cloudflare Pages／Netlify 的作法與部署後的驗證步驟，見 [`world/README.md` §6–§7](world/README.md#6-部署)。

## 授權與出處

- 文章內容、圖表與原刊美術：dentsu Taiwan《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》，版權屬原出版者與各篇作者。
- three.js r185：MIT License（`world/assets/vendor/three.LICENSE.txt`）。
- 字型：Noto Sans TC、Montserrat、IBM Plex Mono，SIL Open Font License 1.1（`world/assets/fonts/OFL.txt`）。
- 配樂、音效與大衛頭像的 3D 網格以 Magnific 生成，細節見 [`world/README.md` §4](world/README.md#4-使用的-ai-工具)。
