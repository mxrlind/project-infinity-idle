# Changelog

## Não lançado

### Adicionado
- **Arte visual substituindo emojis genéricos.** Todo o conteúdo visual abaixo vive em `img/` (novo diretório) e não depende de nenhuma API externa em runtime — são arquivos estáticos versionados no repositório.
  - **Retratos dos 7 heróis** (`img/heroes/{id}.jpg`): cada herói agora mostra um retrato circular ao lado do nome na aba Heróis, em tons de cinza enquanto não contratado e colorido após a contratação. Arte em estilo pintura de fantasia, consistente entre os 7.
  - **Inimigos de combate** (`img/enemies/e1.png`…`e8.png` + `boss.png`): os 8 monstros que se alternam por onda e o chefe agora são ilustrações com fundo transparente, no lugar dos emojis (👺🧟🐗🦂🐍👻🕷️🐺/👹). A tela de combate (`.enemy-box`) renderiza um `<img>` em vez de texto.
  - **Moeda de clique** (`img/gold-coins.jpg`): o círculo de clique (`#click-coin`) usava um gradiente CSS genérico com o glifo "◉", pouco reconhecível como moeda. Agora usa uma foto real de moeda de ouro.
  - **Textura de fundo** (`img/bg-texture.jpg`) e **favicon** (`img/gold-coins.jpg`), aplicados via CSS (`body` background) e `<link rel="icon">` respectivamente.
  - Arquivos: `index.html`, `style.css`, `js/ui.js`, `img/**`.

### Corrigido
- **Conquista secreta "Paciência de Monge" (s4) desbloqueava instantaneamente ao carregar o save**, em vez de exigir 10 minutos reais parado com o jogo aberto. Causa: `S.lastClickAt` era herdado direto do save (`Object.assign(base, data)`) sem reset; se o jogador ficasse horas ou dias offline, `idleTime = agora − lastClickAt` já nascia muito acima do limiar de 600s assim que o save carregava. Correção: `loadGame()` agora reinicia `lastClickAt` para o momento do carregamento.
  - Arquivo: `js/state.js`.
- **Botão "Máx" (e "×10") na aba Heróis não funcionava corretamente.** O preço e o estado habilitado/desabilitado do botão de nivelar herói eram sempre calculados com base no custo de **apenas 1 nível**, independente da quantidade selecionada no seletor (×1/×10/Máx).
  - Em modo **Máx**, o preço exibido (ex. "43 ouro") não correspondia ao valor real cobrado — o clique de fato comprava dezenas/centenas de níveis por um custo muito maior, dando a impressão de que o botão "não fazia o que prometia".
  - Em modo **×10**, o botão aparecia habilitado mesmo sem ouro suficiente para os 10 níveis completos; o clique não fazia literalmente nada (sem log, sem som, sem erro) — indistinguível de um botão quebrado.
  - Correção: adicionada `Game.heroMaxLevels(heroId)` (mesmo padrão de `Game.genMaxBuy` já usado na aba Produção) e a UI agora calcula preço/afordabilidade com base na quantidade real que será comprada. `Game.levelHero()` foi refatorado para reutilizar `heroMaxLevels` em vez de duplicar o loop.
  - Arquivos: `js/game.js`, `js/ui.js`.

## v0.1.0 — Versão inicial

Implementação completa a partir da documentação de game design "Idle Game Definitivo", cobrindo as Fases 1–6 (clique/geradores → heróis/combate → base → talentos → prestígio → eventos mundiais), com teasers de Fase 7–8. Ver [FEATURES.md](FEATURES.md) para o detalhamento completo de cada sistema entregue nesta versão:

- Clique + 11 geradores + 31 upgrades, com marcos de quantidade (×2 a cada 25 unidades)
- 7 heróis com combate automático, ondas, chefes, equipamentos (5 raridades)
- Base com 8 salas
- Talentos em 3 árvores (12 talentos)
- Prestígio com Essência permanente
- 5 tipos de eventos mundiais + moedas douradas
- 43 conquistas (4 secretas)
- NPCs com personalidade (conselheiro + falas de heróis)
- Save automático, progresso offline, exportar/importar
- Áudio sintetizado via Web Audio API
- Tema visual "grimório obsidiana"
