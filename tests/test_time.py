# 練習時間遊戲測試：出題邏輯（獨立重算答案）、字典涵蓋、全流程點擊、畫面截圖
# 用法：python3 tests/test_time.py [shots 資料夾]
import os, sys, json, random
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', 'index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else None

APP = "export function initializeApp(c,n){return {c,n}}"
FS = '''
const op=(k,p,d)=>(window.__ops=window.__ops||[]).push({k,p,d});
export function getFirestore(app){return {app}}
export const collection=(db,...p)=>({db,path:p.join('/')});
export const doc=(db,...p)=>({db,path:p.join('/')});
export const serverTimestamp=()=>'SERVER_TS';
export async function setDoc(r,d){op('set',r.path,d)}
export async function addDoc(c,d){op('add',c.path,d);return {id:'P'+(window.__ops.length)}}
export async function updateDoc(r,d){op('update',r.path,d)}
export const getDoc=async()=>({exists:()=>false,data:()=>({})});
export const getDocs=async()=>({docs:[{data:()=>({name:'小明',score:180})},{data:()=>({name:'Ana',score:150})}]});
export const query=(...a)=>a, orderBy=()=>0, limit=()=>0;
'''
AUTH = """const a={currentUser:null,authStateReady:async()=>{}};
export const getAuth=()=>a;
export const signInAnonymously=async()=>{a.currentUser={uid:'UID1',isAnonymous:true};return {user:a.currentUser}};"""


def route(r):
    u = r.request.url
    if 'gstatic.com/firebasejs' in u:
        body = APP if 'firebase-app' in u else FS if 'firestore' in u else AUTH if 'auth' in u else ''
        return r.fulfill(status=200, content_type='application/javascript', body=body)
    if u.startswith('file:'):
        return r.continue_()
    r.abort()


fails = 0
def check(c, msg):
    global fails
    print(('  ok  ' if c else '  FAIL'), msg)
    if not c:
        fails += 1


LOGIC_JS = r'''
(() => {
  const errs = [], E = m => { if (errs.length < 80) errs.push(m); };
  const missing = new Set();
  const chk = (s, w) => { if (s == null) return; for (const c of String(s).replace(/\{[^}]*\}/g, '')) if (/[㐀-鿿]/.test(c) && !DICT[c]) missing.add(c + '@' + w); };
  const zhNum = s => { const D = {'零':0,'一':1,'二':2,'兩':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9}; if (s.includes('十')){ const p = s.split('十'); return (p[0] ? D[p[0]] : 1) * 10 + (p[1] ? D[p[1]] : 0); } return D[s]; };
  const styles = [];[true,false].forEach(a => [true,false].forEach(b => [true,false].forEach(c => styles.push({half:a,zheng:b,ling:c}))));
  const wkSet = dow => new Set([wkZh(dow,'天'), wkZh(dow,'日')]);
  const N = 250, seen = {};
  // 靜態檢查：行程時間避開 11、17、18 點
  EVENTS.forEach(e => e.times.forEach(t => { if ([11,17,18].includes(t[0])) E('EVENT hour ' + e.id + ' ' + t[0]); }));
  DAILY.forEach(a => a.hours.forEach(H => { if ([11,17,18].includes(H)) E('DAILY hour ' + a.short + ' ' + H); }));
  const labels = EVENTS.map(e => e.label); if (new Set(labels).size !== labels.length) E('duplicate event labels');
  for (const id of Object.keys(GEN)) for (const lv of ['easy','mid','hard']) for (let k = 0; k < N; k++){
    let q; try { q = GEN[id](lv); } catch (e) { E(id + ' ' + lv + ' THROW ' + e.message); continue; }
    const tag = id + '/' + lv; seen[tag] = (seen[tag] || 0) + 1;
    chk(q.line && q.line.zh, tag + ':line'); chk(q.audio, tag + ':audio'); chk(q.peek, tag + ':peek'); chk(q.fb && q.fb.ansZh, tag + ':ans');
    (q.options || []).forEach(o => chk(o.zh, tag + ':opt')); (q.cards || []).forEach(c => chk(c.zh, tag + ':card'));
    if (q.visual && q.visual.details) Object.values(q.visual.details).forEach(d => { chk(d.head, tag + ':dh'); chk(d.body, tag + ':db'); });
    if (q.visual && q.visual.labels) Object.values(q.visual.labels).forEach(l => chk(l, tag + ':label'));
    let c = null;
    if (q.kind === 'choice'){
      const oks = q.options.filter(o => o.ok); c = oks[0];
      if (oks.length !== 1) E(tag + ' oks=' + oks.length);
      if (q.options.length !== 4) E(tag + ' nopts=' + q.options.length);
      const keys = q.options.map(o => o.key != null ? o.key : o.zh); if (new Set(keys).size !== keys.length) E(tag + ' dup keys');
      q.options.filter(o => !o.ok).forEach(o => { if (!o.why || !WHY[o.why]) E(tag + ' wrong without why ' + (o.zh || o.key)); });
    }
    if (id === 'clockChoice'){
      const { h, m, s } = q.visual, valid = new Set(styles.map(st => tZh(h, m, s, st)));
      if (!valid.has(c.zh)) E(tag + ' correct invalid ' + c.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (valid.has(o.zh)) E(tag + ' wrong is also valid ' + o.zh + ' for ' + digital(h, m, s)); if (o.d && o.d === digital(h, m, s)) E(tag + ' wrong same time'); });
      if (s != null && lv !== 'hard') E(tag + ' seconds outside hard');
      if (lv === 'easy' && !(m === 0 || m === 30)) E(tag + ' easy minute ' + m);
      if (lv === 'mid' && m % 5 !== 0) E(tag + ' mid minute ' + m);
    }
    if (id === 'clockSet'){
      const { h, m } = q.target, valid = new Set(styles.map(st => tZh(h, m, null, st)));
      if (!valid.has(q.audio)) E(tag + ' audio ' + q.audio);
      if (q.visual.h0 === h && q.visual.m0 === m) E(tag + ' initial = target');
    }
    if (id === 'clockListen' && q.options[0].zh){
      const t = q.audio; // 只能比對文字：錯誤選項不可與聽到的相同
      q.options.filter(o => !o.ok).forEach(o => { if (o.zh === t) E(tag + ' wrong equals audio'); });
      if (c.zh !== q.audio) E(tag + ' correct != audio');
    }
    if (id === 'dateChoice'){
      const { y, m, mark: d } = q.visual, wy = lv !== 'easy', ww = lv === 'hard', valid = new Set();
      for (const st of ['日','號']) for (const sun of ['天','日']) valid.add(dateStr(y, m, d, { st, sun, year:wy, week:ww, order:'ymd' }));
      if (!valid.has(c.zh)) E(tag + ' correct invalid ' + c.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (valid.has(o.zh)) E(tag + ' wrong valid ' + o.zh); });
      // 日／號 不混用（先把「星期日」拿掉再比，免得把星期日的「日」當成日期的「日」）
      q.options.forEach(o => { const z = o.zh.replace(/星期[天日一二三四五六七]/g, ''); if (z.includes('日') && z.includes('號')) E(tag + ' mixed 日號 ' + o.zh); });
      const dayCh = new Set(q.options.map(o => o.zh.replace(/星期[天日一二三四五六七]/g, '').includes('號') ? '號' : '日')); if (dayCh.size !== 1) E(tag + ' options mix 日 and 號 styles');
    }
    if (id === 'weekdayChoice'){
      const { y, m, mark: d } = q.visual, valid = wkSet(weekdayOf(y, m, d));
      if (!valid.has(c.zh)) E(tag + ' correct invalid ' + c.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (valid.has(o.zh)) E(tag + ' wrong valid ' + o.zh); });
      const sundays = q.options.filter(o => o.zh === '星期天' || o.zh === '星期日'); if (sundays.length > 1) E(tag + ' both 天 and 日');
    }
    if (id === 'dateListen'){
      if (c.zh !== q.audio) E(tag + ' correct != audio');
      q.options.filter(o => !o.ok).forEach(o => { if (o.zh === q.audio) E(tag + ' wrong==audio'); });
    }
    if (id === 'clockChoice'){
      const hasLing = q.options.some(o => /點零[一二三四五六七八九]分/.test(o.zh)), noLing = q.options.some(o => /點[一二三四五六七八九]分/.test(o.zh));
      if (hasLing && noLing) E(tag + ' mixes 零五分 and 五分 forms');
    }
    if (id === 'periodChoice' && q.dbg && q.dbg.form === 'read'){
      const { H: HH, m: mm } = q.dbg, valid = new Set([true, false].map(z => ptZh(HH, mm, { half:true, zheng:z })));
      if (!valid.has(q.line.zh)) E(tag + ' read line invalid ' + q.line.zh);
      if (c.zh !== digital24(HH, mm)) E(tag + ' read correct ' + c.zh);
      if ([11,17,18].includes(HH)) E(tag + ' ambiguous hour ' + HH);
      q.options.filter(o => !o.ok).forEach(o => { if (o.zh === digital24(HH, mm)) E(tag + ' read wrong==correct'); if (!/^\d\d:\d\d$/.test(o.zh)) E(tag + ' read bad option ' + o.zh); });
    } else if (id === 'periodChoice'){
      const [HH, mm] = q.visual.text.split(':').map(Number), valid = new Set([true, false].map(z => ptZh(HH, mm, { half:true, zheng:z })));
      if (!valid.has(c.zh)) E(tag + ' correct invalid ' + c.zh + ' ' + q.visual.text);
      if ([11,17,18].includes(HH)) E(tag + ' ambiguous hour ' + HH);
      q.options.filter(o => !o.ok).forEach(o => {
        if (valid.has(o.zh)) E(tag + ' wrong valid ' + o.zh);
        if (o.why === 'periodWrong' && (o.zh.startsWith(periodOf(HH)) || (o.zh.startsWith('中午') && HH !== 12))) E(tag + ' bad periodWrong ' + o.zh + ' @' + HH);
      });
    }
    if (id === 'schedMatch'){
      const { items, withPeriod } = q.dbg;
      if (q.slots.length !== items.length) E(tag + ' slot count');
      const labs = q.slots.map(s => s.label); if (new Set(labs).size !== labs.length) E(tag + ' dup slot labels ' + labs);
      items.forEach((it, i) => {
        if (q.slots[i].label !== schedLabel(it.H, it.m, withPeriod)) E(tag + ' label mismatch');
        const card = q.cards.find(x => x.slot === i);
        if (!card || card.zh !== schedZh(DAILY.find(a => a.short === it.short), it.H, it.m, withPeriod)) E(tag + ' card mismatch');
        if (!DAILY.find(a => a.short === it.short).hours.includes(it.H)) E(tag + ' implausible hour');
      });
      for (let i = 1; i < items.length; i++) if (items[i].H * 60 + items[i].m < items[i-1].H * 60 + items[i-1].m) E(tag + ' not sorted');
    }
    if (id === 'schedListen'){
      const { short, H, m, withPeriod } = q.dbg, lab = schedLabel(H, m, withPeriod);
      if (q.audio !== schedZh(DAILY.find(a => a.short === short), H, m, withPeriod)) E(tag + ' audio');
      if (!(c.zh === short && c.badge === lab)) E(tag + ' correct card');
      q.options.filter(o => !o.ok).forEach(o => { if (o.zh === short && o.badge === lab) E(tag + ' wrong==correct'); });
    }
    if (id === 'calFindDay'){
      const ev = q.dbg.events, asked = ev.find(x => x.label === q.dbg.asked);
      if (!asked || asked.d !== q.target.d) E(tag + ' target day');
      if (Object.keys(q.visual.labels).length || Object.keys(q.visual.details).length) E(tag + ' calendar must have no event text');
      if (ev.length < 2 || ev.length > 3) E(tag + ' event count ' + ev.length);
      if (new Set(ev.map(x => x.label)).size !== ev.length || new Set(ev.map(x => x.d)).size !== ev.length) E(tag + ' duplicate events/days');
      const stem = q.line.zh.split('。')[0].split('，');
      if (stem.length !== ev.length) E(tag + ' facts count');
      ev.forEach((x, i) => { const mm = zhNum(stem[i].match(/^(.+?)月/)[1]), dd = zhNum(stem[i].match(/月(.+?)號/)[1]); if (mm !== q.visual.m || dd !== x.d || !stem[i].endsWith(x.fut)) E(tag + ' fact ' + stem[i]); });
      if (q.line.zh.split('。')[1].split('是')[0] !== q.dbg.asked) E(tag + ' asked label');
    }
    if (id === 'calWhatDo'){
      const mm = zhNum(q.line.zh.match(/^(.+?)月/)[1]), dd = zhNum(q.line.zh.match(/月(.+?)[號日]/)[1]);
      if (mm !== q.visual.m) E(tag + ' month parse');
      const ev = EVENTS.find(e => e.doZh === c.zh);
      if (q.visual.labels[dd] !== ev.label) E(tag + ' label ' + q.visual.labels[dd] + ' vs ' + ev.label);
      q.options.filter(o => !o.ok).forEach(o => { const e2 = EVENTS.find(e => e.doZh === o.zh); if (q.visual.labels[dd] === e2.label) E(tag + ' wrong is also that day'); });
    }
    if (id === 'calWhatTime'){
      const lab = q.line.zh.split('是')[0], day = Object.keys(q.visual.labels).find(d => q.visual.labels[d] === lab);
      if (!q.visual.details[day].body.startsWith(c.zh + '　')) E(tag + ' time mismatch ' + q.visual.details[day].body + ' vs ' + c.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (q.visual.details[day].body.startsWith(o.zh + '　')) E(tag + ' wrong is valid'); });
    }
    if (id === 'relDay'){
      const { y, m, today } = q.visual, T = new Date(y, m - 1, today), w = T.getDay();
      if (w < 1 || w > 5) E(tag + ' today weekday ' + w);
      const off = { '前天':-2, '昨天':-1, '明天':1, '後天':2 }[q.line.zh.slice(0, 2)], tg = new Date(y, m - 1, today + off);
      if (q.line.zh.includes('星期幾')){
        if (!wkSet(tg.getDay()).has(c.zh)) E(tag + ' wk answer ' + c.zh);
        q.options.filter(o => !o.ok).forEach(o => { if (wkSet(tg.getDay()).has(o.zh)) E(tag + ' wrong wk valid'); });
      } else {
        if (c.zh !== monthZh(tg.getMonth() + 1) + dayZh(tg.getDate(), '號')) E(tag + ' date answer ' + c.zh);
        q.options.filter(o => !o.ok).forEach(o => { if (!/^.+月.+號$/.test(o.zh)) E(tag + ' wrong format ' + o.zh); });
      }
    }
    if (id === 'relWeek'){
      if (q.id !== 'relWeek') continue;
      const { y, m, today } = q.visual, T = new Date(y, m - 1, today), w = T.getDay();
      if (q.line.zh.includes('星期幾')) continue; // 退回 relDay 的情況
      const rel = { '上':-1, '這':0, '下':1 }[q.line.zh[0]], X = WK_ZH.indexOf(q.line.zh[3]);
      if (X < 1 || X > 5) E(tag + ' X ' + X);
      const mon = new Date(y, m - 1, today - ((w + 6) % 7) + rel * 7 + (X - 1));
      const sun = new Date(y, m - 1, today - w + rel * 7 + X);          // 星期日當一週開頭
      if (mon.getTime() !== sun.getTime()) E(tag + ' week convention differs');
      if (c.zh !== monthZh(mon.getMonth() + 1) + dayZh(mon.getDate(), '號')) E(tag + ' answer ' + c.zh + ' vs ' + (mon.getMonth() + 1) + '/' + mon.getDate());
      if (rel === 0 && X === w) E(tag + ' this-week same as today');
    }
    if (id === 'yearView'){
      const { y, m } = q.visual, w2 = q.line.zh.slice(0, 2);
      if (w2 === '上個' || w2 === '下個'){
        const mm = ((m - 1 + (w2 === '上個' ? -1 : 1) + 12) % 12) + 1;
        if (c.zh !== monthZh(mm)) E(tag + ' month answer ' + c.zh + ' vs ' + mm);
      } else {
        const dy = { '去年':-1, '明年':1, '前年':-2, '後年':2 }[w2];
        if (c.zh !== yearZh(y + dy)) E(tag + ' year answer ' + c.zh);
        if (lv !== 'hard' && Math.abs(dy) === 2) E(tag + ' 前年/後年 outside hard');
      }
    }
    if (['tapAbs','tapRelDay','tapRelWeek'].includes(id)){
      const { y, m, today } = q.visual, T = new Date(y, m - 1, today), w = T.getDay(), s = q.audio, tg = q.target;
      if (w < 1 || w > 5) E(tag + ' today weekday');
      let exp;
      const rd = { '前天':-2, '昨天':-1, '明天':1, '後天':2 }[s.slice(0, 2)];
      if (rd !== undefined) exp = new Date(y, m - 1, today + rd);
      else if ('上這下'.includes(s[0]) && s.slice(1, 3) === '星期'){
        const rel = { '上':-1, '這':0, '下':1 }[s[0]], X = WK_ZH.indexOf(s[3]);
        exp = new Date(y, m - 1, today - ((w + 6) % 7) + rel * 7 + (X - 1));
        const sun = new Date(y, m - 1, today - w + rel * 7 + X); if (sun.getTime() !== exp.getTime()) E(tag + ' week convention');
      } else {
        const mm = zhNum(s.match(/^(.+?)月/)[1]), dd = zhNum(s.match(/月(.+?)[號日]/)[1]);
        if (mm !== m) E(tag + ' abs month'); exp = new Date(y, m - 1, dd);
      }
      if (exp.getFullYear() !== tg.y || exp.getMonth() + 1 !== tg.m || exp.getDate() !== tg.d) E(tag + ' target ' + JSON.stringify(tg) + ' vs ' + exp.toISOString() + ' for ' + s);
      const past = exp.getTime() < T.getTime();
      if (past && !s.endsWith('了')) E(tag + ' tense past ' + s); if (!past && !s.includes('要')) E(tag + ' tense future ' + s);
      if (exp.getTime() === T.getTime()) E(tag + ' target is today');
      if (tg.m !== m) E(tag + ' target outside displayed month');
    }
  }
  // makeQuestions
  try {
    const a = makeQuestions('all', 'mix', 20), ids = new Set(a.map(x => x.id)); if (a.length !== 20) E('mix length');
    for (const sid of Object.keys(GEN)) for (const lv of ['easy','mid','hard']) for (let r = 0; r < 60; r++){ const qs = makeQuestions([sid], lv, 10), sg = qs.map(qSig); if (new Set(sg).size !== sg.length) { E('dup in round ' + sid + ' ' + lv); break; } }
    const b = makeQuestions(['clockChoice','clockSet'], 'mid', 10); if (b.length !== 10 || new Set(b.map(x => x.id)).size !== 2) E('makeQuestions subset');
  } catch (e) { E('makeQuestions THROW ' + e.message); }
  // 拼音→注音
  const zyTests = { 'diǎn':'ㄉㄧㄢˇ', 'fēn':'ㄈㄣ', 'zhōng':'ㄓㄨㄥ', 'wǔ':'ㄨˇ', 'liù':'ㄌㄧㄡˋ', 'qī':'ㄑㄧ', 'jiǔ':'ㄐㄧㄡˇ', 'shí':'ㄕˊ', 'sì':'ㄙˋ', 'bàn':'ㄅㄢˋ', 'ge':'˙ㄍㄜ', 'xīng':'ㄒㄧㄥ', 'qí':'ㄑㄧˊ',
    'yuè':'ㄩㄝˋ', 'hào':'ㄏㄠˋ', 'nián':'ㄋㄧㄢˊ', 'liǎng':'ㄌㄧㄤˇ', 'èr':'ㄦˋ', 'zhěng':'ㄓㄥˇ', 'miǎo':'ㄇㄧㄠˇ', 'yī':'ㄧ', 'wǒ':'ㄨㄛˇ', 'jù':'ㄐㄩˋ', 'xué':'ㄒㄩㄝˊ', 'duì':'ㄉㄨㄟˋ', 'huì':'ㄏㄨㄟˋ',
    'yùn':'ㄩㄣˋ', 'yǒu':'ㄧㄡˇ', 'yào':'ㄧㄠˋ', 'men':'˙ㄇㄣ', 'me':'˙ㄇㄜ', 'chuáng':'ㄔㄨㄤˊ', 'shuì':'ㄕㄨㄟˋ', 'zǎo':'ㄗㄠˇ', 'wǎn':'ㄨㄢˇ', 'xiào':'ㄒㄧㄠˋ', 'yǐng':'ㄧㄥˇ', 'jiē':'ㄐㄧㄝ', 'guàng':'ㄍㄨㄤˋ',
    'chī':'ㄔ', 'shì':'ㄕˋ', 'rì':'ㄖˋ', 'zhè':'ㄓㄜˋ', 'jǐ':'ㄐㄧˇ', 'nǎ':'ㄋㄚˇ', 'shén':'ㄕㄣˊ', 'de':'˙ㄉㄜ', 'le':'˙ㄌㄜ', 'kā':'ㄎㄚ', 'fēi':'ㄈㄟ', 'hē':'ㄏㄜ', 'yá':'ㄧㄚˊ', 'kāi':'ㄎㄞ',
    'miàn':'ㄇㄧㄢˋ', 'kǎo':'ㄎㄠˇ', 'yuē':'ㄩㄝ', 'pá':'ㄆㄚˊ', 'shān':'ㄕㄢ', 'jiǎn':'ㄐㄧㄢˇ', 'tóu':'ㄊㄡˊ', 'fà':'ㄈㄚˋ', 'shēng':'ㄕㄥ', 'pài':'ㄆㄞˋ', 'yǎn':'ㄧㄢˇ', 'chàng':'ㄔㄤˋ', 'bān':'ㄅㄢ',
    'xiàn':'ㄒㄧㄢˋ', 'zài':'ㄗㄞˋ', 'zuó':'ㄗㄨㄛˊ', 'jīn':'ㄐㄧㄣ', 'míng':'ㄇㄧㄥˊ', 'qù':'ㄑㄩˋ', 'qián':'ㄑㄧㄢˊ', 'hòu':'ㄏㄡˋ', 'huí':'ㄏㄨㄟˊ', 'jiā':'ㄐㄧㄚ', 'xǐ':'ㄒㄧˇ', 'jiào':'ㄐㄧㄠˋ', 'kàn':'ㄎㄢˋ', 'diàn':'ㄉㄧㄢˋ',
    'gōng':'ㄍㄨㄥ', 'kè':'ㄎㄜˋ', 'xiǎo':'ㄒㄧㄠˇ', 'tiān':'ㄊㄧㄢ', 'shàng':'ㄕㄤˋ', 'xià':'ㄒㄧㄚˋ', 'zuò':'ㄗㄨㄛˋ', 'cān':'ㄘㄢ', 'fàn':'ㄈㄢˋ', 'líng':'ㄌㄧㄥˊ', 'sān':'ㄙㄢ', 'bā':'ㄅㄚ', 'háo':'ㄏㄠˊ' };
  Object.keys(zyTests).forEach(k => { const g = py2zy(k); if (g !== zyTests[k]) E('zhuyin ' + k + ' => ' + g + ' expected ' + zyTests[k]); });
  // 字典的每個字都要有拼音
  Object.keys(DICT).forEach(c => { if (!DICT[c].py) E('dict no py ' + c); });
  return { errs, missing: [...missing].slice(0, 60), combos: Object.keys(seen).length };
})()
'''

ALL_SUBS = ['clockChoice','clockSet','clockListen','dateChoice','weekdayChoice','dateListen','schedMatch','schedListen','periodChoice',
            'calFindDay','calWhatDo','calWhatTime','relDay','relWeek','yearView','tapAbs','tapRelDay','tapRelWeek']


def drag_dial(pg, target):
    box = pg.evaluate("(() => { const r = document.querySelector('#dial').getBoundingClientRect(); return {x:r.left, y:r.top, w:r.width, h:r.height}; })()")
    import math
    def pt(angle, rad):
        a = math.radians(angle)
        return box['x'] + box['w'] / 2 + math.sin(a) * rad * box['w'] / 200, box['y'] + box['h'] / 2 - math.cos(a) * rad * box['h'] / 200
    h, m = target['h'], target['m']
    x, y = pt(m * 6, 74); pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 0.5, y + 0.5); pg.mouse.up()
    x, y = pt((h % 12) * 30 + m * 0.5, 30); pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 0.5, y + 0.5); pg.mouse.up()


def answer(pg, correct=True):
    """依照目前題型作答；correct=False 時故意亂答"""
    kind = pg.evaluate("App.cur.kind")
    if kind == 'choice':
        idx = pg.evaluate("App.cur.options.findIndex(o => o.ok)") if correct else pg.evaluate("App.cur.options.findIndex(o => !o.ok)")
        pg.click('.opt[data-i="%d"]' % idx)
    elif kind == 'dial':
        if correct:
            drag_dial(pg, pg.evaluate("App.cur.target"))
        pg.click('#confirm')
    elif kind == 'tap':
        t = pg.evaluate("App.cur.target")
        d = t['d'] if correct else (1 if t['d'] != 1 else 2)
        pg.click('.cal td[data-d="%d"]' % d)
        pg.click('#confirm')
    elif kind == 'match':
        cards = pg.evaluate("App.cur.cards")
        for si in range(pg.evaluate("App.cur.slots.length")):
            ci = next(i for i, c in enumerate(cards) if c['slot'] == si) if correct else (si % len(cards))
            if not correct:
                ci = [i for i in range(len(cards))][(si + 1) % len(cards)]
            pg.click('[data-card="%d"]' % ci)
            pg.click('[data-slot="%d"]' % si)
        pg.click('#confirm')
    if pg.evaluate("App.cur.visual && App.cur.visual.mode === 'view'"):
        pass


def run_round(pg, correct=True):
    n = pg.evaluate("App.qs.length")
    for i in range(n):
        pg.wait_for_selector('#fb', state='attached')
        answer(pg, correct)
        pg.wait_for_selector('#next:not([hidden])')
        pg.click('#next')
    pg.wait_for_selector('.result')


if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        ctx.add_init_script("window.speechSynthesis && (speechSynthesis.speak = function(){}); ")
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' else None)
        pg.route('**/*', route)
        pg.goto(PAGE); pg.wait_for_timeout(500)
        check(pg.evaluate("typeof GEN") == 'object', 'game loaded')
        check(pg.evaluate("document.querySelectorAll('.unit').length") == 6, 'six units on start screen')
        # 齒輪設定：開始畫面和遊戲中都能打開、能改
        check(pg.evaluate("!document.querySelector('.setrow')") and pg.evaluate("!!document.querySelector('#gear')"), 'start screen has gear, no inline settings')
        pg.click('#gear'); check(pg.evaluate("document.querySelectorAll('.overlay .setrow').length") == 5, 'settings panel has 5 rows')
        check('Chino + Español' in pg.inner_text('.overlay'), 'language label reads Chino + Español')
        pg.click('[data-seg=lv] button[data-v=hard]'); pg.click('#sclose')
        check(pg.evaluate("App.lv") == 'hard', 'level set from start gear')
        pg.evaluate("startRound(['clockChoice'],App.lv,'clockChoice',false)")
        pg.click('#gearq'); pg.click('[data-seg=phon] button[data-v=zhuyin]'); pg.click('[data-seg=lv] button[data-v=easy]'); pg.click('#sclose')
        check(pg.evaluate("Settings.phon") == 'zhuyin' and pg.evaluate("App.lv") == 'easy' and pg.evaluate("App.round.lv") == 'hard', 'in-game gear changes settings; level only for next round')
        pg.evaluate("Settings.phon='pinyin'; writeSettings(Settings); App.lv='mid'; renderStart()")

        print('== 出題邏輯（每題型 × 3 難度 × 250 題）')
        res = pg.evaluate(LOGIC_JS)
        check(res['combos'] == 54, 'all 54 generator/level combos ran (%s)' % res['combos'])
        check(not res['errs'], 'logic invariants hold: %s' % res['errs'][:15])
        check(not res['missing'], 'dictionary covers every Chinese character in content: %s' % res['missing'][:20])

        print('== 全流程：18 種題型 × 3 難度，全部答對應得滿分')
        before = fails
        for lv in ['easy', 'mid', 'hard']:
            for sub in ALL_SUBS:
                pg.evaluate("renderStart()")
                pg.evaluate("App.lv='%s'" % lv)
                pg.evaluate("startRound(['%s'], '%s', '%s', false)" % (sub, lv, sub))
                run_round(pg, True)
                sc = pg.evaluate("App.score")
                if sc != 100:
                    check(False, '%s/%s perfect round score=%s' % (sub, lv, sc))
        check(fails == before, 'every sub-mode scored 100 when answered correctly')

        print('== 故意答錯：不當機、不給分')
        for sub in ALL_SUBS:
            pg.evaluate("startRound(['%s'], 'mid', '%s', false)" % (sub, sub))
            run_round(pg, False)
            sc = pg.evaluate("App.score")
            check(sc < 100, '%s wrong-answers round finished (score=%s)' % (sub, sc))

        print('== 綜合挑戰')
        pg.evaluate("renderStart()"); pass
        pg.evaluate("startRound('all','mix','mix',true)")
        run_round(pg, True)
        check(pg.evaluate("App.score") == 200, 'mixed challenge perfect = 200')
        pg.wait_for_timeout(600)
        check(pg.evaluate("!document.body.innerHTML.includes('firebase')"), 'no firebase')

        print('== 設定組合（字形 × 語言 × 拼音）：每種都跑完一輪')
        combos = [('trad','es','pinyin'), ('simp','en','zhuyin'), ('trad','zh','both'), ('simp','es','off')]
        for (s, l, ph) in combos:
            pg.evaluate("Settings.script='%s'; Settings.lang='%s'; Settings.phon='%s'; renderStart()" % (s, l, ph))
            for sub in ['clockChoice', 'dateChoice', 'schedMatch', 'calWhatTime', 'relWeek', 'tapAbs', 'yearView', 'clockSet']:
                pg.evaluate("startRound(['%s'],'mid','%s',false)" % (sub, sub))
                run_round(pg, True)
            check(pg.evaluate("document.body.innerText.length") > 20, 'settings %s/%s/%s ok' % (s, l, ph))
        pg.evaluate("Settings.script='trad'; Settings.lang='es'; Settings.phon='pinyin'; writeSettings(Settings)")

        check(not errs, 'no page errors / console errors: %s' % errs[:5])

        if SHOTS:
            print('== 截圖 →', SHOTS)
            os.makedirs(SHOTS, exist_ok=True)
            random.seed(7)
            def shot(name):
                pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=True)
            pg.evaluate("Settings.script='trad'; Settings.lang='es'; Settings.phon='pinyin'; App.open='u1'; renderStart()"); shot('00_start')
            for sub in ALL_SUBS:
                pg.evaluate("startRound(['%s'],'mid','%s',false)" % (sub, sub)); pg.wait_for_timeout(100)
                if sub == 'calWhatTime':
                    pg.click('.cal td.tap')
                shot('q_' + sub)
                answer(pg, False); pg.wait_for_selector('#next:not([hidden])'); shot('a_' + sub)
            pg.evaluate("Settings.lang='zh'; Settings.phon='both'; startRound(['clockChoice'],'hard','x',false)"); shot('z_both_clockChoice')
            pg.evaluate("Settings.script='simp'; Settings.lang='en'; Settings.phon='zhuyin'; startRound(['schedListen'],'hard','x',false)"); shot('z_simp_schedListen')
        b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
