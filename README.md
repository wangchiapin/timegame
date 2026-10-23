# 練習時間 · ¿Qué hora es?

> 給西語學生練習中文的時間、日期、星期與行程說法。看時鐘、看月曆、聽句子，選出或點出正確答案。

- **網址：** https://wangchiapin.github.io/timegame/
- **形式：** 單一檔案 `index.html`（由 `src/` 底下的檔案和 game-kit 的共用零件合成，見下方「修改程式」）
- **Firebase：** 沒有接（沒有排行榜、遊玩紀錄、名字欄）；也不記錄最高分
- **狀態：** 第一版（2026-10-22）

## 玩法
四個單元＋綜合挑戰。點一下單元就直接開始，題目從該單元所有題型隨機混出，不用再選題型：

| 單元 | 名稱 | 題型 |
|---|---|---|
| 一 | 幾點幾分 | 看時鐘選說法、聽時間撥指針、聽時間選答案 |
| 二 | 日期和星期 | 看日期選中文（月曆圈出日期）、星期幾（題目直接問「X月X日是星期幾」，月曆不圈選）、聽日期（不提供「看文字」，因為選項本身就是文字）、昨天／今天／明天（到大前天、大後天）、上星期／這星期／下星期（到上上、下下） |
| 三 | 一日行程 | 行程配對時間、聽行程選答案、早上／中午／下午／晚上（看數字選中文，或看中文選數字，各一半） |
| 四 | 月曆年曆 | 讀題目裡的行程再點日期（月曆是空白的）、這一天要做什麼、幾點要做、年曆（上個月、下個月、去年、明年…）、聽幾月幾號點日期、聽昨天明天後天點日期、聽上星期下星期點日期（共 7 種題型，凡是在月曆上點日期的都在這裡） |
| — | 綜合挑戰 | 四個單元全部混合（18 種題型平均抽） |

開始畫面副標：「一起練習時間的中文！」。作答畫面左上角的按鈕直接寫「回主選單」（不用箭頭）。設定裡的注音選項分兩行：Zhuyin／ㄅㄆㄇ，不再從中間斷行。

每個單元 25 題，綜合挑戰 50 題；分數一律 0–100（答對題數 ÷ 總題數 × 100），不記錄最高分。

相對時間詞的難度（單元二的昨天明天、上下星期，單元四的聽力點日期和年曆）：

| 題型 | 簡單 | 普通 | 困難 |
|---|---|---|---|
| 昨天明天（含聽力點日期） | 昨天、明天 | 加前天、後天 | 加大前天、大後天 |
| 星期推算（含聽力點日期） | 這星期、下星期 | 加上星期 | 加上上星期、下下星期 |
| 年曆 | 上個月、下個月 | 加去年、明年 | 加前年、後年，並可能跨年 |

月曆行程共 30 種（含「上中文課」，原本的「上課」已換掉）：牙醫、開會、聚餐、面試、考試、看電影、約會、爬山、剪髮、生日派對、演唱會、搬家、看醫生、逛街、運動、上中文課、游泳、打籃球、唱歌、煮飯、打掃、洗衣服、去銀行、寄包裹、看展覽、逛夜市、婚禮、出差、旅行、去圖書館。長得太像的（運動／游泳／打籃球；唱歌／演唱會）同一回只放一個。銀行的「行」讀 háng，旅行的「行」讀 xíng。

看月曆選時間（calWhatTime）：有行程的每一天排 2–3 個行程（時間都不同、時間用阿拉伯數字列成清單）；月曆格子只寫被問的那個行程，旁邊加「＋」表示還有其他行程，點開才看得到全部；被問的行程不一定排第一個；錯誤選項會包含同一天其他行程的時間。「醫生」已改名「看醫生」。

讀行程點日期：題目裡一件事一行（行末「，」、最後「。」），行程和問題之間有一條細線；每行不換行，字級會隨手機寬度縮放。

相對日期詞：前天、昨天、今天、明天、後天，另加「大前天」（三天前）、「大後天」（三天後）。簡單只有昨天、明天；普通加前天、後天；困難才加大前天、大後天。

詞間空隔：日期和時間的詞（年月日號點分秒、今天明天昨天、上午下午、星期一…）後面在畫面上多空一小格，方便學生斷詞；只影響顯示，不改文字，語音和答案比對不受影響。五點半、分鐘這類連在一起的詞不拆。

難度：簡單／中等／困難／混合。同一回不會出現題幹一樣的題目。答完後，解答（對錯、原因、正確答案、下一題）顯示在螢幕底部的固定解答條，上面的題目和時鐘不會被推動。版面壓緊：手機（約 390×650）上，看時鐘、聽力、星期幾、時段等題型的題目和選項可以不捲動就同時看到；月曆類題型（月曆本身較高）在較矮的螢幕上仍需捲動。一到九分的時間，每題隨機用「八點零五分」或「八點五分」其中一種說法，同一題不混用。答錯會用中、西、英三種語言說明哪裡不對（聽行程題沒有「看文字」，行程卡的時間排在中文前面（語序同中文，字體大小和格式跟中文一樣）；聽時間題只有時鐘圖版本保留「看文字」；聽力題選錯時不再顯示「聽起來很像」那句，畫面上已有「你選的是…」和正確答案）。

## 設定
所有設定（字形、介面語言、拼音／注音、語速、難度）都收在右上角的齒輪 ⚙，開始畫面和遊戲中都能打開；遊戲中改難度從下一回才生效。介面語言標籤直接寫 Chino + Español／Chino + English／Solo chino。

和其他遊戲共用 localStorage `hanziGames.settings`：繁／簡體、介面語言（西／英／只有中文）、拼音／注音、語速（慢 0.45／正常 0.65／快 0.85）。拼音一律台灣讀音；語音只選 zh-TW。

## 外觀：鐘錶機械感 ＋ 日出日落
- 整體像機械鐘錶：粗邊框按鈕、深色翻牌式選項、紙質月曆、LCD 風格數字。
- 每個題目畫面最上方有一條 30px 高的 24 小時色帶（日出到日落），小標記指出「題目的時間」。
- 整頁配色隨時間變化：早上（5–12 點）、下午（12–19 點）、晚上（其他）。色彩 class 加在 `<html>`（`tod-morning` / `tod-afternoon` / `tod-night`）。
- 題目有自己的時間（聽時間、早上／下午選擇、月曆「幾點」題）就用題目的時間；沒有時間的題目（看日期、星期幾等）用玩家裝置目前的時間。開始、結果畫面也用裝置時間。
- 已用腳本檢查所有題型 × 拼音／注音／兩者 × 三種時段的文字對比度（WCAG 4.5 以上）。

## 年曆題
- 年份題問「去年／明年／前年／後年是哪一年？」（簡單只有上下個月；普通加去年、明年；困難才加前年、後年）；年曆中間不再顯示「今天」方框（月曆上已有今天的圓點）。

## 星期題與聽力
- 星期題（看月曆、聽力點日期）加入「上上星期／下下星期」，只在困難出現；普通是上星期、這星期、下星期；簡單只有這星期、下星期。算出來跨月的日子會重抽。
- 所有聽力題（聽時間、聽日期、聽行程、聽力點日期）答完後，回饋框會顯示剛才念的那句中文（含拼音／注音）；答題前不顯示。

## 標題與設定
- 開始畫面的標題是深色金屬銘牌（兩側各一顆螺絲），齒輪是圓形旋鈕，「難度 Nivel」小標籤是深色顯示牌。
- 設定面板：頂端深色標題條；每一排選項是一排深色開關，選中的那格是亮起來的琥珀色；排與排之間用虛線隔開。早上、下午、晚上三種配色都有對應（晚上是深藍配金色）。
- 已檢查設定面板與開始畫面在三種時段、三種拼音／注音設定下的文字對比度。

## 答案欄位
- 解答條也是機械面板：頂端深色標題條（答對綠、答錯紅，中西文同一行），下面是紙色卡片（跟月曆同款）。
- 正確答案字最大；「你選的是…」「為什麼錯」是小字；聽力題的那句中文獨立一行（上方虛線分隔）。
- 配對題（排行程）答錯時，解答改成一行一句：左邊深色時間牌、右邊句子，照時間排序。
- 已檢查三種時段 × 拼音／注音／兩者並列，答對、答錯狀態的文字對比度都在 4.5 以上（月曆週末紅色與答對標題條的顏色因此略為調深）。

## 其他
- 沒有 Firebase：不需要 Firestore 規則，也不會出現在分享區的排行榜總覽與遊玩紀錄後台。
- 靜音鈕用 game-kit 的 `mute.js`；語音提示用 `voicehint.js`。
- 版權說明用 game-kit 的 `copyright.js`（放在頁面最後面，不釘在畫面上）。

## 說明文字總表

改任何一句說明，這張表都要一起更新。程式裡每種題型的提示寫在 `src/02-gen.js` 的 `instr`，畫面按鈕和標題的字在 `src/03-ui.js` 最上面的 `STR`。

寫法規則：聽力題一律「請聽，…」開頭；選答案一律「選出…」；能不重複的說明就不寫（例如月曆題不再每題都寫「看月曆」）；括號只放必要的提醒。

### 各題型上方的提示

| 題型 | 中文 | 西班牙文 | 英文 |
|---|---|---|---|
| 看時鐘選說法 | 看時鐘，選出說法。 | Mira el reloj y elige cómo se dice. | Look at the clock and choose. |
| 聽時間撥指針 | 請聽，撥出正確的時間。 | Escucha y pon la hora. | Listen and set the time. |
| 聽時間選答案 | 請聽，選出時間。 | Escucha y elige la hora. | Listen and choose the time. |
| 聽時間選答案 | 請聽，選出時鐘。 | Escucha y elige el reloj. | Listen and choose the clock. |
| 看日期選中文 | 看圈起來的日子，選出說法。 | Mira el día marcado y elige cómo se dice. | Look at the circled day and choose. |
| 星期幾 | 找到那一天，選出星期幾。 | Busca el día y elige el día de la semana. | Find the day and choose the weekday. |
| 聽日期選答案 | 請聽，選出日期。 | Escucha y elige la fecha. | Listen and choose the date. |
| 行程配對時間 | 把每句話放到正確的時間。 | Pon cada frase en su hora. | Put each sentence at its time. |
| 聽行程選答案 | 請聽，選出行程和時間。 | Escucha y elige la actividad y la hora. | Listen and choose the plan and time. |
| 早上下午 | 看中文，選出數字時間。 | Lee la hora en chino y elige la hora en números. | Read the Chinese and choose the digital time. |
| 早上下午 | 看數字，選出中文說法。 | Mira la hora en números y elige cómo se dice. | Look at the digits and choose the Chinese. |
| 哪一天要做什麼（點日期） | 讀行程，點出正確的日子，再按「確定」。 | Lee los planes, toca el día y pulsa «Confirmar». | Read the plans, tap the day, then press “Confirm”. |
| 這一天要做什麼 | 選出那一天要做什麼。 | Elige qué hay ese día. | Choose what is planned that day. |
| 幾點要做 | 點日子看行程（＋是還有其他行程），選出時間。 | Toca un día para ver los planes (＋ = más planes) y elige la hora. | Tap a day to see its plans (＋ = more) and choose the time. |
| 昨天今天明天 | 看「今天」那一格，選出星期幾。 | Mira el día de «hoy» y elige el día de la semana. | Look at “today” and choose the weekday. |
| 昨天今天明天 | 看「今天」那一格，選出日期。 | Mira el día de «hoy» y elige la fecha. | Look at “today” and choose the date. |
| 上星期下星期 | 看「今天」那一格，選出日期。 | Mira el día de «hoy» y elige la fecha. | Look at “today” and choose the date. |
| 年曆 | 看年曆（紅框是這個月），選出答案。 | Mira el año (el marco rojo es este mes) y elige. | Look at the year (red frame = this month) and choose. |
| 聽幾月幾號點日期 | 請聽，點出那一天，再按「確定」。 | Escucha, toca el día y pulsa «Confirmar». | Listen, tap the day, then press “Confirm”. |
| 聽昨天明天點日期 | 請聽，點出那一天，再按「確定」。 | Escucha, toca el día y pulsa «Confirmar». | Listen, tap the day, then press “Confirm”. |
| 聽上星期下星期點日期 | 請聽，點出那一天，再按「確定」。 | Escucha, toca el día y pulsa «Confirmar». | Listen, tap the day, then press “Confirm”. |

### 開始畫面、設定、作答與結果

| 位置 | 中文 | 西班牙文 | 英文 |
|---|---|---|---|
| 標題 | 練習時間 | Practica la hora y la fecha | Practice time and dates |
| 副標 | 一起練習時間的中文！ | ¡Practiquemos juntos la hora en chino! | Let's practice time in Chinese together! |
| 綜合挑戰 | 綜合挑戰／50 題，四個單元混合 | Desafío mixto／50 preguntas de las cuatro unidades | Mixed challenge／50 questions from all four units |
| 設定各列 | 字形、介面語言、拼音／注音、語速、難度 | Escritura、Idioma、Pinyin / Zhuyin、Voz、Nivel | Script、Language、Pinyin / Zhuyin、Voice、Level |
| 難度提示 | 難度從下一回開始生效。 | El nivel cambia en la próxima ronda. | The level applies from the next round. |
| 作答畫面按鈕 | 回主選單、🔊 聽、看文字、確定、下一題、看結果 | Volver al inicio、Escuchar、Ver el texto、Confirmar、Siguiente、Ver resultado | Back to start、Listen、Show text、Confirm、Next、See result |
| 答案欄 | ✔ 答對了！／✘ 答錯了；正確答案；你選的是 | ¡Correcto!／Incorrecto；Respuesta correcta；Elegiste | Correct!／Not quite；Correct answer；You chose |
| 月曆提示 | 點一天，看那天的行程；這一天沒有行程 | Toca un día para ver el plan；Ese día no hay planes | Tap a day to see its plan；Nothing planned that day |
| 配對提示 | 先點一句話，再點一個時間 | Toca una frase y luego una hora | Tap a sentence, then a time |
| 結果畫面 | 再玩一次、回主選單；分數 0–100 | Jugar otra vez、Volver al inicio | Play again、Back to start |

## 還沒做的事
- 分享區還沒有這個遊戲的卡片。
- 還沒有加入 Excel 彙整表（`game-kit/遊戲設定彙整表.xlsx`）。

## 修改程式
```
src/01-core.js   共用設定、字典、拼音／注音、數字與日期的中文說法
src/02-gen.js    各單元的出題
src/03-ui.js     畫面、計分
src/style.css    樣式
build.js         合成單一 index.html（需要 game-kit/parts/ 的零件；路徑可用環境變數 KIT 指定）
```
改完 `src/` 要執行 `node build.js` 重新產生 `index.html`。

## 測試
`python3 tests/test_time.py [截圖資料夾]`（Playwright；語音用替身，網路全部封鎖）：獨立重算答案檢查出題、字典涵蓋、整個流程點擊、畫面截圖。
