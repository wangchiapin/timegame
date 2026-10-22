// 把 src/ 底下的檔案和 game-kit 的共用零件合成單一 index.html
const fs = require('fs'), path = require('path');
const S = p => fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
const KIT = process.env.KIT || '/home/claude/game-kit/parts/';
const K = p => fs.readFileSync(path.join(KIT, p), 'utf8');
const GAME_ID = 'time';

const mute = K('mute.js').replace(/__GAME__/g, GAME_ID).replace(/__POS__/g, 'left:8px;bottom:22px').replace(/__MOUNT__/g, '');
const plays = K('plays.js').replace('REPLACE_GAME_ID', GAME_ID);
const main = ['01-core.js', '02-gen.js', '03-ui.js'].map(S).join('\n');

const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#ebe5d6">
<title>練習時間 · ¿Qué hora es?</title>
<style>
${S('style.css')}
</style>
</head>
<body>
<div id="app"></div>
<script>
${mute}
</script>
<script>
${main}
</script>
<script>
${K('voicehint.js')}
</script>
<script>
${K('copyright.js')}
</script>
${plays}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', html.length, 'bytes');
