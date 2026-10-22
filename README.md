# 練習時間 · ¿Qué hora es?

> 給西語學生練習中文的時間、日期、星期與行程說法。看時鐘、看月曆、聽句子，選出或點出正確答案。

- **網址：** https://wangchiapin.github.io/timegame/
- **形式：** 單一檔案 `index.html`（由 `src/` 底下的檔案和 game-kit 的共用零件合成，見下方「修改程式」）
- **Firebase 專案：** memorma-24dab（排行榜集合 `timeBoard`，前 10 名；遊玩紀錄 `plays`、`visits`），匿名登入
- **狀態：** 第一版（2026-10-22）

## 玩法
六個單元，可以全部混合，也可以只練其中一個單元或題型：

1. 看時鐘：看時鐘選說法、聽時間撥指針…
2. 日期和星期：看日期選中文、星期幾、聽日期
3. 一天的行程：行程配對時間、聽行程選答案
4. 月曆行事曆：點月曆找日子、這一天要做什麼
5. 星期和日期推算：昨天／今天／明天、上星期／這星期／下星期
6. 聽力點日期：聽幾月幾號、昨天明天後天，在月曆上點出來

難度：簡單／中等／困難／混合。答錯會用中、西、英三種語言說明哪裡不對。

## 設定
和其他遊戲共用 localStorage `hanziGames.settings`：繁／簡體、介面語言（西／英／只有中文）、拼音／注音、語速（慢 0.45／正常 0.65／快 0.85）。拼音一律台灣讀音；語音只選 zh-TW。

## 排行榜與遊玩紀錄
- 排行榜集合 `timeBoard`，依分數取前 10 名。
- 遊玩紀錄用 game-kit 的 `plays.js`（遊戲代號 `time`），「開始」記關卡與暱稱，「玩完」記分數、秒數、名字。在分享區後台「📈 遊玩紀錄」查看。
- 靜音鈕用 game-kit 的 `mute.js`。
- 版權說明用 game-kit 的 `copyright.js`（放在頁面最後面，不釘在畫面上）。

## 還沒做的事
- `timeBoard` 的 Firestore 規則要貼進 memorma-24dab（可用 game-kit 的 `rules/leaderboard-template.txt`），並登記到分享區後台的排行榜總覽。
- 分享區還沒有這個遊戲的卡片與後台開關，後台遊玩紀錄的名稱對照表也還沒有 `time`。
- 還沒有加入 Excel 彙整表（`game-kit/遊戲設定彙整表.xlsx`）。

## 修改程式
```
src/01-core.js   共用設定、字典、拼音／注音、數字與日期的中文說法
src/02-gen.js    各單元的出題
src/03-ui.js     畫面、計分、排行榜
src/style.css    樣式
build.js         合成單一 index.html（需要 game-kit/parts/ 的零件；路徑可用環境變數 KIT 指定）
```
改完 `src/` 要執行 `node build.js` 重新產生 `index.html`。

## 測試
`python3 tests/test_time.py [截圖資料夾]`（Playwright；Firebase 與語音都用替身，不碰真的資料庫）：獨立重算答案檢查出題、字典涵蓋、整個流程點擊、畫面截圖。
