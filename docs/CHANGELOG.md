# Changelog

## Não lançado

### Sinergia de Composição, Pesquisa 2.0 e Feedback Visual (roadmap #2, #5, #14)
Continuação do roadmap após o caminho crítico (#6/#7/#3/#13/#12): os três itens seguintes na ordem recomendada (`#2 → #5 → #14`).

- **🧩 Sinergia de Composição (#2)**: camada ORTOGONAL ao medidor 0–100% de sinergia já existente — conta **reino** (`kingdom`) e **elemento** (`element`), novos campos em `HEROES` (`js/data.js`), mais o **tipo de arma ideal** (já existia via `archetype`) dos heróis **em campo** (não depende de gear equipado). `TEAM_SYNERGIES` (`js/data.js`) define 8 combos com bônus reais: Ordem Solar (Bran+Sera+Io+Kael, o quarteto exato cabe nos 4 slots, +25% ouro), Alcateia Selvagem/Círculo Arcano (3 heróis do reino, +DPS/+pesquisa), Manto das Sombras/Círculo Sagrado (3 do elemento, +crítico/+DPS), Duo Fulminante (2 de Raio), Linha de Frente (3 de Martelo), Esquadrão Equilibrado (4 papéis de combate distintos). Motor: `Game.recomputeSynergy()` (`js/game.js`) agora também tabula `compCounts` e soma os bônus ativos direto no acumulador `_roleEff` (`teamDps/gold/research/crit`) já consumido por `teamDps()`/`enemyGold()`/`researchSpeed()` — **sem hooks novos**. UI: seção "🧩 Composição de Time" no painel de Sinergia (`js/ui.js`), lista as 8 combinações com progresso `have/need` e ✔/✖. Sem migração de save (kingdom/element são dados estáticos dos heróis, não estado).
- **🔬 Pesquisa 2.0 — ramos exclusivos (#5)**: dois pares de tecnologias mutuamente exclusivas em `RESEARCH` (`js/data.js`) via campo novo `exclusiveWith`: Economia (Monopólio Mercantil +40% ouro/+20% custo de herói **ou** Redistribuição Justa −15% custo de herói/−10% ouro) e Combate (Fúria de Sangue +25% DPS/−8% drop **ou** Disciplina de Ferro +12% drop/−10% DPS) — trade-offs reais de build, não dá pra pegar as duas. Motor: `Game.researchExclusionBlocker(def)` (`js/expansion.js`) bloqueia `canStartResearch` quando o lado oposto do par já foi concluído; `researchAvailable()` continua mostrando o ramo travado (não esconde) pra UI exibir o "galho bloqueado" do doc. `RESEARCH_MAX_COMPLETABLE` (`js/data.js`) corrige a conquista "Singularidade Mental" (que exigia concluir TODAS as pesquisas — impossível agora que existem pares exclusivos) para o teto real (`RESEARCH.length` menos metade das que têm par). UI (`js/ui-ext.js`): cards com tag "⚔️ Ramo exclusivo", nota "🔒 Bloqueado — você já escolheu X" e botão desabilitado quando aplicável.
- **✨ Feedback Visual (#14)**: `UI.legendaryFlash(color, big)` (`js/ui.js`) ganhou um segundo parâmetro — quando `big`, soma tremor de tela (`.shake-body`) + rajada de partículas (`UI.particleBurst`, 14 "✦" saindo do centro). Ligado nos drops verdadeiramente **Lendários** (raridade 4, não Épico) em `game.js` (loot de monstro e revelação da Forja) e em todos os marcos raros que já chamavam `legendaryFlash` (Relíquia obtida, evolução de mascote, estágio da Árvore do Mundo, Ascensão) — todos passam a tremer+particular também. Conquistas ganharam `UI.confettiBurst()` (24 peças caindo, cores variadas) chamado em `Game.checkAchievements()` (`js/game.js`). Chefes ganharam barra de HP "gigante" (`.hp-bar-boss`: mais alta + glow pulsante), classe alternada junto com `.is-boss` já existente. Tudo respeita `S.flashFx`/`prefers-reduced-motion` (mesma checagem já usada por `legendaryFlash`).
- Verificado via console no preview: as 8 `TEAM_SYNERGIES` ativam/desativam corretamente por composição de campo (testado quarteto solar, papéis diversos, etc.); `canStartResearch` bloqueia o lado oposto de um par assim que o primeiro é concluído e a UI mostra a nota de bloqueio; `RESEARCH_MAX_COMPLETABLE` calculado certo (24 de 26, com os 2 pares novos); partículas/confete/tremor só disparam com `S.flashFx` ligado e `prefers-reduced-motion` desligado; `.hp-bar-boss` liga junto com `.is-boss` ao entrar em combate de chefe.
- Restam do roadmap: #15 Música dinâmica, #4/#8/#9/#10/#11 (polimento), #16 (contínuo).

### Árvore do Mundo (roadmap #12)
Meta-construção permanente que fecha o "ciclo interdependente" do doc de design: consome **Essência** (#13) e **Conhecimento** (ambos persistem entre prestígios e ascensões) além de **Madeira**/**Cristal** da run atual, e cresce por nível — sem teto de reset. Cada nível concede **+1% de produção, DPS e ganho de Essência para sempre** (cumulativo); ao cruzar um novo estágio visual (Broto → Muda → Árvore Jovem → Ancestral → Gigante → Cósmica), presenteia **Pontos de Ascensão (⬟)** de bônus, realimentando a Progressão em Camadas (#13).
- Config em `WORLD_TREE` (`js/data.js`: `costAt(lvl)` multi-recurso, `stages[]`, `bonusPerLevel`). Estado novo `S.worldTree = { level: 0 }` (`js/state.js`) — **permanente**, não é tocado por `resetRunState`/`doPrestige`/`doAscend`; migra de saves antigos (incluindo sem a chave) como zerado.
- Motor em `js/worldtree.js` (`Game.worldTreeCost/canGrowWorldTree/growWorldTree/worldTreeMult/worldTreeStage`). Bônus plugado nos agregadores já existentes (`expansion.js`: `extGoldMult/extDpsMult/extEssenceMult` agora multiplicam por `Game.worldTreeMult()`), sem tocar o motor original. `growWorldTree(times)` aceita `1`/`10`/`'max'`, mesmo padrão de compra dos geradores.
- UI em `js/worldtree-ui.js`: aba própria "🌳 Árvore do Mundo" (desbloqueia após o 1º prestígio ou 1ª ascensão), com ícone/nome do estágio atual, barra de progresso pro próximo estágio, custo multi-recurso (`cost-missing` nos que faltam) e seletor 1×/10×/Máx — acento visual verde, mesma estrutura visual do Prestígio/Ascensão.
- **Decisão deliberada de escopo** (mesmo espírito do #13): não consome relíquias diretamente nem implementa "mundo2/mundo3/endgame" — esses desbloqueios dependem de conteúdo que ainda não existe (camadas Divindade+). O elo com #6 fica pelo bônus de ⬟ compartilhado; `WORLD_TREE.stages[]` já é a estrutura pra adicionar recompensas maiores depois.
- Verificado via console no preview: custo/nível bate `WORLD_TREE.costAt`; `growWorldTree('max')` cresce até faltar um recurso e para sem erro; cruzar o estágio "Muda" (nível 10) concedeu +1 ⬟; nível sobrevive intacto a `doPrestige()` e `doAscend()`; `globalProdMult()`/`teamDps()` seguem sem `NaN` com o multiplicador novo; save/load faz round-trip completo e um save sem `worldTree` migra para `{level:0}` sem erro.
- Restam do roadmap: #2 Sinergia de Composição, #5 Pesquisa em árvore, #14 Feedback visual, #15 Música dinâmica, #4/#8/#9/#10/#11 (polimento), #16 (modularização — seguida aqui: `worldtree.js`+`worldtree-ui.js`). Camadas Divindade+ ficam pra quando mais conteúdo der sentido a outra camada de reset.

### Progressão em Camadas — Ascensão (roadmap #13)
Uma camada acima do Prestígio: **Run → Prestígio → Ascensão**. Ao acumular **10 prestígios na camada atual** e pelo menos `ASCENSION_ESSENCE_REQ` (50) de Essência, o jogador pode **ascender**: reinicia Essência e Prestígios (junto com tudo que o Prestígio já reseta — ouro, geradores, upgrades, heróis, base) em troca de **Pontos de Ascensão (⬟)**, permanentes mesmo entre ascensões futuras. Cada ⬟ concede **+5% de produção, DPS e ganho de Essência para sempre**, o que acelera a próxima subida — o "efeito bola de neve" pretendido pelo doc de design.
- Config em `LAYERS`/`ASCENSION_*` (`js/data.js`). Estado novo `S.layers = { ascensions, ascPoints }` (`js/state.js`) — **permanente**, sobrevive a prestígio e ascensão; migra de saves antigos como zerado.
- Motor em `js/layers.js` (`Game.ascensionGain/canAscend/ascMult/doAscend`). `Game.doPrestige` foi refatorado para extrair `Game.resetRunState()` (lógica de reset da run, antes duplicada) — reaproveitada por `doAscend`, que reseta essência/prestígios por cima. Bônus plugado nos agregadores já existentes (`expansion.js`: `extGoldMult/extDpsMult/extEssenceMult` agora multiplicam por `Game.ascMult()`), sem tocar o motor original.
- UI em `js/layers-ui.js`: painel "Ascensão" dentro da aba Prestígio (só aparece após o 1º prestígio, pra não spoilar antes da hora), com estado bloqueado (barra de progresso de prestígios) e desbloqueado (botão "Ascender" + confirmação), acento visual roxo-arcano.
- Verificado via console no preview: ganho de Ascensão bate a fórmula (`floor(sqrt(essência/50))`); `doAscend()` zera essência/prestígios e mantém conquistas/pesquisas/mascotes intactos; `doPrestige()` continua funcionando após a refatoração; save com `S.layers` faz round-trip completo em `saveGame`/`loadGame`; save antigo sem `layers` migra para `{ascensions:0, ascPoints:0}` sem erro; fluxo completo pela UI (clique no botão → modal de confirmação → `Confirmar` → reset) testado ponta a ponta.
- Restam do roadmap: #12 Árvore do Mundo (próximo — consome Essência/relíquias, incluindo as de camadas superiores como sumidouro), #2 Sinergia de Composição, #5 Pesquisa em árvore, #14 Feedback visual, #15 Música dinâmica, #4/#8/#9/#10/#11 (polimento), #16 (modularização — seguida aqui: `layers.js`+`layers-ui.js`). Camadas seguintes (Divindade, Singularidade, Recomeço do Universo) ficam para quando #12 e o restante do conteúdo derem sentido a mais uma camada de reset (arquitetura de `LAYERS[]` já suporta adicionar entradas).

### Relíquias, Chefes Inteligentes e Equipamentos 2.0 (roadmap #6, #7, #3)
Os três primeiros itens do caminho crítico do [ROADMAP.md](ROADMAP.md), implementados em sequência:

- **🔮 Relíquias (#6)**: até `RELIC_SLOTS` (3) equipadas ao mesmo tempo, cada uma com um trade-off forte (`RELICS`, `js/data.js`) — ex. Coroa Quebrada (+80% ouro, heróis custam +100%), Olho do Dragão (chefes +400% HP, drop dobrado). Motor em `js/relics.js` (`Game.relicEffect/relicDropBonus/grantRelic/equipRelic`), plugado nos hooks `ext*Mult` já existentes (`expansion.js`) + hook novo `extBossHpMult` (único fora do padrão, usado em `enemyMaxHp`). Fontes: drop raro de chefe (onda ≥40), troca com o Colecionador (Silas), conclusão da pesquisa "Portais Estelares". Permanente — sobrevive ao prestígio. UI em `js/relics-ui.js`: painel na aba Heróis com slots + inventário + chips verde/vermelho do efeito líquido.
- **🐉 Chefes Inteligentes (#7)**: cada chefe (a partir da onda mínima) pode sortear uma mecânica de `BOSS_MECHANICS` — Dragão Alado (penaliza DPS sem Duelista em campo), Golem de Pedra (85% de armadura física — só dano MÁGICO do papel Mago, `armorPen`, ignora), Necromante (drena o tempo de chefe 50% mais rápido) e Rei Demônio (alterna resistência física/mágica a cada 8s). Motor em `js/bosses.js` (`Game.bossArmorMults/bossRolePenaltyMult/tickBossShift`), consumido por `teamDps`/`tick` (`game.js`) — o DPS do time agora é dividido em físico/mágico (`Game.heroIsMagic`). UI em `js/bosses-ui.js`: banner de intro (reaproveita `#event-banner`) + badge da mecânica ativa no painel de combate.
- **🧩 Equipamentos 2.0 (#3)**: itens dropados/forjados podem carregar um `set` (`GEAR_SETS`: Dragão/Sombrio/Golem) e/ou um `element` (`ELEMENTS`, com afixo elemental dedicado em `FORGE_ELEMENT_AFFIXES`). Bônus por nº de peças **equipadas** entre todos os heróis: 2pç (numérico) e 4pç (numérico + especial) — o especial do Conjunto Golem (`armorpen`) faz o time **ignorar armadura de chefe** (liga direto com #7); o do Sombrio (`lifesteal`) dá +2s no tempo de chefe. Chefes com `dropSet` (#7) dropam preferencialmente peças do set correspondente. Motor em `js/gearsets.js` (`Game.activeSetBonuses/rollItemSetElement`). UI em `js/gearsets-ui.js`: seção "Conjuntos" com progresso 0/2/4; chips de gear ganharam glow colorido por elemento e badge do set.
- Verificado via console no preview: relíquia equipada mudou o DPS na proporção exata do efeito; armadura do Golem reduziu o DPS físico a 15% (mágico intacto); Conjunto Golem 4pç fez o time ignorar a armadura; Rei Demônio alternou a resistência corretamente a cada 8s real; penalidade do Dragão confirmada com/sem Duelista em campo; loot temático confirmado; save/load e reset de prestígio preservam `S.relics` (permanente) e recriam `S.combat` sem `undefined`.
- Restam do roadmap: #13 Camadas de Progressão, #12 Árvore do Mundo, #2 Sinergia de Composição, #5 Pesquisa em árvore, #14 Feedback visual, #15 Música dinâmica, #4/#8/#9/#10/#11 (polimento), #16 (modularização — já seguida aqui: `relics.js`+`relics-ui.js`, `bosses.js`+`bosses-ui.js`, `gearsets.js`+`gearsets-ui.js`).

### Papéis de Combate dos Heróis (rework #1)
Cada herói ganhou um **papel de combate** (`role`) — uma camada ORTOGONAL à classe (que ainda alimenta o medidor de Sinergia) e ao arquétipo (que ainda decide a arma ideal). O papel define **como** o herói contribui no motor, dando função em vez de só "maior número":
- **🛡️ Tanque** (Bran, Io): DPS próprio baixo, mas **provoca** (+8% DPS do time por tanque) e **segura chefes** (+6s no tempo-limite por tanque).
- **⚔️ Duelista** (Kael, Lyra): +60% DPS próprio e +6% de crítico para o time (vale no clique **e** no DPS ocioso).
- **🔮 Mago** (Magnus): +45% DPS próprio, **+30% em ondas comuns** (área) e **ignora armadura** de chefes (semente para Chefes Inteligentes #7).
- **🗡️ Assassino** (Vex): +35% DPS, +12% de crítico e **executa** inimigos comuns abaixo de 12% de vida.
- **💀 Necromante** (Nyx): invoca um **exército** que dá DPS EXTRA separado (= DPS próprio ×0,5), crescendo até +150% conforme você abate.
- **🎵 Bardo** (Sera, Orin): quase não bate, mas **+14% DPS do time**, +10% ouro por abate e +15% de velocidade de pesquisa.
- **🪓 Berserker** (Thora): acumula **fúria** a cada segundo de luta (+5%/s até +120%), reseta ao abater — devastador contra chefes.
- Dados em `HERO_ROLES` (`js/data.js`); motor em `Game.roleDpsMult`/`summonDps`/`teamRoleEffects` (`js/game.js`), com hooks em `heroDps`, `teamDps`, `bossTimeLimit`, `enemyGold`, `clickAttack`, `researchSpeed` e o tick de combate (rastreia `S.combat.fightT`). Crítico agora também vale no DPS ocioso (valor esperado). UI: selo de papel nos cards (campo e reserva) + tooltip com a função e perks. Compatível com saves (campos aditivos).

### Revisão de Heróis, Forja, Sinergia e Base
Quatro pilares repensados para terem mecânica de verdade, não só números maiores:
- **⚔️ Especialização por classe (Arquétipo + Arma ideal)**: cada herói ganhou um `archetype` (Duelista/Mago/Arqueiro/Paladino/Assassino/Necromante) com uma **arma ideal** (`WEAPON_TYPES`). Armas forjadas/dropadas agora têm `wtype`. Equipar a arma certa ativa um **pacote de especialização** que escala com a raridade (`Game.specScale`: Comum×1 … Lendário×3): DPS, aura de time, ouro, crítico, material e velocidade — além de mecânicas literais no combate: **ataque duplo** (Duelista no clique) e **execução** de inimigos com pouca vida (Assassino no tick). Arma incompatível → só os atributos-base, sem bônus. Itens antigos migram pelo ícone (`WEAPON_ICON_TO_TYPE`).
- **⚡ Sinergia de Time como medidor 0–100%**: substitui o antigo score contínuo de +30%. A % é **transparente** — soma de composição (proporção 🛡️1:⚔️2:✨1), campo cheio e heróis com a arma ideal — e concede faixas progressivas: 20% +Ataque · 40% +Ouro · 60% +Produção · 80% +Sabedoria · **100% Estado Perfeito** (+50% em tudo, aura brilhante na equipe). Painel novo com barra, escada de faixas e dica do próximo gargalo. Liga as Partes 1 e 2: equipar a arma ideal sobe a sinergia.
- **🏗️ Bug da Base corrigido**: o botão *Construir* era criado sem handler de clique — nenhuma sala podia ser comprada. Agora `renderBase` liga o botão a `Game.buildRoom` (o motor já estava correto).
- **🏰 5 edifícios novos** com efeito real: **Mercado** (renda de ouro passiva que escala com a maior onda), **Templo** (+produção global), **Torre Arcana** (+DPS mágico), **Arena** (+ouro/tempo de chefe), **Castelo** (multiplicador GERAL de sinergias e edifícios — `Game.baseMult`). Grade expandida para 4×4; 7 novas sinergias de vizinhança.
- **🌇 Base viva**: cena panorâmica animada que cresce com os níveis (horizonte de prédios, NPCs caminhando, fogueira, bandeiras do Castelo, partículas, rótulo de estágio Terreno→Cidadela Real) + decorações e brilho por nível em cada tile.
  - Tocados: `js/data.js`, `js/game.js`, `js/ui.js`, `style.css`. Compatível com saves existentes (campos novos são aditivos; `synergyMult`/`SYNERGY_MAX_BONUS` mantidos como legado).


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
