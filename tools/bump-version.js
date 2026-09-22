// Incrementa o ?v=N de todos os <script>/<link> locais do index.html.
// Rodar antes de publicar qualquer mudança em JS/CSS: o GitHub Pages cacheia por 10 min e, sem isso,
// o navegador mistura arquivos novos e antigos (ex.: expansion.js novo chamando função que o game.js antigo não tem).
// Uso: node tools/bump-version.js
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(file, 'utf8');
const cur = Math.max(...[...html.matchAll(/\?v=(\d+)"/g)].map(m => +m[1]));
fs.writeFileSync(file, html.replace(/\?v=\d+"/g, `?v=${cur + 1}"`));
console.log(`index.html: v${cur} -> v${cur + 1}`);
