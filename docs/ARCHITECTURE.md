# Arquitetura — Project Infinity Idle

Sem framework, sem build step, sem dependências externas além de fontes do Google Fonts. Tudo roda com `<script>` tags carregadas em ordem no `index.html`.

> Ver [AUDIT.md](AUDIT.md) para a auditoria técnica/design/produto completa (2026-07-05) — bugs conhecidos, backlog priorizado (🔴 crítico → 🟢 polimento) e plano de evolução curto/médio/longo prazo. O plano de curto prazo já foi executado (ver [CHANGELOG.md](CHANGELOG.md)); o restante é backlog de referência para execução futura.

## Mapa de arquivos

```
index.html      — esqueleto da página (topbar, painel esquerdo, abas, camadas de overlay)
style.css       — todo o visual (tema "grimório obsidiana")
js/format.js    — fmt(), fmtRate(), fmtTime(), fmtMult(), fmtPct()
js/data.js      — TODO o conteúdo do jogo (const arrays/objects, sem lógica)
js/state.js     — objeto S (estado mutável) + save/load/export/import/reset
js/game.js      — objeto Game (motor/regras) + objeto Sound (áudio)
js/expansion.js — EXPANSÃO do motor via Object.assign(Game, …): Mundo Vivo, Mascotes, Pesquisa,
                  Mercado, NPCs, Lore, Segredos, automação + extensão do Sound (volume/música/throttle)
js/relics.js    — Relíquias (roadmap #6): Game.relicEffect/grantRelic/equipRelic — S.relics é permanente
js/bosses.js    — Chefes Inteligentes (roadmap #7): Game.bossArmorMults/bossRolePenaltyMult/tickBossShift
js/gearsets.js  — Equipamentos 2.0 (roadmap #3): Game.activeSetBonuses/rollItemSetElement (sets+elementos)
js/ui.js        — objeto UI (renderização, DOM, feedback visual, modais)
js/ui-ext.js    — EXPANSÃO da UI via Object.assign(UI, …): abas Mascotes/Pesquisa/Mercado/Cidade,
                  widget do mundo, calendário, segredos de input (initExt/updateExt)
js/relics-ui.js  — painel de Relíquias (na aba Heróis)
js/bosses-ui.js  — banner de intro de chefe + badge da mecânica ativa
js/gearsets-ui.js — seção "Conjuntos" (na aba Heróis)
js/main.js      — boot() : carrega save, calcula offline, inicia o loop de tick
img/            — artes estáticas (retratos, inimigos, textura de fundo, favicon) — ver seção "Assets visuais"
```

Ordem de carregamento no `index.html` importa: `format.js` → `data.js` → `state.js` → `game.js` → `expansion.js` → `relics.js` → `bosses.js` → `gearsets.js` → `ui.js` → `ui-ext.js` → `relics-ui.js` → `bosses-ui.js` → `gearsets-ui.js` → `main.js`, pois cada um assume que os anteriores já definiram suas globais (`fmt`, `GENERATORS`, `S`, `Game`, `UI`).

A expansão se integra ao motor original por **hooks pontuais** (grep por "expansão" em `game.js`): agregadores `Game.ext*Mult()` dentro das fórmulas (`globalProdMult`, `teamDps`, `knowledgePerSec`, `dropChance`, `enemyGold`, `essenceGain`, custos), `tickExt(dt)` no fim do `tick`, `onKillExt(wasBoss)` em `onEnemyKilled`, `onPrestigeExt(prevEarned)` no `doPrestige` e `offlineExt(seconds)` no `computeOffline`. Todo o estado novo (`S.world/pets/research/market/npcs/codex/secrets/audio`) é **permanente** — não é tocado pelo reset do prestígio.

## Modelo mental

- **`data.js`** é puramente declarativo — arrays de objetos (`GENERATORS`, `HEROES`, `ROOMS`, `TALENTS`, `ACHIEVEMENTS`, `WORLD_EVENTS`, `UPGRADES`, `RARITIES`...). Nada ali tem lógica de jogo; é a "planilha de balanceamento".
- **`state.js`** define o único objeto de estado mutável, `S`, e funções puras de I/O (`saveGame`, `loadGame`, `exportSave`, `importSave`, `hardReset`). `S` é recriado do zero via `defaultState()` e mesclado com o save salvo (tolerante a saves de versões antigas, graças ao merge sobre o default).
- **`game.js`** é o objeto `Game`: todas as fórmulas e mutações de estado (comprar gerador, contratar herói, construir sala, etc.) vivem como métodos aqui. Também expõe `Game.tick(dt)`, chamado a cada 100ms pelo loop principal, que aplica produção, combate, eventos e verificação de fases. `Sound` (mesmo arquivo) sintetiza efeitos sonoros via Web Audio, sem arquivos externos.
- **`ui.js`** é o objeto `UI`: só lê de `S`/`Game`, nunca decide regras de jogo. Renderiza abas, atualiza textos/barras a cada tick, e mostra feedback (toasts, números flutuantes, modais).
- **`main.js`** é o único lugar com `setInterval`. Ele:
  1. Carrega o save (se existir) e calcula progresso offline.
  2. Agenda o primeiro evento mundial e a primeira moeda dourada.
  3. Roda um loop a 100ms chamando `Game.tick(dt)` → `UI.renderActive()` → `UI.updateDynamic()`.
  4. Verifica conquistas a cada 2s e salva a cada 15s.

## Padrão de renderização (dirty flags)

`UI.dirty` é um mapa de flags por aba (`prod`, `heroes`, `base`, `talents`, `prestige`, `ach`, `config`, mais `tabs` e `left`). Uma aba só é **reconstruída do zero** (DOM recriado) quando sua flag está `true` — isso acontece ao trocar de aba, comprar algo que muda a lista visível, desbloquear um sistema, etc.

Fora isso, `UI.updateDynamic()` roda a cada tick e só atualiza **texto/classe/largura** dos elementos já existentes (guardados em `UI.R`, o cache de referências da aba ativa) — não recria DOM a cada frame. Isso é o que permite atualizar ouro/produção/HP de inimigo suavemente sem re-render caro.

Ao adicionar uma nova seção de UI, siga o padrão:
1. `render<Aba>(c)` cria os elementos uma vez e guarda referências em `this.R`.
2. Uma seção correspondente em `updateDynamic()` atualiza esses elementos a cada tick, se `this.activeTab === '<aba>'`.

## Como adicionar conteúdo novo

Todo o conteúdo é data-driven — normalmente **não é preciso tocar em `game.js` ou `ui.js`** para adicionar uma entrada:

| Quero adicionar... | Onde | Observação |
|---|---|---|
| Gerador de ouro | array `GENERATORS` em `data.js` | motor e UI iteram o array automaticamente |
| Upgrade | array `UPGRADES` em `data.js` | use `type: 'click' \| 'gen' \| 'global' \| 'clickProd'` |
| Herói | array `HEROES` em `data.js` | inclua `story` e `lines` (mín. 2-3 falas) para manter a personalidade |
| Sala da Base | array `ROOMS` em `data.js` | o *efeito* da sala (o que ela produz/bonifica) ainda precisa ser ligado manualmente em `Game` (ex. `energyBoost()`, `knowledgePerSec()`) — a sala em si (custo, nível, UI) é automática |
| Talento | array `TALENTS` em `data.js`, dentro de uma das 3 árvores (`eco`/`war`/`arc`) | o *efeito* do talento também precisa ser referenciado manualmente em `Game` via `this.talentLvl('id')` |
| Conquista | array `ACHIEVEMENTS` em `data.js` | `check: (S, D) => bool`; use `secret: true` para escondê-la até desbloquear |
| Evento mundial | array `WORLD_EVENTS` em `data.js` | `type: 'instant' \| 'buff' \| 'invasion' \| 'offer'` — cada tipo já tem um handler em `Game.fireWorldEvent()` |
| Fala de tutorial | objeto `ADVISOR_TIPS` em `data.js` | referenciada por `Game.updatePhases()` |

Ou seja: geradores, upgrades, heróis e conquistas são **100% plug-and-play**. Salas e talentos precisam de uma linha extra em `Game` para o efeito surtir (mas nunca em `ui.js`, que já é genérico).

## Assets visuais (img/)

```
img/bg-texture.jpg     — textura de fundo, aplicada em background do body (style.css)
img/gold-coins.jpg     — favicon (index.html <link rel="icon">) e imagem do #click-coin (style.css)
img/heroes/{id}.jpg    — retrato de cada herói (mesmo id de HEROES em data.js), 7 arquivos
img/enemies/e1.png…e8.png — 8 inimigos comuns que se alternam por onda (cb.wave % 8)
img/enemies/boss.png   — inimigo exibido quando cb.boss === true
```

- **Retratos de herói**: `UI.renderHeroes()` (`js/ui.js`) cria uma `<div class="hero-portrait">` por linha de herói com `background-image` apontando para `img/heroes/${def.id}.jpg`; o CSS aplica `filter: grayscale` enquanto o herói não foi contratado (`.hero-locked .hero-portrait`).
- **Inimigos**: o botão `.enemy-box` (painel de combate) contém um `<img class="enemy-img">` cujo `src` é atualizado a cada tick em `UI.updateDynamic()` com base em `cb.boss` e `cb.wave % 8`, mapeando para `e1..e8` ou `boss`. Como os PNGs têm fundo transparente, o `drop-shadow` do `.enemy-box` continua funcionando por cima da arte.
- **Convenção de nomes**: ao adicionar um novo herói em `HEROES` (data.js), o arquivo `img/heroes/{id}.jpg` precisa existir com esse exato `id` — não há fallback automático se faltar.
- Nenhum asset é gerado ou buscado em runtime; todos são arquivos estáticos versionados no repo, então funcionam offline e não dependem de nenhuma API de terceiros.

## Fórmulas centrais (referência rápida)

Todas em `js/game.js`. Ver [FEATURES.md](FEATURES.md) para explicação de cada uma em contexto de jogo.

```
genCost(gen, n)      = Σ baseCost × 1.15^(owned+i)  × (1 − 1.5%×Barganha, mín. ×0.5)
genMult(gen)         = Π upgrades_do_gerador × 2^⌊owned/25⌋
goldPerSec()          = Σ genProd(gen) × globalProdMult()
globalProdMult()      = (1+1%×conquistas) × (1+2%×essência) × (1+5%×Ganância)
                         × (1+3%×Harmonia×prestígios) × (1+6%×Cofre-Forte)
                         × Π upgrades_globais × buffMult('prod')
clickPower()          = Π upgrades_de_clique × (1+25%×Mãos Rápidas) × (1+2%×essência)
                         + goldPerSec() × Σ pct_dos_upgrades_clickProd,  × buffMult('click')

heroDps(h)            = baseDps × nível × 2^⌊nível/25⌋ × heroGearMult(h)
teamDps()             = Σ heroDps × (1+10%×Quartel) × (1+10%×Fúria) × (1+1%×conquistas) × buffMult('dps')
enemyMaxHp(onda)       = 15 × 1.45^(onda−1) × (9 se chefe)
enemyGold(onda)        = 4 × 1.42^(onda−1) × (14 se chefe) × (1+8%×Caçador) × (×3 se invasão)

roomCost(sala)         = baseCost × costMult^nível  (por recurso)
knowledgePerSec()      = 0.2×nível(Lab) × (1+15%×Biblioteca) × (1+10%×Sabedoria) × energyBoost()
energyBoost()          = 1 + 8%×nível(Gerador)

talentCost(t)          = ⌈baseCost × 1.9^nível_atual⌉

essenceGain()           = ⌊(ouro_ganho_na_run / 1e8)^0.45⌋ × (1+5%×Transcendência),  0 se ouro < 1e8

offline: gold/know/materiais = taxa_normal × segundos_offline(máx 12h) × 0.5 × (1+10%×Sonho Lucrativo)
```

## Limitações conhecidas / decisões deliberadas

- **`heroMaxLevels` e `genMaxBuy` têm um teto de iterações** (200 e 500 respectivamente) para evitar loops longos em `while`. Na prática só importa em cenários de ouro absurdamente acima do necessário; não afeta jogo normal.
- **Sem backend**: todo o estado vive no `localStorage` do navegador. Export/import por código Base64 é o único jeito de migrar entre navegadores/dispositivos.
- **Tick de produção é capado em 2s por chamada** (`Math.min(dt, 2)` em `main.js`) mesmo que a aba fique em segundo plano por mais tempo — o "resto" do tempo é coberto separadamente pelo cálculo de progresso offline no próximo carregamento, não pelo tick em si.
