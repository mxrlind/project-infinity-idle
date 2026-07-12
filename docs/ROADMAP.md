# Roadmap da Grande Expansão — 15 sistemas restantes

Documento de planejamento derivado do doc de game design do usuário ("idle game onde todos os
sistemas dependem entre si"). Numeração segue o doc original (16 itens). **#1 Rework de Heróis já
foi implementado** (ver [CHANGELOG.md](CHANGELOG.md) → *Papéis de Combate*). Este arquivo cobre os
**15 restantes**, cada um mapeado para a arquitetura real: `js/data.js` (dados), `js/game.js` /
`js/expansion.js` (motor), `js/ui.js` / `js/ui-ext.js` (UI), `js/state.js` (estado), `style.css`.

> **#6 Relíquias, #7 Chefes Inteligentes, #3 Equipamentos 2.0, #13 Progressão em Camadas
> (Ascensão) e #12 Árvore do Mundo já foram implementados** (ver [CHANGELOG.md](CHANGELOG.md)),
> cada um como par próprio `js/<sistema>.js` + `js/<sistema>-ui.js` (seguindo a recomendação do #16
> abaixo). Restam **10** sistemas. Próximos na ordem recomendada: **#2 → #5 → #14 → #15 → ...**

> **Convenções do projeto** (respeitar em toda implementação):
> - Tudo data-driven: conteúdo novo entra como const em `data.js`, nunca hard-coded no motor.
> - Motor da expansão via `Object.assign(Game, {...})` em `expansion.js`; UI via `Object.assign(UI, {...})` em `ui-ext.js`.
> - Hooks já existentes no motor original: `extProdMult/extDpsMult/extKillGoldMult/extMaterialMult/extDropBonus/extCritBonus/extHeroCostMult`, `tickExt(dt)`, `onKillExt(boss)`, `onPrestigeExt()`, `offlineExt(sec)`. **Preferir estender esses hooks a editar o motor original.**
> - Renderização por dirty-flags: `UI.dirty.{prod,heroes,base,...}`; caches invalidados por `_gearDirty`/`_fieldDirty`.
> - Save versionado (`SAVE_VERSION`, hoje 2) com migração e merge profundo. Todo estado permanente novo tem que sobreviver ao prestígio e migrar de saves antigos.
> - Números grandes via `fmt()` (`js/format.js`); escalas sempre relativas à maior onda (`enemyGold(S.combat.maxWave)`) pra nunca ficarem obsoletas.

---

## Legenda de status e prioridade

| Símbolo | Significado |
|---|---|
| 🟥 **NOVO** | Sistema inexistente — construir do zero |
| 🟨 **APROFUNDAR** | Existe uma base; falta a camada de profundidade do doc |
| 🟩 **POLIR** | Praticamente pronto; faltam detalhes ou feedback |

**Ordem recomendada** (dependências + impacto): **6 → 7 → 3 → 13 → 12 → 2 → 5 → 14 → 15 → 4/8/9/10/11/16**.

---

## #6 · Relíquias ✅ IMPLEMENTADO — *prioridade máxima (o usuário marcou como "o mais importante")*

**Objetivo:** itens rarísssimos que **mudam a gameplay** com trade-offs fortes, no máximo **3 equipadas**. É o principal gerador de builds.

**Dados (`data.js`):**
```js
const RELIC_SLOTS = 3;
const RELICS = [
  { id:'ampulheta', name:'Ampulheta Rachada', icon:'⏳', rarity:4,
    desc:'+40% pesquisa · −30% frequência de eventos',
    effects:{ research:1.40, eventFreq:0.70 } },
  { id:'olho_dragao', name:'Olho do Dragão', icon:'🐲', rarity:5,
    desc:'Chefes têm +400% HP, mas dropam +100%',
    effects:{ bossHp:5.0, drop:2.0 } },
  { id:'coroa_quebrada', name:'Coroa Quebrada', icon:'👑', rarity:5,
    desc:'+80% ouro · heróis custam +100%',
    effects:{ gold:1.80, heroCost:2.0 } },
  // ... ~12-16 relíquias, cada uma com um trade-off que empurra pra uma build diferente
];
```

**Estado (`state.js`):** `relics: { owned:{}, equipped:[null,null,null] }` — **permanente** (não reseta no prestígio).

**Motor (`expansion.js`):**
- `relicEffect(key)` → produto dos `effects[key]` das relíquias equipadas (default 1).
- Aplicar nos hooks existentes: `extProdMult` (`gold`), `extDpsMult` (`dps`), `extKillGoldMult`, `extDropBonus`, `extHeroCostMult` (`heroCost`), `researchSpeed` (`research`), `enemyMaxHp` (`bossHp` — **precisa de um hook novo `extBossHpMult`** no motor original, é a única edição fora de hook).
- Fontes de relíquia: drop de chefe raro, troca com o Colecionador (Silas já existe), recompensa de conclusão de árvore de pesquisa.

**UI:** nova aba ou painel dentro de Heróis: 3 slots + inventário de relíquias, cada uma mostrando o trade-off em verde/vermelho. Tooltip com o efeito líquido.

**Save/compat:** aditivo; migração cria `relics` vazio. **Esforço: M (meio dia).** Depende de: nada (autocontido). Habilita: #12 (Árvore do Mundo consome relíquias), #7 (relíquias que mexem em chefes).

---

## #7 · Chefes Inteligentes ✅ IMPLEMENTADO — *seam de `armorPen` já pronto*

**Objetivo:** cada chefe tem **mecânica**, não só +HP/+dano. Conecta diretamente com os papéis de herói (#1).

**Dados (`data.js`):**
```js
const BOSS_MECHANICS = [
  { id:'dragao',   name:'Dragão Alado',  icon:'🐉', desc:'Voa: só Arqueiros/Duelistas acertam',
    req:{ role:['duelista'] }, penalty:0.15 },       // sem o papel certo em campo, DPS ×0.15
  { id:'golem',    name:'Golem de Pedra', icon:'🗿', desc:'Blindado: só dano MÁGICO fere de verdade',
    armor:0.85 },                                     // reduz DPS físico 85%; Mago (armorPen) ignora
  { id:'necro',    name:'Necromante',    icon:'💀', desc:'Invoca esqueletos que roubam seu tempo de chefe',
    summonEnemies:true },
  { id:'rei_demonio', name:'Rei Demônio', icon:'😈', desc:'Troca de resistência (física↔mágica) a cada 8s',
    shifting:true },
];
```

**Motor (`game.js`):**
- `armorPen` (do Mago, papel #1) **já existe** em `HERO_ROLES.mago.combat.armorPen` — falta consumir: em `teamDps`/`heroDps`, separar DPS físico de mágico e aplicar `armor` do chefe só ao físico. Heróis com `armorPen` contam como mágico.
- `spawnEnemy`: quando `boss`, sortear/atribuir `c.bossMech` (por faixa de onda). Mostrar aviso ("O Golem só teme magia!").
- `role: ['duelista']` etc. → checar presença do papel em campo (`teamRoleEffects().counts`) e aplicar `penalty` se ausente.
- `shifting`: alternar `c.resist` no tick a cada N segundos.

**UI:** intro de chefe (banner com nome + mecânica), ícone da resistência atual na barra de HP.

**Save/compat:** `S.combat.bossMech` transitório (não precisa migrar). **Esforço: M.** Depende de: #1 (papéis — feito). Sinergiza com: #6.

---

## #3 · Equipamentos 2.0 (Sets + Afixos de Elemento + Loot de Chefe) ✅ IMPLEMENTADO

**Existe hoje:** `RARITIES`, `FORGE_AFFIXES` (5 afixos), Forja em 3 tiers, drop de gear, `wtype`/especialização por arquétipo. **Falta:** conjuntos (sets), afixos elementais, loot temático por chefe.

**Dados (`data.js`):**
```js
const GEAR_SETS = [
  { id:'dragao', name:'Conjunto Dragão', icon:'🐉',
    bonuses:{ 2:{ dps:0.20 }, 4:{ special:'burn' } } },   // 2pç +20% DPS · 4pç ataques causam fogo
  { id:'sombrio', name:'Conjunto Sombrio', icon:'🌑',
    bonuses:{ 2:{ crit:0.08 }, 4:{ special:'lifesteal' } } },
];
const ELEMENTS = ['fogo','gelo','raio','sagrado','sombra'];  // afixos elementais novos em FORGE_AFFIXES
```
- Adicionar `set` e `element` aos itens (drop/forja). Chefes (#7) dropam peças do seu próprio set (`Chefe Dragão → Set Dragão`).

**Motor:** `activeSetBonuses()` (conta peças equipadas por set entre todos os heróis, aplica limiares 2/4) — mesmo padrão de `activeSynergies()` da Base. Entra em `recomputeGearBonuses()` (cache `_gearDirty`).

**UI:** aba/seção "Conjuntos" mostrando progresso 0/2/4 de cada set; cor de borda por elemento nos chips de gear.

**Save/compat:** itens antigos sem `set`/`element` continuam válidos (contam como sem-set). **Esforço: M-G.** Depende de: idealmente #7 (loot de chefe). Nota: cuidado com power-creep — sets devem competir com afixos, não empilhar sem limite.

---

## #13 · Progressão em Camadas ✅ IMPLEMENTADO (Ascensão) — *dá o "objetivo final" que hoje falta*

**Objetivo:** camadas acima do Prestígio, cada uma retendo mais progresso:
`Run → Prestígio → Ascensão → Divindade → Singularidade → Recomeço do Universo`.

**Existe hoje:** só Prestígio (`S.prestiges`, `S.essence`, +2%/pt, expoente 0.45).

**Dados/Estado:**
```js
const LAYERS = [
  { id:'prestige',    unlockAt:{ essence:0 },        currency:'essence',  keeps:['essence'] },
  { id:'ascension',   unlockAt:{ prestiges:10 },      currency:'ascPoint', keeps:['essence','talents?'] },
  { id:'divinity',    unlockAt:{ ascensions:5 },      currency:'divShard', keeps:['ascension gains','research?'] },
  // ...
];
// S: prestiges, ascensions, divinities, ascPoints, divShards...
```
- Cada camada superior: reset mais amplo, moeda mais rara, mas **retém** categorias que a camada abaixo zerava (ex.: Ascensão mantém Essência; Divindade mantém talentos).

**Motor:** generalizar a função de prestígio atual (`Game.prestige`/`onPrestigeExt`) numa `doReset(layer)` parametrizada pelo que zera e pelo que mantém. Bônus por moeda de camada entram em `baseMult()`.

**UI:** aba Prestígio vira "Renascimento" com abas por camada desbloqueada; cada uma com sua fórmula de ganho e barra de progresso pro próximo desbloqueio.

**Save/compat:** cuidado — é o item de maior risco de bug em save. Migrar `prestiges/essence` existentes pra camada 0. **Esforço: G.** Depende de: nada, mas é melhor depois de #6/#7 (mais conteúdo pra reter dá sentido às camadas).

> **Implementado (parcial, por design):** só a camada **Ascensão** (a 1ª acima do Prestígio) foi
> construída — `unlockAt:{ prestiges:10 }`, moeda `ascPoints` (⬟), reseta essência+prestígios,
> +5%/pt permanente em produção/DPS/essência. `Game.doPrestige` foi generalizado via
> `Game.resetRunState()` (extraído, reaproveitado por `Game.doAscend()` em `js/layers.js`), em vez
> de uma função `doReset(layer)` totalmente genérica — menor risco de save, mesmo espírito.
> Divindade/Singularidade/Recomeço do Universo ficam para quando #12 (Árvore do Mundo) e mais
> conteúdo derem sentido a outra camada; `LAYERS[]` em `data.js` já é a estrutura pra adicioná-las
> incrementalmente (mesma lógica do #16). Ver [CHANGELOG.md](CHANGELOG.md).

---

## #12 · Árvore do Mundo ✅ IMPLEMENTADO — *o objetivo de longuíssimo prazo*

**Objetivo:** meta-construção que consome recursos de TODOS os sistemas e cresce visualmente; cada nível libera novos mundos (loop de recomeço do #13).

**Dados:**
```js
const WORLD_TREE = {
  levels: 1000,
  costAt:(lvl)=>({ madeira:..., cristal:..., conhecimento:..., essence:..., gold:... }),  // escala forte
  stages:[ {at:1,name:'Broto',art:'broto'}, {at:100,name:'Árvore'}, {at:500,name:'Gigante'}, {at:1000,name:'Árvore Cósmica'} ],
  unlocks:{ 100:'mundo2', 500:'mundo3', 1000:'endgame' },
};
```

**Motor (`expansion.js`):** `growWorldTree()` (gasta o pacote de recursos, sobe nível, dispara desbloqueios). Consome `essence` (#13), relíquias (#6), materiais, conhecimento — é o **sumidouro** que fecha o ciclo do fluxograma do doc.

**UI:** aba própria com **arte que evolui por estágio** (Broto → Cósmica). Padrão de arte já usado no projeto: sprite sheet do usuário recortado (ver memória, `img/rooms`). Barra de custo multi-recurso (reusar `roomCostHtml`).

**Save/compat:** `S.worldTree = { level:0 }` permanente. **Esforço: G.** Depende de: #6 e #13 (consome as moedas deles).

> **Implementado (escopo ajustado, por design):** consome essência+conhecimento (persistentes) e
> madeira/cristal da run, com `WORLD_TREE.costAt(lvl)`/`stages[]`/`bonusPerLevel` em `data.js`.
> **Não** consome relíquias diretamente nem implementa os desbloqueios "mundo2/mundo3/endgame" —
> ficam para quando as camadas Divindade+ (#13) derem sentido a esse conteúdo. Em vez disso, cada
> estágio cruzado presenteia Pontos de Ascensão (⬟), fechando o ciclo com #13 sem inventar sistemas
> ainda não construídos. Motor `js/worldtree.js` + UI `js/worldtree-ui.js` (aba própria). Ver
> [CHANGELOG.md](CHANGELOG.md).

---

## #2 · Sinergia de Composição (Reino + Elemento + Tipo) 🟨 APROFUNDAR

**Existe hoje:** medidor 0–100% por classe (🛡️1:⚔️2:✨1) + campo cheio + arma ideal, com 5 faixas de bônus (`SYNERGY_TIERS`). **Falta:** as sinergias temáticas do doc (mesmo reino, mesmo elemento, mesmo tipo de arma, grupo equilibrado).

**Dados:** adicionar `kingdom` e `element` aos heróis (`data.js`, junto de `role`). Definir:
```js
const TEAM_SYNERGIES = [
  { id:'reino_solar', when:{ kingdom:'solar', count:4 }, bonus:{ gold:0.25 } },
  { id:'fogo_x3',     when:{ element:'fogo',  count:3 }, bonus:{ burn:0.30 } },
  { id:'melee_x4',    when:{ weaponType:'melee', count:4 }, bonus:{ dps:0.30 } },
  { id:'equilibrado', when:{ roles:['tank','mago','duelista','support'] }, bonus:{ dps:0.40, gold:0.20, xp:0.15 } },
];
```

**Motor:** estender `recomputeSynergy()` (já itera o campo — mesmo laço do `_roleEff`) pra também contar reino/elemento/tipo e ativar `TEAM_SYNERGIES`. Bônus agregam num cache lido por `teamDps`/`enemyGold`.

**UI:** o painel de Sinergia já existe — adicionar seção "Composição" listando sinergias ativas (✔) e a que falta pouco (✖ Falta um Mago), como no mockup do doc.

**Save/compat:** aditivo. **Esforço: M.** Depende de: #1 (papéis, feito). Bom par com #3 (elementos).

---

## #5 · Pesquisa 2.0 (Árvore com Exclusividade) 🟨 APROFUNDAR

**Existe hoje:** 22 techs em 9 categorias com `req` (pré-requisitos), tempo real, fila, offline. **Falta:** a estrutura de **árvore ramificada com escolhas exclusivas** ("não dá pra pegar tudo → cria builds"), como Metalurgia→Aço Negro→Titânio *ou* Magia→Runas→Caos.

**Dados:** adicionar `exclusiveWith:[ids]` e/ou `branch` às entradas de `RESEARCH`. Marcar caminhos mutuamente exclusivos.

**Motor:** em `canResearch`/`completeResearch`, bloquear techs que conflitam com uma já concluída. Talvez um respec pago (essência).

**UI:** `renderResearch` vira layout de **árvore** (nós + linhas), não lista. Mostrar galhos travados. Maior parte do esforço é UI.

**Save/compat:** cuidado — saves com techs "conflitantes" já concluídas precisam de regra de reconciliação. **Esforço: M-G (UI pesada).** Depende de: nada.

---

## #14 · Feedback Visual 🟨 APROFUNDAR

**Existe hoje:** `legendaryFlash`, `toast`, `shake`, `prefers-reduced-motion` + toggle `S.flashFx`. **Falta:** o "juice" do doc.

- **Lendário:** tela treme + glow dourado + partículas + som exclusivo (parte já existe via `legendaryFlash`; incrementar partículas).
- **Chefe:** barra gigante + introdução + animação (casa com #7).
- **Conquista:** explosão + confetes + som.
- Respeitar `S.flashFx`/`prefers-reduced-motion` sempre.

**Onde:** `ui.js`/`ui-ext.js` + `style.css` (keyframes). **Esforço: M.** Depende de: melhor junto com #7. Baixo risco.

---

## #15 · Música Dinâmica 🟨 APROFUNDAR

**Existe hoje:** música ambiente gerativa com fade + volume-mestre (Áudio 2.0, `Sound`/`Music`). **Falta:** trilha muda por contexto: chefe / prestígio / cidade / combate.

**Motor:** `Music.setContext(ctx)` trocando a progressão/escala gerativa conforme estado (boss ativo, aba aberta, camada de prestígio). Hookar em `spawnEnemy` (boss), troca de aba, `doReset`. **Esforço: M.** Depende de: infra de áudio já existe.

---

## #4 · Base Estratégica 🟩 POLIR

**Existe hoje:** grade 4×4, arrastar salas (tap-to-swap + drag&drop), 15 `ROOM_SYNERGIES` de vizinhança ortogonal escalando com `min(nível)`. **Isso já É o "puzzle" do doc.** Falta pouco:
- Mais pares de sinergia temáticos do doc (Laboratório+Biblioteca=+pesquisa já existe como Academia; Banco+Mercado=+ouro existe como Bolsa de Valores).
- Talvez salas com efeito de **área** (afeta as 4 vizinhas, não só 1 par).

**Esforço: P.** Depende de: nada. Basicamente conteúdo novo em `ROOM_SYNERGIES`.

---

## #8 · Mundo Vivo 🟩 POLIR

**Existe hoje:** calendário permanente, dia/noite, 4 estações, 5 climas alterando produção/DPS/materiais/drops. **Já cobre o doc.** Faltam só os "sabores" listados:
- Primavera→poções, Verão→−água, Inverno→**monstros exclusivos**, Eclipse→**boss secreto** (casa com #7), Lua Cheia→**lobisomens** (inimigos temáticos).

**Motor:** hook em `spawnEnemy` pra trocar o *tipo* de inimigo por estação/clima (não só multiplicadores). **Esforço: P-M.** Depende de: sinergia com #7.

---

## #9 · NPCs como Progressão 🟩 POLIR

**Existe hoje:** 5 NPCs (Dorian, Bruna, Zephyr, Mira, Silas) com amizade (0–5), perks permanentes, estoque diário, missões diárias. **Já é progressão.** Faltam os desbloqueios "grandes" do doc:
- Ferreiro→**Forja Lendária** (tier 4 da Forja), Mercador→**Mercado Negro**, Mago→**Encantamentos** (reroll de afixos), Colecionador→**Relíquias** (liga com #6), Alquimista→**Poções** melhores.

**Motor:** `npcLevel(id) >= X` desbloqueia mecânica (padrão já usado nos perks). **Esforço: M.** Depende de: #6 (Colecionador↔Relíquias), #3 (Ferreiro↔sets).

---

## #10 · Mercado (Oferta/Demanda + Pedidos de NPC) 🟩 POLIR

**Existe hoje:** preços vivos por hora do mundo (demanda sazonal/climática + ruído), sparklines 48h, escassez/promoção, taxas. **Já é economia dinâmica.** Faltam:
- **Pedidos de NPC** ("Quero 500 Ferro → grande recompensa") — parcialmente existe via missões diárias; ampliar pra pedidos com recompensa escalada.
- Eventos mundiais afetando preço de forma mais explícita (Tempestade→madeira cara já existe via `weather`).

**Esforço: P-M.** Depende de: #9.

---

## #11 · Coleções / Códex 🟩 POLIR

**Existe hoje:** Códex com lore por fase + 14 Descobertas ocultas. **Falta:** o Códex de **completude** do doc — categorias Heróis / Chefes / Equipamentos / Relíquias / Eventos / NPCs / Lore / Mascotes / Monstros, com % de completude e **conquista especial a 100%**.

**Dados:** derivar completude do estado existente (heróis contratados, chefes vistos, sets completados, relíquias, etc.). **Motor:** `codexCompletion()` agregando por categoria. **UI:** grade de cards descoberto/oculto por categoria com barra de %. **Esforço: M.** Depende de: #6 (relíquias), #3 (equip), #7 (chefes) pra ter o que catalogar.

---

## #16 · Arquitetura Técnica (Modularização) 🟨 ORGANIZACIONAL

O doc sugere `heroes.js`, `synergy.js`, `equipment.js`, `bossAI.js`, `relics.js`, `market.js`,
`researchTree.js`, `worldEvents.js`, `collections.js`, `treeOfWorld.js`.

**Realidade do projeto:** hoje o motor da expansão é **um** `expansion.js` (`Object.assign(Game)`) e a UI
**um** `ui-ext.js`. O padrão funciona e mantém tudo em escopo global sem build. **Recomendação:** *não*
quebrar em 10 arquivos de uma vez (risco alto, ganho baixo sem bundler). Em vez disso, **conforme cada
sistema novo (#6, #7, #12, #13) for grande, dar a ele seu próprio par `<sistema>.js` + `<sistema>-ext.js`**
carregado no `index.html`, seguindo o padrão do `expansion.js`. Modularização incremental, não big-bang.
**Esforço: contínuo.** Sem dependências.

---

## Resumo — matriz de decisão

| # | Sistema | Status | Esforço | Prioridade | Depende de |
|---|---|---|---|---|---|
| 6 | Relíquias | ✅ feito | M | ★★★ | — |
| 7 | Chefes Inteligentes | ✅ feito | M | ★★★ | #1 (feito) |
| 3 | Equipamentos 2.0 (sets) | ✅ feito | M-G | ★★☆ | #7 (feito) |
| 13 | Progressão em Camadas | ✅ feito (Ascensão) | G | ★★☆ | — |
| 12 | Árvore do Mundo | ✅ feito | G | ★★☆ | #6, #13 (feitos) |
| 2 | Sinergia de composição | 🟨 | M | ★★☆ | #1 (feito) |
| 5 | Pesquisa 2.0 (árvore) | 🟨 | M-G | ★☆☆ | — |
| 14 | Feedback visual | 🟨 | M | ★★☆ | #7 |
| 15 | Música dinâmica | 🟨 | M | ★☆☆ | — |
| 4 | Base estratégica | 🟩 | P | ★☆☆ | — |
| 8 | Mundo vivo | 🟩 | P-M | ★☆☆ | #7 |
| 9 | NPCs progressão | 🟩 | M | ★★☆ | #6, #3 |
| 10 | Mercado (pedidos) | 🟩 | P-M | ★☆☆ | #9 |
| 11 | Coleções/Códex | 🟩 | M | ★☆☆ | #6, #3, #7 |
| 16 | Modularização | 🟨 | contínuo | ★☆☆ | — |

**Caminho crítico do "ciclo interdependente" do doc:** #6 Relíquias → #7 Chefes → #3 Sets →
#13 Camadas → #12 Árvore do Mundo. **Esses cinco já estão implementados** (ver
[CHANGELOG.md](CHANGELOG.md)) e fecham o fluxograma (drops → build → chefes → recursos → recomeço)
que é o coração da proposta. O resto é aprofundamento de sistemas que já existem — próximo: #2 → #5 → #14 → #15 → #4/#8/#9/#10/#11/#16.
