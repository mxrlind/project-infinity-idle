# Changelog

## Não lançado

### Expansão: Mundo Vivo, Mascotes, Pesquisa, Mercado, Cidade, Lore, Segredos e Áudio 2.0
Oito sistemas novos, integrados entre si (detalhes e números em [FEATURES.md](FEATURES.md) §18–25):
- **🗓️ Mundo Vivo**: calendário permanente (1 dia = 20 min reais), dia/noite, 4 estações e 5 climas (chuva, tempestade, neve, lua cheia, eclipse) que alteram produção, DPS, conhecimento, materiais e drops. Widget no painel esquerdo + modal de calendário.
- **🐾 Mascotes**: Lobo/Coruja/Dragão/Fênix com nível, XP (abates + alimentação), evolução (nv 25/50) e bônus passivos só quando **ativos**. Fênix devolve um "ninho de ouro" após o prestígio. Data-driven (`PETS`).
- **🔬 Pesquisa**: 22 tecnologias em 9 categorias, tempo real (5 min–3 dias) com fila, cancelamento, progresso offline e notificações. Várias desbloqueiam mecânicas: Mercado, Cidade, mascotes, 5º slot do campo, automação (autocomprador/autoclique), previsão do tempo, +1 ✦ por chefe em eclipse.
- **📈 Mercado**: preços vivos por hora do mundo (demanda sazonal/climática + ruído), sparklines de 48h, escassez/promoção, taxas reduzíveis (pesquisa + amizade). Especulação de verdade: comprar, estocar, vender.
- **🏘️ Cidade**: 5 NPCs (Dorian, Bruna, Zephyr, Mira, Silas) com amizade, perks permanentes, estoque diário determinístico e missões diárias ligadas aos outros sistemas (vender, forjar, pesquisar, alimentar, chefes).
- **📖 Lore Oculta**: 14 descobertas com gatilhos silenciosos, registradas automaticamente na nova seção "Descobertas" do Códex.
- **🤫 5 segredos novos** (conquistas secretas): palavra mágica, ponto escondido, timing de mercado, desmanche lendário, caçada lunar.
- **🔊 Áudio 2.0**: volume-mestre, anti-sobreposição, 9 efeitos novos e música ambiente gerativa com fade.
- Save **v2** com migração automática de saves v1 (merge profundo; tudo da expansão é permanente e sobrevive ao prestígio). Hooks pontuais no motor original (`ext*Mult`, `tickExt`, `onKillExt`, `onPrestigeExt`, `offlineExt`).
  - Arquivos novos: `js/expansion.js` (motor), `js/ui-ext.js` (UI). Tocados: `js/data.js`, `js/state.js`, `js/game.js`, `js/ui.js`, `index.html`, `style.css`.



### Segurança
- **Requisito de prestígio agora é validado no motor, não só na UI.** `Game.buyGen()` e `Game.hireHero()` checam `reqPrestige` antes de qualquer compra — antes, chamar esses métodos pelo console permitia comprar a Singularidade/contratar Nyx sem nunca ter prestigiado (a única barreira era a lista não renderizar o botão). Fecha o item 🔴1 da [AUDIT.md](AUDIT.md).
  - Arquivo: `js/game.js`.
- **Import de save agora valida schema e a UI escapa strings vindas do save.** `importSave()` descarta chaves desconhecidas, exige tipo compatível com o estado default e só aceita buffs em formato conhecido (strings curtas); `UI.updateBuffs()` escapa `name`/`icon` antes de injetar em `innerHTML`. Antes, um código de save malicioso compartilhado entre jogadores podia injetar HTML/script na sessão de quem importasse (self-XSS). Fecha o item 🔴2 da AUDIT.
  - Arquivos: `js/state.js`, `js/ui.js`.

### Corrigido (novo)
- **"Máx" agora é o máximo de verdade.** `genMaxBuy`/`heroMaxLevels` eram loops capados em 500/200 iterações — em late-game o botão "Máx" mostrava menos do que o ouro realmente comprava. Substituídos pela soma geométrica em fórmula fechada (e sua inversão por logaritmo), sem teto artificial; `genCost`/`heroLvlCost` também deixaram de ser O(n). Fecha o item 🔴3 da AUDIT.
  - Arquivo: `js/game.js`.
- **Texto do prestígio dizia "a Essência cresce com a raiz do ouro"**, mas o expoente real é 0.45 (não 0.5). O texto agora comunica o crescimento sublinear real ("dobrar o ouro rende ~1.37× de Essência"). Fecha o item 🟡11 da AUDIT.
  - Arquivo: `js/ui.js`.

### Acessibilidade
- **Respeito a `prefers-reduced-motion`**: com a preferência ativa no sistema, todas as animações/transições são neutralizadas e o flash de tela cheia de drop lendário é totalmente desativado.
- **Nova opção "✨ Efeitos de tela cheia" na aba Ajustes** (`S.flashFx`, persistida no save): desliga o `legendaryFlash` independente do som e da preferência do sistema — proteção para jogadores fotossensíveis. Fecha o item 🟠5 da AUDIT.
  - Arquivos: `style.css`, `js/ui.js`, `js/state.js`.

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
