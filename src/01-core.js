'use strict';
/* =====================================================================
   練習時間 ¿Qué hora es?  —  核心：工具、共用設定、字典、拼音／注音、數字與日期的中文說法
   ===================================================================== */

/* ---------- 小工具 ---------- */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const randInt = (a, b) => a + rnd(b - a + 1);
function shuffle(a){ a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = rnd(i + 1); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function sample(a, n){ return shuffle(a).slice(0, n); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const pad2 = n => (n < 10 ? '0' : '') + n;

/* ============ 共用設定（和其他遊戲同一份 hanziGames.settings，來自 game-kit/parts/settings.js） ============ */
const SETTINGS_KEY = 'hanziGames.settings';
const SET_OPTS = { script:['trad','simp'], lang:['es','en','zh'], phon:['pinyin','zhuyin','both','off'], rate:['slow','normal','fast'] };
const RATE_VALUE = { slow:0.45, normal:0.65, fast:0.85 };
function writeSettings(o){
  try{
    let cur = {};
    try{ cur = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; }catch(e){}
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(Object.assign(cur, { v:1, script:o.script, lang:o.lang, phon:o.phon, rate:o.rate })));
  }catch(e){}
}
function readSettings(){
  const out = { v:1, script:'trad', lang:'es', phon:'pinyin', rate:'normal' };
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); }catch(e){}
  if (saved && typeof saved === 'object'){
    Object.keys(SET_OPTS).forEach(k => { if (SET_OPTS[k].includes(saved[k])) out[k] = saved[k]; });
  } else writeSettings(out);
  return out;
}
const Settings = readSettings();

/* ---------- 字典：字 拼音（台灣讀音）簡體 ---------- */
const DICT_SRC = `
文 wén
大 dà
行 xíng
游 yóu
泳 yǒng
打 dǎ
籃 lán 篮
球 qiú
歌 gē
煮 zhǔ
掃 sǎo 扫
衣 yī
服 fú
銀 yín 银
寄 jì
包 bāo
裹 guǒ
展 zhǎn
覽 lǎn 览
夜 yè
市 shì
婚 hūn
禮 lǐ 礼
參 cān 参
加 jiā
出 chū
差 chāi
旅 lǚ
圖 tú 图
書 shū 书
館 guǎn 馆
零 líng
一 yī
二 èr
兩 liǎng 两
三 sān
四 sì
五 wǔ
六 liù
七 qī
八 bā
九 jiǔ
十 shí
點 diǎn 点
分 fēn
鐘 zhōng 钟
秒 miǎo
半 bàn
整 zhěng
小 xiǎo
時 shí 时
個 ge 个
年 nián
月 yuè
日 rì
號 hào 号
星 xīng
期 qí
天 tiān
上 shàng
下 xià
午 wǔ
早 zǎo
中 zhōng
晚 wǎn
前 qián
後 hòu 后
昨 zuó
今 jīn
明 míng
去 qù
這 zhè 这
現 xiàn 现
在 zài
幾 jǐ 几
是 shì
哪 nǎ
什 shén
麼 me 么
要 yào
做 zuò
的 de
我 wǒ
們 men 们
有 yǒu
了 le
起 qǐ
床 chuáng
吃 chī
餐 cān
飯 fàn 饭
班 bān
回 huí
家 jiā
洗 xǐ
澡 zǎo
睡 shuì
覺 jiào 觉
看 kàn
電 diàn 电
視 shì 视
功 gōng
課 kè 课
喝 hē
咖 kā
啡 fēi
學 xué 学
校 xiào
運 yùn 运
動 dòng 动
牙 yá
醫 yī 医
開 kāi 开
會 huì 会
聚 jù
面 miàn
試 shì 试
考 kǎo
影 yǐng
約 yuē 约
爬 pá
山 shān
剪 jiǎn
頭 tóu 头
髮 fà 发
生 shēng
派 pài
對 duì 对
演 yǎn
唱 chàng
搬 bān
逛 guàng
街 jiē
候 hòu
千 qiān
`;
const DICT = {};
DICT_SRC.trim().split('\n').forEach(l => { const p = l.trim().split(/\s+/); if (p.length >= 2) DICT[p[0]] = { py:p[1], s:p[2] || p[0] }; });

/* 介面文字用的簡體對照（字典以外） */
const S2_PAIRS = '說说 這这 麼么 時时 間间 點点 鐘钟 號号 選选 聽听 確确 請请 對对 錯错 讀读 話话 個个 從从 顯显 後后 過过 還还 與与 為为 會会 應应 該该 習习 練练 題题 單单 戲戏 難难 擇择 實实 際际 針针 撥拨 準准 備备 續续 結结 覺觉 學学 認认 識识 計计 設设 數数 據据 邊边 記记 錄录 歷历 讓让 們们 來来 寫写 圖图 語语 歡欢 鍵键 隱隐 藏藏 顯显 項项 純纯 體体 繁繁 簡简 兩两 進进 關关 開开 戰战 擊击 絡络 總总 綜综 合合 隨随 機机 鈴铃 響响 錶表 邏逻 輯辑 發发 義义 較较 讀读 與与 帶带 頁页 實实 張张 現现 驗验 勵励 親亲 當当 聯联 傳传 鍋锅 氣气 願愿 資资 較较 專专 動动 轉转 運运 稱称 員员 讚赞 剛刚 厲厉 對对 條条 無无 離离 費费 蘋苹 歲岁 網网 頭头 靜静 論论 長长 馬马 蟲虫 買买 賣卖 興兴 師师 業业 楊杨 劃划 臺台 灣湾 灣湾';
const S2 = {};
S2_PAIRS.split(/\s+/).forEach(p => { if (p.length === 2) S2[p[0]] = p[1]; });
function toSimp(s){ let o = ''; for (const c of String(s)) o += S2[c] || (DICT[c] && DICT[c].s) || c; return o; }

/* ---------- 多語文字 ---------- */
function L(zh, es, en, zhS){ return { zh, es, en, zhS }; }
function zhOf(l){ return Settings.script === 'simp' ? (l.zhS || toSimp(l.zh)) : l.zh; }
function trOf(l){ return Settings.lang === 'es' ? (l.es || '') : Settings.lang === 'en' ? (l.en || '') : ''; }
function Lh(l){ const t = trOf(l); return esc(zhOf(l)) + (t ? `<span class="tr">${esc(t)}</span>` : ''); }          // 中文＋下方翻譯
function Li(l){ const t = trOf(l); return esc(zhOf(l)) + (t ? `<span class="tr inline">${esc(t)}</span>` : ''); }   // 同一行

/* ---------- 拼音 → 注音 ---------- */
const TONE_MAP = { 'ā':['a',1],'á':['a',2],'ǎ':['a',3],'à':['a',4],'ē':['e',1],'é':['e',2],'ě':['e',3],'è':['e',4],'ī':['i',1],'í':['i',2],'ǐ':['i',3],'ì':['i',4],
  'ō':['o',1],'ó':['o',2],'ǒ':['o',3],'ò':['o',4],'ū':['u',1],'ú':['u',2],'ǔ':['u',3],'ù':['u',4],'ǖ':['ü',1],'ǘ':['ü',2],'ǚ':['ü',3],'ǜ':['ü',4] };
function splitTone(s){ let tone = 0, base = ''; for (const ch of s){ const m = TONE_MAP[ch]; if (m){ base += m[0]; tone = m[1]; } else base += ch; } return { base:base.replace(/v/g, 'ü'), tone }; }
const ZY_INI = { zh:'ㄓ', ch:'ㄔ', sh:'ㄕ', b:'ㄅ', p:'ㄆ', m:'ㄇ', f:'ㄈ', d:'ㄉ', t:'ㄊ', n:'ㄋ', l:'ㄌ', g:'ㄍ', k:'ㄎ', h:'ㄏ', j:'ㄐ', q:'ㄑ', x:'ㄒ', r:'ㄖ', z:'ㄗ', c:'ㄘ', s:'ㄙ' };
const ZY_FIN = { a:'ㄚ', o:'ㄛ', e:'ㄜ', ai:'ㄞ', ei:'ㄟ', ao:'ㄠ', ou:'ㄡ', an:'ㄢ', en:'ㄣ', ang:'ㄤ', eng:'ㄥ', er:'ㄦ', i:'ㄧ', ia:'ㄧㄚ', ie:'ㄧㄝ', iao:'ㄧㄠ', iou:'ㄧㄡ', ian:'ㄧㄢ', in:'ㄧㄣ', iang:'ㄧㄤ', ing:'ㄧㄥ',
  iong:'ㄩㄥ', u:'ㄨ', ua:'ㄨㄚ', uo:'ㄨㄛ', uai:'ㄨㄞ', uei:'ㄨㄟ', uan:'ㄨㄢ', uen:'ㄨㄣ', uang:'ㄨㄤ', ong:'ㄨㄥ', ueng:'ㄨㄥ', 'ü':'ㄩ', 'üe':'ㄩㄝ', 'üan':'ㄩㄢ', 'ün':'ㄩㄣ' };
function py2zy(syl){
  const { base, tone } = splitTone(String(syl).toLowerCase());
  let ini = '', fin = base;
  if (/^(zh|ch|sh)/.test(base)){ ini = base.slice(0, 2); fin = base.slice(2); }
  else if (/^[bpmfdtnlgkhjqxrzcs]/.test(base)){ ini = base[0]; fin = base.slice(1); }
  else if (base[0] === 'y'){ const r = base.slice(1); fin = r === 'i' ? 'i' : r[0] === 'u' ? 'ü' + r.slice(1) : r[0] === 'i' ? r : 'i' + r; }
  else if (base[0] === 'w'){ const r = base.slice(1); fin = r === 'u' ? 'u' : 'u' + r; }
  if (ini && 'jqx'.includes(ini) && fin[0] === 'u') fin = 'ü' + fin.slice(1);
  if (ini){ if (fin === 'iu') fin = 'iou'; else if (fin === 'ui') fin = 'uei'; else if (fin === 'un') fin = 'uen'; }
  let z = ZY_INI[ini] || '';
  if (ini && 'zh ch sh r z c s'.split(' ').includes(ini) && fin === 'i') z += '';
  else { const f = ZY_FIN[fin]; if (f === undefined) return syl; z += f; }
  const mark = ['', '', 'ˊ', 'ˇ', 'ˋ'][tone];
  return (tone === 0 ? '˙' : '') + z + mark;
}

/* ---------- 把一句中文拆成「字＋拼音」 ----------
   寫法：字後面可以接 {拼音} 來指定這個字的讀音，例如  哪一{yì}天 */
function parseLine(text){
  const arr = Array.from(String(text)), out = [];
  for (let i = 0; i < arr.length; i++){
    const c = arr[i];
    if (c === '{') continue;
    const e = DICT[c];
    const item = { c, py: e ? e.py : null, hz: !!e };
    if (c === '行' && arr[i - 1] === '銀') item.py = 'háng';   // 銀行（háng）；其他情況（旅行、行）預設 xíng
    if (arr[i + 1] === '{'){ const j = arr.indexOf('}', i + 2); if (j > 0){ item.py = arr.slice(i + 2, j).join(''); item.hz = true; i = j; } }
    out.push(item);
  }
  return out;
}
function plainZh(text){ return String(text).replace(/\{[^}]*\}/g, ''); }
/* 日期、時間的詞後面空一小格，方便學生斷詞：二零二六年 五月 二十日 五點 十五分
   只在「數字＋年月日號點分秒」和幾個固定詞（今天、下午、星期一…）後面加；只影響畫面，不改文字，語音和比對不受影響 */
const GAP_NUM = '零一二三四五六七八九十兩百千';
const GAP_WORDS = /大後天|大前天|後天|前天|今天|明天|昨天|今年|明年|去年|早上|上午|中午|下午|晚上|星期[一二三四五六七日天]/g;
function gapAfter(items){
  const arr = items.map(it => it.c), n = arr.length, set = new Set();
  const isNum = c => c !== undefined && (GAP_NUM.includes(c) || /\d/.test(c));
  for (let i = 0; i < n; i++){
    const c = arr[i], p = arr[i - 1], nx = arr[i + 1];
    let ok = false;
    if ('年日號點秒'.includes(c)) ok = isNum(p);
    else if (c === '月') ok = isNum(p) || (p === '個' && isNum(arr[i - 2]));
    else if (c === '分') ok = isNum(p) && nx !== '鐘';
    else if (c === '半' || c === '整') ok = p === '點';        // 五點半／五點整 後面也空一格（句中才會有，句尾不加）
    if (ok) set.add(i);
  }
  const str = arr.join(''); let m; GAP_WORDS.lastIndex = 0;
  while ((m = GAP_WORDS.exec(str))) set.add(m.index + m[0].length - 1);
  return [...set].filter(i => i < n - 1 && !/[，。？！、：；,.?!:;\s（）()「」]/.test(arr[i + 1]) && !'半鐘整'.includes(arr[i + 1]));
}
function lineHTML(text){
  const simp = Settings.script === 'simp', ph = Settings.phon;
  let o = '';
  const items = parseLine(text), gaps = new Set(gapAfter(items)), multi = /[\n\v]/.test(text);
  if (multi) o += '<span class="ln">';
  items.forEach((it, idx) => {
    if (it.c === '\n'){ o += '</span><span class="ln">'; return; }
    if (it.c === '\v'){ o += '</span><span class="qsep"></span><span class="ln q">'; return; }
    const gp = gaps.has(idx) ? ' gap' : '';
    const ch = simp ? (DICT[it.c] ? DICT[it.c].s : (S2[it.c] || it.c)) : it.c;
    if (!it.hz || ph === 'off'){ o += `<span class="ch${it.hz ? '' : ' np'}${gp}"><span class="h">${esc(ch)}</span></span>`; return; }
    const py = it.py, zy = py2zy(py);
    let top = '', bot = '';
    if (ph === 'pinyin') top = py;
    else if (ph === 'zhuyin') bot = zy;
    else { top = py; bot = zy; }
    o += `<span class="ch${gp}">${ph === 'zhuyin' ? '' : `<span class="ph">${esc(top)}</span>`}<span class="h">${esc(ch)}</span>${bot ? `<span class="ph">${esc(bot)}</span>` : ''}</span>`;
  });
  if (multi) o += '</span>';
  return o;
}

/* ---------- 數字 ---------- */
const DIGZ = '零一二三四五六七八九';
function numZh(n){
  if (n < 10) return DIGZ[n];
  if (n < 20) return '十' + (n % 10 ? DIGZ[n % 10] : '');
  const t = Math.floor(n / 10), u = n % 10;
  return DIGZ[t] + '十' + (u ? DIGZ[u] : '');
}
const digitsZh = n => String(n).split('').map(c => DIGZ[+c]).join('');
const hourZh = h => (h === 2 ? '兩' : numZh(h));
const yearQtyZh = y => '二千零' + numZh(y % 100);     // 「二千零二十六」：把年份當成一般數字念（錯誤說法）

/* ---------- 時間的中文說法 ----------
   st = { half:true/false（30分用「半」）, zheng:true/false（整點加「整」）}；s 有值時一律把分、秒都說出來 */
function tZh(h, m, s, st){
  let t = hourZh(h) + '點';
  if (s != null){
    t += (m === 0 ? '零分' : m < 10 ? '零' + DIGZ[m] + '分' : numZh(m) + '分');
    t += numZh(s) + '秒';
    return t;
  }
  if (m === 0) return t + (st && st.zheng ? '整' : '');
  if (m === 30 && st && st.half) return t + '半';
  if (m < 10) return t + (st && st.ling === false ? '' : '零') + DIGZ[m] + '分';   // 八點零五分／八點五分都對，每題只用一種
  return t + numZh(m) + '分';
}
const digital = (h, m, s) => h + ':' + pad2(m) + (s != null ? ':' + pad2(s) : '');
const digital24 = (H, m) => pad2(H) + ':' + pad2(m);
/* 時段：早上 6–11、中午 12、下午 13–17、晚上 18–23（凌晨等不常用的不出現） */
function periodOf(H){ return H === 12 ? '中午' : H < 12 ? '早上' : H < 18 ? '下午' : '晚上'; }
const h12 = H => (H % 12 === 0 ? 12 : H % 12);
const ptZh = (H, m, st) => periodOf(H) + tZh(h12(H), m, null, st);

/* ---------- 日期 ---------- */
const WK_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const weekdayOf = (y, m, d) => new Date(y, m - 1, d).getDay();
const dim = (y, m) => new Date(y, m, 0).getDate();
function addDays(y, m, d, n){ const t = new Date(y, m - 1, d + n); return { y:t.getFullYear(), m:t.getMonth() + 1, d:t.getDate() }; }
const wkZh = (dow, sun) => '星期' + (dow === 0 ? (sun || '天') : WK_ZH[dow]);
const monthZh = m => numZh(m) + '月';
const dayZh = (d, st) => numZh(d) + (st || '號');
const yearZh = y => digitsZh(y) + '年';
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_ES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WK_SHORT_ES = ['dom','lun','mar','mié','jue','vie','sáb'];
const WK_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
/* 外語（或純中文模式的阿拉伯數字）日期 */
function fmtDate(y, m, d, withYear){
  if (Settings.lang === 'es') return d + ' de ' + MONTHS_ES[m - 1] + (withYear ? ' de ' + y : '');
  if (Settings.lang === 'en') return MONTHS_EN[m - 1] + ' ' + d + (withYear ? ', ' + y : '');
  return (withYear ? y + '年' : '') + m + '月' + d + '日';
}
function fmtMonthTitle(y, m){
  if (Settings.lang === 'es') return MONTHS_ES[m - 1] + ' de ' + y;
  if (Settings.lang === 'en') return MONTHS_EN[m - 1] + ' ' + y;
  return y + '年' + m + '月';
}
const dayName = dow => (Settings.lang === 'es' ? DAYS_ES[dow] : Settings.lang === 'en' ? DAYS_EN[dow] : '');
const digDate = (y, m, d) => y + '/' + m + '/' + d;

/* ---------- 說中文（瀏覽器語音，只選台灣／普通話） ---------- */
function mandarinVoice(){
  let vs = [];
  try{ vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; }catch(e){}
  const ok = v => { const l = String(v.lang || '').toLowerCase().replace(/_/g, '-'); if (l.indexOf('yue') === 0 || l.indexOf('zh-hk') === 0) return false; return l === 'zh' || l.indexOf('zh-') === 0 || l.indexOf('cmn') === 0; };
  const c = vs.filter(ok);
  return c.find(v => /tw/i.test(v.lang)) || c[0] || null;
}
function speak(text){
  try{
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(plainZh(text));
    const v = mandarinVoice();
    if (v){ u.voice = v; u.lang = v.lang; } else u.lang = 'zh-TW';
    u.rate = RATE_VALUE[Settings.rate] || 0.65;
    speechSynthesis.speak(u);
  }catch(e){}
}
