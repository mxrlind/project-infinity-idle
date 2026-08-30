#!/usr/bin/env python3
"""Gera js/art-manifest.js a partir do que existe em img/.

O jogo emite <img> com fallback pro emoji (UI.iconImgHtml). Sem manifesto, TODA área ainda sem arte
dispara um 404 por ícone — eram ~90 requisições falhas por carregamento, enchendo o console de erro
e escondendo erros de verdade. Com o manifesto, o <img> só é emitido quando o arquivo existe.

Rode isto sempre que adicionar ou remover arte:  python tools/gen-art-manifest.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'img')
OUT = os.path.join(ROOT, 'js', 'art-manifest.js')
SKIP = {'_staging'}
EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}

manifest = {}
for group in sorted(os.listdir(IMG)):
    path = os.path.join(IMG, group)
    if not os.path.isdir(path) or group in SKIP:
        continue
    names = sorted(
        os.path.splitext(f)[0] for f in os.listdir(path)
        if os.path.splitext(f)[1].lower() in EXTS
    )
    if names:
        manifest[group] = names

body = ',\n'.join(f'  {json.dumps(g)}: {json.dumps(n)}' for g, n in manifest.items())
with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write(
        '// ===== Manifesto de arte — GERADO por tools/gen-art-manifest.py, não edite à mão =====\n'
        '// Mapeia pasta de img/ -> nomes de arquivo (sem extensão) que realmente existem.\n'
        '// UI.iconImgHtml consulta isto antes de emitir um <img>: sem o manifesto, cada ícone ainda\n'
        '// sem arte disparava um 404 (eram ~90 por carregamento da página).\n'
        f'const ART = {{\n{body},\n}};\n'
    )
print(f'{OUT}: {sum(len(v) for v in manifest.values())} arquivos em {len(manifest)} pastas')
