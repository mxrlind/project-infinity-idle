# Project Infinity Idle

Idle game em HTML/CSS/JS puro (zero dependências, zero build), implementado a partir da documentação de game design "Idle Game Definitivo". Inspirado em Cookie Clicker, Clicker Heroes, AdVenture Capitalist, Idle Mastermind e Idle Wizard.

🎮 **Jogar online:** https://mxrlind.github.io/project-infinity-idle/

## Repositório e deploy

Código versionado em [github.com/mxrlind/project-infinity-idle](https://github.com/mxrlind/project-infinity-idle) (público), publicado via **GitHub Pages** direto da branch `master`, pasta raiz (`/`).

Como o jogo é HTML/CSS/JS estático sem build, o deploy é automático: qualquer `git push` para `master` atualiza o site em produção em ~1 minuto, sem passo manual extra.

```bash
git add -A
git commit -m "sua mensagem"
git push
```

## Rodar

Qualquer servidor estático funciona (precisa de HTTP por causa dos módulos/fetch de fontes; abrir o `index.html` direto também funciona, mas por HTTP é mais confiável):

```bash
npx serve project-infinity-idle
# ou
python -m http.server --directory project-infinity-idle 8000
```

O save é feito em `localStorage`, então ele persiste no mesmo navegador/origem entre sessões.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | Todas as funcionalidades e sistemas do jogo, com números e fórmulas exatas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Estrutura dos arquivos, fluxo de dados, como estender o conteúdo |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Histórico de mudanças e correções |

## Visão geral rápida

| Fase | Sistema desbloqueado | Gatilho (ouro ganho na run atual) |
|---|---|---|
| 1 | Clique, geradores, upgrades | início |
| 2 | Heróis, combate automático, chefes, equipamentos | 2.500 |
| 3 | Base (8 salas) | 200 mil |
| 4 | Talentos (3 árvores) | 10 milhões |
| 5 | Prestígio (Essência permanente) | 500 milhões |
| 6 | Eventos mundiais | 5 bilhões (ou 1º prestígio) |
| 7–8 | Teasers ("???" na navegação) | 500 bi / 100 tri |

Detalhes completos de cada sistema — geradores, heróis, salas, talentos, conquistas, eventos, fórmulas de custo/produção — estão em [docs/FEATURES.md](docs/FEATURES.md).

## Arquitetura (resumo)

```
index.html      — estrutura da página
style.css       — tema "grimório obsidiana"
js/format.js    — formatação de números gigantes
js/data.js      — TODO o conteúdo do jogo (data-driven)
js/state.js     — estado + save/load/export/import
js/game.js      — motor: produção, combate, prestígio, eventos, offline, áudio
js/ui.js        — renderização das abas, feedback visual, modais
js/main.js      — boot + loop principal (tick de 100ms)
```

Detalhes de como cada peça se conecta e como adicionar novo conteúdo (gerador, herói, sala, talento, conquista, evento) estão em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Segredos

Existem 4 conquistas secretas e outras curiosidades escondidas — não documentadas aqui de propósito. Se quiser a lista completa mesmo assim (ou estiver debugando), ela está em `js/data.js` na constante `ACHIEVEMENTS` (`secret: true`).
