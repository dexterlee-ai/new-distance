# 新距離 The New Distance｜決策智慧 2026 世界版

把 dentsu《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》的 22 篇文章，畫成一座可以走進去的世界。

> 品牌在岸上，人在中心；中間隔著一片由 AI 代理組成的海。越往中心，離人越近。

這是一份**策展詮釋**：世界的結構、每一區的裝置與說明文字是我們的詮釋；篇名、作者、全文、圖表、註解與引文都依原刊收錄。引文由建置腳本逐字比對原文，對不上就無法建置。

---

## 繳交清單

| 項目 | 內容 |
|---|---|
| 作品網址（免登入） | `https://＿＿＿＿＿＿`（部署後填入，作法見 §6） |
| 原始碼 | <https://github.com/dexterlee-ai/new-distance> |
| 託管 | `＿＿＿＿＿＿`（Cloudflare Pages 或 Netlify 擇一；理由見 §6） |
| 3 分鐘介紹 | 影片：`＿＿＿＿＿＿`；旁白稿與分鏡：[`docs/intro-script.md`](docs/intro-script.md) |
| 使用的 AI 工具 | §4 |
| 製作流程 | §5 |
| 部署理由與資安自評 | §6、§7（每一項都附驗證方法） |
| 測試環境 | 開發期間：桌機 Chrome（含無頭模式逐畫面截圖）、手機尺寸模擬（390×844）。送件前補測並填入：`＿＿＿＿＿＿`（建議 Safari macOS／iOS、Edge、Android Chrome） |

給第一次打開的人：按「為我規劃一條路線」回答三題，跟著路線一站一站走，再挑想讀的文章深讀全文。也可以直接開 `#/map`（整張地圖）或 `#/index`（22 篇目錄）。

---

## 1. 世界觀

### 四個距離（同心圓）

| 距離 | 環 | 品牌要做到的事 | 分區（文章） |
|---|---|---|---|
| 0 | 人之核 People Core | 懂人 | People Model 向日葵（12、2） |
| 28 | 人心之地 Heartland | 被相信・被記住・被想要 | 信任之地（3、6）・共同記憶（8、10、11）・心動與遲疑（7、17） |
| 57 | 代理之層 Agent Layer | 被讀懂・被選擇・被授權 | 答案引擎（13、19、9）・授權之橋（15、18、22） |
| 84 | 組織之岸 The Shore | 判斷・交付・文化 | 衡斷之塔（1、5、14）・交付工坊（20、21、4）・文化暗流（16，位於世界底下） |

- **多核心**：中心是「懂人」（People Model），岸上是「判斷」（衡斷之塔）。全書的立場正是兩者之間的分工：用模擬做篩選，用真人做把關。
- **系統是活的**：紙船從交付工坊出發，經過答案引擎（灰色的量產紙船在這裡溶成字元沉沒），停靠在人心之地；人們的討論化成對話泡泡飄進答案引擎的耳朵；AI 代理把答案送回人群。每一區都是同一個系統的一個環節。
- **個人化路線**：讀者回答三題（角色、產業、最在意的事），系統挑出最相關的文章，排成一條由外而內的路線：從組織之岸出發，經過代理之層與人心之地，最後停在人之核。路線上的每張文章卡片都寫出推薦給你的原因；產業理由只引用同一產業的書中案例。
- **與人的距離**：靠近一區時，左下角的量尺會顯示這裡與人的距離（0 是人本身，84 是品牌自己的岸邊）。這是作品的標題，也是導覽的座標。

### 視覺與聲音

- 取自原刊封面的「鉛筆素描 ↔ ASCII 字元」二元：屬於人的東西以鉛筆排線畫在再生紙上，屬於機器的東西以字元排印。People Model 剛好介於兩者之間，種子盤由內而外從實心人形、半透明人形，過渡到字元方塊。
- 答案引擎是一顆大衛頭像：以原刊的大衛鉛筆素描重建成 3D 模型，用石墨排線畫出，後腦碎成青色的字元方塊——由人做成的模型，正在變成機器。
- 章節色（People 萊姆、Model 粉、AI 天藍）只在讀者注視的區域完整出現，其他地方是點狀的淡印，像 Riso 套色。
- 潛到世界底下（文化暗流）時，紙張翻成深色、線條變成粉筆，對應原刊章節扉頁的深色跨頁。
- 開場時世界從中心的人開始，一圈圈往外被畫出來。
- 聲音（`assets/js/audio.js`）預設靜音，不會自動播放：讀者按下頂欄的「聲音」後才建立音訊、載入音檔；上次開著聲音離開，下次也只會在按鈕上提示，仍要讀者自己按。底樂在世界上方循環，潛到世界底下換成低鳴，打開全文時自動壓低。

---

## 2. 策展：哪些是原刊，哪些是我們的詮釋

| 內容 | 來源 | 規則 |
|---|---|---|
| 篇名、副標、作者、職稱、頁碼 | 原刊（`data/index.json`） | 照原刊，不改字 |
| 全文、圖表、註解 | 原刊（`data/a/NN.json`；圖表由原刊 PDF 裁切） | 逐字收錄；註解編號依原刊的「註解N」校正 |
| 引文 | 原刊 | 建置時逐字比對（見 §5 品質關卡） |
| 世界、四個環、九個分區、裝置、每區的一句話與運作步驟 | 我們的策展（`tools/world_curation/districts.json`） | 開場畫面註明這是一份策展詮釋 |
| 每篇的核心概念、篇與篇的關聯、角色／產業／焦點標籤、案例的產業 | 子代理逐篇細讀後整理，稽核時再逐項對照原文（`concepts_A.json`、`concepts_B.json`） | 每句引文附 block id 與頁碼 |

閱讀的設計是「先看懂，再挑著深讀」：每一區先用裝置演出概念，面板依序給一句話、運作步驟、原文引文與文章卡片；按「深讀全文」進入閱讀器，側欄一直標示這篇在世界裡的位置，「下一篇」會沿著你的路線往下走。

---

## 3. 架構

純靜態網站：沒有後端、沒有資料庫、沒有建置工具鏈、沒有第三方執行期依賴。

```
world/                    ← 部署目錄（整個資料夾上傳即可）
  index.html              入口（CSP 以 meta 宣告；只有一支外部 module script，沒有行內腳本與樣式）
  _headers                Cloudflare Pages／Netlify 的 HTTP 標頭與快取規則
  assets/css/world.css    介面樣式
  assets/js/
    main.js               啟動；瀏覽器不支援 WebGL2 時自動改為純文字閱讀
    engine.js             渲染器、燈光、鏡頭運鏡（飛行、慣性、視差偏移）
    npr.js                非寫實渲染：場景先寫入「繪圖緩衝」（明暗、字元度、套色、覆蓋），再由一個合成 pass 畫成鉛筆排線、ASCII、Riso 套色與紙紋
    mat.js                材質工廠（以 three.js Lambert 光照＋陰影為底，改寫輸出）
    terrain.js            圓盤世界、指紋紋理丘陵、ASCII 代理之海
    d-*.js                九個分區的裝置
    life.js               紙船、行人、對話泡泡、AI 代理
    world.js / kit.js     組裝世界、共用幾何與工具
    ui.js / route.js / reader.js   介面、個人化路線、全文閱讀器
    audio.js              聲音（預設靜音）
  assets/audio/           底樂、低鳴與 12 個短音效（MP3，見 §4）
  assets/vendor/          three.js r185（MIT，本地自帶）
  assets/fonts/           思源黑體（Noto Sans TC）、Montserrat、IBM Plex Mono（OFL，依實際用字子集化）
  assets/img/             紙紋 paper.webp、原刊圖表 fig/、favicon
  data/                   index.json、a/NN.json（原刊逐字資料）、world.json（策展層）、head.bin＋head_shards.json（大衛頭像網格）
  docs/                   3 分鐘介紹的旁白稿與分鏡
```

### 資料流程

1. `site/data/`：從原刊 InDesign 文字與 PDF 萃取的逐字全文與圖表（另一個版本的資料管線產出，兩版共用；本版只讀不改）。
2. `tools/world_curation/concepts_A.json`、`concepts_B.json`：逐篇細讀後整理的核心概念、運作機制、產業與角色標籤、案例所屬產業、文章間關聯；每句引文附 block id 與頁碼。
3. `tools/world_curation/districts.json`：世界觀、四個環、九個分區的文字（手寫的策展層，不由管線產生）。
4. `tools/world_curation/notes_fix.json`：共用資料裡註解順序或編號有誤的文章，依原刊「註解N」標出正確的順序與編號。
5. `python -I tools/build_world.py`：讀取 `site/data`，套用註解校正並執行 §5 列出的檢查；全部通過後才寫入 `world/data`（含 `world.json`），並只複製文章實際用到的圖。
6. `python -I tools/head_mesh.py <head.glb>`：把 Magnific 重建的大衛頭像（GLB 原檔不隨附）減面到約 3.6 萬個三角形、量化成 `data/head.bin`，並在後腦取樣碎裂點 `data/head_shards.json`（需要 numpy、trimesh、fast_simplification）。
7. `python -I tools/subset_fonts.py <字型來源資料夾>`：依全站實際用字子集化字型（需要 fontTools；改了文案就要重跑）。

### 本機預覽

```bash
# 完整專案：在專案根目錄執行（不快取；.js 固定送 text/javascript）
python tools/serve_world.py 5180

# 只有 world/ 資料夾時：在 world/ 的上一層執行（macOS／Linux）
python -m http.server 5180 --directory world
```

Windows 上的 Python 可能依登錄檔把 `.js` 送成 `text/plain`，ES module 會載不起來，請用 `serve_world.py`。網址加上 `?still`（例如 `http://127.0.0.1:5180/?still#/d/trust`）會跳過開場、讓動畫停在固定畫格，供截圖比對用；加上 `?debug` 會在主控台開放 `window.__nd`（例如 `__nd.engine.tick(n)` 手動推進畫格）。兩者都不影響一般讀者。

專案範圍：`world/` 是部署目錄；`tools/` 是建置腳本與策展資料；`site/` 是另一個版本，本版只讀取它的 `site/data`。原刊 PDF 與 InDesign 原檔不在專案資料夾內，也不公開。

---

## 4. 使用的 AI 工具

| 工具 | 模型／功能 | 用在哪裡 | 人的決定 |
|---|---|---|---|
| Claude Code | Claude Opus 5.5 | 世界觀策展、資料萃取與驗證、全部程式（three.js 非寫實渲染管線、九個裝置、介面、個人化路線、閱讀器、建置腳本）、在瀏覽器中逐畫面截圖檢查與修正 | 世界觀方向、三個問題的選項、哪些內容可以公開 |
| Claude Code 子代理（多代理工作流） | 同上 | 平行細讀 22 篇全文，產出概念、標籤與關聯資料；研究 2025–2026 國際得獎互動網站（清單見 `tools/world_curation/references_2025_2026.md`）；六個面向的稽核與複核；分五組平行修正（見 §5） | 作者指定稽核的重點（例如桌機的地圖與路線構圖） |
| Magnific | Google Lyria 3 Pro（音樂生成） | 底樂 `world.mp3`（約 2 分 52 秒；循環時以 6 秒交叉淡化接回開頭） | 作者核可在既定美術方向內使用付費生成 |
| Magnific | ElevenLabs Sound Effects（音效生成） | 世界底下的低鳴 `under.mp3`（20 秒循環）與 12 個短音效：鏡頭長距離飛行的風聲、分區開啟的鉛筆聲、選答案時的打字聲、開合閱讀頁的翻頁聲、路線排好與 People Model 回應時的鈴聲 | 同上 |
| Magnific | hi3d-portrait（圖生 3D） | 以原刊的大衛鉛筆素描為輸入，重建 3D 頭像；再由 `tools/head_mesh.py` 減面為 18,001 個頂點、35,998 個三角形 | 同上；來源限定為原刊美術 |
| 21st | — | 未使用。介面元件都是手寫的原生 HTML／CSS，沒有引入任何元件庫 | — |

- 音檔生成後重新壓縮成約 80–112 kbps 的 MP3，以控制下載量。
- 畫面上沒有任何 AI 生成的平面圖像。直接使用的原刊美術只有紙紋 `paper.webp` 與文章內的圖表；向日葵、指紋之心、指紋丘陵都是依原刊章節意象以程式建模。唯一經 AI 處理的視覺素材，是由原刊大衛素描重建的 3D 頭像。
- 建置與檢查用的非 AI 工具：Python（fontTools、trimesh、fast_simplification、numpy）、Node.js（`node --check` 語法檢查、路線組合腳本）、無頭 Chrome（截圖）。

---

## 5. 製作流程

1. **資料**：原刊 InDesign 文字依版面順序萃取成逐字區塊，圖表由 PDF 裁切，註解依原刊「註解N」編號（`site/data`，與另一版本共用）。
2. **策展**：子代理平行細讀 22 篇，整理每篇的核心概念、運作機制、標籤與關聯；再決定世界的結構——以「與人的距離」為唯一的座標，把 22 篇分進四個環、九個分區。
3. **世界**：自寫非寫實渲染（鉛筆排線、ASCII、Riso 套色、紙紋）、九個裝置、串起各區的生命系統、介面、個人化路線與全文閱讀器。開發中反覆以無頭 Chrome 截圖（`?still` 固定畫格），逐畫面檢查構圖與文字。
4. **素材**：方向確認後，用 Magnific 生成配樂、音效與大衛頭像（§4）。
5. **稽核**：六個面向各由一個代理實測——內容忠實度、程式、無障礙、資安、個人化路線、視覺。實測方式包括無頭 Chrome 逐路由操作、以 Node 腳本跑遍全部 560 種三題組合、逐句比對引文與原文。每一項發現再由另一個代理獨立複核：63 項成立、6 項駁回。
6. **修正**：成立的發現分給五組平行處理（3D、介面、資料、路線、文件）。各組只改自己負責的檔案；跨組的部分先訂好介面約定（例如引擎的動態開關、路線函式的保證、案例資料的格式），避免互相覆蓋。
7. **部署**：部署到會讀 `_headers` 的託管，依 §7 逐項驗證後，把結果填回本文件。

### 品質關卡

`tools/build_world.py` 任一項檢查不通過就停止建置：

- 世界用到的每句引文（9 個分區引文、22 篇核心引文）都必須逐字出現在該篇原文中；
- 策展文字（文章關聯理由、概念說明、分區的一句話與步驟）裡 8 個字以上的「」引號內容，必須逐字出現在它談到的文章中；
- 每篇文章的每個註解標號都必須對應到唯一一條註解，註解編號不得重複；
- 案例產業、文章產業與三題的標籤，只能使用三題選項裡的 id。

### 放棄的做法

- 答案引擎原本是一顆依手繪側面剪影擠出的方塊頭（舊的 `voxel_head.py` → `face_voxels.json`），後來改成由原刊大衛素描重建的 3D 頭像；舊腳本與資料已刪除。
- 原刊的封面、大衛、臉、指紋心、向日葵五張插圖曾複製進部署目錄備用，最後都沒有直接使用：向日葵與指紋心改用程式建模，大衛改為 3D 重建。這五個檔從未被網站載入，已從部署目錄移除（原檔仍在 `site/`）。

---

## 6. 部署

### 為什麼選 Cloudflare Pages 或 Netlify

這是一個純靜態網站，不需要伺服器程式。Cloudflare Pages 和 Netlify 都會讀 `world/_headers`，能送出 meta 標籤做不到的保護（`frame-ancestors`、`X-Frame-Options`、`nosniff`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`）與快取規則；兩者都提供 HTTPS、ETag，並以整批切換的方式上線，部署過程中不會出現新舊檔案混用。

### 步驟

- **Cloudflare Pages**：Workers & Pages → 建立 Pages 專案 → 直接上傳，選 `world/` 資料夾。若連接 Git：建置指令留空，輸出目錄填 `world`。
- **Netlify**：新增網站 → 手動部署，把 `world/` 資料夾拖進去。若連接 Git：建置指令留空，發布目錄填 `world`。
- 部署後把網址填進最上方的繳交清單，再依 §7 驗證。`README.md` 與 `docs/` 也會一起公開（內容就是這份說明，不含個資）。

### GitHub Pages 為什麼不建議

GitHub Pages 不支援自訂 HTTP 標頭，會略過 `_headers`。網站仍能運作，`index.html` 的 meta CSP 也仍然有效，但 meta CSP 不能設定 `frame-ancestors`，其他標頭與快取規則都不會生效。

### 快取規則（`_headers`）

| 路徑 | Cache-Control | 原因 |
|---|---|---|
| `/`、`/index.html`、`/assets/js/*`、`/assets/vendor/*`、`/assets/css/*`、`/data/*` | `no-cache` | 檔名沒有版本號；每次使用前都用 ETag 確認（沒變就回 304），重新部署後不會新舊模組與資料混用 |
| `/assets/audio/*` | `public, max-age=2592000`（30 天） | 生成一次後不再修改；若要替換音檔，請改檔名，並同步修改 `audio.js` 裡的檔名 |
| `/assets/fonts/*`、`/assets/img/*` | `public, max-age=86400, stale-while-revalidate=604800` | 字型會隨文案重新子集化、圖表可能重新裁切：1 天內直接用快取，之後一週內先顯示快取、背景更新 |

`/*` 只設資安標頭；`Cache-Control` 對每個路徑只由一條規則設定，因為 Cloudflare Pages 遇到同一個標頭被多條規則命中時，會用逗號把值串在一起。

### 被嵌入 iframe 的情況

目前以 `frame-ancestors 'none'` 與 `X-Frame-Options: DENY` 禁止任何網站嵌入本作品。送件前請向主辦單位確認評審頁會不會用 iframe 嵌入作品；如果會，把 `_headers` 的 `frame-ancestors 'none'` 改成 `frame-ancestors 'self' https://<主辦網域>`，並刪除 `X-Frame-Options: DENY`。

---

## 7. 資安自評

| 項目 | 主張 | 怎麼驗證 | 結果 |
|---|---|---|---|
| 內容安全政策 | `default-src 'self'`；腳本、樣式、字型、圖片與連線都只允許同源（圖片另允許 `data:`、`blob:`）；`object-src 'none'`、`form-action 'none'`、`base-uri 'self'`；部署後再加上 `frame-ancestors 'none'` | 開發者工具 Console 沒有 CSP 錯誤；在 Console 執行 `document.querySelector('meta[http-equiv]').content`；部署後用下方 `curl -sI` 看 `content-security-policy` | 稽核時（2026-10-18）走遍 16 條路由，`securitypolicyviolation` 事件 0 次 |
| 沒有行內腳本與事件屬性 | HTML 只有一支 `<script type="module" src>`；程式產生的 HTML 不含 `on*=` 屬性與 `style=""`；樣式一律用 class 或 CSSOM | 下方掃描指令（行內事件、eval） | 0 筆 |
| 第三方請求 | 沒有追蹤碼、分析、廣告或 CDN；three.js、字型、音檔都自帶 | 開發者工具 Network 篩選「非本網域」；或在 Console 執行 `[...new Set(performance.getEntriesByType('resource').map(e => new URL(e.name).origin))]`，只會出現本站網域 | 程式碼中沒有任何外部載入網址；稽核時首頁載入 32 個請求全部同源 |
| 個資 | 不收集任何個人資料；沒有 cookie、帳號、表單或後端。三題答案只存在讀者自己的瀏覽器（localStorage），分享路線時只帶三個選項 id | Console 執行 `Object.keys(localStorage)`，只會看到 `nd.` 開頭的介面偏好：`nd.profile`（三題答案）、`nd.read`（讀過哪幾篇）、`nd.motion`、`nd.sound`（動態與聲音開關）、`nd.mapHint`（地圖提示看過沒）；下方掃描指令（email） | 程式中只有 `ui.js` 一處讀寫 localStorage；email 0 筆 |
| 原刊中的個人信箱 | 原刊 p.2–3、p.196–197 的聯絡信箱不收錄 | 下方掃描指令（email） | 0 筆 |
| 金鑰與密碼 | 原始碼與資料中沒有任何金鑰、權杖、密碼或客戶資料；網站不呼叫任何需要金鑰的服務 | 下方掃描指令（金鑰） | 0 筆 |
| 動態內容 | 插入畫面的資料字串一律先經 `esc()` 跳脫；不使用 `eval`／`new Function`；網址中的路線參數只接受三題選項裡存在的 id，其餘一律當成未作答 | 閱讀 `reader.js` 的 `esc()`、`route.js` 的 `cleanProfile()`；試開 `#/route/constructor.x.y` 不會出錯 | — |
| 外部連結 | 原刊註解的來源連結一律 `target="_blank" rel="noopener noreferrer"`，全站 `Referrer-Policy: no-referrer` | 在任一篇全文的註解上檢查元素 | 稽核時 77 條註解外連全部是 https |
| 權限 | 不使用相機、麥克風、定位、付款、USB：`Permissions-Policy` 全部關閉 | 部署後 `curl -sI` | 部署後填入 |
| 聲音 | 不自動播放；讀者按下「聲音」前不建立音訊、不下載音檔 | 閱讀 `audio.js` 的 `enable()` 與 `ui.js` 的聲音開關；開發者工具 Network 在按下「聲音」前看不到 `.mp3` | — |
| HTTP 標頭與快取 | 見 §6 | 下方 `curl -sI` 指令 | 部署後貼上輸出 |
| 授權 | three.js MIT；字型 SIL OFL 1.1；文章與原刊美術屬 dentsu Taiwan；音檔與 3D 頭像以作者的 Magnific 付費帳號生成 | `assets/vendor/three.LICENSE.txt`、`assets/fonts/OFL.txt`；各字型的版權聲明保留在字型檔的 name table | — |

### 掃描指令（在 `world/` 目錄下執行，macOS／Linux／Git Bash）

```bash
# email：應為 0 筆
grep -rEn "[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}" --include=*.json --include=*.js --include=*.html --include=*.css .
# 金鑰與私鑰：應為 0 筆
grep -rEn "AKIA[0-9A-Z]{16}|sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{35}|gh[pousr]_[A-Za-z0-9]{36}|-----BEGIN [A-Z ]*PRIVATE KEY" --include=*.json --include=*.js --include=*.html --include=*.css .
# eval、行內事件屬性、行內樣式：應為 0 筆
grep -rEn "eval\(|new Function\(" --include=*.js .
grep -rEn " on[a-z]+=| style=\"" assets/js index.html
# 程式中載入外部網址：應為 0 筆
grep -rEn "(src|href)=[\"']https?://|url\([\"']?https?://|from [\"']https?://|import\([\"']https?://|fetch\([\"'\`]https?://" --include=*.js --include=*.html --include=*.css .
# 讀寫瀏覽器儲存的位置：只有 ui.js
grep -rn "localStorage\|sessionStorage\|indexedDB\|document.cookie" assets/js
```

2026-10-18 在本機執行以上指令：email、金鑰、eval、行內事件與外部載入都是 0 筆，瀏覽器儲存只出現在 `assets/js/ui.js`。

### 部署後的標頭驗證

```bash
SITE=https://＿＿＿＿＿＿
curl -sI "$SITE/"                         # 應有 content-security-policy（含 frame-ancestors 'none'）、x-content-type-options: nosniff、
                                          #   referrer-policy: no-referrer、permissions-policy、cross-origin-opener-policy、x-frame-options: DENY、cache-control: no-cache、etag
curl -sI "$SITE/assets/js/main.js"        # content-type 為 JavaScript（text/javascript 或 application/javascript）、cache-control: no-cache、etag
curl -sI "$SITE/data/world.json"          # cache-control: no-cache、etag
curl -sI "$SITE/assets/audio/world.mp3"   # cache-control: public, max-age=2592000
curl -sI "$SITE/assets/fonts/NotoSansTC-sub.woff2"   # cache-control: public, max-age=86400, stale-while-revalidate=604800
# 用上一個回應的 etag 重新請求，應回 304
curl -sI -H 'If-None-Match: "<etag>"' "$SITE/assets/js/main.js"
```

部署後把輸出貼在這裡：

```
（待部署後貼上）
```

---

## 8. 無障礙

- 每一區、每一篇都有完整文字版本（概念、運作步驟、引文、全文）；3D 畫面只是第二層表達。
- 全站可用鍵盤操作：Tab 切換地標與按鈕、Enter 進入、Esc 返回、方向鍵在導覽站之間前後移動。
- 頂欄的「暫停動態」隨時可以停住世界的動態（拖曳與鏡頭移動仍可使用），選擇會被記住。
- 尊重 `prefers-reduced-motion`：鏡頭改為直接切換，世界的動態預設停止。
- 瀏覽器不支援 WebGL2 時，自動改為純文字閱讀（地圖、目錄與全文都能用）。

---

## 9. 授權與出處

- 文章內容、圖表與原刊美術（紙紋、大衛素描）：dentsu Taiwan《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》。
- three.js r185 與 BufferGeometryUtils：MIT License（`assets/vendor/three.LICENSE.txt`）。
- 字型：Noto Sans TC（Adobe／Google）、Montserrat（The Montserrat Project Authors）、IBM Plex Mono（IBM Corp.），SIL Open Font License 1.1（`assets/fonts/OFL.txt`），子集化後在本站自架。
- 配樂、低鳴與音效：以 Magnific 生成（Google Lyria 3 Pro、ElevenLabs Sound Effects）。
- 大衛頭像的 3D 網格：以 Magnific hi3d-portrait 由原刊大衛素描重建，再以 `tools/head_mesh.py` 處理。
