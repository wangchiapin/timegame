/* =====================================================================
   出題：每個 gXxx(lv) 回傳一題，lv = 'easy' | 'mid' | 'hard'
   題目格式：
     { id, kind:'choice'|'dial'|'tap'|'match', instr:L, line:{zh,es,en}|null,
       visual:{...}|null, audio:'要念的中文'|null, options:[{zh|svg, badge, gloss, ok, why, d, key}],
       target, fb:{ ansZh, extra } }
   ===================================================================== */

/* ---------- 答錯時的說明 ---------- */
const WHY = {
  hourDur:  L('「點」是幾點；「小時」是一段時間。', 'Para decir la hora se usa 點; 小時 es una duración.', '點 tells the clock time; 小時 is a length of time.'),
  minDur:   L('幾點幾分用「分」；「分鐘」是一段時間。', 'Para la hora se usa 分; 分鐘 es una duración.', 'Use 分 for the clock time; 分鐘 is a length of time.'),
  two:      L('2 點要說「兩點」，不說「二點」。', 'Las 2 se dicen 兩點, no 二點.', 'Two o’clock is 兩點, not 二點.'),
  swap:     L('時針（短）和分針（長）看反了。', 'Confundiste la manecilla corta (hora) con la larga (minutos).', 'You mixed up the short (hour) and long (minute) hands.'),
  secUnit:  L('秒針的數字要說「秒」，不是「分」。', 'Los segundos se dicen 秒, no 分.', 'Seconds are 秒, not 分.'),
  swapms:   L('分和秒說反了。', 'Cambiaste los minutos y los segundos.', 'You swapped the minutes and the seconds.'),
  time:     L('這個時間和鐘面上的不一樣，再看一次。', 'Esa hora no coincide con la del reloj. Míralo otra vez.', 'That time does not match the clock. Look again.'),
  ge:       L('年、月、日（號）前面不加「個」。', 'No se pone 個 delante de 年, 月, 日 ni 號.', 'Do not put 個 before 年, 月, 日 or 號.'),
  order:    L('中文的日期從大到小：年、月、日。', 'En chino la fecha va de mayor a menor: año, mes, día.', 'Chinese dates go from largest to smallest: year, month, day.'),
  yearQty:  L('年份要一個數字一個數字念：二零二六年。', 'El año se lee dígito por dígito: 二零二六年.', 'A year is read digit by digit: 二零二六年.'),
  val:      L('日期的數字不對，再看一次月曆。', 'Los números de la fecha no coinciden. Mira otra vez el calendario.', 'The numbers in the date do not match. Look at the calendar again.'),
  weekWrong:L('星期不對，看一下月曆最上面的星期。', 'El día de la semana no es correcto; mira la cabecera del calendario.', 'The weekday is wrong; check the header of the calendar.'),
  sevenWk:  L('星期天（星期日）不說「星期七」。', 'El domingo es 星期天 o 星期日, no 星期七.', 'Sunday is 星期天 or 星期日, never 星期七.'),
  wk:       L('星期不對，再看一次月曆。', 'El día de la semana no es correcto. Mira otra vez el calendario.', 'That is not the right weekday. Look at the calendar again.'),
  periodOrder:L('時段要放在前面：「早上七點」，不是「七點早上」。', 'El momento del día va primero: 早上七點, no 七點早上.', 'The part of the day comes first: 早上七點, not 七點早上.'),
  pmAm:     L('早上、中午、下午、晚上要和 24 小時制對起來：下午三點是 15:00。', 'Mañana, mediodía, tarde y noche se corresponden con el reloj de 24 horas: 下午三點 son las 15:00.', 'Morning, noon, afternoon and evening map to the 24-hour clock: 下午三點 is 15:00.'),
  periodWrong:L('時段不對，想一想這是白天還是晚上。', 'El momento del día no corresponde a esa hora.', 'That part of the day does not fit this time.'),
  heard:    L('', '', ''),   // 聽力選錯：不顯示說明（畫面上已有「你選的是…」和正確答案）
  act:      L('聽到的行程不是這個，再聽一次。', 'No es la actividad que se oyó. Escucha otra vez.', 'That is not the activity you heard. Listen again.'),
  weekShift:L('這是不同星期的同一天，要注意「上、這、下」。', 'Es el mismo día de la semana, pero de otra semana. Fíjate en 上, 這, 下.', 'Same weekday, but a different week. Watch 上, 這 and 下.'),
  dayShift: L('差了一天，再數一次。', 'Te equivocaste por un día; cuenta otra vez.', 'Off by one day; count again.'),
  rel:      L('要從標著「今天」的那一格開始算。', 'Cuenta a partir del día marcado como «hoy».', 'Count from the day marked “today”.'),
  month:    L('月份不對，再看一次年曆。', 'El mes no es correcto. Mira otra vez el calendario anual.', 'That is not the right month. Look at the year calendar again.'),
  year:     L('年份不對，想一想今年是哪一年。', 'El año no es correcto. Piensa en qué año estamos.', 'That is not the right year. Think about which year it is now.'),
  tap:      L('你點的不是這一天。', 'No es ese día.', 'That is not the day.'),
  ev:       L('月曆上那一天不是這個行程。', 'Ese día del calendario no tiene esa actividad.', 'That day on the calendar has a different plan.')
};

/* ---------- 選項 ---------- */
const okey = o => (o.key != null ? o.key : o.zh);
function mkOptions(correct, wrongs, n){
  n = n || 4;
  const seen = new Set([okey(correct)]), out = [];
  for (const w of wrongs){ const k = okey(w); if (seen.has(k)) continue; seen.add(k); out.push(Object.assign({ ok:false }, w)); if (out.length >= n - 1) break; }
  return shuffle([Object.assign({}, correct, { ok:true }), ...out]);
}
const timeKey = (h, m, s) => h + ':' + m + ':' + (s == null ? '' : s);

/* =====================  單元一：看時鐘  ===================== */
function pickTime(lv, withSec){
  const h = randInt(1, 12); let m, s = null;
  if (lv === 'easy') m = pick([0, 30]);
  else if (lv === 'mid') m = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
  else m = Math.random() < 0.15 ? pick([0, 30]) : randInt(1, 59);
  if (withSec && lv === 'hard' && Math.random() < 0.6){ s = pick([10, 15, 20, 25, 30, 35, 40, 45, 50, 55]); if (m === 0) m = randInt(1, 59); }
  return { h, m, s };
}
const randStyle = () => ({ half:Math.random() < 0.5, zheng:Math.random() < 0.5, ling:Math.random() < 0.5 });

function wrongTimes(h, m, s, lv){
  const c = [];
  const add = (h2, m2, s2, why) => {
    h2 = ((h2 - 1 + 12) % 12) + 1;
    if (m2 < 0 || m2 > 59 || (s2 != null && (s2 < 0 || s2 > 59))) return;
    if (timeKey(h2, m2, s2) === timeKey(h, m, s)) return;
    c.push({ h:h2, m:m2, s:s2, why:why || 'time' });
  };
  if (lv === 'easy'){
    add(h + 1, m, s); add(h - 1, m, s); add(h + 2, m, s); add(h, m === 0 ? 30 : 0, s); add(h + 1, m === 0 ? 30 : 0, s); add(h - 1, m === 0 ? 30 : 0, s);
    return c;
  }
  add(h + 1, m, s); add(h - 1, m, s); add(h + 2, m, s);
  if (m % 5 === 0){ add(h, (m + 5) % 60, s); add(h, (m + 55) % 60, s); add(h, (m + 10) % 60, s); }
  else { add(h, m + 1, s); add(h, m - 1, s); add(h, m + 2, s); add(h, m - 2, s); }
  if (m % 5 === 0 && s == null){ const h2 = (m / 5) || 12, m2 = (h % 12) * 5; add(h2, m2, s, 'swap'); }
  if (s != null){ add(h, m, (s + 5) % 60); add(h, m, (s + 55) % 60); if (m >= 10) add(h, s, m, 'swapms'); }
  return c;
}
function formErrors(h, m, s, st){
  const out = [], t = tZh(h, m, s, st);
  if (s == null){
    if (m === 0 || (m === 30 && st.half)) out.push({ zh:hourZh(h) + '小時' + (m === 30 ? '半' : (st.zheng ? '整' : '')), why:'hourDur' });
    else out.push({ zh:hourZh(h) + '小時' + (m < 10 ? (st.ling === false ? '' : '零') + DIGZ[m] : numZh(m)) + '分', why:'hourDur' });
    if (m !== 0 && !(m === 30 && st.half)) out.push({ zh:hourZh(h) + '點' + (m < 10 ? (st.ling === false ? '' : '零') + DIGZ[m] : numZh(m)) + '分鐘', why:'minDur' });
  } else {
    out.push({ zh:t.slice(0, -1) + '分', why:'secUnit' });
  }
  if (h === 2) out.push({ zh:t.replace('兩', '二'), why:'two' });
  return out.filter(f => f.zh !== t);
}

function gClockChoice(lv){
  const { h, m, s } = pickTime(lv, true), st = randStyle();
  const correctZh = tZh(h, m, s, st);
  const nForms = lv === 'easy' ? 1 : (Math.random() < 0.5 ? 1 : 2);
  const wrongs = shuffle(formErrors(h, m, s, st)).slice(0, nForms);
  shuffle(wrongTimes(h, m, s, lv)).forEach(w => wrongs.push({ zh:tZh(w.h, w.m, w.s, st), why:w.why, d:digital(w.h, w.m, w.s) }));
  let guard = 0;
  while (wrongs.length < 10 && guard++ < 30){ const r = pickTime(lv, s != null); if (timeKey(r.h, r.m, r.s) !== timeKey(h, m, s)) wrongs.push({ zh:tZh(r.h, r.m, r.s, st), why:'time', d:digital(r.h, r.m, r.s) }); }
  return { id:'clockChoice', kind:'choice',
    instr:L('看時鐘，選出正確的說法。', 'Mira el reloj y elige cómo se dice.', 'Look at the clock and choose the correct way to say it.'),
    line:{ zh:'現在幾點？', es:'¿Qué hora es?', en:'What time is it?' },
    visual:{ type:'clock', h, m, s },
    options:mkOptions({ zh:correctZh, why:null, d:digital(h, m, s) }, wrongs),
    fb:{ ansZh:correctZh, extra:digital(h, m, s) } };
}

function gClockSet(lv){
  const { h, m } = pickTime(lv, false), st = randStyle();
  const zh = tZh(h, m, null, st);
  return { id:'clockSet', kind:'dial',
    instr:L('請聽，然後把時針和分針撥到正確的位置。', 'Escucha y mueve las manecillas a la hora correcta.', 'Listen, then move the hands to the right time.'),
    line:null, visual:{ type:'dial', h0:(h === 12 && m === 0) ? 6 : 12, m0:(h === 12 && m === 0) ? 30 : 0 },
    audio:zh, peek:zh, target:{ h, m }, fb:{ ansZh:zh, extra:digital(h, m) } };
}

const HOUR_CONF = { 1:[7], 7:[1], 4:[10], 10:[4], 2:[12], 12:[2], 3:[8], 8:[3] };
function confuseMin(m){
  const c = [];
  if (m >= 10){ const sw = (m % 10) * 10 + Math.floor(m / 10); if (sw < 60 && sw !== m) c.push(sw); }
  if (m + 10 < 60) c.push(m + 10); if (m - 10 >= 0) c.push(m - 10);
  if (m + 5 < 60) c.push(m + 5); if (m - 5 >= 0) c.push(m - 5);
  if (m + 1 < 60) c.push(m + 1); if (m - 1 >= 0) c.push(m - 1);
  return c;
}
function confTimes(h, m, s, lv){
  const set = new Map();
  const add = (h2, m2, s2) => {
    h2 = ((h2 - 1 + 12) % 12) + 1;
    if (m2 < 0 || m2 > 59 || (s2 != null && (s2 < 0 || s2 > 59))) return;
    const k = timeKey(h2, m2, s2);
    if (k === timeKey(h, m, s) || set.has(k)) return;
    set.set(k, { h:h2, m:m2, s:s2 });
  };
  const hc = HOUR_CONF[h] || [];
  const mcs = lv === 'easy' ? [m === 0 ? 30 : 0] : shuffle(confuseMin(m));
  hc.forEach(x => add(x, m, s));
  mcs.forEach(x => add(h, x, s));
  if (hc.length && mcs.length) add(hc[0], mcs[0], s);
  if (s != null) shuffle(confuseMin(s)).forEach(x => add(h, m, x));
  add(h + 1, m, s); add(h - 1, m, s);
  return shuffle([...set.values()]);
}
function gClockListen(lv){
  const { h, m, s } = pickTime(lv, true), st = randStyle();
  const zh = tZh(h, m, s, st);
  const variant = Math.random() < 0.5 ? 'text' : 'clock';
  let cands = confTimes(h, m, s, lv), guard = 0;
  while (cands.length < 6 && guard++ < 30){ const r = pickTime(lv, s != null); if (timeKey(r.h, r.m, r.s) !== timeKey(h, m, s)) cands.push(r); }
  let options;
  if (variant === 'text'){
    options = mkOptions({ zh, why:null, d:digital(h, m, s) }, cands.map(c => ({ zh:tZh(c.h, c.m, c.s, st), why:'heard', d:digital(c.h, c.m, c.s) })));
  } else {
    options = mkOptions({ key:'c' + timeKey(h, m, s), svg:clockSVG({ h, m, s, mini:true }), why:null, d:digital(h, m, s) },
      cands.map(c => ({ key:'c' + timeKey(c.h, c.m, c.s), svg:clockSVG({ h:c.h, m:c.m, s:c.s, mini:true }), why:'heard', d:digital(c.h, c.m, c.s) })));
  }
  return { id:'clockListen', kind:'choice',
    instr:variant === 'text' ? L('請聽，選出正確的時間。', 'Escucha y elige la hora correcta.', 'Listen and choose the correct time.')
                             : L('請聽，選出正確的時鐘。', 'Escucha y elige el reloj correcto.', 'Listen and choose the correct clock.'),
    line:null, visual:null, audio:zh, peek:zh, optClass:variant === 'clock' ? 'clk' : '',
    options, fb:{ ansZh:zh, extra:digital(h, m, s) } };
}

/* =====================  單元二：日期和星期  ===================== */
function randDate(){ const y = randInt(2024, 2029), m = randInt(1, 12), d = randInt(1, dim(y, m)); return { y, m, d }; }
/* o: {st:'日'|'號', sun, year, week, weekText, order:'ymd'|'dmy'|'mdy', gem, ged, gey, qy} */
function dateStr(y, m, d, o){
  const Y = o.year ? (o.qy ? yearQtyZh(y) : digitsZh(y)) + (o.gey ? '個年' : '年') : '';
  const M = numZh(m) + (o.gem ? '個月' : '月');
  const D = numZh(d) + (o.ged ? '個' + o.st : o.st);
  const core = o.order === 'dmy' ? D + M + Y : o.order === 'mdy' ? M + D + Y : Y + M + D;
  const W = o.week ? (o.weekText || wkZh(weekdayOf(y, m, d), o.sun)) : '';
  return core + W;
}
function gDateChoice(lv){
  const { y, m, d } = randDate(), st = pick(['日', '號']), sun = pick(['天', '日']);
  const withYear = lv !== 'easy', withWeek = lv === 'hard';
  const base = { st, sun, year:withYear, week:withWeek, order:'ymd' };
  const mk = (yy, mm, dd, o) => dateStr(yy, mm, dd, Object.assign({}, base, o || {}));
  const correct = mk(y, m, d);
  const grp = { order:[], ge:[], qty:[], val:[], wk:[] };
  grp.order.push({ zh:mk(y, m, d, { order:'dmy' }), why:'order' });
  if (withYear) grp.order.push({ zh:mk(y, m, d, { order:'mdy' }), why:'order' });
  [{ gem:true }, { ged:true }].concat(withYear ? [{ gey:true }] : []).forEach(g => grp.ge.push({ zh:mk(y, m, d, g), why:'ge' }));
  if (withYear) grp.qty.push({ zh:mk(y, m, d, { qy:true }), why:'yearQty' });
  [d - 1, d + 1, d - 2, d + 2].filter(x => x >= 1 && x <= dim(y, m)).forEach(x => grp.val.push({ zh:mk(y, m, x), why:'val' }));
  [m - 1, m + 1].filter(x => x >= 1 && x <= 12).forEach(x => grp.val.push({ zh:mk(y, x, Math.min(d, dim(y, x))), why:'val' }));
  if (withYear) [y - 1, y + 1].forEach(x => grp.val.push({ zh:mk(x, m, d), why:'val' }));
  if (d <= 12 && d !== m) grp.val.push({ zh:mk(y, d, m), why:'val' });
  if (withWeek) shuffle([0, 1, 2, 3, 4, 5, 6].filter(x => x !== weekdayOf(y, m, d))).slice(0, 2).forEach(x => grp.wk.push({ zh:mk(y, m, d, { weekText:wkZh(x, sun) }), why:'weekWrong' }));
  const chosen = [pick(grp.order), pick(grp.ge)];
  const third = lv === 'easy' ? ['val'] : lv === 'mid' ? ['qty', 'val'] : ['qty', 'val', 'wk', 'wk'];
  const tg = pick(third); chosen.push(pick(grp[tg].length ? grp[tg] : grp.val));
  const extra = shuffle([].concat(grp.val, grp.ge, grp.order, grp.qty, grp.wk));
  return { id:'dateChoice', kind:'choice',
    instr:L('看月曆上圈起來的日子，選出正確的中文說法。', 'Mira el día marcado en el calendario y elige cómo se dice en chino.', 'Look at the circled day and choose the correct Chinese.'),
    line:{ zh:'這一{yì}天是什麼時候{hou}？', es:'¿Qué fecha es este día?', en:'What date is this day?' },
    visual:{ type:'cal', y, m, mark:d, mode:'none', cap:true },
    options:mkOptions({ zh:correct, why:null }, chosen.concat(extra)),
    fb:{ ansZh:correct, extra:fmtDate(y, m, d, true) + '（' + dayName(weekdayOf(y, m, d)) + '）' } };
}

function gWeekdayChoice(lv){
  const { y, m, d } = randDate(), dow = weekdayOf(y, m, d), sun = pick(['天', '日']), st = pick(['日', '號']);
  const correct = wkZh(dow, sun);
  const wrongs = shuffle([0, 1, 2, 3, 4, 5, 6].filter(x => x !== dow)).map(x => ({ zh:wkZh(x, sun), why:'wk' }));
  if (lv !== 'easy' && Math.random() < (dow === 0 ? 0.9 : 0.4)) wrongs.unshift({ zh:'星期七', why:'sevenWk' });
  return { id:'weekdayChoice', kind:'choice',
    instr:L('看月曆，找到題目問的日子，選出星期幾。', 'Mira el calendario, busca el día de la pregunta y elige qué día de la semana es.', 'Find the day in the calendar and choose the weekday.'),
    line:{ zh:numZh(m) + '月' + numZh(d) + st + '是星期幾？', es:'¿Qué día de la semana es el ' + d + ' de ' + MONTHS_ES[m - 1] + '?', en:'What day of the week is ' + MONTHS_EN[m - 1] + ' ' + d + '?' },
    visual:{ type:'cal', y, m, mode:'none', cap:true },
    options:mkOptions({ zh:correct, why:null }, wrongs),
    dbg:{ y, m, d, st },
    fb:{ ansZh:correct, extra:fmtDate(y, m, d, true) } };
}

const MON_CONF = { 12:[2, 11], 2:[12], 10:[4, 11], 4:[10], 7:[1, 11], 1:[7, 11], 11:[1, 10, 12], 3:[8], 8:[3], 5:[9], 9:[5], 6:[], };
function gDateListen(lv){
  const { y, m, d } = randDate(), st = pick(['日', '號']), sun = pick(['天', '日']);
  const withYear = lv !== 'easy', withWeek = lv === 'hard';
  const base = { st, sun, year:withYear, week:withWeek, order:'ymd' };
  const mk = (yy, mm, dd) => dateStr(yy, mm, dd, base);
  const zh = mk(y, m, d);
  const N = dim(y, m), cand = new Map();
  const add = (yy, mm, dd) => { if (mm < 1 || mm > 12 || dd < 1 || dd > dim(yy, mm)) return; const k = yy + '/' + mm + '/' + dd; if (k === y + '/' + m + '/' + d || cand.has(k)) return; cand.set(k, { y:yy, m:mm, d:dd }); };
  (MON_CONF[m] || []).forEach(x => add(y, x, Math.min(d, dim(y, x))));
  if (d >= 10) add(y, m, (d % 10) * 10 + Math.floor(d / 10));
  [10, -10, 1, -1, 2, -2].forEach(x => add(y, m, d + x));
  [m + 1, m - 1].forEach(x => add(y, x, Math.min(d, N)));
  if (withYear) [1, -1].forEach(x => add(y + x, m, d));
  const cs = shuffle([...cand.values()]);
  return { id:'dateListen', kind:'choice',
    instr:L('請聽，選出正確的日期。', 'Escucha y elige la fecha correcta.', 'Listen and choose the correct date.'),
    line:null, visual:null, audio:zh,
    options:mkOptions({ zh, why:null, d:digDate(y, m, d) }, cs.map(c => ({ zh:mk(c.y, c.m, c.d), why:'heard', d:digDate(c.y, c.m, c.d) }))),
    fb:{ ansZh:zh, extra:fmtDate(y, m, d, true) } };
}

/* =====================  單元三：一天的行程  ===================== */
/* hours 都避開 11、17、18 點，免得「早上／中午」「下午／晚上」有兩種都說得通的說法 */
const DAILY = [
  { short:'起床',   es:'levantarse',        en:'get up',          hours:[6, 7, 8] },
  { short:'吃早餐', es:'desayunar',         en:'have breakfast',  hours:[7, 8, 9] },
  { short:'上班',   es:'ir al trabajo',     en:'go to work',      hours:[8, 9] },
  { short:'上課',   es:'tener clase',       en:'have class',      hours:[9, 10, 14, 15] },
  { short:'吃午飯', es:'almorzar',          en:'have lunch',      hours:[12, 13] },
  { short:'喝咖啡', es:'tomar café',        en:'drink coffee',    hours:[10, 14, 15] },
  { short:'做功課', es:'hacer la tarea',    en:'do homework',     hours:[14, 15, 16, 20] },
  { short:'回家',   es:'volver a casa',     en:'go home',         hours:[16, 19] },
  { short:'運動',   es:'hacer ejercicio',   en:'exercise',        hours:[7, 19, 20] },
  { short:'吃晚飯', es:'cenar',             en:'have dinner',     hours:[19, 20] },
  { short:'看電視', es:'ver la tele',       en:'watch TV',        hours:[20, 21] },
  { short:'洗澡',   es:'ducharse',          en:'take a shower',   hours:[21, 22] },
  { short:'睡覺',   es:'dormir',            en:'sleep',           hours:[22, 23] },
  { short:'去學校', es:'ir a la escuela',   en:'go to school',    hours:[7, 8] }
];
const schedMins = lv => (lv === 'easy' ? [0] : lv === 'mid' ? [0, 30] : [0, 10, 20, 30, 40, 50]);
function pickSchedule(n, lv, withPeriod){
  const res = [], key = r => (withPeriod ? r.H * 100 + r.m : h12(r.H) * 100 + r.m);
  for (const a of shuffle(DAILY)){
    if (res.length >= n) break;
    const r = { a, H:pick(a.hours), m:pick(schedMins(lv)) };
    if (res.some(x => key(x) === key(r))) continue;
    res.push(r);
  }
  return res.sort((p, q) => p.H * 60 + p.m - (q.H * 60 + q.m));
}
const schedZh = (a, H, m, withPeriod) => '我' + (withPeriod ? periodOf(H) : '') + tZh(h12(H), m, null, { half:true, zheng:false }) + a.short;
const schedLabel = (H, m, withPeriod) => (withPeriod ? digital24(H, m) : digital(h12(H), m));

function gSchedMatch(lv){
  const withPeriod = lv !== 'easy', n = lv === 'easy' ? 3 : lv === 'mid' ? 4 : 5;
  const items = pickSchedule(n, lv, withPeriod);
  const slots = items.map(it => ({ label:schedLabel(it.H, it.m, withPeriod) }));
  const cards = shuffle(items.map((it, i) => ({ zh:schedZh(it.a, it.H, it.m, withPeriod), slot:i, gloss:L('', it.a.es, it.a.en) })));
  return { id:'schedMatch', kind:'match',
    instr:L('把每一句話放到正確的時間。先點句子，再點時間。', 'Pon cada frase en su hora. Toca la frase y luego la hora.', 'Put each sentence at the right time. Tap a sentence, then a time.'),
    line:null, visual:null, slots, cards, dbg:{ items:items.map(it => ({ short:it.a.short, H:it.H, m:it.m })), withPeriod },
    fb:{ ansZh:items.map(it => schedZh(it.a, it.H, it.m, withPeriod)).join('　'), extra:null } };
}
function gSchedListen(lv){
  const withPeriod = lv !== 'easy';
  const it = pickSchedule(1, lv, withPeriod)[0], { a, H, m } = it;
  const zh = schedZh(a, H, m, withPeriod), lab = schedLabel(H, m, withPeriod);
  const card = (act, HH, mm, why) => ({ key:act.short + '|' + schedLabel(HH, mm, withPeriod), zh:act.short, badge:schedLabel(HH, mm, withPeriod), gloss:L('', act.es, act.en), why, d:act.short + ' ' + schedLabel(HH, mm, withPeriod) });
  const wrongs = [];
  const flip = m === 0 ? 30 : 0;
  [[H + 1, m], [H - 1, m], [H, flip], [H + 2, m]].forEach(([HH, mm]) => { if (HH >= 6 && HH <= 23 && (withPeriod || h12(HH) !== h12(H) || mm !== m)) wrongs.push(card(a, HH, mm, 'heard')); });
  const others = shuffle(DAILY.filter(x => x.short !== a.short));
  others.slice(0, 2).forEach(o => wrongs.push(card(o, H, m, 'act')));
  others.slice(2, 4).forEach(o => wrongs.push(card(o, pick(o.hours), pick(schedMins(lv)), 'act')));
  const picked = shuffle(wrongs);
  // 至少一個「同一個行程、不同時間」，一個「同一個時間、不同行程」
  const sameAct = picked.filter(w => w.zh === a.short), otherAct = picked.filter(w => w.zh !== a.short);
  const wr = [].concat(sameAct.slice(0, 1), otherAct.filter(w => w.badge === lab).slice(0, 1), picked);
  return { id:'schedListen', kind:'choice',
    instr:L('請聽，選出正確的行程和時間。', 'Escucha y elige la actividad y la hora correctas.', 'Listen and choose the right activity and time.'),
    line:null, visual:null, audio:zh, peek:zh, optClass:'cardopt', dbg:{ short:a.short, H, m, withPeriod },
    options:mkOptions(card(a, H, m, null), wr),
    fb:{ ansZh:zh, extra:lab } };
}

const PERIOD_HOURS = [6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 19, 20, 21, 22, 23];
function gPeriodRead(lv){
  /* 反過來：看中文（早上／中午／下午／晚上＋時間），選出正確的數字時間 */
  const H = pick(PERIOD_HOURS), m = pick(schedMins(lv)), st = { half:true, zheng:Math.random() < 0.5 };
  const zh = ptZh(H, m, st), flip = m === 0 ? 30 : 0, wrongs = [];
  const add = (HH, mm, why) => { if (HH >= (why === 'pmAm' ? 1 : 6) && HH <= 23 && !(HH === H && mm === m)) wrongs.push({ zh:digital24(HH, mm), why }); };
  if (H <= 12) add(H + 12, m, 'pmAm'); else add(H - 12, m, 'pmAm');           // 早上／下午搞混（例如 03:00 和 15:00）
  add(H + 1, m, 'time'); add(H - 1, m, 'time'); add(H, flip, 'time'); add(H + 2, m, 'time');
  const trap = wrongs.filter(w => w.why === 'pmAm'), rest = shuffle(wrongs.filter(w => w.why !== 'pmAm'));
  return { id:'periodChoice', kind:'choice',
    instr:L('看中文時間，選出正確的數字時間。', 'Lee la hora en chino y elige la hora en números.', 'Read the Chinese time and choose the digital time.'),
    line:{ zh, es:'', en:'' }, visual:null, dbg:{ form:'read', H, m },
    options:mkOptions({ zh:digital24(H, m), why:null, d:digital24(H, m) }, [].concat(trap, rest)),
    fb:{ ansZh:zh, extra:digital24(H, m) } };
}
function gPeriodChoice(lv){
  if (Math.random() < 0.5) return gPeriodRead(lv);
  const H = pick(PERIOD_HOURS), m = pick(schedMins(lv)), st = { half:true, zheng:Math.random() < 0.5 };
  const correct = ptZh(H, m, st), hh = h12(H);
  const wrongs = [];
  wrongs.push({ zh:tZh(hh, m, null, st) + periodOf(H), why:'periodOrder' });
  ['早上', '下午', '晚上', '中午'].filter(p => p !== periodOf(H) && (p !== '中午' || H === 12 ? true : false)).forEach(p => wrongs.push({ zh:p + tZh(hh, m, null, st), why:'periodWrong' }));
  [H + 1, H - 1].filter(x => x >= 6 && x <= 23).forEach(x => wrongs.push({ zh:ptZh(x, m, st), why:'time', d:digital24(x, m) }));
  const order = wrongs.filter(w => w.why === 'periodOrder'), pw = shuffle(wrongs.filter(w => w.why === 'periodWrong')), tm = shuffle(wrongs.filter(w => w.why === 'time'));
  const wr = [].concat(order, pw.slice(0, 1), tm.slice(0, 1), pw.slice(1), tm.slice(1));
  return { id:'periodChoice', kind:'choice',
    instr:L('看數字時間，選出正確的中文說法（含早上、中午、下午、晚上）。', 'Mira la hora en números y elige cómo se dice (con mañana, mediodía, tarde o noche).', 'Look at the digital time and choose how to say it (with morning, noon, afternoon or evening).'),
    line:null, visual:{ type:'digital', text:digital24(H, m) },
    options:mkOptions({ zh:correct, why:null, d:digital24(H, m) }, wr),
    fb:{ ansZh:correct, extra:digital24(H, m) } };
}

/* =====================  單元四：月曆行事曆  ===================== */
/* 時間都避開 11、17、18 點；day: wk＝星期一到五，we＝週末，any＝都可以 */
const EVENTS = [
  { id:'dentist',  label:'牙醫',   doZh:'看牙醫',     fut:'要去看牙醫',   past:'去看牙醫了',   es:'ir al dentista',               en:'go to the dentist',      esP:'fui al dentista',               enP:'went to the dentist',    times:[[10,0],[10,30],[14,0],[15,30],[16,0]], day:'wk' },
  { id:'meeting',  label:'開會',   doZh:'開會',       fut:'要開會',       past:'開會了',       es:'tener una reunión',            en:'have a meeting',         esP:'tuve una reunión',              enP:'had a meeting',          times:[[9,0],[10,0],[14,0],[15,0]], day:'wk' },
  { id:'dinner',   label:'聚餐',   doZh:'聚餐',       fut:'要去聚餐',     past:'去聚餐了',     es:'ir a una cena con amigos',     en:'go to a group dinner',   esP:'fui a una cena con amigos',     enP:'went to a group dinner', times:[[19,0],[19,30],[20,0]], day:'any' },
  { id:'interview',label:'面試',   doZh:'面試',       fut:'要面試',       past:'面試了',       es:'tener una entrevista',         en:'have an interview',      esP:'tuve una entrevista',           enP:'had an interview',       times:[[9,0],[10,30],[14,0]], day:'wk' },
  { id:'exam',     label:'考試',   doZh:'考試',       fut:'要考試',       past:'考試了',       es:'tener un examen',              en:'have an exam',           esP:'tuve un examen',                enP:'had an exam',            times:[[9,0],[10,0],[13,30],[14,0]], day:'wk' },
  { id:'movie',    label:'看電影', doZh:'看電影',     fut:'要去看電影',   past:'去看電影了',   es:'ir al cine',                   en:'go to the movies',       esP:'fui al cine',                   enP:'went to the movies',     times:[[13,0],[15,0],[19,0],[19,30],[20,30]], day:'any' },
  { id:'date',     label:'約會',   doZh:'約會',       fut:'要去約會',     past:'去約會了',     es:'tener una cita',               en:'go on a date',           esP:'tuve una cita',                 enP:'went on a date',         times:[[12,0],[19,0],[20,0]], day:'any' },
  { id:'hiking',   label:'爬山',   doZh:'爬山',       fut:'要去爬山',     past:'去爬山了',     es:'ir de excursión a la montaña', en:'go hiking',              esP:'fui de excursión a la montaña', enP:'went hiking',            times:[[6,0],[7,0],[8,0]], day:'we' },
  { id:'haircut',  label:'剪髮',   doZh:'剪頭髮',     fut:'要去剪頭髮',   past:'去剪頭髮了',   es:'cortarme el pelo',             en:'get a haircut',          esP:'me corté el pelo',              enP:'got a haircut',          times:[[10,0],[15,0],[16,0]], day:'any' },
  { id:'birthday', label:'生日',   doZh:'生日派對',   fut:'要去生日派對', past:'去生日派對了', es:'ir a una fiesta de cumpleaños',en:'go to a birthday party', esP:'fui a una fiesta de cumpleaños',enP:'went to a birthday party', times:[[19,0],[19,30]], day:'we' },
  { id:'concert',  label:'演唱會', doZh:'看演唱會',   fut:'要去看演唱會', past:'去看演唱會了', es:'ir a un concierto',            en:'go to a concert',        esP:'fui a un concierto',            enP:'went to a concert',      times:[[19,0],[19,30]], day:'we' },
  { id:'moving',   label:'搬家',   doZh:'搬家',       fut:'要搬家',       past:'搬家了',       es:'mudarme',                      en:'move house',             esP:'me mudé',                       enP:'moved house',            times:[[8,0],[9,0]], day:'we' },
  { id:'doctor',   label:'醫生',   doZh:'看醫生',     fut:'要去看醫生',   past:'去看醫生了',   es:'ir al médico',                 en:'see the doctor',         esP:'fui al médico',                 enP:'saw the doctor',         times:[[9,0],[10,0],[14,30],[16,0]], day:'wk' },
  { id:'class',    label:'上課',   doZh:'上課',       fut:'要上課',       past:'上課了',       es:'tener clase',                  en:'have class',             esP:'tuve clase',                    enP:'had class',              times:[[8,0],[9,0],[10,0],[13,30],[15,0]], day:'wk' },
  { id:'shopping', label:'逛街',   doZh:'逛街',       fut:'要去逛街',     past:'去逛街了',     es:'ir de compras',                en:'go shopping',            esP:'fui de compras',                enP:'went shopping',          times:[[14,0],[15,30]], day:'we' },
  { id:'gym',      label:'運動',   doZh:'運動',       fut:'要去運動',     past:'去運動了',     es:'hacer ejercicio',              en:'exercise',               esP:'hice ejercicio',                enP:'exercised',              times:[[6,30],[19,0],[20,0]], day:'any' }
];
const nEvents = lv => (lv === 'easy' ? 5 : lv === 'mid' ? 8 : 11);
function makeMonth(n){
  const y = randInt(2025, 2028), m = randInt(1, 12), N = dim(y, m);
  const free = new Set(Array.from({ length:N }, (_, i) => i + 1)), out = [];
  shuffle(EVENTS).slice(0, n).forEach(ev => {
    let pool = [...free].filter(d => { const w = weekdayOf(y, m, d); return ev.day === 'any' || (ev.day === 'wk' ? (w >= 1 && w <= 5) : (w === 0 || w === 6)); });
    if (!pool.length) pool = [...free];
    const day = pick(pool); free.delete(day);
    const t = pick(ev.times);
    out.push({ day, ev, h:t[0], mi:t[1] });
  });
  return { y, m, events:out.sort((a, b) => a.day - b.day) };
}
function calVisual(mo, mode, extra){
  const labels = {}, details = {};
  mo.events.forEach(e => {
    labels[e.day] = e.ev.label;
    const dow = weekdayOf(mo.y, mo.m, e.day);
    details[e.day] = { head:monthZh(mo.m) + dayZh(e.day, '號') + '　' + wkZh(dow, '天'), body:ptZh(e.h, e.mi, { half:true, zheng:false }) + '　' + e.ev.doZh, gloss:L('', e.ev.es, e.ev.en) };
  });
  return Object.assign({ type:'cal', y:mo.y, m:mo.m, mode, labels, details }, extra || {});
}
function gCalFindDay(lv){
  /* 月曆上不寫任何行程；行程只寫在題目裡，學生讀完要在空白月曆上點出對的日期 */
  const mo = makeMonth(lv === 'easy' ? 2 : lv === 'hard' ? 3 : pick([2, 3])), e = pick(mo.events);
  const facts = mo.events.map(x => monthZh(mo.m) + dayZh(x.day, '號') + x.ev.fut).join('，');
  const v = calVisual(mo, 'pick'); v.labels = {}; v.details = {};
  return { id:'calFindDay', kind:'tap',
    instr:L('讀題目裡的行程，在月曆上點出正確的日子，再按「確定」。', 'Lee el plan en la pregunta, toca el día correcto en el calendario y pulsa «Confirmar».', 'Read the plans in the question, tap the right day on the calendar, then press “Confirm”.'),
    line:{ zh:facts + '。' + e.ev.label + '是哪一{yì}天？', es:'¿Qué día es: ' + e.ev.es + '?', en:'Which day: ' + e.ev.en + '?' },
    dbg:{ events:mo.events.map(x => ({ d:x.day, label:x.ev.label, fut:x.ev.fut })), asked:e.ev.label },
    visual:v, target:{ y:mo.y, m:mo.m, d:e.day },
    fb:{ ansZh:monthZh(mo.m) + dayZh(e.day, '號'), extra:fmtDate(mo.y, mo.m, e.day, true) } };
}
function gCalWhatDo(lv){
  const mo = makeMonth(nEvents(lv)), e = pick(mo.events), st = '號';
  const opt = x => ({ key:x.ev.id, zh:x.ev.doZh, gloss:L('', x.ev.es, x.ev.en), why:'ev', d:x.ev.doZh });
  return { id:'calWhatDo', kind:'choice',
    instr:L('看月曆，選出那一天要做什麼。', 'Mira el calendario y elige qué hay que hacer ese día.', 'Look at the calendar and choose what happens that day.'),
    line:{ zh:monthZh(mo.m) + dayZh(e.day, st) + '要做什麼？', es:'¿Qué hay que hacer el ' + fmtDate(mo.y, mo.m, e.day, false) + '?', en:'What is on ' + fmtDate(mo.y, mo.m, e.day, false) + '?' },
    visual:calVisual(mo, 'none'),
    options:mkOptions(Object.assign(opt(e), { why:null }), shuffle(mo.events.filter(x => x !== e)).map(opt)),
    fb:{ ansZh:e.ev.doZh, extra:fmtDate(mo.y, mo.m, e.day, true) } };
}
function gCalWhatTime(lv){
  const mo = makeMonth(nEvents(lv)), e = pick(mo.events), st = { half:true, zheng:false };
  const correct = ptZh(e.h, e.mi, st), flip = e.mi === 0 ? 30 : 0, wrongs = [];
  [[e.h + 1, e.mi], [e.h - 1, e.mi], [e.h, flip], [e.h + 2, e.mi], [e.h - 2, e.mi], [e.h + 1, flip]].forEach(([H, mm]) => {
    if (H >= 6 && H <= 23) wrongs.push({ zh:ptZh(H, mm, st), why:'time', d:digital24(H, mm) });
  });
  return { id:'calWhatTime', kind:'choice',
    instr:L('點月曆上的日子看行程，再選出正確的時間。', 'Toca un día del calendario para ver el plan y elige la hora correcta.', 'Tap a day on the calendar to see the plan, then choose the right time.'),
    line:{ zh:e.ev.label + '是幾點？', es:'¿A qué hora es: ' + e.ev.es + '?', en:'What time: ' + e.ev.en + '?' },
    visual:calVisual(mo, 'view'),
    options:mkOptions({ zh:correct, why:null, d:digital24(e.h, e.mi) }, shuffle(wrongs)),
    fb:{ ansZh:correct, extra:digital24(e.h, e.mi) + '　' + fmtDate(mo.y, mo.m, e.day, true) } };
}

/* =====================  單元五：星期和日期推算  ===================== */
const REL_DAYS = { '-2':'前天', '-1':'昨天', '0':'今天', '1':'明天', '2':'後天' };
const REL_DAYS_L = { '-2':['anteayer', 'the day before yesterday'], '-1':['ayer', 'yesterday'], '0':['hoy', 'today'], '1':['mañana', 'tomorrow'], '2':['pasado mañana', 'the day after tomorrow'] };
function randToday(){
  for (;;){
    const y = randInt(2025, 2028), m = randInt(1, 12), d = randInt(8, 22), w = weekdayOf(y, m, d);
    if (w >= 1 && w <= 5) return { y, m, d, w };
  }
}
const sameMonth = (a, t) => a.y === t.y && a.m === t.m;
function todayVisual(T, extra){ return Object.assign({ type:'cal', y:T.y, m:T.m, today:T.d, mode:'none' }, extra || {}); }
function dateOpt(t, why){ return { zh:monthZh(t.m) + dayZh(t.d, '號'), why:why || 'val', d:fmtDate(t.y, t.m, t.d, false) }; }

function gRelDay(lv){
  const T = randToday(), offs = lv === 'easy' ? [-1, 1] : [-2, -1, 1, 2], off = pick(offs);
  const askWeek = lv === 'easy' ? true : lv === 'mid' ? Math.random() < 0.5 : Math.random() < 0.3;
  const tg = addDays(T.y, T.m, T.d, off), word = REL_DAYS[String(off)];
  const lt = REL_DAYS_L[String(off)];
  const instr = L('看月曆上標示「今天」的那一格，選出正確的答案。', 'Mira el día marcado como «hoy» y elige la respuesta correcta.', 'Find the day marked “today” and choose the right answer.');
  const sun = pick(['天', '日']);
  let options, line, ansZh;
  if (askWeek){
    const dow = weekdayOf(tg.y, tg.m, tg.d); ansZh = wkZh(dow, sun);
    const wr = shuffle([-2, -1, 0, 1, 2].filter(x => x !== off)).map(x => { const t = addDays(T.y, T.m, T.d, x); return { zh:wkZh(weekdayOf(t.y, t.m, t.d), sun), why:'rel' }; });
    shuffle([0, 1, 2, 3, 4, 5, 6]).forEach(x => wr.push({ zh:wkZh(x, sun), why:'wk' }));
    options = mkOptions({ zh:ansZh, why:null }, wr);
    line = { zh:word + '是星期幾？', es:'¿Qué día de la semana es ' + lt[0] + '?', en:'What day of the week is ' + lt[1] + '?' };
  } else {
    ansZh = monthZh(tg.m) + dayZh(tg.d, '號');
    const wr = [];
    [-2, -1, 0, 1, 2].filter(x => x !== off).forEach(x => wr.push(dateOpt(addDays(T.y, T.m, T.d, x), 'rel')));
    [7, -7].forEach(x => wr.push(dateOpt(addDays(tg.y, tg.m, tg.d, x), 'weekShift')));
    options = mkOptions({ zh:ansZh, why:null, d:fmtDate(tg.y, tg.m, tg.d, false) }, shuffle(wr));
    line = { zh:word + '是幾月幾號？', es:'¿Qué fecha es ' + lt[0] + '?', en:'What is the date ' + lt[1] + '?' };
  }
  return { id:'relDay', kind:'choice', instr, line, visual:todayVisual(T), options,
    fb:{ ansZh, extra:'今天 ' + fmtDate(T.y, T.m, T.d, true) + '（' + dayName(T.w) + '）' } };
}

const REL_WEEK = { '-1':['上', 'la semana pasada', 'last week'], '0':['這', 'esta semana', 'this week'], '1':['下', 'la próxima semana', 'next week'] };
function gRelWeek(lv){
  for (let g = 0; g < 200; g++){
    const T = randToday(), wOff = pick(lv === 'easy' ? [0, 1] : [-1, 0, 1]), X = randInt(1, 5);
    if (wOff === 0 && X === T.w) continue;
    const mondayOff = -((T.w + 6) % 7);
    const tg = addDays(T.y, T.m, T.d, mondayOff + wOff * 7 + (X - 1));
    if (!sameMonth(T, tg)) continue;
    const word = REL_WEEK[String(wOff)][0] + wkZh(X, '天');
    const wr = [];
    const sh = (n, why) => { const t = addDays(tg.y, tg.m, tg.d, n); if (sameMonth(T, t)) wr.push(dateOpt(t, why)); };
    sh(7, 'weekShift'); sh(-7, 'weekShift'); sh(1, 'dayShift'); sh(-1, 'dayShift'); sh(2, 'dayShift'); sh(-2, 'dayShift');
    const order = shuffle(wr), wk = order.filter(x => x.why === 'weekShift'), ds = order.filter(x => x.why === 'dayShift');
    const wrongs = [].concat(wk.slice(0, 1), ds.slice(0, 1), order);
    const ansZh = monthZh(tg.m) + dayZh(tg.d, '號');
    return { id:'relWeek', kind:'choice',
      instr:L('看月曆上標示「今天」的那一格，選出正確的日期。', 'Mira el día marcado como «hoy» y elige la fecha correcta.', 'Find the day marked “today” and choose the right date.'),
      line:{ zh:word + '是幾月幾號？', es:'¿Qué fecha es el ' + DAYS_ES[X] + ' de ' + REL_WEEK[String(wOff)][1] + '?', en:'What is the date of ' + DAYS_EN[X] + ' ' + REL_WEEK[String(wOff)][2] + '?' },
      visual:todayVisual(T), options:mkOptions({ zh:ansZh, why:null, d:fmtDate(tg.y, tg.m, tg.d, false) }, wrongs),
      fb:{ ansZh, extra:'今天 ' + fmtDate(T.y, T.m, T.d, true) + '（' + dayName(T.w) + '）' } };
  }
  return gRelDay(lv);
}

function gYearView(lv){
  const cross = lv === 'hard' && Math.random() < 0.5;
  const y = randInt(2025, 2028), m = cross ? pick([1, 12]) : randInt(2, 11), d = randInt(1, 28);
  const kinds = lv === 'easy' ? ['pm', 'nm'] : lv === 'mid' ? ['pm', 'nm', 'ly', 'ny'] : ['pm', 'nm', 'ly', 'ny', 'l2', 'n2'];
  let kind = pick(kinds);
  if (cross){ kind = m === 1 ? pick(['pm', 'ly']) : pick(['nm', 'ny']); }
  const vis = { type:'ycal', y, m, d };
  const base = { id:'yearView', kind:'choice',
    instr:L('看年曆（紅框是這個月），選出正確的答案。', 'Mira el calendario anual (el marco rojo es este mes) y elige la respuesta.', 'Look at the year calendar (the red frame is this month) and choose the answer.'),
    visual:vis };
  if (kind === 'pm' || kind === 'nm'){
    const t = kind === 'pm' ? m - 1 : m + 1, tm = ((t - 1 + 12) % 12) + 1;
    const wr = shuffle([tm - 1, tm + 1, tm + 2, tm - 2, m].map(x => ((x - 1 + 12) % 12) + 1).filter(x => x !== tm)).map(x => ({ zh:monthZh(x), why:x === m ? 'rel' : 'month' }));
    const ansZh = monthZh(tm);
    return Object.assign(base, {
      line:{ zh:(kind === 'pm' ? '上' : '下') + '個月是幾月？', es:kind === 'pm' ? '¿Qué mes es el mes pasado?' : '¿Qué mes es el próximo mes?', en:kind === 'pm' ? 'What month is last month?' : 'What month is next month?' },
      options:mkOptions({ zh:ansZh, why:null }, wr), fb:{ ansZh, extra:fmtDate(y, m, d, true) + (cross ? (kind === 'pm' ? '（上個月是去年）' : '（下個月是明年）') : '') } });
  }
  const dy = { ly:-1, ny:1, l2:-2, n2:2 }[kind], ty = y + dy, ansZh = yearZh(ty);
  const word = { ly:'去年', ny:'明年', l2:'前年', n2:'後年' }[kind];
  const tr = { ly:['el año pasado', 'last year'], ny:['el próximo año', 'next year'], l2:['hace dos años', 'the year before last'], n2:['dentro de dos años', 'the year after next'] }[kind];
  const wr = [{ zh:yearQtyZh(ty) + '年', why:'yearQty' }, { zh:digitsZh(ty) + '個年', why:'ge' }];
  [-2, -1, 0, 1, 2].filter(x => x !== dy).forEach(x => wr.push({ zh:yearZh(y + x), why:x === 0 ? 'rel' : 'year' }));
  return Object.assign(base, {
    line:{ zh:word + '是幾年？', es:'¿Qué año es ' + tr[0] + '?', en:'What year is ' + tr[1] + '?' },
    options:mkOptions({ zh:ansZh, why:null }, wr), fb:{ ansZh, extra:fmtDate(y, m, d, true) } });
}

/* =====================  單元六：聽力點日期  ===================== */
function tapQuestion(T, tg, zh, whenTrans, ev, past){
  const trEs = whenTrans[0] + ', ' + (past ? ev.esP : 'voy a ' + ev.es) + '.';
  const trEn = whenTrans[1] + ', ' + (past ? 'I ' + ev.enP : 'I’m going to ' + ev.en) + '.';
  return { id:'tap', kind:'tap',
    instr:L('請聽，然後點月曆上正確的日子，再按「確定」。', 'Escucha, toca el día correcto del calendario y pulsa «Confirmar».', 'Listen, tap the right day on the calendar, then press “Confirm”.'),
    line:null, visual:todayVisual(T, { mode:'pick' }), audio:zh, peek:zh, target:{ y:tg.y, m:tg.m, d:tg.d },
    fb:{ ansZh:monthZh(tg.m) + dayZh(tg.d, '號'), extra:fmtDate(tg.y, tg.m, tg.d, true), trans:{ es:trEs, en:trEn } } };
}
function gTapAbs(lv){
  const T = randToday(), ev = pick(EVENTS), N = dim(T.y, T.m);
  let d; do { d = randInt(1, N); } while (d === T.d);
  const past = d < T.d, st = pick(['日', '號']);
  const zh = monthZh(T.m) + dayZh(d, st) + '我' + (past ? ev.past : ev.fut);
  const q = tapQuestion(T, { y:T.y, m:T.m, d }, zh, ['El ' + fmtDate(T.y, T.m, d, false), 'On ' + fmtDate(T.y, T.m, d, false)], ev, past);
  q.id = 'tapAbs'; return q;
}
function gTapRelDay(lv){
  const T = randToday(), ev = pick(EVENTS), off = pick(lv === 'easy' ? [-1, 1] : [-2, -1, 1, 2]);
  const tg = addDays(T.y, T.m, T.d, off), past = off < 0, lt = REL_DAYS_L[String(off)];
  const zh = REL_DAYS[String(off)] + '我' + (past ? ev.past : ev.fut);
  const q = tapQuestion(T, tg, zh, [lt[0][0].toUpperCase() + lt[0].slice(1), lt[1][0].toUpperCase() + lt[1].slice(1)], ev, past);
  q.id = 'tapRelDay'; return q;
}
function gTapRelWeek(lv){
  for (let g = 0; g < 200; g++){
    const T = randToday(), ev = pick(EVENTS), wOff = pick(lv === 'easy' ? [0, 1] : [-1, 0, 1]), X = randInt(1, 5);
    if (wOff === 0 && X === T.w) continue;
    const tg = addDays(T.y, T.m, T.d, -((T.w + 6) % 7) + wOff * 7 + (X - 1));
    if (!sameMonth(T, tg)) continue;
    const past = (tg.d < T.d), zh = REL_WEEK[String(wOff)][0] + wkZh(X, '天') + '我' + (past ? ev.past : ev.fut);
    const q = tapQuestion(T, tg, zh, ['El ' + DAYS_ES[X] + ' de ' + REL_WEEK[String(wOff)][1], DAYS_EN[X] + ' ' + REL_WEEK[String(wOff)][2]], ev, past);
    q.id = 'tapRelWeek'; return q;
  }
  return gTapRelDay(lv);
}

/* =====================  單元清單  ===================== */
const GEN = { clockChoice:gClockChoice, clockSet:gClockSet, clockListen:gClockListen,
  dateChoice:gDateChoice, weekdayChoice:gWeekdayChoice, dateListen:gDateListen,
  schedMatch:gSchedMatch, schedListen:gSchedListen, periodChoice:gPeriodChoice,
  calFindDay:gCalFindDay, calWhatDo:gCalWhatDo, calWhatTime:gCalWhatTime,
  relDay:gRelDay, relWeek:gRelWeek, yearView:gYearView,
  tapAbs:gTapAbs, tapRelDay:gTapRelDay, tapRelWeek:gTapRelWeek };
const UNITS = [
  { id:'u1', t:L('單元一　看時鐘', 'Unidad 1 · Leer el reloj', 'Unit 1 · Reading the clock'),
    subs:[['clockChoice', L('看時鐘選說法', 'Mira el reloj y elige', 'Look and choose')], ['clockSet', L('聽時間撥指針', 'Escucha y mueve las manecillas', 'Listen and set the hands')], ['clockListen', L('聽時間選答案', 'Escucha y elige', 'Listen and choose')]] },
  { id:'u2', t:L('單元二　日期和星期', 'Unidad 2 · Fecha y día de la semana', 'Unit 2 · Dates and weekdays'),
    subs:[['dateChoice', L('看日期選中文', 'De la fecha al chino', 'From date to Chinese')], ['weekdayChoice', L('星期幾？', '¿Qué día de la semana?', 'Which weekday?')], ['dateListen', L('聽日期選答案', 'Escucha la fecha y elige', 'Listen to the date')]] },
  { id:'u3', t:L('單元三　一天的行程', 'Unidad 3 · El horario del día', 'Unit 3 · A day’s schedule'),
    subs:[['schedMatch', L('行程配對時間', 'Une cada actividad con su hora', 'Match plans to times')], ['schedListen', L('聽行程選答案', 'Escucha la actividad y elige', 'Listen to the plan')], ['periodChoice', L('早上、中午、下午、晚上', 'Mañana, mediodía, tarde, noche', 'Morning, noon, afternoon, evening')]] },
  { id:'u4', t:L('單元四　月曆行事曆', 'Unidad 4 · Calendario de actividades', 'Unit 4 · Calendar plans'),
    subs:[['calFindDay', L('哪一天要做什麼？（點日期）', '¿Qué día? (toca el día)', 'Which day? (tap it)')], ['calWhatDo', L('這一天要做什麼？', '¿Qué hay ese día?', 'What is on that day?')], ['calWhatTime', L('幾點要做？', '¿A qué hora?', 'At what time?')]] },
  { id:'u5', t:L('單元五　星期和日期推算', 'Unidad 5 · Calcular días y fechas', 'Unit 5 · Working out days'),
    subs:[['relDay', L('昨天、今天、明天', 'Ayer, hoy, mañana', 'Yesterday, today, tomorrow')], ['relWeek', L('上星期、這星期、下星期', 'La semana pasada, esta, la próxima', 'Last, this, next week')], ['yearView', L('年曆：上個月、下個月、去年、明年', 'Año: mes pasado, próximo, año pasado…', 'Year view: last/next month, last/next year')]] },
  { id:'u6', t:L('單元六　聽力點日期', 'Unidad 6 · Escucha y señala el día', 'Unit 6 · Listen and tap the day'),
    subs:[['tapAbs', L('聽幾月幾號', 'Escucha la fecha', 'Listen to the date')], ['tapRelDay', L('聽昨天、明天、後天', 'Escucha ayer, mañana…', 'Listen to yesterday, tomorrow…')], ['tapRelWeek', L('聽上星期、下星期', 'Escucha la semana pasada / próxima', 'Listen to last / next week')]] }
];
const ALL_IDS = Object.keys(GEN);
const qSig = q => [q.id, q.line && q.line.zh, q.audio, JSON.stringify(q.visual), JSON.stringify(q.target), q.cards && q.cards.map(c => c.zh + '|' + c.slot).join(',')].join('#');
function makeQuestions(spec, lv, n){
  /* spec: 'all' 或 一串題型 id；lv: 'easy'|'mid'|'hard'|'mix'。同一回不出現題幹一樣的題目 */
  const ids = spec === 'all' ? ALL_IDS : spec;
  const out = [], seen = new Set(); let bag = [];
  while (out.length < n){
    if (!bag.length) bag = shuffle(ids);
    const id = bag.pop();
    const L2 = lv === 'mix' ? pick(['easy', 'mid', 'mid', 'hard']) : lv;
    let q = null;
    for (let t = 0; t < 30; t++){ q = GEN[id](L2); if (!seen.has(qSig(q))) break; }
    seen.add(qSig(q)); q.lv = L2; out.push(q);
  }
  return out;
}
