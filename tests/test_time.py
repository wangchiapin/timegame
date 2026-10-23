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
      const { y, m, d, st } = q.dbg, valid = wkSet(weekdayOf(y, m, d));
      if (!valid.has(c.zh)) E(tag + ' correct invalid ' + c.zh);
      if (q.visual.mark !== undefined) E(tag + ' calendar must not be circled');
      if (q.line.zh !== numZh(m) + '月' + numZh(d) + st + '是星期幾？') E(tag + ' bad line ' + q.line.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (valid.has(o.zh)) E(tag + ' wrong valid ' + o.zh); });
      const sundays = q.options.filter(o => o.zh === '星期天' || o.zh === '星期日'); if (sundays.length > 1) E(tag + ' both 天 and 日');
    }
    if (id === 'dateListen'){
      if (q.peek) E(tag + ' dateListen must have no peek');
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
      const [factsTxt, askTxt] = q.line.zh.split('\v');
      const stem = factsTxt.split('\n').map((z, i, arr) => { if (!z.endsWith(i < arr.length - 1 ? '，' : '。')) E(tag + ' line end punct ' + z); return z.slice(0, -1); });
      if (stem.length !== ev.length) E(tag + ' facts count');
      ev.forEach((x, i) => { const mm = zhNum(stem[i].match(/^(.+?)月/)[1]), dd = zhNum(stem[i].match(/月(.+?)號/)[1]); if (mm !== q.visual.m || dd !== x.d || !stem[i].endsWith(x.fut)) E(tag + ' fact ' + stem[i]); });
      if (askTxt.split('是')[0] !== q.dbg.asked) E(tag + ' asked label');
    }
    if (id === 'calWhatDo'){
      const mm = zhNum(q.line.zh.match(/^(.+?)月/)[1]), dd = zhNum(q.line.zh.match(/月(.+?)[號日]/)[1]);
      if (mm !== q.visual.m) E(tag + ' month parse');
      const ev = EVENTS.find(e => e.doZh === c.zh);
      if (q.visual.labels[dd] !== ev.label) E(tag + ' label ' + q.visual.labels[dd] + ' vs ' + ev.label);
      q.options.filter(o => !o.ok).forEach(o => { const e2 = EVENTS.find(e => e.doZh === o.zh); if (q.visual.labels[dd] === e2.label) E(tag + ' wrong is also that day'); });
    }
    if (id === 'calWhatTime'){
      const D = q.dbg, today = D.days.find(x => x.day === D.day), tg = today.items.find(x => x.label === D.label && x.h === D.h && x.mi === D.mi);
      if (!tg) E(tag + ' target missing in its day');
      if (q.visual.labels[D.day] !== D.label) E(tag + ' cell label must be the asked event');
      if (!q.visual.plus[D.day]) E(tag + ' cell needs plus');
      if (q.line.zh !== D.label + '是幾點？') E(tag + ' line');
      const nTarget = D.days.reduce((s, x) => s + x.items.filter(i => i.label === D.label).length, 0); if (nTarget !== 1) E(tag + ' asked event must appear exactly once in month: ' + nTarget);
      D.days.forEach(x => {
        if (x.items.length < 2 || x.items.length > 3) E(tag + ' items per day ' + x.items.length);
        if (new Set(x.items.map(i => i.h)).size !== x.items.length) E(tag + ' same hour in one day');
        const det = q.visual.details[x.day].items; if (det.length !== x.items.length) E(tag + ' detail count');
        det.forEach(it => { if (!/^\d\d:\d\d$/.test(it.t)) E(tag + ' detail time must be digits ' + it.t); });
        if (!q.visual.labels[x.day] || !x.items.some(i => i.label === q.visual.labels[x.day])) E(tag + ' cell label not in its day');
        for (let k = 1; k < det.length; k++) if (det[k - 1].t >= det[k].t) E(tag + ' detail not sorted');
      });
      const day = q.visual.details[D.day].items; if (!day.some(it => it.t === digital24(D.h, D.mi))) E(tag + ' target time not in detail');
      const st = { half:true, zheng:false };
      if (c.zh !== ptZh(D.h, D.mi, st)) E(tag + ' correct ' + c.zh);
      q.options.filter(o => !o.ok).forEach(o => { if (o.zh === c.zh) E(tag + ' wrong equals correct'); });
      if (today.items.length > 1 && !q.options.some(o => !o.ok && o.why === 'otherEv')) E(tag + ' no same-day trap option');
    }
    if (id === 'relDay'){
      const { y, m, today } = q.visual, T = new Date(y, m - 1, today), w = T.getDay();
      if (w < 1 || w > 5) E(tag + ' today weekday ' + w);
      const off = { '大前天':-3, '大後天':3, '前天':-2, '昨天':-1, '明天':1, '後天':2 }[q.line.zh.startsWith('大') ? q.line.zh.slice(0, 3) : q.line.zh.slice(0, 2)], tg = new Date(y, m - 1, today + off);
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
      const z0 = q.line.zh, dbl = (z0[0] === '上' || z0[0] === '下') && z0[1] === z0[0] ? 1 : 0, rel = { '上':-1, '這':0, '下':1 }[z0[0]] * (dbl ? 2 : 1), X = WK_ZH.indexOf(z0[3 + dbl]);
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
      const rd = { '大前天':-3, '大後天':3, '前天':-2, '昨天':-1, '明天':1, '後天':2 }[s.startsWith('大') ? s.slice(0, 3) : s.slice(0, 2)];
      if (rd !== undefined) exp = new Date(y, m - 1, today + rd);
      else if ('上這下'.includes(s[0]) && (s.slice(1, 3) === '星期' || s.slice(2, 4) === '星期')){
        const dbl = s[1] === s[0] ? 1 : 0, rel = { '上':-1, '這':0, '下':1 }[s[0]] * (dbl ? 2 : 1), X = WK_ZH.indexOf(s[3 + dbl]);
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
    const a = makeQuestions('all', 'mix', 50), ids = new Set(a.map(x => x.id)); if (a.length !== 50) E('mix length');
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
        check(pg.evaluate("document.querySelectorAll('.unit').length") == 4, 'four units on start screen')
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

        pg.evaluate("startRound(['dateListen'], 'easy', 'dateListen', false, 10)")
        check(pg.evaluate("!document.querySelector('#peek') && !document.querySelector('#peekBox') && !!document.querySelector('#hear')") and 'undefined' not in pg.evaluate("document.body.innerText"), 'dateListen: no 看文字 button, no undefined, 聽 button present')
        pg.evaluate("renderStart()")
        for sub, lvl in [('schedListen','easy'),('clockListen','easy')]:
            pk = []
            for _ in range(30):
                pg.evaluate("startRound(['%s'], '%s', '%s', false, 10)" % (sub, lvl, sub))
                pk.append(pg.evaluate("[App.cur.options[0].svg ? 'clock' : 'text', !!document.querySelector('#peek')]"))
            if sub == 'schedListen':
                check(all(not x[1] for x in pk), 'schedListen: never a 看文字 button')
            else:
                check(all(x[1] == (x[0] == 'clock') for x in pk) and any(x[0]=='text' for x in pk) and any(x[0]=='clock' for x in pk), 'clockListen: 看文字 only on the clock-face version')
        pg.evaluate("startRound(['schedListen'], 'easy', 's', false, 10)")
        check(pg.evaluate("[...document.querySelectorAll('.opt .zrow')].length >= 4 && [...document.querySelectorAll('.opt .zrow')].every(r => /^\\d{1,2}:\\d\\d$/.test(r.children[0].textContent.replace(/\\s/g,'')) && r.children[1].textContent.replace(/\\s/g,'').length > 0)"), 'schedListen cards: time comes first, same order as Chinese, in the same character format')
        pg.evaluate("renderStart()")
        print('== 月曆行程 30 種')
        ev = pg.evaluate("EVENTS.map(e => ({id:e.id, label:e.label, times:e.times, day:e.day, fut:e.fut, past:e.past, es:e.es, en:e.en, esP:e.esP, enP:e.enP, doZh:e.doZh}))")
        check(len(ev) == 30 and len({e['id'] for e in ev}) == 30 and len({e['label'] for e in ev}) == 30, '30 events, unique ids and labels')
        check(any(e['label'] == '上中文課' for e in ev) and not any(e['label'] == '上課' for e in ev), '上中文課 present, plain 上課 removed')
        check(all(e['fut'] and e['past'] and e['es'] and e['en'] and e['esP'] and e['enP'] and e['doZh'] for e in ev), 'every event has all forms')
        check(all(h not in (11, 17, 18) for e in ev for h, _ in e['times']) and all(e['day'] in ('wk', 'we', 'any') for e in ev), 'no ambiguous hours; day type valid')
        check(all(len(e['label']) <= 4 for e in ev), 'calendar labels at most 4 characters')
        bad = pg.evaluate("(() => { let b = 0; for (let k = 0; k < 400; k++) for (const n of [5, 8, 11]){ const ls = makeMonth(n).events.map(x => x.ev.label); if (ls.length !== n) b++; if (['運動','游泳','打籃球'].filter(x => ls.includes(x)).length > 1 || ['唱歌','演唱會'].filter(x => ls.includes(x)).length > 1) b++; } return b; })()")
        check(bad == 0, 'makeMonth: right count, no look-alike events together')
        print('== 大前天、大後天')
        cnt = pg.evaluate("(() => { const r = {}; for (const lv of ['easy','mid','hard']) for (const g of ['relDay','tapRelDay']){ let n = 0; for (let k = 0; k < 400; k++){ const q = GEN[g](lv); const z = q.line ? q.line.zh : q.audio; if (/^大(前|後)天/.test(z)) n++; } r[lv + '/' + g] = n; } return r; })()")
        check(all(cnt[k] == 0 for k in cnt if not k.startswith('hard')), 'easy/mid never use 大前天/大後天: %s' % cnt)
        check(all(cnt[k] > 20 for k in cnt if k.startswith('hard')), 'hard uses 大前天/大後天 regularly: %s' % cnt)
        print('== 詞間空隔（只影響畫面）')
        gp = lambda z: pg.evaluate("(z) => gapAfter(parseLine(z)).map(i => Array.from(z)[i]).join('')", z)
        check(gp('二零二六年五月二十日五點十五分') == '年月日點', 'gap after 年月日點, none after final 分')
        check(gp('二零二六年五月二十日五點十五分三十秒') == '年月日點分', 'gap after 分 before 秒; final 秒 none')
        check(gp('五點半') == '', '五點半: no gap before 半')
        check(gp('十五分鐘') == '', '分鐘 stays together')
        check(gp('二個月') == '', '二個月 final: no trailing gap')
        check(gp('二個月十五日') == '月', '二個月 then 日: gap after 月')
        check(gp('明天下午五點') == '天午', '明天 下午 gap; 五點 final none')
        check(gp('星期日') == '' and gp('星期三下午') == '三', '星期X is one word')
        check(gp('今天，五點') == '', 'no gap before punctuation')
        check(pg.evaluate("plainZh('二零二六年五月')") == '二零二六年五月' and 'gap' in pg.evaluate("lineHTML('五月二十日')"), 'text unchanged; gap only in rendered html')

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
                pg.evaluate("startRound(['%s'], '%s', '%s', false, 10)" % (sub, lv, sub))
                run_round(pg, True)
                sc = pg.evaluate("App.score")
                if sc != 100:
                    check(False, '%s/%s perfect round score=%s' % (sub, lv, sc))
        check(fails == before, 'every sub-mode scored 100 when answered correctly')

        print('== 鐘錶風格 ＋ 日出日落色帶')
        for sub in ALL_SUBS:
            pg.evaluate("startRound(['%s'], 'mid', '%s', false, 10)" % (sub, sub)); pg.wait_for_timeout(50)
            r = pg.evaluate("""() => { const b = document.querySelector('.tod'); return b ? { h:b.getBoundingClientRect().height, cls:document.documentElement.className, hasMk:!!b.querySelector('.mk') } : null; }""")
            check(r and abs(r['h'] - 30) < 1 and r['hasMk'] and r['cls'].startswith('tod-'), '%s: 30px band + marker + html class (%s)' % (sub, r))
        for hh, cl in [(7, 'tod-morning'), (13, 'tod-afternoon'), (21, 'tod-night'), (3, 'tod-night'), (12, 'tod-afternoon'), (19, 'tod-night')]:
            check(pg.evaluate("todClass(%d)" % hh) == cl, 'todClass(%d)=%s' % (hh, cl))
        pg.evaluate("startRound(['schedListen'], 'mid', 's', false, 10)")
        pg.evaluate("startRound(['yearView'], 'mid', 'y', false, 10)"); pg.wait_for_timeout(50)
        for _ in range(12):
            if pg.evaluate("!!document.querySelector('.ycal')"): break
            pg.evaluate("document.querySelector('#next') && !document.querySelector('#next').hidden && document.querySelector('#next').click()")
        txt = pg.evaluate("document.body.innerText")
        check('是幾年' not in txt, 'year questions say 哪一年 not 幾年')
        check(pg.evaluate("!document.querySelector('.ycal') || !document.querySelector('.datebox')"), 'year view has no Hoy box')

        print('== 上上/下下星期、前年/後年、聽力顯示念的題目')
        r = pg.evaluate("""() => { const o = {};
          for (const [id, lv] of [['relWeek','hard'],['tapRelWeek','hard'],['relWeek','mid'],['tapRelWeek','mid'],['relWeek','easy'],['tapRelWeek','easy']]){ const k = id + lv; o[k] = new Set(); for (let i = 0; i < 400; i++){ const q = GEN[id](lv); const z = q.line ? q.line.zh : q.audio; const m = z.match(/^(上上|下下|上|下|這)星期/); if (m) o[k].add(m[1]); } o[k] = [...o[k]]; }
          const y = new Set(); for (let i = 0; i < 400; i++){ const q = GEN.yearView('mid'); y.add(q.line.zh.slice(0,2)); } const yh = new Set(); for (let i = 0; i < 400; i++){ const q = GEN.yearView('hard'); yh.add(q.line.zh.slice(0,2)); } o.yh = [...yh];
          const ye = new Set(); for (let i = 0; i < 400; i++){ const q = GEN.yearView('easy'); ye.add(q.line.zh.slice(0,2)); }
          const t = GEN.tapAbs('mid'); o.say = t.fb.say === t.audio; o.hasDbl = o.relWeekhard.includes('上上') && o.relWeekhard.includes('下下') && o.tapRelWeekhard.includes('上上'); o.y = [...y]; o.ye = [...ye]; return o; }""")
        check('上' in r['relWeekmid'] and '上上' not in r['relWeekmid'] and '下下' not in r['tapRelWeekmid'], 'mid has 上星期 but no 上上/下下 (%s)' % r['relWeekmid'])
        check('上' not in r['relWeekeasy'] and '上上' not in r['relWeekeasy'], 'easy only 這/下 星期 (%s)' % r['relWeekeasy'])
        check('前年' not in r['y'] and '後年' not in r['y'] and '去年' in r['y'], 'mid year has 去年/明年 but no 前年/後年 (%s)' % r['y'])
        check('去年' not in r['ye'] and '前年' not in r['ye'], 'easy year has no year words')
        check(r['hasDbl'], 'hard has 上上/下下星期')
        check('前年' in r['yh'] and '後年' in r['yh'], 'hard year has 前年/後年 (%s)' % r['yh'])
        check(r['say'], 'tap question feedback shows the spoken sentence')
        pg.evaluate("startRound(['tapAbs'], 'mid', 't', false, 10)"); pg.wait_for_timeout(50)
        answer(pg, False); pg.wait_for_selector('#next:not([hidden])')
        check(pg.evaluate("!!document.querySelector('.fb .say')"), 'tap feedback renders .say')

        print('== 所有聽力題答完都顯示念的句子')
        for sub in ['clockListen', 'dateListen', 'schedListen', 'tapAbs', 'tapRelDay', 'tapRelWeek', 'clockSet']:
            pg.evaluate("startRound(['%s'], 'mid', 'q', false, 10)" % sub); pg.wait_for_timeout(50)
            has_audio = pg.evaluate("!!document.querySelector('#hear')")
            answer(pg, False); pg.wait_for_selector('#next:not([hidden])')
            say = pg.evaluate("(document.querySelector('.fb .say')||{}).innerText||''")
            if has_audio: check(len(say) > 1, '%s shows spoken sentence after answer (%r)' % (sub, say[:20]))
        pg.evaluate("startRound(['relDay'], 'mid', 'q', false, 10)"); pg.wait_for_timeout(50)
        answer(pg, False); pg.wait_for_selector('#next:not([hidden])')
        check(pg.evaluate("!document.querySelector('.fb .say')"), 'non-listening question shows no .say')

        print('== 答案欄位：標題條 ＋ 紙卡；配對題清單')
        pg.evaluate("startRound(['schedMatch'], 'mid', 'q', false, 10)"); pg.wait_for_timeout(50)
        answer(pg, False); pg.wait_for_selector('#next:not([hidden])')
        r = pg.evaluate("({ h:!!document.querySelector('.fb .fbh'), n:document.querySelectorAll('.fb .fbr').length, m:App.cur.slots.length, tm:[...document.querySelectorAll('.fb .fbr .tm')].map(e=>e.innerText).join() === App.cur.slots.map(s=>s.label).join() })")
        check(r['h'] and r['n'] == r['m'] and r['tm'], 'match feedback: header bar + one row per slot, times in order (%s)' % r)
        pg.evaluate("startRound(['relDay'], 'mid', 'q', false, 10)"); pg.wait_for_timeout(50)
        answer(pg, True); pg.wait_for_selector('#next:not([hidden])')
        check(pg.evaluate("document.querySelector('.fb.ok .fbh') && !document.querySelector('.fb .fbr')"), 'ok feedback: green header, no list')

        print('== 四個單元（昨天明天、上下星期在單元二；點日期題都在單元四）')
        u = pg.evaluate("UNITS.map(x => [x.id, x.subs.map(s => s[0])])")
        check(len(u) == 4 and [x[0] for x in u] == ['u1','u2','u3','u4'], 'four units (%s)' % [x[0] for x in u])
        d = dict(u)
        check('relDay' in d['u2'] and 'relWeek' in d['u2'] and len(d['u2']) == 5, 'u2 = date/weekday + relDay/relWeek (5 types)')
        check(all(k in d['u4'] for k in ('tapAbs', 'yearView', 'tapRelDay', 'tapRelWeek')) and len(d['u4']) == 7, 'u4 = calendar + all tap types + yearView (7 types)')
        check(pg.evaluate("UNITS[1].t.zh || UNITS[1].t") is not None and '日期和星期' in str(pg.evaluate("JSON.stringify(UNITS[1].t)")), 'unit 2 named 日期和星期')
        check(sorted(sum(d.values(), [])) == sorted(pg.evaluate("Object.keys(GEN)")), 'every question type is in exactly one unit')
        r = pg.evaluate("""() => { const o = {}; for (const lv of ['easy','mid','hard']) for (const g of ['relDay','tapRelDay']){ const s = new Set(); for (let k = 0; k < 500; k++){ const q = GEN[g](lv); const z = q.line ? q.line.zh : q.audio; const m = z.match(/^(大前天|大後天|前天|後天|昨天|明天)/); if (m) s.add(m[1]); } o[lv + '/' + g] = [...s].sort().join(); } return o; }""")
        check(all(v == '明天,昨天' for k, v in r.items() if k.startswith('easy')), 'easy 昨天/明天 only: %s' % r)
        check(all(v == '前天,後天,明天,昨天' for k, v in r.items() if k.startswith('mid')), 'mid adds 前天/後天: %s' % r)
        check(all(len(v.split(',')) == 6 for k, v in r.items() if k.startswith('hard')), 'hard has all six: %s' % r)

        print('== 標題銘牌與設定面板風格')
        pg.evaluate("renderStart()")
        r = pg.evaluate("""() => { const h = getComputedStyle(document.querySelector('.title h1')); const g = getComputedStyle(document.querySelector('#gear')); return { hbg:h.backgroundColor, bw:h.borderTopWidth, round:g.borderTopLeftRadius }; }""")
        check(r['bw'] == '2px' and r['hbg'] != 'rgba(0, 0, 0, 0)' and r['round'] in ('50%', '21px'), 'title plate + round gear knob (%s)' % r)
        pg.evaluate("openSettings()")
        r = pg.evaluate("""() => { const h3 = getComputedStyle(document.querySelector('.overlay .panel h3')); const on = getComputedStyle(document.querySelector('.overlay .seg button.on')); const off = getComputedStyle(document.querySelector('.overlay .seg button:not(.on)')); return { h3:h3.backgroundColor, on:on.backgroundColor, off:off.color, n:document.querySelectorAll('.overlay .seg').length }; }""")
        check(r['n'] == 5 and r['h3'] != 'rgba(0, 0, 0, 0)' and r['on'] != r['h3'], 'settings: dark header, 5 rows, lit selected segment (%s)' % r)
        pg.evaluate("document.querySelector('.overlay').remove()")

        print('== 單元：點一下直接開始 25 題；綜合 50 題；百分制')
        pg.evaluate("renderStart()")
        check(pg.evaluate("document.querySelectorAll('.unit').length") == 4 and pg.evaluate("document.querySelectorAll('.unit .subs, [data-sub], [data-unitmix]').length") == 0, 'four unit buttons, no sub lists')
        pg.click('[data-ustart="u3"]'); pg.wait_for_selector('#fb', state='attached')
        r = pg.evaluate("({ n:App.qs.length, ids:[...new Set(App.qs.map(q => q.id))].sort().join() })")
        check(r['n'] == 25 and r['ids'] == 'periodChoice,schedListen,schedMatch', 'unit 3 = 25 questions of its 3 types (%s)' % r)
        answer(pg, True); pg.wait_for_selector('#next:not([hidden])')
        check(pg.evaluate("App.score") == 4, 'one right of 25 = 4 points')
        pg.evaluate("renderStart()")
        pg.evaluate("startRound('all','mix','mix',true)")
        check(pg.evaluate("App.qs.length") == 50, 'mixed challenge = 50 questions')
        answer(pg, True); pg.wait_for_selector('#next:not([hidden])')
        check(pg.evaluate("App.score") == 2, 'one right of 50 = 2 points')
        pg.evaluate("renderStart()")

        print('== 故意答錯：不當機、不給分')
        for sub in ALL_SUBS:
            pg.evaluate("startRound(['%s'], 'mid', '%s', false, 10)" % (sub, sub))
            run_round(pg, False)
            sc = pg.evaluate("App.score")
            check(sc < 100, '%s wrong-answers round finished (score=%s)' % (sub, sc))

        print('== 綜合挑戰')
        pg.evaluate("renderStart()"); pass
        pg.evaluate("startRound('all','mix','mix',true)")
        run_round(pg, True)
        check(pg.evaluate("App.score") == 100, 'mixed challenge perfect = 100')
        pg.wait_for_timeout(600)
        check(pg.evaluate("!document.body.innerHTML.includes('firebase')"), 'no firebase')

        print('== 設定組合（字形 × 語言 × 拼音）：每種都跑完一輪')
        combos = [('trad','es','pinyin'), ('simp','en','zhuyin'), ('trad','zh','both'), ('simp','es','off')]
        for (s, l, ph) in combos:
            pg.evaluate("Settings.script='%s'; Settings.lang='%s'; Settings.phon='%s'; renderStart()" % (s, l, ph))
            for sub in ['clockChoice', 'dateChoice', 'schedMatch', 'calWhatTime', 'relWeek', 'tapAbs', 'yearView', 'clockSet']:
                pg.evaluate("startRound(['%s'],'mid','%s',false, 10)" % (sub, sub))
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
                pg.evaluate("startRound(['%s'],'mid','%s',false, 10)" % (sub, sub)); pg.wait_for_timeout(100)
                if sub == 'calWhatTime':
                    pg.click('.cal td.tap')
                shot('q_' + sub)
                answer(pg, False); pg.wait_for_selector('#next:not([hidden])'); shot('a_' + sub)
            pg.evaluate("Settings.lang='zh'; Settings.phon='both'; startRound(['clockChoice'],'hard','x',false, 10)"); shot('z_both_clockChoice')
            pg.evaluate("Settings.script='simp'; Settings.lang='en'; Settings.phon='zhuyin'; startRound(['schedListen'],'hard','x',false, 10)"); shot('z_simp_schedListen')
        b.close()
    print('FAILS', fails)
    sys.exit(1 if fails else 0)
