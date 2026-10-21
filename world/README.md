# 新距離 The New Distance｜決策智慧 2026 世界版

把 dentsu《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》的 22 篇文章，畫成一座可以走進去的世界。

> 品牌與消費者之間，多了一層 AI。

這是一份**策展詮釋**：世界的結構、每一區的裝置與說明文字是我們的詮釋；篇名、作者、全文、圖表、註解與引文都依原刊收錄。引文由建置腳本逐字比對原文，對不上就無法建置。

---

## 繳交清單

| 項目 | 內容 |
|---|---|
| 作品網址（免登入） | <https://dexterlee-ai.github.io/new-distance/> |
| 原始碼 | <https://github.com/dexterlee-ai/new-distance> |
| 託管 | GitHub Pages（`gh-pages` 分支，內容即 `world/`；理由與限制見 §6） |
| 3 分鐘介紹 | 影片：`＿＿＿＿＿＿`；旁白稿與分鏡：[`docs/intro-script.md`](docs/intro-script.md) |
| 使用的 AI 工具 | §4 |
| 製作流程 | §5 |
| 部署理由與資安自評 | §6、§7（每一項都附驗證方法） |
| 測試環境 | 開發期間：桌機 Chrome（含無頭模式逐畫面截圖）、手機尺寸模擬（390×844）。送件前補測並填入：`＿＿＿＿＿＿`（建議 Safari macOS／iOS、Edge、Android Chrome） |

給第一次打開的人：按「為我規劃一條路線」回答三題，跟著路線一站一站走，再挑想讀的文章深讀全文。也可以直接開 `#/map`（整張地圖）自己點任一區，或開 `#/index`（22 篇目錄）。每一區第一次打開時，畫面會先自己演一遍這一區在說的事，字幕只替剛看到的畫面命名。

---

## 1. 世界觀

### 三圈：品牌、AI、消費者

地圖只說一句話：「品牌與消費者之間，多了一層 AI」。最外圈是品牌，中心是消費者，中間多了一層 AI；品牌的話、網友的評價，都先經過 AI。地圖上的每一區都用一般讀者熟悉的說法命名，不另造術語。

| 圈 | 分區（地圖上的名字） | 文章 | 畫面演的事 |
|---|---|---|---|
| 品牌（最外圈） | 判斷力 | 14、1、5 | AI 幾秒就印出一大堆方案；哪一張值得做、蓋章的人要負責，由人決定 |
| | AI 內容產製 | 20、21、4 | AI 讓人人都能量產；先定品牌規格、出貨前由人把關，做出來的才看得出是你 |
| | 組織文化 | 16 | 買了一堆 AI 工具，船還是擱淺不動；卡住的是水面下的冰山 |
| AI（中間） | AI 搜尋 | 9、13、19 | 消費者先問 AI；網友的評價流進 AI，變成 AI 的推薦 |
| | Agent 權限 | 22、18、15 | 每件事 Agent 能做到哪一步：查詢訂單一路做完，金融交易停下來等人確認 |
| 消費者（中心） | 真實與信任 | 6、3 | AI 幾秒就做出一樣的；三個來源交叉驗證、有人願意替你說話，才會被相信 |
| | 品牌記憶 | 8、10、11 | 看板沒人看；大家一起應援過的時刻，才會被記得、帶下一代走進來 |
| | 購買動機與猶豫 | 7、17 | 想買的理由要在 AI 比價前種下；結帳前一句說明，讓人安心 |
| | 數位分身 | 12、2 | 先問 5,000 多位數位分身篩掉沒機會的口味；上市與否，交給真人把關 |

- **兩個中心**：中心是「懂人」（數位分身），岸上是「判斷」（判斷力）。全書的立場正是兩者之間的分工：用模擬做篩選，用真人做把關。
- **地圖上的三股流動**：每一股都有名字，也都畫成看得出是什麼的東西。「品牌內容」是從 AI 內容產製出發的紙船，經過人把關的掛上品牌小旗，沒有規格的量產船在 AI 附近溶成字元；「網友評價」是從 AI 搜尋的人群升起、飄進大衛耳朵的對話泡泡；「AI 的推薦」是從大衛嘴邊送到消費者手機上的小答案卡。進到某一區時，只留下和這一區有關的流動，而且不會從主角面前經過。
- **個人化路線**：讀者回答三題（角色、產業、最在意的事），系統挑出最相關的文章，排成一條由外而內的路線：從品牌出發，經過 AI，最後停在中心的消費者。路線上的每張文章卡片都寫出推薦給你的原因；產業理由只引用同一產業的書中案例。

### 每一區怎麼讀：先看畫面，再讀字

作者審閱第一版時指出：名詞太抽象、手機上文字面板蓋住世界、標示線太短看不出指哪個物件、要靠「它如何運作」的文字才看得懂。第二版因此把每一區都改成「畫面先演，字幕只命名」：

- **一到就有事發生**：第一次打開一區，鏡頭落地的同時畫面就開始演，1–2 秒內出現一個有因有果的事件（例如判斷力的 AI 印表機一口氣吐出一大堆方案卡）。每一區分成 4–6 步，每一步的字幕在畫面的關鍵動作發生之後才出現，停留的時間依字數計算。演完一次之後，由讀者自己按「下一步」「再看一次」。
- **字寫在物件上**：標籤直接貼在它說的物件旁邊（引線在手機上最長 48 px），AI 做出來的字卡用青色細框，人寫的用紙條；畫面上同時最多 3 個標籤。
- **可以點的東西就是畫面裡的東西**：演完後，畫面裡可以點的物件會亮起小圈，點一下只有它保持實線，其他退成輪廓，說明欄寫出它在這一區的意思。部分區域有「換你試試」，例如判斷力讓讀者自己挑一張方案蓋章，AI 搜尋讓讀者決定 A 牌要怎麼被推薦，畫面依讀者的選擇重演最後幾步。
- **鏡頭只在換地方時飛**：同一區裡，鏡頭不會自己轉開；關掉說明、點物件都不會改變讀者調好的角度。讀者自己拖曳、縮放後，可以按「回到原視角」。
- **手機與桌機分開設計**：手機上說明是畫面底部約 18% 高的三行說明欄，往上拉才展開成半頁，而且蓋住畫面時畫面本身不移動；手機橫拿時說明在右側一欄；桌機是右側 400 px 的面板，可收成 56 px 的窄欄。

### 視覺與聲音

- 取自原刊封面的「鉛筆素描 ↔ ASCII 字元」二元：屬於人的東西以鉛筆排線畫在再生紙上，屬於機器的東西以字元排印。People Model 剛好介於兩者之間，種子盤由內而外從實心人形、半透明人形，過渡到字元方塊。
- 同一套規則也用在動畫裡：AI 做出來的東西（方案卡、量產的紙船、AI 的答案卡）一律用字元畫，人做的決定（蓋章、寫規格、替品牌說話）一律用鉛筆畫，讀者一眼就分得出哪些是 AI 做的。
- AI 搜尋是一顆大衛頭像：以原刊的大衛鉛筆素描重建成 3D 模型，用石墨排線畫出，後腦碎成青色的字元方塊——由人做成的模型，正在變成機器。
- 章節色（萊姆、粉、天藍）只在讀者注視的區域、正在演的那一步完整出現，其他地方是點狀的淡印，像 Riso 套色；讀者點了某個物件時，其他物件退成只剩輪廓。
- 組織文化在岸邊切開一個剖面：水面上是擱淺的船，水面下是看不見的冰山。
- 開場時世界從中心的人開始，一圈圈往外被畫出來。
- 聲音（`assets/js/audio.js`）預設靜音，不會自動播放：讀者按下頂欄的「聲音」後才建立音訊、載入音檔；上次開著聲音離開，下次也只會在按鈕上提示，仍要讀者自己按。底樂在世界上方循環，看組織文化水面下的冰山時加入低鳴，打開全文時自動壓低。

---

## 2. 策展：哪些是原刊，哪些是我們的詮釋

| 內容 | 來源 | 規則 |
|---|---|---|
| 篇名、副標、作者、職稱、頁碼 | 原刊（`data/index.json`） | 照原刊，不改字 |
| 全文、圖表、註解 | 原刊（`data/a/NN.json`；圖表由原刊 PDF 裁切） | 逐字收錄；註解編號依原刊的「註解N」校正；第 11 篇有 4 個內文標號依內容改正（見下方） |
| 引文 | 原刊 | 建置時逐字比對（見 §5 品質關卡） |
| 世界、四個環、九個分區、裝置、每區的一句話與運作步驟 | 我們的策展（`tools/world_curation/districts.json`） | 開場畫面註明這是一份策展詮釋 |
| 每篇的核心概念、篇與篇的關聯、角色／產業／焦點標籤、案例的產業 | 子代理逐篇細讀後整理，稽核時再逐項對照原文（`concepts_A.json`、`concepts_B.json`） | 每句引文附 block id 與頁碼 |

### 第 11 篇的註解標號

〈從金曲獎到甄嬛傳〉的 27 條註解與原刊註解頁一致，但內文有 6 個標號連到錯的出處。能從內容確定正確出處的 4 個已改正；閱讀器裡，滑鼠停在改過的標號上會顯示原刊印的號碼，資料中也保留原刊標號（`data/a/11.json` 的 `printed`）。改正的依據寫在 `tools/world_curation/notes_fix.json`，建置時逐一比對標號前的文字，對不上就無法建置。

| 頁 | 內文（標號前的文字） | 原刊標號 | 改為 | 依據 |
|---|---|---|---|---|
| 85 | 「這個邏輯也能從 2026 年的收視高點」 | 16 | 14 | 註解 14 是台視公布的第 37 屆金曲獎收視（3.37、收視高點）；註解 16 是甄嬛傳直播 |
| 85 | 「受眾輪廓更能說明這件事。從尼爾森資料」 | 15 | 13 | 註解 13 是 Nielsen Arianna 的第 35–37 屆金曲獎收視與受眾輪廓；註解 15 是甄嬛傳直播 |
| 86 | 「2025 年的 26 天直播累積超過 2,030 萬次觀看」 | 15 | 16 | 註解 16 記載 2025 年 26 天累積 2,030 萬觀看；原刊把 15、16 印反 |
| 86 | 「2026 年截至前十天累積觀看已達 1,026 萬」 | 16 | 15 | 註解 15 記載過年 10 天觀看累計破千萬；原刊把 15、16 印反 |

無法確定、照原刊保留的 2 個：
- p.85「……都可能共同影響最後的結果」的 16：講的是金曲獎收視，不是甄嬛傳，但註解 13、14 兩條金曲獎出處都說得通。
- p.86「2026 年包括遊戲與家電品牌等也加入合作」的 17：講的是甄嬛傳直播，應是註解 15 或 16 的八大電視報導，但兩篇都沒寫到品牌合作。

閱讀的設計是「先看懂，再挑著深讀」：每一區先用畫面演出概念；展開說明後依序是這一區在說什麼、動畫每一步的說明、書裡怎麼說、原文引文與文章卡片；按「深讀全文」進入閱讀器，側欄一直標示這篇在世界裡的位置，「下一篇」會沿著你的路線往下走。分區的動畫是我們的詮釋，畫面中的人數、比例與物件都是示意，說明欄會註明。

---

## 3. 架構

純靜態網站：沒有後端、沒有資料庫、沒有建置工具鏈、沒有第三方執行期依賴。

```
world/                    ← 部署目錄（整個資料夾上傳即可）
  index.html              入口（CSP 以 meta 宣告；只有一支外部 module script，沒有行內腳本與樣式）
  _headers                Cloudflare Pages／Netlify 用的 HTTP 標頭與快取規則（GitHub Pages 會略過，見 §6）
  .nojekyll               讓 GitHub Pages 原樣提供檔案、不經 Jekyll 處理
  assets/css/world.css    介面樣式
  assets/js/
    main.js               啟動；瀏覽器不支援 WebGL2 時自動改為純文字閱讀
    engine.js             渲染器、燈光、鏡頭（只在換地方時飛行；同一區內只調整構圖的留白，讀者動過鏡頭就不再自動移動）
    npr.js                非寫實渲染：場景先寫入「繪圖緩衝」（明暗、字元度、套色、覆蓋），再由一個合成 pass 畫成鉛筆排線、ASCII、Riso 套色與紙紋
    mat.js                材質工廠（以 three.js Lambert 光照＋陰影為底，改寫輸出；含「只剩輪廓」的淡化）
    terrain.js            圓盤世界、指紋紋理丘陵、ASCII 的 AI 之海、組織文化的船塢
    people.js / props.js  共用的人物（站、退後、舉手、蓋章、坐、走路等姿勢）與道具（卡片、對話泡泡、印章、手機、桌椅等）
    d-*.js                九個分區：場景、動畫的每一步（同一份介面約定：步驟、鏡頭、可點的物件、標籤與字卡的位置）
    life.js               地圖上的三股流動：品牌內容、網友評價、AI 的推薦
    world.js / kit.js     組裝世界、共用幾何與工具
    story.js              分區動畫的播放：第一次自動播、之後由讀者帶；跳到任一步都得到同一個畫面
    strip.js / overlay.js 說明欄（手機三行／半頁、桌機側欄）；畫面上的標籤、字卡、可點的小圈（有數量上限，彼此不重疊）
    pick.js               點擊判定：先找物件，再找分區，最後才是地面
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
4. `tools/world_curation/notes_fix.json`：共用資料裡註解順序或編號有誤的文章，依原刊「註解N」標出正確的順序與編號；另列出第 11 篇 4 個依內容改正的內文標號（§2）。
5. `python tools/build_world.py`（需要 fontTools，用來檢查字型涵蓋全站用字）：讀取 `site/data`，套用註解校正並執行 §5 列出的檢查；全部通過後才寫入 `world/data`（含 `world.json`），並只複製文章實際用到的圖。
6. `python -I tools/head_mesh.py <head.glb>`：把 Magnific 重建的大衛頭像（GLB 原檔不隨附）減面到約 3.6 萬個三角形、量化成 `data/head.bin`，並在後腦取樣碎裂點 `data/head_shards.json`（需要 numpy、trimesh、fast_simplification）。
7. `python -I tools/subset_fonts.py <字型來源資料夾>`：依全站實際用字子集化字型（需要 fontTools；改了文案就要重跑）。

### 本機預覽

```bash
# 完整專案：在專案根目錄執行（不快取；.js 固定送 text/javascript）
python tools/serve_world.py 5180

# 只有 world/ 資料夾時：在 world/ 的上一層執行（macOS／Linux）
python -m http.server 5180 --directory world
```

Windows 上的 Python 可能依登錄檔把 `.js` 送成 `text/plain`，ES module 會載不起來，請用 `serve_world.py`。網址加上 `?still`（例如 `http://127.0.0.1:5180/?still#/d/trust`）會跳過開場、讓每一區停在演完的畫面，供截圖比對用；加上 `?debug` 會在主控台開放 `window.__nd`（例如 `__nd.engine.tick(n)` 手動推進畫格）。兩者都不影響一般讀者。

專案範圍：`world/` 是部署目錄；`tools/` 是建置腳本與策展資料；`site/` 是另一個版本，本版只讀取它的 `site/data`。原刊 PDF 與 InDesign 原檔不在專案資料夾內，也不公開。

---

## 4. 使用的 AI 工具

| 工具 | 模型／功能 | 用在哪裡 | 人的決定 |
|---|---|---|---|
| Claude Code | Claude Opus 5.5 | 世界觀策展、資料萃取與驗證、全部程式（three.js 非寫實渲染管線、九區的場景與動畫、介面、個人化路線、閱讀器、建置與驗證腳本）、在瀏覽器中逐畫面截圖檢查與修正 | 世界觀方向、三個問題的選項、哪些內容可以公開 |
| Claude Code 子代理（多代理工作流） | 同上 | 平行細讀 22 篇全文，產出概念、標籤與關聯資料；研究 2025–2026 國際得獎互動網站（清單見 `tools/world_curation/references_2025_2026.md`）；六個面向的稽核與複核；分五組平行修正；第二版依作者審閱做介面診斷與設計系統，再分批平行重做九區，每一區由另一個代理獨立審查、再由沒參與的代理以第一次看的讀者身分檢查畫面（見 §5） | 作者指定稽核的重點；審閱第一版後決定「畫面先演、字幕只命名」的方向，並先看過兩區樣板的影片與截圖才放行其餘七區 |
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
7. **部署**：以 `gh-pages` 分支發布到 GitHub Pages（§6），在線上網址依 §7 逐項驗證，結果填回本文件。
8. **依作者審閱重新設計**：作者在手機上看過第一版後，指出名詞太抽象、文字面板蓋住世界、標示線看不出指哪個物件、按了關閉鏡頭會自己轉開、向日葵與燈塔要靠文字才看得懂。我們沒有逐條照改，而是把這些意見當成症狀，回頭找出共同的原因（畫面沒有自己說話、介面搶走畫面、鏡頭不聽讀者的），訂出一套設計系統：鏡頭規則、說明欄的三種尺寸、畫面上文字的數量上限、AI 與人的畫法，以及每一區的「步驟」介面約定。先做數位分身與判斷力兩區樣板，作者看過影片與截圖、確認「一點過去就有動畫產出很多內容」的方向後，其餘七區分兩批平行重做。
9. **自動驗證**：`tools/verify_world.mjs` 在四種螢幕（390×844、430×760、932×430、1440×900）上逐區、逐步截圖並量測（見下方品質關卡），輸出逐區的對照表與報告；任何一項失敗就不提交。

### 品質關卡

### 品質關卡

`tools/build_world.py` 任一項檢查不通過就停止建置：

- 世界用到的每句引文（9 個分區引文、22 篇核心引文）都必須逐字出現在該篇原文中；
- 策展文字（文章關聯理由、概念說明、分區的一句話與步驟）裡 8 個字以上的「」引號內容，必須逐字出現在它談到的文章中；
- 每篇文章的每個註解標號都必須對應到唯一一條註解，註解編號不得重複；
- 案例產業、文章產業與三題的標籤，只能使用三題選項裡的 id。
- 畫面上的文字有字數上限，不得出現原書的英文框架詞（例如 People、Model、Agentic 等，「Agent 權限」的區名除外），全站用字都要在子集化後的字型裡。

`tools/verify_world.mjs` 在真的瀏覽器（無頭 Chrome、使用顯示卡）裡逐區、逐步檢查，任一項失敗就不提交：

- 主角在手機上至少 60 px 高、完整在畫面內；每個可點的物件都看得到、至少 40 px；
- 手機上的字幕一行放得下，畫面上的字至少 12 px，每個按鈕與可點範圍至少 44 × 44 px；
- 標籤、字卡、小圈彼此不重疊，也不被說明欄蓋住；
- 點物件、關掉說明、切換步驟時鏡頭不會自己移動；
- 每一區的動畫可以跳到任一步，得到的畫面和從頭播到那裡完全相同；
- 減少動態模式下每一步都直接到位；開場頁的第一次繪製時間。

### 放棄的做法

- 第一版的分區用了自創的名字（信任之地、答案引擎、衡斷之塔、交付工坊、文化暗流、授權之橋、共同記憶、心動與遲疑），讀者看不出在講什麼；第二版改成一般讀者熟悉的說法（真實與信任、AI 搜尋、判斷力等），舊名字只留在資料的內部名稱裡。
- 第一版每一區用「它如何運作」的文字步驟解釋裝置；第二版改成畫面自己演，文字只在說明欄裡供想深入的人讀。
- 第一版的地圖上有四處遊走、沒有角色的小人，與左下角「與人的距離」量尺；讀者看不出意義，都已移除，改成有名字的三股流動。
- 第一版的組織文化位在世界底下，要讓鏡頭潛到地盤下才看得到；第二版改成岸邊的剖面，從地圖上就看得到。

- 答案引擎原本是一顆依手繪側面剪影擠出的方塊頭（舊的 `voxel_head.py` → `face_voxels.json`），後來改成由原刊大衛素描重建的 3D 頭像；舊腳本與資料已刪除。
- 原刊的封面、大衛、臉、指紋心、向日葵五張插圖曾複製進部署目錄備用，最後都沒有直接使用：向日葵與指紋心改用程式建模，大衛改為 3D 重建。這五個檔從未被網站載入，已從部署目錄移除（原檔仍在 `site/`）。

---

## 6. 部署

### 目前的部署：GitHub Pages

作品網址：<https://dexterlee-ai.github.io/new-distance/>（原始碼：<https://github.com/dexterlee-ai/new-distance>）

- **為什麼選它**：原始碼本來就公開在 GitHub，同一個 repository 就能提供免登入的 HTTPS 網址，不需要另外的帳號、伺服器或建置設定。2026-10-18 實測：HTTP 會以 301 轉到 HTTPS；回應帶 `strict-transport-security` 與 `etag`（帶 `If-None-Match` 重新請求會回 304）；文字檔以 gzip 傳送；每種檔案的 `content-type` 都正確（`.js` 為 `application/javascript`，ES module 才載得起來；`.woff2` 為 `font/woff2`；`.bin` 為 `application/octet-stream`）。
- **怎麼部署**：`gh-pages` 分支只放 `world/` 的內容。在專案根目錄提交後執行 `sh tools/deploy_pages.sh`：它把 `HEAD` 裡的 `world/` 做成一個部署 commit（訊息註明來源 commit），推上 `gh-pages`，GitHub Pages 約一分鐘內上線。`world/.nojekyll` 讓 Pages 原樣提供檔案。
- **限制**：GitHub Pages 不支援自訂 HTTP 標頭，會略過 `_headers`。`index.html` 的 meta CSP 仍然有效，但下列保護在 GitHub Pages 上沒有：
  - `frame-ancestors`（meta CSP 不能設定）與 `X-Frame-Options`：其他網站可以用 iframe 嵌入本作品。本作品沒有登入、表單，也沒有任何會改變讀者資料的操作，被嵌入時能誘導的動作有限。
  - `X-Content-Type-Options: nosniff`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`。網站本身不使用相機、麥克風、定位、付款等需要權限的功能（§7 有驗證方法）。
  - 快取：所有檔案一律 `cache-control: max-age=600`。重新部署後的 10 分鐘內，已經開過網站的讀者可能拿到新舊混用的檔案。評審期間不要重新部署；必須部署時，部署後等 10 分鐘再請人測試。
  - 回應帶 `access-control-allow-origin: *`：其他網站可以讀取這些檔案。內容本來就公開，不含個資或金鑰。
- **搜尋引擎**：`index.html` 帶 `<meta name="robots" content="noindex">`，作品不會出現在搜尋結果；用網址開啟不受影響。
- `README.md`、`docs/` 與 `_headers` 也會一起公開（內容就是這份說明，不含個資）。

### 想要完整標頭時：Cloudflare Pages 或 Netlify

這兩個託管都會讀 `world/_headers`，能補上 GitHub Pages 缺少的保護（`frame-ancestors`、`X-Frame-Options`、`nosniff`、`Permissions-Policy`、`Cross-Origin-Opener-Policy`）與下方的快取規則，並以整批切換的方式上線，部署過程中不會出現新舊檔案混用。

- **Cloudflare Pages**：Workers & Pages → 建立 Pages 專案 → 連接這個 repository 的 `main` 分支，建置指令留空，輸出目錄填 `world`；或直接上傳 `world/` 資料夾。
- **Netlify**：新增網站 → 連接這個 repository，建置指令留空，發布目錄填 `world`；或手動部署，把 `world/` 資料夾拖進去。
- 換託管後，更新最上方繳交清單的網址，再依 §7 的標頭驗證重新檢查。

### 快取規則（`_headers`，只在 Cloudflare Pages／Netlify 生效）

| 路徑 | Cache-Control | 原因 |
|---|---|---|
| `/`、`/index.html`、`/assets/js/*`、`/assets/vendor/*`、`/assets/css/*`、`/data/*` | `no-cache` | 檔名沒有版本號；每次使用前都用 ETag 確認（沒變就回 304），重新部署後不會新舊模組與資料混用 |
| `/assets/audio/*` | `public, max-age=2592000`（30 天） | 生成一次後不再修改；若要替換音檔，請改檔名，並同步修改 `audio.js` 裡的檔名 |
| `/assets/fonts/*`、`/assets/img/*` | `public, max-age=86400, stale-while-revalidate=604800` | 字型會隨文案重新子集化、圖表可能重新裁切：1 天內直接用快取，之後一週內先顯示快取、背景更新 |

`/*` 只設資安標頭；`Cache-Control` 對每個路徑只由一條規則設定，因為 Cloudflare Pages 遇到同一個標頭被多條規則命中時，會用逗號把值串在一起。

### 被嵌入 iframe 的情況

- **GitHub Pages（目前）**：沒有 `frame-ancestors`，任何網站都能嵌入；評審頁若用 iframe 嵌入本作品，可以正常顯示。
- **Cloudflare Pages／Netlify**：`_headers` 以 `frame-ancestors 'none'` 與 `X-Frame-Options: DENY` 禁止任何網站嵌入。若主辦單位的評審頁會用 iframe 嵌入作品，把 `frame-ancestors 'none'` 改成 `frame-ancestors 'self' https://<主辦網域>`，並刪除 `X-Frame-Options: DENY`。

---

## 7. 資安自評

| 項目 | 主張 | 怎麼驗證 | 結果 |
|---|---|---|---|
| 內容安全政策 | `default-src 'self'`；腳本、樣式、字型、圖片與連線都只允許同源（圖片另允許 `data:`、`blob:`）；`object-src 'none'`、`form-action 'none'`、`base-uri 'self'`；在 Cloudflare Pages／Netlify 上，`_headers` 會再加上 `frame-ancestors 'none'`（GitHub Pages 只有 meta CSP，見 §6） | 開發者工具 Console 沒有 CSP 錯誤；在 Console 執行 `document.querySelector('meta[http-equiv]').content`；在 Cloudflare Pages／Netlify 上用下方 `curl -sI` 看 `content-security-policy` | 稽核時（2026-10-18）走遍 16 條路由，`securitypolicyviolation` 事件 0 次 |
| 沒有行內腳本與事件屬性 | HTML 只有一支 `<script type="module" src>`；程式產生的 HTML 不含 `on*=` 屬性與 `style=""`；樣式一律用 class 或 CSSOM | 下方掃描指令（行內事件、eval） | 0 筆 |
| 第三方請求 | 沒有追蹤碼、分析、廣告或 CDN；three.js、字型、音檔都自帶 | 開發者工具 Network 篩選「非本網域」；或在 Console 執行 `[...new Set(performance.getEntriesByType('resource').map(e => new URL(e.name).origin))]`，只會出現本站網域 | 程式碼中沒有任何外部載入網址；稽核時首頁載入 32 個請求全部同源 |
| 個資 | 不收集任何個人資料；沒有 cookie、帳號、表單或後端。三題答案只存在讀者自己的瀏覽器（localStorage），分享路線時只帶三個選項 id | Console 執行 `Object.keys(localStorage)`，只會看到 `nd.` 開頭的介面偏好：`nd.profile`（三題答案）、`nd.read`（讀過哪幾篇）、`nd.motion`、`nd.sound`（動態與聲音開關）、`nd.mapHint`（地圖提示看過沒）；下方掃描指令（email） | 程式中只有 `ui.js` 一處讀寫 localStorage；email 0 筆 |
| 原刊中的個人信箱 | 原刊 p.2–3、p.196–197 的聯絡信箱不收錄 | 下方掃描指令（email） | 0 筆 |
| 金鑰與密碼 | 原始碼與資料中沒有任何金鑰、權杖、密碼或客戶資料；網站不呼叫任何需要金鑰的服務 | 下方掃描指令（金鑰） | 0 筆 |
| 動態內容 | 插入畫面的資料字串一律先經 `esc()` 跳脫；不使用 `eval`／`new Function`；網址中的路線參數只接受三題選項裡存在的 id，其餘一律當成未作答 | 閱讀 `reader.js` 的 `esc()`、`route.js` 的 `cleanProfile()`；試開 `#/route/constructor.x.y` 不會出錯 | — |
| 外部連結 | 原刊註解的來源連結一律 `target="_blank" rel="noopener noreferrer"`，全站 `Referrer-Policy: no-referrer` | 在任一篇全文的註解上檢查元素 | 稽核時 77 條註解外連全部是 https |
| 權限 | 不使用相機、麥克風、定位、付款、USB；`_headers` 的 `Permissions-Policy` 全部關閉 | 下方掃描指令（權限）；在 Cloudflare Pages／Netlify 上用 `curl -sI` 看 `permissions-policy` | 程式中 0 筆；GitHub Pages 不送這個標頭（§6） |
| 聲音 | 不自動播放；讀者按下「聲音」前不建立音訊、不下載音檔 | 閱讀 `audio.js` 的 `enable()` 與 `ui.js` 的聲音開關；開發者工具 Network 在按下「聲音」前看不到 `.mp3` | — |
| HTTP 標頭與快取 | 見 §6 | 下方 `curl -sI` 指令 | 2026-10-18 GitHub Pages 實測輸出貼在下方 |
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
# 需要權限的瀏覽器功能（相機、麥克風、定位、付款、USB 等）：應為 0 筆
grep -rnE "getUserMedia|geolocation|PaymentRequest|navigator\.(usb|serial|hid|bluetooth|mediaDevices)" assets/js
# 讀寫瀏覽器儲存的位置：只有 ui.js
grep -rn "localStorage\|sessionStorage\|indexedDB\|document.cookie" assets/js
```

2026-10-18 在本機執行以上指令：email、金鑰、eval、行內事件、外部載入與需要權限的功能都是 0 筆，瀏覽器儲存只出現在 `assets/js/ui.js`。

### 部署後的標頭驗證

```bash
SITE=https://dexterlee-ai.github.io/new-distance
curl -sI "$SITE/"                                  # 200、content-type: text/html、strict-transport-security、etag、cache-control: max-age=600
curl -sI "$SITE/assets/js/main.js"                 # content-type: application/javascript（ES module 才載得起來）
curl -sI "$SITE/data/head.bin"                     # content-type: application/octet-stream
curl -sI "$SITE/assets/fonts/NotoSansTC-sub.woff2" # content-type: font/woff2
# 用上一個回應的 etag 重新請求，應回 304
curl -sI -H 'If-None-Match: "<etag>"' "$SITE/assets/js/main.js"
curl -sI "http://dexterlee-ai.github.io/new-distance/"   # 301，轉到 https
```

換到 Cloudflare Pages／Netlify 後，`/` 的回應還應出現 `content-security-policy`（含 `frame-ancestors 'none'`）、`x-content-type-options: nosniff`、`referrer-policy: no-referrer`、`permissions-policy`、`cross-origin-opener-policy` 與 `x-frame-options: DENY`，各路徑的 `cache-control` 依 §6 的表格。

2026-10-18 在 GitHub Pages 的實測輸出（節錄）：

```
/                                   HTTP/2 200  text/html; charset=utf-8  strict-transport-security: max-age=31556952  etag  cache-control: max-age=600
/assets/js/main.js                  HTTP/2 200  application/javascript; charset=utf-8
/data/world.json                    HTTP/2 200  application/json; charset=utf-8
/data/head.bin                      HTTP/2 200  application/octet-stream
/assets/audio/world.mp3             HTTP/2 200  audio/mp3
/assets/fonts/NotoSansTC-sub.woff2  HTTP/2 200  font/woff2
/assets/img/art/paper.webp          HTTP/2 200  image/webp
main.js + If-None-Match             HTTP/2 304
http://…/new-distance/              HTTP/1.1 301 Moved Permanently（轉到 https）
/assets/js/ui.js                    content-encoding: gzip
```

---

## 8. 無障礙

- 每一區、每一篇都有完整文字版本（這一區在說什麼、動畫每一步的說明、書裡怎麼說、引文、全文）；動畫的字幕放在 `aria-live` 區域，螢幕閱讀器會在每一步讀出；步驟按鈕標明「第 i 步」。
- 全站可用鍵盤操作：Tab 切換地標與按鈕、Enter 進入、Esc 一層層返回（關閉全文、結束「換你試試」、取消點選的物件、收起說明、離開分區）；在分區裡，方向鍵前後切換動畫的步驟，空白鍵暫停或繼續，R 再看一次，`[`、`]` 換到上一區、下一區，M 回到地圖。
- 頂欄的「暫停動畫」隨時可以停住世界的動態（拖曳與鏡頭移動仍可使用），選擇會被記住。
- 尊重 `prefers-reduced-motion`：鏡頭改為直接切換，世界的動態預設停止，分區的每一步直接顯示結果。
- 瀏覽器不支援 WebGL2 時，自動改為純文字閱讀（地圖、目錄與全文都能用）。

---

## 9. 授權與出處

- 文章內容、圖表與原刊美術（紙紋、大衛素描）：dentsu Taiwan《決策智慧 2026｜Agentic 時代：重塑品牌與人的真實距離》。
- three.js r185 與 BufferGeometryUtils：MIT License（`assets/vendor/three.LICENSE.txt`）。
- 字型：Noto Sans TC（Adobe／Google）、Montserrat（The Montserrat Project Authors）、IBM Plex Mono（IBM Corp.），SIL Open Font License 1.1（`assets/fonts/OFL.txt`），子集化後在本站自架。
- 配樂、低鳴與音效：以 Magnific 生成（Google Lyria 3 Pro、ElevenLabs Sound Effects）。
- 大衛頭像的 3D 網格：以 Magnific hi3d-portrait 由原刊大衛素描重建，再以 `tools/head_mesh.py` 處理。
