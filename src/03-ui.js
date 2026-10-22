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
  setScript:L('字形', 'Escritura', 'Script'),
  setLang:  L('介面語言', 'Idioma', 'Language'),
  setPhon:  L('拼音／注音', 'Pinyin / Zhuyin', 'Pinyin / Zhuyin'),
  setRate:  L('語速', 'Voz', 'Voice'),
  setLv:    L('難度', 'Nivel', 'Level'),
  mix:      L('綜合挑戰', 'Desafío mixto', 'Mixed challenge'),
  mixSub:   L('20 題，所有單元混在一起，可以進排行榜', '20 preguntas de todas las unidades; cuenta para la clasificación', '20 questions from every unit — counts for the leaderboard'),
  mixUnit:  L('這個單元全部混合（10 題）', 'Mezclar toda la unidad (10 preguntas)', 'Mix this whole unit (10 questions)'),
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
  best:     L('我的最高分', 'Mi mejor puntaje', 'My best score'),
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
  let g = '<circle cx="100" cy="100" r="95" fill="#fbf8f0" stroke="#2b2a27" stroke-width="2"/>';
  for (let i = 0; i < 60; i++){
    const big = i % 5 === 0, a = i * 6, p1 = pt(a, 94), p2 = pt(a, big ? 85 : 90);
    g += `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="#2b2a27" stroke-width="${big ? 2 : 1}"/>`;
  }
  let nums = '';
  for (let n = 1; n <= 12; n++){ const p = pt(n * 30, 70); nums += `<text x="${p[0]}" y="${p[1]}" text-anchor="middle" dominant-baseline="central" font-size="17" fill="#2b2a27" stroke="#fbf8f0" stroke-width="3" paint-order="stroke" font-family="system-ui,sans-serif">${n}</text>`; }
  const hA = (h % 12) * 30 + m * 0.5 + (hasS ? s / 120 : 0), mA = m * 6 + (hasS ? s * 0.1 : 0);
  const hp = pt(hA, 48), mp = pt(mA, 74);
  g += nums;
  g += `<line class="hh" x1="100" y1="100" x2="${hp[0]}" y2="${hp[1]}" stroke="#2b2a27" stroke-width="6" stroke-linecap="round"/>`;
  g += `<line class="mh" x1="100" y1="100" x2="${mp[0]}" y2="${mp[1]}" stroke="#2b2a27" stroke-width="3.5" stroke-linecap="round"/>`;
  if (hasS){
    const sp = pt(s * 6, 82), st = pt(s * 6 + 180, 16);
    g += `<line x1="${st[0]}" y1="${st[1]}" x2="${sp[0]}" y2="${sp[1]}" stroke="#a8503c" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  g += `<circle cx="100" cy="100" r="4.5" fill="${hasS ? '#a8503c' : '#2b2a27'}"/>`;
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
      h += `<td class="${cls}" data-d="${d}"${v.today === d ? ` data-today="${esc(sc('今天'))}"` : ''}><span class="n">${d}</span>${v.labels && v.labels[d] ? `<span class="lb">${esc(sc(v.labels[d]))}</span>` : ''}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table></div>';
}
function ycalHTML(v){
  const todayTxt = (Settings.lang === 'es' ? 'Hoy: ' : Settings.lang === 'en' ? 'Today: ' : sc('今天：')) + fmtDate(v.y, v.m, v.d, true);
  let h = `<div class="datebox">${esc(todayTxt)}</div><div class="ytitle">${esc(Settings.lang === 'zh' ? v.y + '年' : String(v.y))}</div><div class="ycal">`;
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
  return `<div class="seg" data-seg="${key}">` + opts.map(([v, l]) => `<button data-v="${v}" class="${cur === v ? 'on' : ''}">${esc(zhOf(L(l)))}</button>`).join('') + '</div>';
}
function renderStart(){
  App.round = null; try{ speechSynthesis.cancel(); }catch(e){}
  let h = `<div class="title"><h1>${esc(zhOf(STR.title))}</h1><div class="sub">${Lh(STR.sub)}</div></div>`;
  h += `<div class="card"><div class="setrow"><label>${Lh(STR.nameL)}</label><input type="text" id="nm" maxlength="14" value="${esc(App.name)}" placeholder="${esc(zhOf(STR.namePh))}"></div>`;
  h += `<div class="setrow"><label>${Lh(STR.setScript)}</label>${seg('script', [['trad', '繁體'], ['simp', '简体']], Settings.script)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setLang)}</label>${seg('lang', [['es', '中＋西'], ['en', '中＋英'], ['zh', '純中文']], Settings.lang)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setPhon)}</label>${seg('phon', [['pinyin', '拼音'], ['zhuyin', '注音'], ['both', '兩者'], ['off', '關']], Settings.phon)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setRate)}</label>${seg('rate', [['slow', '慢'], ['normal', '一般'], ['fast', '快']], Settings.rate)}</div>`;
  h += `<div class="setrow"><label>${Lh(STR.setLv)}</label>${seg('lv', [['easy', '簡單'], ['mid', '普通'], ['hard', '困難']], App.lv)}</div></div>`;
  h += `<button class="mixbtn" id="mix"><b>${esc(zhOf(STR.mix))}</b><span class="tr" style="font-size:14px">${esc(zhOf(STR.mixSub))}${trOf(STR.mixSub) ? '<br>' + esc(trOf(STR.mixSub)) : ''}</span></button>`;
  UNITS.forEach(u => {
    h += `<div class="unit${App.open === u.id ? ' open' : ''}" data-u="${u.id}"><button class="uh"><span><b>${esc(zhOf(u.t))}</b>${trOf(u.t) ? `<span class="tr">${esc(trOf(u.t))}</span>` : ''}</span><span class="arrow">▶</span></button><div class="subs">`;
    u.subs.forEach(([id, l]) => { h += `<button class="btn" data-sub="${id}">${Lh(l)}</button>`; });
    h += `<button class="btn mixu" data-unitmix="${u.id}">${Lh(STR.mixUnit)}</button></div></div>`;
  });
  h += `<button class="btn wide" id="lb" style="margin-top:10px">🏆 ${esc(zhOf(STR.board))}${trOf(STR.board) ? ' · ' + esc(trOf(STR.board)) : ''}</button>`;
  root().innerHTML = h;
  $('#nm').addEventListener('input', e => { App.name = e.target.value.trim().slice(0, 14); try{ localStorage.setItem('timegame.name', App.name); }catch(err){} });
  $$('[data-seg]').forEach(box => box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = box.dataset.seg, v = b.dataset.v;
    if (k === 'lv'){ App.lv = v; try{ localStorage.setItem('timegame.lv', v); }catch(err){} }
    else { Settings[k] = v; writeSettings(Settings); }
    renderStart();
  }));
  $$('.unit .uh').forEach(b => b.addEventListener('click', () => { const id = b.parentNode.dataset.u; App.open = App.open === id ? null : id; renderStart(); }));
  $$('[data-sub]').forEach(b => b.addEventListener('click', () => startRound([b.dataset.sub], App.lv, b.dataset.sub, false)));
  $$('[data-unitmix]').forEach(b => b.addEventListener('click', () => { const u = UNITS.find(x => x.id === b.dataset.unitmix); startRound(u.subs.map(s => s[0]), App.lv, u.id, false); }));
  $('#mix').addEventListener('click', () => startRound('all', 'mix', 'mix', true));
  $('#lb').addEventListener('click', () => showBoard());
}

/* =====================  出題與作答  ===================== */
function startRound(spec, lv, label, isMix){
  const n = isMix ? 20 : 10;
  App.round = { spec, lv, label, isMix, n };
  App.qs = makeQuestions(spec, lv, n); App.i = 0; App.score = 0; App.right = 0; App.t0 = Date.now();
  try{ window.HGPlays && HGPlays.start(label + ':' + lv, App.name); }catch(e){}
  renderQ();
}
function optHTML(o){
  let h = '';
  if (o.svg) h += o.svg;
  if (o.zh) h += `<div>${lineHTML(o.zh)}</div>`;
  if (o.badge) h += `<div class="badge">${esc(o.badge)}</div>`;
  if (o.gloss){ const t = trOf(o.gloss); if (t) h += `<span class="tr">${esc(t)}</span>`; }
  return h;
}
function renderQ(){
  const q = App.qs[App.i], n = App.qs.length;
  App.cur = q; App.answered = false; App.sel = null; App.dial = null; App.match = null;
  try{ speechSynthesis.cancel(); }catch(e){}
  let h = `<div class="bar"><button class="btn" id="home">←</button><div class="small">${esc(sc('第')) } ${App.i + 1} / ${n} ${esc(sc('題'))}</div><div><b>${App.score}</b> <span class="small">${esc(zhOf(STR.score))}</span></div></div>`;
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
    h += `<div class="hearbar"><button class="btn" id="hear">${Lh(STR.hear)}</button><button class="btn" id="peek">${Lh(STR.peek)}</button></div><div class="peek" id="peekBox" hidden>${lineHTML(q.peek)}</div>`;
  }
  if (q.kind === 'choice'){
    const long = q.options.some(o => o.zh && o.zh.replace(/\{[^}]*\}/g, '').length > 5);
    const cls = (q.optClass === 'cardopt' || long) ? 'opts one' : 'opts';
    h += `<div class="${cls}">` + q.options.map((o, i) => `<button class="opt" data-i="${i}">${optHTML(o)}</button>`).join('') + '</div>';
  } else if (q.kind === 'match'){
    h += `<div class="match"><div class="small" style="text-align:center">${esc(zhOf(STR.hintLine))}${trOf(STR.hintLine) ? ' · ' + esc(trOf(STR.hintLine)) : ''}</div><div id="slots"></div><div class="cards" id="cards"></div></div>`;
  }
  if (q.kind !== 'choice') h += `<div class="foot"><button class="btn primary" id="confirm" disabled>${Lh(STR.confirm)}</button></div>`;
  h += '<div id="fb"></div><div class="foot"><button class="btn primary" id="next" hidden></button></div>';
  root().innerHTML = h;
  window.scrollTo(0, 0);
  $('#home').addEventListener('click', renderStart);
  if (q.audio){
    $('#hear').addEventListener('click', () => speak(q.audio));
    $('#peek').addEventListener('click', () => { const b = $('#peekBox'); b.hidden = !b.hidden; });
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
  if (ok){ App.score += 10; App.right++; }
  sfx(ok);
  let h = `<div class="fb ${ok ? 'ok' : 'bad'}"><div class="big">${Lh(ok ? STR.right : STR.wrong)}</div>`;
  if (!ok && chosen && chosen.d) h += `<div class="why">${Li(STR.youChose)}：${esc(chosen.d)}</div>`;
  if (!ok && chosen && chosen.why && WHY[chosen.why]) h += `<div class="why">${Lh(WHY[chosen.why])}</div>`;
  if (extraHTML) h += extraHTML;
  if (!ok) h += `<div class="small" style="margin-top:8px">${Li(STR.correctIs)}</div>`;
  h += `<div class="ans">${lineHTML(q.fb.ansZh)}</div>`;
  if (q.fb.extra) h += `<div class="small">${esc(q.fb.extra)}</div>`;
  if (q.fb.trans){ const t = Settings.lang === 'es' ? q.fb.trans.es : Settings.lang === 'en' ? q.fb.trans.en : ''; if (t) h += `<div class="small">${esc(t)}</div>`; }
  h += '</div>';
  $('#fb').innerHTML = h;
  $('#home').nextElementSibling.nextElementSibling.querySelector('b').textContent = App.score;
  const last = App.i >= App.qs.length - 1, nb = $('#next');
  nb.innerHTML = Lh(last ? STR.seeResult : STR.next); nb.hidden = false;
  nb.onclick = () => { if (last) showResult(); else { App.i++; renderQ(); } };
  const cf = $('#confirm'); if (cf) cf.disabled = true;
  nb.scrollIntoView({ block:'nearest', behavior:'smooth' });
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
const LB = (function(){
  const CFG = { apiKey:'AIzaSyC_YSDn2OH6_GKKwCq0d8QFNl3fYXzTC60', authDomain:'memorma-24dab.firebaseapp.com', projectId:'memorma-24dab', appId:'1:806709458465:web:f0d12acb2f911f2f165560' };
  const V = '10.12.2', CDN = 'https://www.gstatic.com/firebasejs/' + V + '/', COL = 'timeBoard';
  let readyP = null;
  function ready(){
    if (readyP) return readyP;
    readyP = (async () => {
      const A = await import(CDN + 'firebase-app.js'), Au = await import(CDN + 'firebase-auth.js'), F = await import(CDN + 'firebase-firestore.js');
      const app = A.initializeApp(CFG, 'timeboard'), auth = Au.getAuth(app);
      if (!auth.currentUser) await Au.signInAnonymously(auth); else await auth.authStateReady();
      return { F, db:F.getFirestore(app), uid:auth.currentUser.uid };
    })().catch(() => { readyP = null; return null; });
    return readyP;
  }
  async function submit(name, score){
    const L0 = await ready(); if (!L0) return false;
    try{
      const ref = L0.F.doc(L0.db, COL, L0.uid); let prev = -1;
      try{ const s = await L0.F.getDoc(ref); if (s.exists()) prev = s.data().score; }catch(e){}
      if (score <= prev) return true;
      await L0.F.setDoc(ref, { name:String(name).slice(0, 14), score, updatedAt:L0.F.serverTimestamp() });
      return true;
    }catch(e){ return false; }
  }
  async function top(){
    const L0 = await ready(); if (!L0) return null;
    try{
      const q = L0.F.query(L0.F.collection(L0.db, COL), L0.F.orderBy('score', 'desc'), L0.F.limit(10));
      const s = await L0.F.getDocs(q);
      return s.docs.map(d => d.data());
    }catch(e){ return null; }
  }
  return { submit, top };
})();
function localBest(){ try{ return +localStorage.getItem('timegame.best') || 0; }catch(e){ return 0; } }
function boardHTML(rows){
  if (rows === null) return `<div class="note">${Lh(STR.lbFail)}</div>`;
  if (!rows.length) return `<div class="note">${Lh(STR.lbEmpty)}</div>`;
  return '<table class="board">' + rows.map((r, i) => `<tr><td style="width:34px">${i + 1}</td><td>${esc(r.name || '')}</td><td class="r">${esc(r.score)}</td></tr>`).join('') + '</table>';
}
function showResult(){
  const r = App.round, n = App.qs.length, max = n * 10, ratio = App.score / max;
  const msg = ratio >= 0.9 ? L('太棒了！', '¡Excelente!', 'Excellent!') : ratio >= 0.7 ? L('很好！', '¡Muy bien!', 'Well done!') : ratio >= 0.5 ? L('不錯，再練習一下。', 'Bien, practica un poco más.', 'Good, keep practicing.') : L('再試一次，你可以的！', 'Inténtalo otra vez, ¡puedes!', 'Try again, you can do it!');
  try{ window.HGPlays && HGPlays.end({ score:App.score, secs:Math.round((Date.now() - App.t0) / 1000), name:App.name }); }catch(e){}
  if (App.score > localBest() && r.isMix){ try{ localStorage.setItem('timegame.best', String(App.score)); }catch(e){} }
  let h = `<div class="card result"><div class="small">${esc(sc(r.isMix ? '綜合挑戰' : '練習完成'))}</div><div class="score">${App.score}<span class="small"> / ${max}</span></div><div class="msg">${Lh(msg)}</div><div class="small">${App.right} / ${n}</div></div>`;
  if (r.isMix){
    h += `<div class="card"><div id="lbsave" class="note">${App.name ? Lh(STR.loading) : Lh(STR.lbNeedName)}</div><div id="lbtop"></div></div>`;
  }
  h += `<div class="row" style="justify-content:center"><button class="btn primary" id="again">${Lh(STR.again)}</button><button class="btn" id="home2">${Lh(STR.home)}</button></div>`;
  root().innerHTML = h; window.scrollTo(0, 0);
  $('#again').addEventListener('click', () => startRound(r.spec, r.lv, r.label, r.isMix));
  $('#home2').addEventListener('click', renderStart);
  if (r.isMix){
    (async () => {
      let saved = false;
      if (App.name) saved = await LB.submit(App.name, App.score);
      const rows = await LB.top();
      const a = $('#lbsave'), b = $('#lbtop'); if (!a || !b) return;
      a.innerHTML = App.name ? (saved ? Lh(STR.lbSaved) : Lh(STR.lbFail)) : Lh(STR.lbNeedName);
      b.innerHTML = boardHTML(rows);
    })();
  }
}
function showBoard(){
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="panel"><h3>🏆 ${esc(zhOf(STR.board))} · ${esc(zhOf(STR.mix))}</h3><div id="bd" class="note">${Lh(STR.loading)}</div><div class="note">${Li(STR.best)}：${localBest()}</div><button class="btn wide" id="bclose">${Lh(STR.close)}</button></div>`;
  document.body.appendChild(ov);
  $('#bclose', ov).addEventListener('click', () => ov.remove());
  ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
  LB.top().then(rows => { const b = $('#bd', ov); if (b) b.innerHTML = boardHTML(rows); });
}

renderStart();
