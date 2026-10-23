/* =====================================================================
   畫面：時鐘、月曆、各題型互動、結果與排行榜
   ===================================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const sc = s => (Settings.script === 'simp' ? toSimp(s) : s);

const STR = {
  title:    L('練習時間', 'Practica la hora y la fecha', 'Practice time and dates'),
  sub:      L('時鐘、日期、月曆，一起練習中文怎麼說', 'Reloj, fechas y calendario en chino', 'Clocks, dates and calendars in Chinese'),
  nameL:    L('名字', 'Nombre', 'Name'),
  namePh:   L('輸入你的名字', 'Escribe tu nombre', 'Enter your name'),
  settings: L('設定', 'Ajustes', 'Settings'),
  lvNote:   L('難度從下一回開始生效。', 'El nivel cambia en la próxima ronda.', 'The level applies from the next round.'),
  setScript:L('字形', 'Escritura', 'Script'),
  setLang:  L('介面語言', 'Idioma', 'Language'),
  setPhon:  L('拼音／注音', 'Pinyin / Zhuyin', 'Pinyin / Zhuyin'),
  setRate:  L('語速', 'Voz', 'Voice'),
  setLv:    L('難度', 'Nivel', 'Level'),
  mix:      L('綜合挑戰', 'Desafío mixto', 'Mixed challenge'),
  mixSub:   L('50 題，五個單元混合', '50 preguntas de las cinco unidades', '50 questions from all five units'),
  board:    L('排行榜', 'Clasificación', 'Leaderboard'),
  hear:     L('🔊 聽', '🔊 Escuchar', '🔊 Listen'),
  peek:     L('看文字', 'Ver el texto', 'Show text'),
  confirm:  L('確定', 'Confirmar', 'Confirm'),
  next:     L('下一題', 'Siguiente', 'Next'),
  seeResult:L('看結果', 'Ver resultado', 'See result'),
  right:    L('✔ 答對了！', '✔ ¡Correcto!', '✔ Correct!'),
  wrong:    L('✘ 答錯了', '✘ Incorrecto', '✘ Not quite'),
  correctIs:L('正確答案', 'Respuesta correcta', 'Correct answer'),
  youChose: L('你選的是', 'Elegiste', 'You chose'),
  tapHint:  L('點一天，看那天的行程', 'Toca un día para ver el plan', 'Tap a day to see its plan'),
  noPlan:   L('這一天沒有行程', 'Ese día no hay planes', 'Nothing planned that day'),
  again:    L('再玩一次', 'Jugar otra vez', 'Play again'),
  home:     L('回主畫面', 'Volver al inicio', 'Back to start'),
  score:    L('分', 'pts', 'pts'),
  today:    L('今天', 'Hoy', 'Today'),
  loading:  L('讀取中…', 'Cargando…', 'Loading…'),
  lbFail:   L('排行榜暫時連不上', 'La clasificación no está disponible ahora', 'The leaderboard is unavailable right now'),
  lbEmpty:  L('還沒有人上榜，你當第一名吧！', 'Aún no hay nadie. ¡Sé el primero!', 'Nobody yet — be the first!'),
  lbNeedName:L('輸入名字才會記錄到排行榜', 'Escribe tu nombre para entrar en la clasificación', 'Enter your name to be on the leaderboard'),
  lbSaved:  L('已記錄到排行榜', 'Guardado en la clasificación', 'Saved to the leaderboard'),
  close:    L('關閉', 'Cerrar', 'Close'),
  correctSent:L('正確的配對', 'Emparejamiento correcto', 'Correct matches'),
  hintLine: L('先點一句話，再點一個時間', 'Toca una frase y luego una hora', 'Tap a sentence, then a time')
};
const T = k => Lh(STR[k]);
const Ti = k => Li(STR[k]);

/* ---------- 狀態 ---------- */
const App = { name:'', lv:'mid', open:null, round:null, qs:[], i:0, score:0, right:0, t0:0, cur:null, answered:false, sel:null, dial:null, match:null };
try{ App.name = localStorage.getItem('timegame.name') || ''; const l = localStorage.getItem('timegame.lv'); if (['easy', 'mid', 'hard'].includes(l)) App.lv = l; }catch(e){}
const root = () => $('#app');

/* ---------- 音效（有靜音鈕，見 mute.js） ---------- */
let _ac = null;
function sfx(ok){
  try{
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    if (!_ac) _ac = new AC();
    if (_ac.state === 'suspended') _ac.resume();
    const t = _ac.currentTime, notes = ok ? [[660, 0], [880, 0.09]] : [[220, 0], [170, 0.12]];
    notes.forEach(([f, d]) => {
      const o = _ac.createOscillator(), g = _ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
      o.connect(g); g.connect(_ac.destination); o.start(t + d); o.stop(t + d + 0.18);
    });
  }catch(e){}
}

/* =====================  時鐘  ===================== */
function clockSVG(o){
  const { h, m, s } = o, hasS = s != null;
  const pt = (a, len) => { const r = a * Math.PI / 180; return [(100 + len * Math.sin(r)).toFixed(2), (100 - len * Math.cos(r)).toFixed(2)]; };
  let g = '<circle cx="100" cy="100" r="97" fill="#1f1f1d"/><circle cx="100" cy="100" r="90" fill="#fbf9f2"/>';
  for (let i = 0; i < 60; i++){
    const big = i % 5 === 0, a = i * 6, p1 = pt(a, 88), p2 = pt(a, big ? 76 : 83);
    g += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#1f1f1d" stroke-width="${big ? 3.6 : 1.1}" stroke-linecap="butt"/>`;
  }
  let nums = '';
  for (let n = 1; n <= 12; n++){ const p = pt(n * 30, 62); nums += `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="central" font-size="19" font-weight="700" fill="#1f1f1d" font-family="Georgia,'Times New Roman',serif">${n}</text>`; }
  const hA = (h % 12) * 30 + m * 0.5 + (hasS ? s / 120 : 0), mA = m * 6 + (hasS ? s * 0.1 : 0);
  const hp = pt(hA, 46), mp = pt(mA, 76), hb = pt(hA + 180, 9), mb = pt(mA + 180, 12);
  g += nums;
  g += `<line class="hh" x1="${hb[0]}" y1="${hb[1]}" x2="${hp[0]}" y2="${hp[1]}" stroke="#1f1f1d" stroke-width="7.5" stroke-linecap="butt"/>`;
  g += `<line class="mh" x1="${mb[0]}" y1="${mb[1]}" x2="${mp[0]}" y2="${mp[1]}" stroke="#1f1f1d" stroke-width="5" stroke-linecap="butt"/>`;
  if (hasS){
    const sp = pt(s * 6, 84), st = pt(s * 6 + 180, 22), sd = pt(s * 6, 70);
    g += `<line x1="${st[0]}" y1="${st[1]}" x2="${sp[0]}" y2="${sp[1]}" stroke="#c0392b" stroke-width="2" stroke-linecap="butt"/><circle cx="${sd[0]}" cy="${sd[1]}" r="5" fill="#c0392b"/>`;
  }
  g += `<circle cx="100" cy="100" r="6" fill="${hasS ? '#c0392b' : '#1f1f1d'}"/>`;
  return `<svg viewBox="0 0 200 200" class="clock${o.mini ? ' mini' : ''}" ${o.dial ? 'id="dial"' : ''} role="img" aria-label="clock">${g}</svg>`;
}
function setHands(svg, h, m){
  const pt = (a, len) => { const r = a * Math.PI / 180; return [(100 + len * Math.sin(r)).toFixed(2), (100 - len * Math.cos(r)).toFixed(2)]; };
  const hp = pt((h % 12) * 30 + m * 0.5, 48), mp = pt(m * 6, 74), hh = $('.hh', svg), mh = $('.mh', svg);
  hh.setAttribute('x2', hp[0]); hh.setAttribute('y2', hp[1]); mh.setAttribute('x2', mp[0]); mh.setAttribute('y2', mp[1]);
}
function bindDial(svg, st, readout){
  let drag = null;
  const ang = e => {
    const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 200 - 100, y = (e.clientY - r.top) / r.height * 200 - 100;
    let a = Math.atan2(x, -y) * 180 / Math.PI; if (a < 0) a += 360;
    return { a, r:Math.hypot(x, y) };
  };
  const apply = p => {
    if (drag === 'm') st.m = Math.round(p.a / 6) % 60;
    else { let hh = Math.round((p.a - st.m * 0.5) / 30); hh = ((hh % 12) + 12) % 12; st.h = hh === 0 ? 12 : hh; }
    setHands(svg, st.h, st.m); if (readout) readout.textContent = digital(st.h, st.m);
  };
  svg.addEventListener('pointerdown', e => { if (App.answered) return; const p = ang(e); drag = p.r > 60 ? 'm' : 'h'; try{ svg.setPointerCapture(e.pointerId); }catch(err){} apply(p); e.preventDefault(); });
  svg.addEventListener('pointermove', e => { if (drag && !App.answered) apply(ang(e)); });
  const end = () => { drag = null; };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
}

/* =====================  月曆  ===================== */
function calHTML(v){
  const { y, m } = v, N = dim(y, m), first = new Date(y, m - 1, 1).getDay();
  let h = `<div class="cal"><div class="ct">${esc(fmtMonthTitle(y, m))}</div><table><thead><tr>`;
  WK_ZH.forEach((w, i) => { h += `<th class="${i === 0 || i === 6 ? 'we' : ''}">${w}</th>`; });
  h += '</tr></thead><tbody>';
  let d = 1 - first;
  for (let r = 0; r < 6 && d <= N; r++){
    h += '<tr>';
    for (let c = 0; c < 7; c++, d++){
      if (d < 1 || d > N){ h += '<td class="empty"></td>'; continue; }
      const tappable = v.mode === 'pick' || (v.mode === 'view' && v.details && v.details[d]);
      const cls = [(c === 0 || c === 6) ? 'we' : '', v.today === d ? 'today' : '', v.mark === d ? 'mark' : '', tappable ? 'tap' : ''].filter(Boolean).join(' ');
      h += `<td class="${cls}" data-d="${d}"${v.today === d ? ` data-today="${esc(sc('今天'))}"` : ''}><span class="n">${d}</span>${v.labels && v.labels[d] ? `<span class="lb">${esc(sc(v.labels[d]))}${v.plus && v.plus[d] ? '<span class="plus">＋</span>' : ''}</span>` : ''}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table></div>';
}
function ycalHTML(v){
  let h = `<div class="ytitle">${esc(Settings.lang === 'zh' ? v.y + '年' : String(v.y))}</div><div class="ycal">`;
  for (let m = 1; m <= 12; m++){
    const N = dim(v.y, m), first = new Date(v.y, m - 1, 1).getDay();
    h += `<div class="mm${m === v.m ? ' cur' : ''}"><div class="mt">${esc(sc(monthZh(m)))}</div><table>`;
    let d = 1 - first;
    for (let r = 0; r < 6 && d <= N; r++){
      h += '<tr>';
      for (let c = 0; c < 7; c++, d++){ h += (d < 1 || d > N) ? '<td></td>' : `<td class="${m === v.m && d === v.d ? 't' : ''}">${d}</td>`; }
      h += '</tr>';
    }
    h += '</table></div>';
  }
  return h + '</div>';
}

/* =====================  開始畫面  ===================== */
function seg(key, opts, cur){
  return `<div class="seg" data-seg="${key}">` + opts.map(([v, l]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}">${typeof l === 'string' ? esc(l) : Lh(l)}</button>`).join('') + '</div>';
}
const LV_OPTS = () => [['easy', L('簡單', 'Fácil', 'Easy')], ['mid', L('普通', 'Normal', 'Medium')], ['hard', L('困難', 'Difícil', 'Hard')]];
function settingsRows(){
  let h = `<div class="setrow"><label>${Lh(STR.setScript)}</label>${seg('script', [['trad', '繁體'], ['simp', '简体']], Settings.script)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setLang)}</label>${seg('lang', [['es', 'Chino + Español'], ['en', 'Chino + English'], ['zh', 'Solo chino']], Settings.lang)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setPhon)}</label>${seg('phon', [['pinyin', 'Pinyin'], ['zhuyin', 'Zhuyin ㄅㄆㄇ'], ['both', L('兩者', 'Ambos', 'Both')], ['off', L('關', 'Apagado', 'Off')]], Settings.phon)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setRate)}</label>${seg('rate', [['slow', L('慢', 'Lento', 'Slow')], ['normal', L('一般', 'Normal', 'Normal')], ['fast', L('快', 'Rápido', 'Fast')]], Settings.rate)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setLv)}</label>${seg('lv', LV_OPTS(), App.lv)}</div>`;
  return h;
}
/* 齒輪：所有設定都在這裡，開始畫面和遊戲中都能打開 */
function openSettings(){
  const ov = document.createElement('div'); ov.className = 'overlay'; document.body.appendChild(ov);
  let changed = false;
  const close = () => {
    ov.remove();
    if (!changed) return;
    if (App.round){ if (!App.answered) renderQ(); } else renderStart();   // 已答完的題目不重畫，下一題才套用新設定
  };
  const draw = () => {
    ov.innerHTML = `<div class="panel"><h3>⚙ ${Lh(STR.settings)}</h3>${settingsRows()}${App.round ? `<div class="note">${Lh(STR.lvNote)}</div>` : ''}<button class="btn wide" id="sclose">${Lh(STR.close)}</button></div>`;
    $('#sclose', ov).addEventListener('click', close);
    $$('[data-seg]', ov).forEach(box => box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const k = box.dataset.seg, v = b.dataset.v;
      if (k === 'lv'){ App.lv = v; try{ localStorage.setItem('timegame.lv', v); }catch(err){} }
      else { Settings[k] = v; writeSettings(Settings); if (k !== 'rate') changed = true; }
      draw();
    }));
  };
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  draw();
}
function renderStart(){
  App.round = null; try{ speechSynthesis.cancel(); }catch(e){}
  let h = `<div class="title"><h1>${esc(zhOf(STR.title))}</h1><div class="sub">${Lh(STR.sub)}</div></div>`;
  h += `<button class="gear" id="gear" aria-label="settings">⚙</button>`;
  h += `<button class="lvchip" id="lvchip">${Li(STR.setLv)}：${Li(LV_OPTS().find(x => x[0] === App.lv)[1])} ⚙</button>`;
  h += `<button class="mixbtn" id="mix"><b>${esc(zhOf(STR.mix))}</b><span class="tr" style="font-size:14px">${esc(zhOf(STR.mixSub))}${trOf(STR.mixSub) ? '<br>' + esc(trOf(STR.mixSub)) : ''}</span></button>`;
  UNITS.forEach(u => {
    h += `<div class="unit" data-u="${u.id}"><button class="uh" data-ustart="${u.id}"><span><b>${esc(zhOf(u.t))}</b>${trOf(u.t) ? `<span class="tr">${esc(trOf(u.t))}</span>` : ''}</span><span class="arrow">▶</span></button></div>`;
  });
  document.body.classList.remove('has-sheet'); applyTod(nowHour());
  root().innerHTML = h;
  $('#gear').addEventListener('click', openSettings); $('#lvchip').addEventListener('click', openSettings);
  $$('[data-ustart]').forEach(b => b.addEventListener('click', () => { const u = UNITS.find(x => x.id === b.dataset.ustart); startRound(u.subs.map(x => x[0]), App.lv, u.id, false); }));
  $('#mix').addEventListener('click', () => startRound('all', 'mix', 'mix', true));
}

/* =====================  出題與作答  ===================== */
function startRound(spec, lv, label, isMix, nOver){
  const n = nOver || (isMix ? 50 : 25);
  App.round = { spec, lv, label, isMix, n };
  App.qs = makeQuestions(spec, lv, n); App.i = 0; App.score = 0; App.right = 0; App.t0 = Date.now();
  renderQ();
}
/* 時間放在中文前面（語序同中文），字體大小、格式和旁邊的漢字一樣；上下留空白行，跟有拼音／注音的漢字對齊 */
function timeChunk(t){
  const ph = Settings.phon, top = ph === 'pinyin' || ph === 'both', bot = ph === 'zhuyin' || ph === 'both';
  return `<span class="ch np">${top ? '<span class="ph">&nbsp;</span>' : ''}<span class="h">${esc(t)}</span>${bot ? '<span class="ph">&nbsp;</span>' : ''}</span>`;
}
function optHTML(o){
  let h = '';
  if (o.svg) h += o.svg;
  if (o.zh && o.badge) h += `<div class="zrow"><span>${timeChunk(o.badge)}</span><span>${lineHTML(o.zh)}</span></div>`;
  else {
    if (o.zh) h += `<div>${lineHTML(o.zh)}</div>`;
    if (o.badge) h += `<div class="badge">${esc(o.badge)}</div>`;
  }
  if (o.gloss){ const t = trOf(o.gloss); if (t) h += `<span class="tr">${esc(t)}</span>`; }
  return h;
}
/* =====  一天的時間：色帶和背景色  ===== */
const todClass = h => (h >= 5 && h < 12 ? 'tod-morning' : h >= 12 && h < 19 ? 'tod-afternoon' : 'tod-night');
const nowHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const todOf = q => (q && typeof q.tod === 'number' ? q.tod : nowHour());   // 題目有時間就用題目的，沒有就用手機現在的時間
function applyTod(h){ document.documentElement.className = todClass(h); }
const TOD_ICON = { 'tod-morning':['☀️', '#ffe08a'], 'tod-afternoon':['🌤️', '#ffd27a'], 'tod-night':['🌙', '#e8e3c6'] };
function todBand(h){
  let t = '';
  for (let i = 0; i <= 24; i++) t += `<i class="tk${i % 6 === 0 ? ' b' : ''}" style="left:${(i / 24 * 100).toFixed(2)}%"></i>`;
  [0, 6, 12, 18, 24].forEach(i => { t += `<i class="tl" style="left:${Math.min(Math.max(i / 24 * 100, 4), 96)}%">${i}</i>`; });
  const ic = TOD_ICON[todClass(h)], x = Math.min(Math.max(h / 24 * 100, 3), 97);
  return `<div class="tod" aria-hidden="true" data-h="${h.toFixed(2)}">${t}<i class="mk" style="left:${x.toFixed(2)}%;background:${ic[1]}">${ic[0]}</i></div>`;
}
function renderQ(){
  const q = App.qs[App.i], n = App.qs.length;
  App.cur = q; App.answered = false; App.sel = null; App.dial = null; App.match = null;
  try{ speechSynthesis.cancel(); }catch(e){}
  let h = `<div class="bar"><button class="btn" id="home">←</button><div class="small">${esc(sc('第')) } ${App.i + 1} / ${n} ${esc(sc('題'))}</div><div class="rgt"><button class="btn gear" id="gearq" aria-label="settings">⚙</button><span><b>${App.score}</b> <span class="small">${esc(zhOf(STR.score))}</span></span></div></div>`;
  const th = todOf(q); applyTod(th); h += todBand(th);
  h += `<div class="prog"><i style="width:${(App.i / n) * 100}%"></i></div>`;
  h += `<div class="instr">${Lh(q.instr)}</div>`;
  if (q.line){
    const t = Settings.lang === 'es' ? q.line.es : Settings.lang === 'en' ? q.line.en : '';
    h += `<div class="qline">${lineHTML(q.line.zh)}${t ? `<span class="tr">${esc(t)}</span>` : ''}</div>`;
  }
  const v = q.visual;
  h += '<div class="vis">';
  if (v){
    if (v.type === 'clock') h += clockSVG(v);
    else if (v.type === 'dial'){ h += clockSVG({ h:v.h0, m:v.m0, dial:true }) + `<div class="dialread" id="dialread">${digital(v.h0, v.m0)}</div>`; }
    else if (v.type === 'digital') h += `<div class="digi" style="font-size:46px">${esc(v.text)}</div>`;
    else if (v.type === 'cal'){
      if (v.datebox) h += `<div class="datebox">${esc(v.datebox)}</div>`;
      h += calHTML(v);
      if (v.mode === 'view') h += `<div class="detail" id="detail"><span class="small">${esc(zhOf(STR.tapHint))}${trOf(STR.tapHint) ? ' · ' + esc(trOf(STR.tapHint)) : ''}</span></div>`;
    }
    else if (v.type === 'ycal') h += ycalHTML(v);
  }
  h += '</div>';
  if (q.audio){
    h += `<div class="hearbar"><button class="btn" id="hear">${Lh(STR.hear)}</button>${q.peek ? `<button class="btn" id="peek">${Lh(STR.peek)}</button>` : ''}</div>${q.peek ? `<div class="peek" id="peekBox" hidden>${lineHTML(q.peek)}</div>` : ''}`;
  }
  if (q.kind === 'choice'){
    const long = q.options.some(o => o.zh && o.zh.replace(/\{[^}]*\}/g, '').length > 5);
    const cls = (q.optClass === 'cardopt' || long) ? 'opts one' : 'opts';
    h += `<div class="${cls}">` + q.options.map((o, i) => `<button class="opt${o.svg ? ' img' : ''}" data-i="${i}">${optHTML(o)}</button>`).join('') + '</div>';
  } else if (q.kind === 'match'){
    h += `<div class="match"><div class="small" style="text-align:center">${esc(zhOf(STR.hintLine))}${trOf(STR.hintLine) ? ' · ' + esc(trOf(STR.hintLine)) : ''}</div><div id="slots"></div><div class="cards" id="cards"></div></div>`;
  }
  if (q.kind !== 'choice') h += `<div class="foot"><button class="btn primary" id="confirm" disabled>${Lh(STR.confirm)}</button></div>`;
  h += '<div class="sheet" id="sheet" hidden><div class="sheetin"><div id="fb"></div><div class="foot"><button class="btn primary" id="next" hidden></button></div></div></div>';
  document.body.classList.remove('has-sheet');
  root().innerHTML = h;
  window.scrollTo(0, 0);
  $('#home').addEventListener('click', renderStart);
  $('#gearq').addEventListener('click', openSettings);
  if (q.audio){
    $('#hear').addEventListener('click', () => speak(q.audio));
    if ($('#peek')) $('#peek').addEventListener('click', () => { const b = $('#peekBox'); b.hidden = !b.hidden; });
    setTimeout(() => { if (App.cur === q && !App.answered) speak(q.audio); }, 350);
  }
  if (q.kind === 'choice') $$('.opt').forEach(b => b.addEventListener('click', () => answerChoice(+b.dataset.i)));
  else if (q.kind === 'dial'){
    App.dial = { h:q.visual.h0, m:q.visual.m0 };
    bindDial($('#dial'), App.dial, $('#dialread'));
    $('#confirm').disabled = false;
    $('#confirm').addEventListener('click', answerDial);
  } else if (q.kind === 'tap') bindCal(q);
  else if (q.kind === 'match') initMatch(q);
  if (q.visual && q.visual.type === 'cal' && q.visual.mode === 'view') bindCal(q);
}

function showFeedback(ok, q, chosen, extraHTML){
  App.answered = true;
  if (ok){ App.right++; App.score = Math.round(App.right * 100 / App.round.n); }
  sfx(ok);
  let h = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="fbh big">${Li(ok ? STR.right : STR.wrong)}</div><div class="fbb">`;
  if (!ok && chosen && chosen.d) h += `<div class="why">${Li(STR.youChose)}：${esc(chosen.d)}</div>`;
  if (!ok && chosen && chosen.why && chosen.why !== 'heard' && WHY[chosen.why]) h += `<div class="why">${Lh(WHY[chosen.why])}</div>`;
  if (extraHTML) h += extraHTML;
  if (!ok) h += `<div class="small fbl0">${Li(STR.correctIs)}</div>`;
  if (q.fb.list) h += '<div class="fbl">' + q.fb.list.map(r => `<div class="fbr"><span class="tm">${esc(r.tm)}</span><span class="ans">${lineHTML(r.zh)}</span></div>`).join('') + '</div>';
  else h += `<div class="ans">${lineHTML(q.fb.ansZh)}</div>`;
  if (q.fb.extra) h += `<div class="small">${esc(q.fb.extra)}</div>`;
  const say = q.fb.say || q.audio;
  if (say) h += `<div class="say">${lineHTML(say)}</div>`;
  if (q.fb.trans){ const t = Settings.lang === 'es' ? q.fb.trans.es : Settings.lang === 'en' ? q.fb.trans.en : ''; if (t) h += `<div class="small">${esc(t)}</div>`; }
  h += '</div>';
  h += '</div>';
  $('#fb').innerHTML = h;
  $('#home').nextElementSibling.nextElementSibling.querySelector('b').textContent = App.score;
  const last = App.i >= App.qs.length - 1, nb = $('#next');
  nb.innerHTML = Lh(last ? STR.seeResult : STR.next); nb.hidden = false;
  nb.onclick = () => { if (last) showResult(); else { App.i++; renderQ(); } };
  const cf = $('#confirm'); if (cf) cf.disabled = true;
  /* 解答條固定在螢幕底部：上面的題目、時鐘、選項完全不動，也不自動捲動 */
  const sh = $('#sheet'); sh.hidden = false; document.body.classList.add('has-sheet');
  document.documentElement.style.setProperty('--sheet-h', (sh.offsetHeight + 16) + 'px');
}

function answerChoice(i){
  if (App.answered) return;
  const q = App.cur, o = q.options[i];
  $$('.opt').forEach((b, k) => { b.disabled = true; if (q.options[k].ok) b.classList.add('ok'); else if (k === i) b.classList.add('bad'); });
  showFeedback(!!o.ok, q, o);
}
function answerDial(){
  if (App.answered) return;
  const q = App.cur, st = App.dial, tg = q.target;
  const dm = Math.abs(st.m - tg.m), diff = Math.min(dm, 60 - dm);
  const ok = st.h === tg.h && diff <= 2;
  const mine = digital(st.h, st.m);
  showFeedback(ok, q, ok ? null : { d:mine, why:null }, `<div style="text-align:center">${clockSVG({ h:tg.h, m:tg.m, mini:true })}</div>`);
}

/* ---------- 月曆點選 ---------- */
function bindCal(q){
  const v = q.visual;
  $$('.cal td[data-d]').forEach(td => td.addEventListener('click', () => {
    const d = +td.dataset.d;
    if (v.mode === 'view'){
      const det = v.details[d], box = $('#detail');
      if (!box) return;
      $$('.cal td').forEach(x => x.classList.remove('sel')); td.classList.add('sel');
      if (!det){ box.innerHTML = `<span class="small">${esc(zhOf(STR.noPlan))}</span>`; return; }
      if (det.items){
        box.innerHTML = det.items.map(it => { const tt = trOf(it.gloss); return `<div class="plan">${timeChunk(it.t)}<span>${lineHTML(it.zh)}</span>${tt ? `<span class="small">${esc(tt)}</span>` : ''}</div>`; }).join('');
        return;
      }
      const t = trOf(det.gloss);
      box.innerHTML = `<div>${lineHTML(det.head)}</div><div>${lineHTML(det.body)}</div>${t ? `<span class="small">${esc(t)}</span>` : ''}`;
      return;
    }
    if (App.answered) return;
    $$('.cal td').forEach(x => x.classList.remove('sel')); td.classList.add('sel');
    App.sel = d; $('#confirm').disabled = false;
  }));
  if (q.kind === 'tap') $('#confirm').addEventListener('click', answerTap);
}
function answerTap(){
  if (App.answered || App.sel == null) return;
  const q = App.cur, tg = q.target, ok = App.sel === tg.d;
  $$('.cal td[data-d]').forEach(td => { td.classList.remove('sel'); if (+td.dataset.d === tg.d) td.classList.add('good'); else if (!ok && +td.dataset.d === App.sel) td.classList.add('wrong'); });
  showFeedback(ok, q, ok ? null : { d:fmtDate(tg.y, tg.m, App.sel, false), why:'tap' });
}

/* ---------- 行程配對 ---------- */
function initMatch(q){
  App.match = { placed:q.slots.map(() => null), selCard:null };
  drawMatch(q);
  $('#confirm').addEventListener('click', answerMatch);
}
function drawMatch(q){
  const st = App.match, done = App.answered;
  $('#slots').innerHTML = q.slots.map((s, i) => {
    const ci = st.placed[i], card = ci != null ? q.cards[ci] : null;
    return `<div class="slot"><div class="tm">${esc(s.label)}</div><div class="box${card ? ' filled' : ''}${done && card ? (card.slot === i ? ' ok' : ' bad') : ''}" data-slot="${i}">${card ? lineHTML(card.zh) : ''}</div></div>`;
  }).join('');
  $('#cards').innerHTML = q.cards.map((c, i) => {
    const used = st.placed.includes(i), t = trOf(c.gloss);
    return `<button class="cardb${st.selCard === i ? ' sel' : ''}${used ? ' used' : ''}" data-card="${i}"${used || done ? ' disabled' : ''}>${lineHTML(c.zh)}${t ? `<span class="tr">${esc(t)}</span>` : ''}</button>`;
  }).join('');
  if (!done){
    $$('[data-card]').forEach(b => b.addEventListener('click', () => { st.selCard = st.selCard === +b.dataset.card ? null : +b.dataset.card; drawMatch(q); }));
    $$('[data-slot]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.slot;
      if (st.selCard != null){ const prev = st.placed[i]; st.placed[i] = st.selCard; st.selCard = null; void prev; }
      else if (st.placed[i] != null) st.placed[i] = null;
      drawMatch(q);
    }));
    $('#confirm').disabled = st.placed.some(x => x == null);
  }
}
function answerMatch(){
  if (App.answered) return;
  const q = App.cur, st = App.match;
  const ok = st.placed.every((ci, i) => ci != null && q.cards[ci].slot === i);
  showFeedback(ok, q, null);     // 這裡會把 App.answered 設成 true
  drawMatch(q);                  // 再重畫一次，把對錯的顏色畫出來
}

/* =====================  結果與排行榜  ===================== */
function showResult(){
  const r = App.round, n = App.qs.length, max = 100, ratio = App.score / max;
  const msg = ratio >= 0.9 ? L('太棒了！', '¡Excelente!', 'Excellent!') : ratio >= 0.7 ? L('很好！', '¡Muy bien!', 'Well done!') : ratio >= 0.5 ? L('不錯，再練習一下。', 'Bien, practica un poco más.', 'Good, keep practicing.') : L('再試一次，你可以的！', 'Inténtalo otra vez, ¡puedes!', 'Try again, you can do it!');
  let h = `<div class="card result"><div class="small">${esc(sc(r.isMix ? '綜合挑戰' : '練習完成'))}</div><div class="score">${App.score}<span class="small"> / ${max}</span></div><div class="msg">${Lh(msg)}</div><div class="small">${App.right} / ${n}</div></div>`;
  h += `<div class="row" style="justify-content:center"><button class="btn primary" id="again">${Lh(STR.again)}</button><button class="btn" id="home2">${Lh(STR.home)}</button></div>`;
  document.body.classList.remove('has-sheet'); applyTod(nowHour());
  root().innerHTML = h; window.scrollTo(0, 0);
  $('#again').addEventListener('click', () => startRound(r.spec, r.lv, r.label, r.isMix));
  $('#home2').addEventListener('click', renderStart);
}
renderStart();
