# Auditoria Completa — Project Infinity Idle

*Análise técnica, de design e de produto, realizada em 2026-07-05. Serve como backlog de referência para execução futura.*

> **Status de execução:** plano de curto prazo (🔴1, 🔴2, 🔴3, 🟠5, 🟡11) implementado em 2026-07-05.
> Itens 🟠4, 🟠6, 🟠7 e 🟡8 (médio prazo) implementados em 2026-07-12. 🟡9 já estava resolvido (sessão
> anterior não registrada aqui). Detalhes no [CHANGELOG.md](CHANGELOG.md). Restam: 🟡10 (meta
> diária), 🟢12-15 (polimento) e as decisões de longo prazo da Parte 11 (identidade visual completa,
> backend/live-ops, segundo loop estratégico).
>
> **Segunda auditoria (2026-09-21):** o motor cresceu de 3.166 para ~8.300 linhas desde julho
> (novos sistemas: Base com sinergias, Expansão/Mundo, Monetização, Árvore do Mundo, Relíquias,
> Conjuntos de equipamento, Chefes com mecânica, Metas Diárias, Camadas de Ascensão). Ver
> [PARTE 12](#parte-12--auditoria-de-desempenho-e-bugs-2026-09-21) para os achados dessa rodada,
> com foco em desempenho (não coberto em profundidade na auditoria de julho) e nos sistemas novos.
> Status de execução da Parte 12 registrado no início dela.

---

## PARTE 0 — Prova de entendimento (antes de criticar)

**Loop principal:** `main.js` roda um único `setInterval` de 100ms. A cada tick: `Game.tick(dt)` calcula produção passiva, aplica dano do time de heróis no inimigo atual, decrementa timers de buff/evento/moeda dourada, e checa desbloqueio de fases. Em seguida `UI.renderActive()` (só reconstrói DOM se a aba ativa estiver "dirty") e `UI.updateDynamic()` (atualiza texto/largura de elementos já existentes, todo tick). Achievements são checadas a cada 2s, save a cada 15s.

**Progressão:** 8 "fases" (`PHASES` em `data.js`) desbloqueiam sistemas conforme `S.earned` (ouro ganho *nesta run*, zera no prestígio) cruza limiares: clique → heróis/combate (2.5K) → base (200K) → talentos (10M) → prestígio (500M) → eventos mundiais (5B) → teaser fase 7 (500B) → teaser fase 8 (100T). `S.maxPhaseId` é o teto permanente exibido (não regride com prestígio).

**Economia:** ouro é produzido por clique (`clickPower()`) e por 11 geradores com custo exponencial ×1.15/unidade e marco de produção ×2 a cada 25 unidades possuídas. 31 upgrades (clique, por-gerador, globais) multiplicam produção. `globalProdMult()` empilha: conquistas (+1%/cada), essência (+2%/ponto), talento Ganância, talento Harmonia×prestígios, sala Cofre-Forte, upgrades globais, buffs ativos.

**Combate:** 100% automático (DPS do time × dt), com clique opcional causando dano extra. Ondas sobem HP exponencialmente (`15×1.45^(onda-1)`), chefes a cada 10 ondas com timer (falha = "recuo" de 5 abates). Heróis têm nível (custo ×1.08), marco de DPS ×2 a cada 25 níveis, e 2 slots de equipamento (arma/amuleto) com 5 raridades, drop só em chefes/mercador, auto-equip se estritamente melhor.

**Base:** 8 salas com custo em ouro+materiais, efeitos hard-coded manualmente em `Game` (energia, DPS, conhecimento, drop, produção de ouro).

**Talentos:** 3 árvores (12 talentos) compradas com Conhecimento (só produzido pelo Laboratório), custo ×1.9/nível, tetos individuais.

**Prestígio:** essência = `⌊(earned/1e8)^0.45⌋`, +2%/ponto de produção global permanente, reseta run mas preserva essência/conquistas/talentos/conhecimento/fases.

**Eventos & moedas douradas:** 5 tipos de evento mundial a cada 160–340s (fase 6+); moedas douradas desde o início, 70–220s, dão ouro instantâneo ou frenesi ×7.

**Persistência:** `localStorage`, merge tolerante sobre `defaultState()`, export/import Base64, sem backend, sem verificação de integridade.

Nada ficou obscuro — a arquitetura é pequena o bastante (3.166 linhas no total) para ler de ponta a ponta em uma sessão. Isso já é meio ponto a favor: não existe complexidade escondida atrapalhando quem chega depois.

---

## PARTE 1 — Bugs e exploits reais encontrados (com linha)

🔴 **Exploit: `reqPrestige` só é validado na UI, não no motor.**
`Game.buyGen()` (game.js:281) e `Game.hireHero()` (game.js:312) **não checam** `def.reqPrestige`. Quem abrir o console e chamar `Game.buyGen('singular', 1)` ou `Game.hireHero('nyx')` antes do 1º prestígio compra Singularidade/Nyx de graça, sem nunca ter prestigiado. A única barreira é a lista não renderizar o botão. Isso é uma regra de negócio no lugar errado — regra de desbloqueio deveria viver no motor, não na view. Baixo risco de abuso "orgânico" (exige DevTools), mas é uma falha de arquitetura clássica (a doc de vocês mesmos diz "UI só lê, nunca decide regras" — e aqui decide, por omissão).

🟠 **Self-XSS via import de save.**
`importSave()` (state.js) só valida `typeof data.gold === 'number'`. Qualquer string dentro de `S.buffs[].name/icon` é jogada direto em `innerHTML` em `updateBuffs()` (ui.js:428-431) sem escape. Um save Base64 malicioso (compartilhado entre jogadores como "código de build") pode injetar HTML/script na sessão de quem importar. Baixa severidade (self-XSS, precisa a vítima colar o código), mas é o tipo de coisa que qualquer QA sério reprova em code review.

🟠 **Flash de tela sem respeito a `prefers-reduced-motion`.**
`legendaryFlash()` (ui.js:470) dispara um flash de tela cheia em drops raros, sem checar a media query de movimento reduzido nem oferecer opção de desativar separadamente do som. Para jogadores fotossensíveis isso é um risco de acessibilidade real, não estético.

🟡 **Lógica de visibilidade de recursos ilegível e frágil.**
`renderLeft()` (ui.js:414): `if (S.res[d.k] < 1 && !(d.k !== 'cristal' && S.unlocked.base)) continue;` — uma dupla negação para expressar "esconda cristal até ter 1+, e esconda os outros recursos até a Base existir". Funciona, mas é o tipo de linha que o próximo dev (ou você em 3 meses) vai gastar 10 minutos decifrando. Deveria ser uma função nomeada, tipo `shouldShowResource(k)`.

🟡 **`SAVE_VERSION` existe mas não é usado para migração real.**
`state.js` declara `SAVE_VERSION = 1` e salva `v: SAVE_VERSION`, mas `loadGame()` nunca lê `data.v` para decidir uma estratégia de migração — o único tratamento de versão antiga é o hack específico do `maxPhaseId`. No dia em que vocês mudarem a forma de `heroes[id].gear` (por exemplo, adicionar um 3º slot), saves antigos vão silenciosamente ter heróis sem o novo slot e quebrar em runtime a primeira vez que algo tentar ler `h.gear.novoSlot`, porque o merge é raso (`Object.assign`) e não desce recursivamente em `heroes`/`gens`/`talents`/`rooms`.

🟡 **Nenhuma validação de integridade client-side vs. servidor.**
Isso é esperado para um jogo sem backend, mas precisa estar escrito em algum lugar como decisão consciente: qualquer número no jogo é editável via console. Se algum dia vocês quiserem leaderboard, Discord integration com "flex seu save" etc., vão precisar reconstruir a economia com validação server-side do zero. Vale documentar isso em `ARCHITECTURE.md` como limitação conhecida (hoje só está implícito).

🟢 **`updateDynamic()` faz ~15 `getElementById` por tick (10×/s), sem cache.**
Irrelevante em termos de FPS hoje (é picossegundos por chamada em qualquer browser moderno), mas é o tipo de dívida que vocês vão sentir se um dia adicionarem 3x mais elementos dinâmicos na tela. Fácil de cachear numa passada única no `UI.init()`.

🟢 **Moeda dourada pode nascer fora da área visível em mobile.**
`spawnGoldenCoin()` usa `getBoundingClientRect()` de `#main-panel`; se o painel esquerdo estiver aberto por cima em telas estreitas (`.open` no CSS mobile), o cálculo de posição pode colocar a moeda atrás do painel sobreposto. Não testei visualmente (não tenho o CSS renderizado na tela), mas o código sugere essa condição de corrida geométrica.

Nenhum dos bugs é "quebra o jogo" — isso é revelador. O código é limpo o bastante para que os únicos problemas reais sejam frestas de validação, não bagunça estrutural. Dito isso, "não travou" é uma barra muito baixa para investidor. Vamos ao design.

---

## PARTE 2 — Arquitetura e código

**Pontos fortes (de verdade, não elogio vazio):**
- Separação de responsabilidades é honesta: `data.js` é 100% declarativo, `game.js` não toca DOM, `ui.js` não decide regra nenhuma (exceto a falha do Ponto 1 acima). Isso é *melhor* do que 90% dos protótipos de idle game que veem luz do dia.
- Padrão de dirty-flags para renderização é a decisão certa para este porte de jogo — evita re-render caro sem a complexidade de um Virtual DOM que seria overkill aqui.
- Fórmulas centralizadas e documentadas em `ARCHITECTURE.md` — isso é *incomum* e bom. A maioria dos idle games amadores tem fórmula espalhada e ninguém sabe explicar o próprio balanceamento.

**Pontos fracos:**
- **Zero testes automatizados.** Isso não é polimento, é risco de produto: cada fórmula em `game.js` (genCost, essenceGain, enemyGold...) é pura e trivialmente testável, e nenhuma tem um teste. Qualquer refatoração futura em `globalProdMult()` (que já empilha 7 multiplicadores) é uma aposta às cegas sem regressão automatizada.
- **Objeto `Game` como namespace único, sem injeção de estado.** `Game` lê `S` global implicitamente em todo método. Funciona para um jogo pequeno, mas significa que você não consegue simular "e se esse jogador tivesse X essência" sem mutar o estado real — dificulta ferramentas de balanceamento (ex: uma calculadora offline de curva de progressão, que qualquer economista de live-service vai querer).
- **`heroMaxLevels`/`genMaxBuy` com loop `while` limitado a 200/500 iterações** é uma gambiarra funcional, não uma solução: a forma certa é resolver a soma geométrica por fórmula fechada (existe fórmula analítica para "quantos níveis de custo `base×mult^n` cabem em X ouro" via logaritmo). Hoje, em ouro numericamente grande (o que *vai* acontecer, o jogo tem sufixo até `QiDc` = 10^51), o teto artificial de 200/500 exibe "Máx" que na real não é o máximo — é uma mentira na cara do jogador disfarçada de limitação técnica.
- **Sem TypeScript/JSDoc/schema.** Dado que `data.js` é a "planilha de balanceamento", um erro de digitação num campo (`prod` vs `dps`, por exemplo) só quebra em runtime, silenciosamente, sem erro. Para um jogo com 43 conquistas + 31 upgrades + 12 talentos escritos à mão, isso é uma bomba-relógio de erro humano sem rede de segurança.

**Escalabilidade de conteúdo (o que a doc promete):** a tabela do `ARCHITECTURE.md` está correta — gerador/upgrade/herói/conquista são de fato plug-and-play. Mas "sala" e "talento" exigem edição manual em `Game`, e isso quer dizer que o sistema **não é data-driven o suficiente para um live-service real**: todo talento novo é uma PR em código, não um dado. Para um jogo pequeno tudo bem; para "competir com os melhores do gênero" (sua meta declarada), isso é o gargalo nº1 de velocidade de conteúdo.

---

## PARTE 3 — Game design: é divertido?

**Sim, com ressalvas — e a razão é estrutural, não de polimento.**

O jogo é um clone honesto da fórmula Cookie Clicker/Clicker Heroes: clique → geradores → prestígio, com heróis old idle-RPG por cima. Ele **não tem identidade própria**. A ambientação "grimório obsidiana" e os NPCs com personalidade (Bran, Thora, Nyx) são a única coisa que puxa para um lado autoral — e são o melhor material do projeto. As falas dos heróis (`data.js`) têm voz de verdade; isso é raro em idle games indies, que geralmente são só números com skin.

**Maior problema de gameplay:** a Fase 1 (só clique+geradores) não tem *nenhum* gancho narrativo ou de sistema até 2.500 de ouro. Comparado com Clicker Heroes (que já mostra o primeiro monstro na tela 1) ou Cookie Clicker (que já tem os avós narrando desde o segundo clique), aqui os primeiros minutos são genéricos: clicar numa moeda e comprar "Aprendiz Coletor". A personalidade só aparece na Fase 2. Isso é um erro de retenção clássico — **os primeiros 30 segundos são o momento de maior taxa de abandono em qualquer F2P/idle**, e vocês gastam esse tempo com o conteúdo mais commodity do jogo.

**Maior diferencial:** o sistema de heróis com personalidade + combate automático + equipamento é bem mais robusto que a média do gênero idle-clicker puro. Isso poderia ser o "gancho de marketing" do jogo, mas está escondido atrás de um muro de 2.500 de ouro (uns 2-5 minutos, ok, não é grave, mas ainda assim é a coisa errada para mostrar primeiro numa thumbnail/trailer de YouTube).

**Repetição:** estruturalmente é um idle game, então repetição é o gênero — o que importa é se a curva de decisão muda o suficiente entre fases. Aqui muda pouco: comprar-o-mais-barato é a heurística ótima em quase todo estágio (não há trade-off real entre árvores de talento com custos mutuamente exclusivos fortes o bastante, por exemplo). Falta um sistema que force *escolha* real (ex: talentos com exclusão mútua, ou específico "essa build de talento é melhor pra farm de chefe X mas pior pra offline Y").

---

## PARTE 4 — Balanceamento (números, não sentimento)

Usando as fórmulas do `ARCHITECTURE.md`/`data.js`:

- **Curva de custo de gerador (×1.15) vs. curva de produção por marco (×2 a cada 25 unidades):** isso é consistente com o padrão do gênero (é quase literalmente a curva do Cookie Clicker). Sem red flags aqui.
- **Prestígio com expoente 0.45** sobre `earned/1e8`: isso é uma curva bem achatada — dobrar o ouro ganho rende só ~1.37× de essência. Isso empurra fortemente para "prestigie cedo e frequentemente" em vez de "acumule uma run gigante". É uma escolha de design válida, mas contradiz o texto da UI (`renderPrestige`) que diz "a Essência cresce com a raiz do ouro acumulado" — 0.45 não é raiz quadrada (0.5), é levemente mais achatado que raiz. Pequena imprecisão de comunicação, mas em um jogo de números isso é a linguagem que o jogador usa para decidir estratégia — vale corrigir o texto ou o expoente.
- **Chefes com timer fixo (`30 + 3×Paciência`)** não escala com onda. Na onda 300, um chefe com HP ×9 do inimigo normal e o mesmo teto de tempo relativo de DPS vai ficar impossível de matar a tempo se o DPS não acompanhar — isso é provavelmente intencional (soft-wall de progresso), mas não está documentado como tal. Se não for intencional, é um bug de design que vai gerar frustração tarde de jogo sem explicação.
- **`heroMaxLevels`/`genMaxBuy` capados em 200/500** combinados com custo exponencial: para jogadores muito avançados (que é exatamente o público que mais usa "Máx"), o cap vai ativamente esconder compra disponível. Já é bug (Parte 1), mas também é balanceamento errado: o cap deveria ser dinâmico ou resolvido analiticamente, nunca hardcoded.
- **Falta soft cap declarado em produção tardia.** Com sufixos até `QiDc` (10^51) e todos os multiplicadores empilhando *multiplicativamente* (conquistas, essência, talentos, salas, upgrades, buffs), a produção tardia deveria ter um freio (ex: diminishing returns num dos multiplicadores) para não virar "todo mundo empurrado pra notação científica em uma tarde de jogo". Não vi nenhum soft cap nas fórmulas revisadas.

---

## PARTE 5 — UX/UI

- **Hierarquia visual:** painel esquerdo fixo com ouro/clique/recursos/log é a decisão certa (é o padrão do gênero por um motivo: informação crítica sempre visível).
- **Seletor ×1/×10/Máx compartilhado** entre geradores e heróis é uma boa decisão de consistência — poucos idle games amadores acertam isso.
- **Abas bloqueadas mostram "🔒???"** — ótimo gancho de curiosidade, mecanismo de retenção válido (curiosity gap).
- **Falta feedback de "quase lá".** O painel "mais perto de desbloquear" (`closestAchievement`) existe só para conquistas — não existe equivalente para a próxima fase de forma proeminente (existe a barra de fase no topo, mas ela é pequena e não conta "faltam X ouro" de forma clara — o `title` do tooltip tem essa info, mas tooltip é descoberta, não é UI ativa).
- **Sem indicação de dano crítico/variação** no combate — todo dano é determinístico (`teamDps()×dt`), o que é ok para automação, mas o clique manual (`clickAttack`) também não tem nenhuma variância ou crítico, o que deixa clicar mecanicamente "sem graça" comparado a Clicker Heroes (que tem crítico de clique como sistema central).
- **Acessibilidade:** sem suporte a leitor de tela (nenhum `aria-label` visto em `ui.js`), sem modo de alto contraste, sem respeito a `prefers-reduced-motion` (Parte 1). Para um jogo que quer ir pra Steam, isso vira ponto de review negativo hoje em dia — Steam tem cada vez mais jogadores marcando "sem acessibilidade" como motivo de refund.

---

## PARTE 6 — Retenção

- **Primeiros 30s:** genérico (Parte 3). Risco real de abandono pré-Fase 2.
- **Primeiros 5 min:** melhora bastante ao desbloquear Heróis — personalidade entra em cena.
- **Primeira hora:** provavelmente chega em Base/Talentos, curva parece bem calibrada pra manter engajamento (não simulei numericamente hora a hora, mas a progressão de fases sugere isso).
- **Primeiro dia:** aqui entra o teste real — o jogo depende de o jogador voltar depois de ficar offline (offline gains a 50%, save automático). Isso está implementado corretamente. Mas **não há nenhuma notificação/push/reminder** pra trazer o jogador de volta (esperado, é um jogo sem backend, mas é uma limitação real de retenção D1/D7 se algum dia vocês quiserem números de verdade).
- **Segredos e conquistas secretas** são um gancho de retenção genuíno e bem feito — 4 segredos não documentados, escondidos como "???" até desbloquear, é textbook de curiosity-driven retention.
- **Falta um sistema de "objetivo diário" ou desafio rotativo.** Isso é o que separa um protótipo de um live-service de verdade — sem ele, depois que o jogador zera os sistemas atuais, não tem razão pra voltar amanhã específica (só "minha run ainda tá rodando offline").

---

## PARTE 7 — Performance e escalabilidade técnica

- Tick de 100ms com produção O(n) sobre geradores/heróis/upgrades é trivial para os volumes atuais (11 geradores, 7 heróis, 31 upgrades). **Não escala mal** porque o gênero *idle* não tem centenas de entidades simultâneas — não é um jogo de 1000 inimigos em tela, então a pergunta "suporta 1000 inimigos" (do seu checklist) não se aplica ao gênero; o que importa aqui é volume de *conteúdo* (quantos geradores/heróis/talentos cabem sem ui.js virar sopa), e isso escala bem hoje.
- **Multiplayer/live-service futuro exigiria reescrever a persistência do zero** — hoje é 100% client-side, sem noção de conta de usuário, sem servidor de autoridade. Isso não é "dívida técnica", é ausência total da capability. Se "Steam" ou "mobile com live-ops" é meta real, isso precisa entrar no roadmap de longo prazo como projeto à parte, não como refactor incremental.
- **Mods:** o padrão data-driven ajuda, mas não existe nenhum mecanismo de carregar dado externo (tudo é `const` hardcoded no bundle) — suportar mods exigiria expor `data.js` como JSON carregável em runtime.

---

## PARTE 8 — Comparação com o gênero

| Critério | Project Infinity Idle | Cookie Clicker | Clicker Heroes | Idle Wizard |
|---|---|---|---|---|
| Progressão de clique/geradores | Sólida, sem inovação | Referência do gênero | Boa | Boa |
| Combate/heróis | Melhor que a média indie | N/A | Referência do gênero | Média |
| Personalidade/narrativa | Ponto forte real | Fraco (é decoração) | Fraco | Fraco |
| Profundidade de talentos/build | Rasa (poucos trade-offs reais) | N/A | Média | Profunda (referência) |
| Polimento visual/áudio | Emoji + arte parcial | Alto polimento | Alto polimento | Médio |
| Sistemas de retenção longo prazo | Fraco (sem daily/live-ops) | Forte (eventos sazonais) | Forte | Forte |

Onde ganha: personalidade de heróis, clareza de fórmulas documentadas, código mais limpo que a média de projeto indie desse porte.
Onde perde: profundidade de decisão estratégica, polimento visual (ainda é majoritariamente emoji), zero sistemas de live-ops/retenção de longo prazo, zero identidade visual/sonora própria (áudio sintetizado é funcional, não memorável).

---

## PARTE 9 — Lista priorizada

### 🔴 Crítico
1. ✅ **Validar `reqPrestige` no motor (`buyGen`/`hireHero`), não só na UI.** Causa: regra de negócio na camada errada. Solução: `if (def.reqPrestige && S.prestiges < def.reqPrestige) return false;` no topo dos dois métodos. Dificuldade: trivial. Benefício: fecha o único exploit real encontrado.
2. ✅ **Sanitizar/validar schema no `importSave` e escapar HTML em `updateBuffs`/qualquer render de string vinda do save.** Causa: confiança implícita em dado externo. Solução: `textContent` em vez de `innerHTML` para campos de buff, e um schema mínimo (`Object.keys` esperadas) antes de aceitar import. Dificuldade: baixa. Benefício: fecha vetor de self-XSS.
3. ✅ **Resolver `genMaxBuy`/`heroMaxLevels` analiticamente (fórmula fechada via log), removendo o teto de 200/500.** Causa: gambiarra vira mentira pro jogador em late-game. Dificuldade: média (matemática de soma geométrica, mas conhecida). Benefício: "Máx" volta a significar máximo de verdade.

### 🟠 Importante
4. ✅ **Repensar a Fase 1 para injetar personalidade/narrativa desde o segundo 1**, não só a partir de 2.500 ouro. Ex: Mestre Aldric já comentar durante clique puro, ou um pré-herói cameo. Impacto: retenção nos primeiros 30s, o ponto de maior abandono do gênero.
5. ✅ **Adicionar `prefers-reduced-motion` e opção separada de "efeitos de tela cheia"** para `legendaryFlash`. Impacto: acessibilidade e conformidade Steam.
6. ✅ **Migração de save de verdade usando `SAVE_VERSION`**, com merge profundo (não raso) em `heroes`/`gens`/`talents`/`rooms`. Impacto: evita quebra silenciosa quando o schema mudar.
7. ✅ **Testes automatizados nas fórmulas puras de `game.js`.** São 100% testáveis sem DOM. Impacto: segurança para refatorar sem medo.

### 🟡 Melhorias
8. ✅ Dar às árvores de talento trade-offs reais (custo mutuamente exclusivo ou sinergias fortes o bastante pra criar dilema), não só "tudo é bom, junte tudo".
9. ✅ Variância/crítico no dano de clique manual, pra dar textura tátil ao clique (hoje é puramente determinístico). *(resolvido em sessão anterior ao registro deste doc — `clickAttack` já tem crítico + ataque duplo do Duelista; item não estava marcado aqui.)*
10. ✅ Sistema de meta diária/desafio rotativo simples (nem precisa backend — pode ser seed determinística por data). *(implementado: `js/daily.js`/`daily-ui.js`, 3 metas por data real com sequência de dias; ver [CHANGELOG.md](CHANGELOG.md))*
11. ✅ Corrigir o texto de `renderPrestige` ("raiz do ouro") pra bater com o expoente real (0.45) ou ajustar o expoente pra 0.5 e simplificar a comunicação.
12. Cachear `getElementById` em `UI.init()` ao invés de buscar todo tick.

### 🟢 Polimento
13. ✅ Adicionar `aria-label` nos botões de ícone (moeda, clique de combate, seletor de quantidade). *(feito, e mais: regiões vivas em Crônicas/toasts, `aria-selected` nas abas, `aria-pressed` no seletor, `role="progressbar"` nas barras, decoração com `aria-hidden`. O ouro ficou deliberadamente FORA de região viva — muda 10×/s e afogaria o leitor de tela; o valor vive no rótulo da moeda.)*
14. Substituir emoji restante (upgrades, salas, talentos, conquistas) por ícones ilustrados, seguindo o precedente já criado pra heróis/inimigos — hoje há uma inconsistência visual clara entre o que ganhou arte e o que ficou emoji.
15. ✅ Documentar explicitamente em `ARCHITECTURE.md` a decisão consciente de "sem validação server-side" como limitação de produto, não deixar implícito. *(seção "O jogo é 100% client-side" — inclui o critério de revisão exploit acidental vs. trapaça deliberada, a lista do que não pode ser construído em cima, e o caminho de saída se algum deles virar meta. Na mesma passagem foi corrigida uma afirmação obsoleta que ainda descrevia o teto de 200/500 do `genMaxBuy`, removido no item 🔴3.)*

---

## PARTE 10 — Notas (0–10)

| Critério | Nota | Justificativa curta |
|---|---:|---|
| Gameplay | 6 | Sólido, sem inovação de mecânica |
| Diversão | 6 | Funciona, mas primeiros minutos genéricos |
| Originalidade | 5 | Fórmula conhecida + heróis com personalidade é o único traço próprio |
| UX | 6 | Boas decisões (seletor, dirty flags visual), faltam microinterações e feedback de progresso de fase |
| UI | 5 | Emoji misto com arte real quebra consistência visual |
| Progressão | 6 | Curva coerente, falta soft cap declarado em late-game |
| Combate | 6 | Automação bem feita, clique manual raso |
| Economia | 6 | Fórmulas sólidas e documentadas, falta trade-off estratégico |
| Performance | 8 | Não há gargalo real no porte atual |
| Código | 7 | Separação de responsabilidades exemplar pro tamanho, mas zero testes |
| Arquitetura | 7 | Clara e documentada, mas "sala"/"talento" não são de fato plug-and-play |
| Escalabilidade | 4 | De conteúdo, ok; de produto (live-service/multiplayer), praticamente zero |
| Arte | 5 | Retratos/inimigos bons, resto ainda emoji |
| Áudio | 5 | Funcional e sem custo de asset, mas não memorável |
| Retenção | 4 | Sem sistemas de longo prazo além de prestígio/conquistas |
| Qualidade geral | 6 | Acima da média indie, longe de AAA |
| Potencial comercial | 4 | Precisa de identidade visual/sonora própria pra se diferenciar |
| Potencial de viralização | 3 | Nada aqui é "compartilhável" (sem clipe/momento social) |
| Potencial Steam | 5 | Viável como jogo gratuito/pago barato, não como carro-chefe |
| Potencial Mobile | 4 | Precisaria de UI touch-first e monetização repensada do zero |
| Potencial competitivo | 4 | Não compete hoje com Clicker Heroes/Idle Wizard em profundidade |

---

## PARTE 11 — Plano de evolução

**Curto prazo (1–2 semanas):** itens 🔴 críticos (1–3) + item 5 (reduced motion) + item 11 (texto de prestígio). Isso fecha os riscos reais de segurança/confiabilidade sem tocar em design.

**Médio prazo (1–2 meses):** reforma da Fase 1 (item 4), testes automatizados nas fórmulas (item 7), migração de save real (item 6), trade-offs de talento (item 8), variância de clique (item 9). Isso é o que transforma "protótipo bem-feito" em "jogo com identidade e retenção defensável".

**Longo prazo (3+ meses, se a meta for competir de verdade):** sistema de meta diária/live-ops (item 10), identidade visual completa (substituir todo emoji restante), decisão consciente sobre backend (mesmo que mínimo, tipo Supabase pra sync de save entre dispositivos — vocês já usam Supabase em outro projeto, é conhecimento reaproveitável), e um segundo loop de decisão estratégica real (hoje o jogo é essencialmente unidimensional: "compre o mais barato disponível" é quase sempre ótimo).

---

**Resumo em uma frase:** o código é mais maduro que o design — vocês construíram uma máquina bem-feita para rodar uma fórmula que ainda não decidiu o que a torna diferente das outras.

---

## PARTE 12 — Auditoria de desempenho e bugs (2026-09-21)

*Revisão focada em performance, bugs e organização, cobrindo o que foi escrito depois da Parte 0–11 (a base cresceu 2,6× — 3.166 → ~8.300 linhas). `node tests/run.js` = 59/59 passando no momento desta auditoria.*

> **Status de execução:** 🔴 B1, 🔴 B2 e 🔴 B3 corrigidos em 2026-09-21 (ver [CHANGELOG.md](CHANGELOG.md)).
> Todo o resto (P1–P10, B4–B13, O1–O7, D1–D8) é backlog, não implementado ainda.

### 12.1 — Gargalos de desempenho

🔴 **P1 — `Game.synergyBonuses()` recalculado ~30–40×/tick (≈350×/s), sem cache.**
O ponto mais quente do jogo. `synergyBonuses()` (`game.js:1158`) roda três varreduras completas da grade da Base a cada chamada — `adjacencyPairs()` (`game.js:1109`), `activeSynergies()` (`game.js:1074`), `activeComplexes()` (`game.js:1125`) — cada uma revalidando `ensureBaseGrid()` (`game.js:1031`, 13× `indexOf` sobre 16 células) e `activeSynergies()` fazendo `ROOM_SYNERGIES.find()` (21 defs) por célula×vizinho, ~670 comparações por chamada. `heroGearMult()` (`game.js:313`) chama isso **uma vez por herói, por cálculo de DPS**, e `teamDps`/`updateDynamic` somados chamam DPS 20–25× por tick. Estimativa: ~400k operações/s e ~1.200 alocações/s de array/objeto para um valor que só muda quando o jogador constrói ou move uma sala. Correção: cache com dirty-flag (o projeto já usa esse padrão em `_gearDirty`/`_fieldDirty`), invalidado em `buildRoom`, `swapCells`, prestígio/ascensão e pesquisas que mexam em `extSynergyMult`. Deve cortar ~70–80% do custo do tick.

🔴 **P2 — `UI.updateClosestAch()` reavalia todas as ~66 conquistas e reescreve HTML 10×/s.**
`ui.js:1801` chama isso todo tick → `Game.closestAchievement()` (`game.js:1377`) roda `derived()` + `a.progress()` para cada conquista. A conquista `cx1` (`data.js:676`) sozinha chama `codexCompletion()` (`expansion.js:747`), que varre `NPCS` + 9 `countDefs`. `box.innerHTML` é reescrito mesmo sem mudança. Correção: mover para o cadenciamento de 2s de `checkAchievements` (`main.js:43`) e só tocar o DOM quando id/porcentagem mudarem.

🟠 **P3 — CSS custom property escrita no `documentElement` todo tick.**
`ui.js:1788-1789` escreve `--arcane-glow` a cada tick, alimentando um `radial-gradient` de tela cheia (`style.css:28`) — força repintura 10×/s por um valor que só muda em prestígio/essência. Guardar o último valor e só escrever na mudança.

🟠 **P4 — `innerHTML` reconstruído por linha, por tick (~130 reparsings/s).**
Geradores (`ui.js:1810`, até 11), salas (`ui.js:1910`, 13 — cada uma chamando `roomCostHtml` → `extRoomCostMult` → loop de 25 pesquisas), forja (`ui.js:983`), buffs (`ui.js:1672`, mesmo com zero buffs). O projeto já resolve isso em outro lugar com assinatura/comparação (`_dailySig` em `daily-ui.js:11`, `compSig` em `ui.js:445`) — falta aplicar o mesmo padrão aqui.

🟠 **P5 — `Game.genMaxBuy()` chamado duas vezes por linha por tick** (`ui.js:1807-1808`) quando "Máx" está selecionado — calcular `n` uma vez e derivar `cost` dele.

🟡 **P6 — `.find()` linear sem índice por id**, repetido em `heroDps`/`roleDpsMult`/`heroArchetype`/`heroRole`/`summonDps` (`HEROES.find`), `genCost`/`genMult` (`GENERATORS.find`), `relics.js`/`bosses`/`weapon types`. `genMult()`/`globalProdMult()` também percorrem os 31 `UPGRADES` a cada chamada (~700 iterações/tick só nisso). Correção: mapas `id → def` construídos uma vez no load.

🟡 **P7 — alocações descartáveis por tick**: `fieldHeroes()` (`game.js:347`, Object.keys+filter+sort, chamado 5–8×/tick — já existe `_fieldDirty`, falta cachear a lista junto), `worldInfo()` (`expansion.js:10`, ~15–20 objetos novos/tick via `extGoldMult`/`extDpsMult`/etc.), `matPerSec()`.

🟡 **P8 — `Game.clickAttack()` roda a cadeia de DPS inteira por clique** (`game.js:817`) — jogador clicando 10×/s dobra o custo total de CPU do jogo. Reaproveitar o `teamDps` já calculado no tick.

🟢 **P9 — `getElementById` sem cache no tick** (item 🟢 já citado na Parte 1/item 12 da lista priorizada — ainda não feito: `ui.js:1759-1794` + `updateBuffs`/`updateClosestAch`/`updateDaily`/`ensureModalSanity`/`updateWorld` somam ~16 buscas por tick).

🟢 **P10 — `drawBaseLinks` faz layout thrashing** (`ui.js:1296-1301`): `center(idx)` chama `getBoundingClientRect()` sem memoizar, 2× por segmento. Só roda no render da Base (não no tick), mas cachear os centros antes do laço de desenho é trivial.

### 12.2 — Bugs

🔴 **B1 — Import de save e hard reset não têm efeito real.** *(corrigido em 2026-09-21, ver CHANGELOG)*
`beforeunload` (`main.js:58`) chama `saveGame()` incondicionalmente. `importSave()` + `location.reload()` (`ui.js:1607-1610`) e `hardReset()` (`ui.js:1618-1619`) gravam o novo estado, mas o `reload()` dispara `beforeunload` antes de descarregar a página, que regrava o **estado antigo da sessão em memória** por cima do que acabou de ser importado/resetado. O jogador vê a página recarregar e acha que funcionou; o progresso real continua o de antes. Efeito colateral: depois de um hard reset, o boot encontra um save (o antigo, regravado) e pula o modal de lore inicial (`main.js:17-20`).

🔴 **B2 — Meta diária "Vender no Mercado" nunca pode ser sorteada.** *(corrigido em 2026-09-21, ver CHANGELOG)*
`data.js:1049` checa `S.research.done.mercado`, mas a pesquisa que libera o Mercado tem id `comercio` (`data.js:825`, `unlock: 'market'`) — não existe pesquisa com id `mercado`. `req` retorna sempre `false`, então `rollDailyGoals` (`daily.js:42`) filtra essa meta do pool para todo jogador, todo dia, para sempre: das 8 metas declaradas, só 7 já existiram na prática.

🔴 **B3 — A seção "Bolsa" nunca detecta melhorias.** *(corrigido em 2026-09-21, ver CHANGELOG)*
`ui.js:553-558` conta upgrades filtrando `S.forge.inventory` por `item.heroId`, mas itens **forjados** (`Game.forgeItem`, `game.js:737`) nunca têm esse campo — só drops de combate (`rollGear`, `game.js:550`) têm, e esses são auto-equipados ou vendidos, nunca ficam na bolsa. `upgrades` é sempre 0: a Bolsa nunca abre sozinha nem mostra "N melhorias!". O próprio comentário acima da função (`ui.js:551-552`) já sinalizava essa decisão como pendente. Correção: comparar contra o melhor item equipado no slot entre os heróis em campo (`Game.itemScore` + `Game.fieldHeroes()`).

🟠 **B4 — XSS via save importado, fechado só parcialmente** (a Parte 1/item 🟠2 marcou esse item como ✅, mas restam vetores). `updateBuffs` já escapa (`ui.js:1670`, `UI.esc`) e `importSave` valida o array `buffs` (`state.js:246-251`), mas o schema só checa `typeof` de chaves de primeiro nível — `forge` e `npcs` passam como `'object'` com conteúdo livre. Ainda sem escape: `gearIconHtml()` (`ui.js:65-66`, `item.icon` cru → `innerHTML` em `renderMiniGear`/`bagCard`/`showForgeReveal`) e a label de oferta de NPC (`ui-ext.js:348`, monta de `S.npcs.offers`, que é persistido no save).

🟠 **B5 — Bônus globais de equipamento contam heróis na reserva, não só em campo.** `recomputeGearBonuses()` (`game.js:168-194`) e `activeSetCounts()` (`gearsets.js:25`) iteram `S.heroes` inteiro, enquanto o resto do sistema (`teamDps`, `recomputeSynergy`, `_roleEff`) usa só `fieldHeroes()`. Consequência: guardar armas com afixo de time no banco dá o bônus de graça, e Conjuntos de 4 peças completam sem nenhuma peça em campo — mesma categoria do exploit `reqPrestige` fechado em julho (regra existe num lugar, ignorada em outro). Atenção ao corrigir: `setFieldSlot` (`game.js:369`) só marca `_fieldDirty`, precisaria marcar `_gearDirty` também.

🟠 **B6 — "Formação Estendida" (5º slot) não invalida o cache de sinergia.** `expansion.js:284` marca `UI.dirty.heroes` mas não `Game._fieldDirty`; `_lastSynergy.slots` fica em 4, então o medidor de sinergia mostra o campo como cheio até o jogador mover um herói manualmente.

🟠 **B7 — Progressão de combate trava em aba de fundo.** `dt` é limitado a 2s (`main.js:36`) e `damageEnemy` (`game.js:829-834`) descarta dano excedente — só 1 inimigo morre por tick. Navegadores estrangulam `setInterval` em background para ~1×/s, e `computeOffline` (`game.js:1485`) credita ouro/conhecimento/materiais mas nenhuma onda/abate — deixar o jogo aberto em outra aba é pior que fechá-lo, para combate. Isso também cria um teto duro de 10 abates/s no late-game: acima de certo DPS, mais dano deixa de acelerar progressão.

🟡 **B8** — `UI._seenIds['bag']` (`ui.js:15-20`) usa `item.uid` monotonicamente crescente como chave — o Set nunca encolhe numa sessão longa. 🟡 **B9** — seed de diálogo de NPC colide (`ui-ext.js:278`: `'mercador'[1]` e `'ferreiro'[1]` são ambos `'e'`). 🟡 **B10** — `typewrite` (`ui.js:2204-2208`) não guarda/limpa o `setInterval`; fechar o modal no meio deixa escrevendo até 10s, e abrir lore em sequência acumula intervalos. 🟡 **B11** — `SAVE_VERSION = 3` (`state.js:3`) segue sem ser lido em `loadGame` (item 🟡6 da Parte 1, marcado ✅ mas só o merge raso→genérico foi resolvido, não migração real). 🟡 **B12** — lógica de visibilidade de recursos (`ui.js:1657`) continua com a dupla negação apontada na Parte 1/item 🟡 (não corrigido). 🟢 **B13** — moeda dourada ainda pode nascer atrás do painel esquerdo no mobile (`ui.js:2037`, mesmo diagnóstico da Parte 1/item 🟢).

### 12.3 — Organização e limpeza

🔴 **O1 — `js/monetization.js` (521 linhas) não está referenciado em `index.html`, mas é uma armadilha se alguém ligar.** Tem `STRIPE_PUBLIC_KEY: 'pk_live_xxxxx'` hardcoded, `JSON.parse` sem try/catch alimentando `Object.assign(this, data)` sobre dado de `localStorage` (permite sobrescrever métodos do próprio objeto), handlers `onclick="MONETIZATION.buyItem(...)"` inline (estilo oposto ao resto do projeto), CSS 100% inline fora do design system (um botão nasceria sobreposto ao `#topbar`), abas de shop que nunca trocam estado visual ativo, um `setInterval` de 5 min (`trackRevenue`) que só faz `console.log` e nunca é limpo, e zero integração com `S`/save (chave de `localStorage` separada — "compras" não sobrevivem a export/import nem a hard reset). Recomendação: mover para `docs/`/`prototypes/` como referência de produto, ou reescrever no padrão do projeto antes de ligar.

🟠 **O2 — regras de negócio na UI em sistemas novos** (mesma categoria do exploit de julho, mas contido — não chega a ser explorável hoje): `UI.renderRelics` decide o slot livre (`relics-ui.js:116`, `indexOf(null)`) sem um `Game.equipRelicFirstFree()` equivalente a `Game.firstFreeFieldSlot()`; `renderProd`/`renderRecruit`/`updateDynamic` reimplementam o mesmo filtro de visibilidade **três vezes** (`ui.js:220-222`, `511-513`, `1823-1827`, com comentário admitindo que precisam ficar idênticas). Pontos bons registrados: `buyGen`/`hireHero` já validam `reqPrestige` no motor, e `canGrowWorldTree` (`worldtree.js:31-40`) documenta explicitamente por que o gate vive lá — o padrão certo existe, só não é universal ainda.

🟠 **O3 — duplicação entre os `*-ui.js`**: 5 implementações do widget "HTML de custo multi-recurso" (`roomCostHtml`, `forgeCostPart`, `researchCostHtml`, `worldTreeCostHtml`, inline de ofertas de NPC), cada uma com seu próprio dicionário de ícones de recurso; padrão "botão com afford" (`classList.toggle('afford', ok); disabled = !ok`) repetido ~12×; seletor ×1/×10/Máx implementado 3× (`ui.js:206-213`, `314-319`, `worldtree-ui.js:52-56`) — a versão da Árvore do Mundo perdeu `aria-pressed`/`aria-label`, regredindo a acessibilidade do item ✅13 da Parte 9.

🟡 **O4 — números mágicos que duplicam texto de `data.js`**: multiplicadores de sala hardcoded em `game.js` (linhas 34-36, 410-411, 464, 524, 1019) repetem os mesmos percentuais que já estão escritos nos `desc` de `ROOMS` (`data.js:280-294`) — duas fontes de verdade para manter sincronizadas a cada ajuste de balanceamento. Também sem constante nomeada: curvas de HP de inimigo/chefe (`game.js:452,459`), timer de chefe (`game.js:482-483`), chances de drop (`game.js:581,590,823`), volatilidade de mercado (`expansion.js:350`).

🟡 **O5 — ~80 globais em `window`** (aceitável sem bundler, ordem de `<script>` em `index.html:81-101` documenta a dependência), com um near-miss já existente: `RESEARCH_MAX_COMPLETABLE` (`data.js:845`) é calculado na avaliação de `data.js` e consumido por `ACHIEVEMENTS.rs3` (`data.js:665`) — só funciona porque a ordem de declaração é essa.

🟡 **O6 — tratamento de erro inconsistente**: `catch (e) {}` silencioso em vários pontos (`state.js:148,153`, `game.js:1362`, `expansion.js:732`, `daily.js:42`), guarda defensiva bem documentada em `npcLevel` (`expansion.js:414-416`), e nenhuma guarda em `renderBag` (`ui.js:559`), que quebraria se `RARITIES[best]` fosse `undefined` por uma raridade inválida vinda de save importado.

🟢 **O7 — código morto legado**: `Game.synergyMult` (`game.js:200`, marcado "(legado)") e `SYNERGY_MAX_BONUS` (`data.js:152`, "compat com saves") não são lidos por ninguém; `o._target` (`expansion.js:591`) grava campo transitório dentro de `S.npcs.offers`, que vai pro save.

### 12.4 — Ideias de design (baseadas no conteúdo real de `data.js`/`expansion.js`)

🔴 **D1 — a Árvore do Mundo tem 2/3 do conteúdo matematicamente inalcançável.** Custos por nível (`data.js:574-581`, bases 1.15/1.32) nos estágios de nível 150/400/1000 (`data.js:582-589`) exigem essência/cristal na casa de 1e18–1e24+, muito além do que `essenceGain = (earned/1e8)^0.45` (`game.js:1241`) consegue produzir em qualquer curva realista de late-game. Achatar as bases (~1.06–1.08) ou reposicionar os estágios (ex: 0/5/15/40/80/150) resolveria.

🟠 **D2 — o teto de 10 abates/s (ligado ao B7) satura o valor de investir em DPS no late-game.** Uma mecânica de "abater múltiplos inimigos por tick quando o DPS excede o HP da onda" transformaria excesso de DPS em progressão visível.

🟠 **D3 — Fases 7 e 8 continuam teasers vazios**; a Fase 8 (100T) nem tem notificação em `updatePhases` (`game.js:1307-1312`). Decidir entre dar conteúdo real à aba "???"/guildas ou remover a Fase 8 e assumir a Árvore do Mundo/Ascensão como o endgame declarado.

🟠 **D4 — a reserva de heróis não tem função própria** (e hoje é a superfície do exploit B5): com `FIELD_SLOTS = 4` (`data.js:150`) e 10 heróis, 6 ficam parados só custando. Sugestões que reaproveitam sistemas existentes: expedições em tempo real (mesma mecânica de fila de `RESEARCH`), treinamento (XP cedido de um herói banco pra um em campo), ou rotação tática puxada pelos requisitos de papel dos chefes (`BOSS_MECHANICS.req.role`, `data.js:484-497`) — hoje o aviso de mecânica (`bosses-ui.js:7`) chega depois do spawn, tarde demais pra decidir.

🟡 **D5 — a renda passiva do Mercado (`mercadoGoldPerSec`, `game.js:15-19`) fica fora de `globalProdMult()`** — não recebe essência, conquistas, talentos, salas, upgrades globais nem Árvore do Mundo, mas recebe todos os bônus de ouro-por-abate. Provavelmente não intencional; a sala fica obsoleta exatamente quando os multiplicadores principais crescem.

🟡 **D6 — as melhores decisões do jogo (Relíquias) estão escondidas atrás de dezenas de horas/dias**: chefe onda ≥40 (8% chance), Colecionador atrás da pesquisa `cidade` (7200s, atrás de `comercio`), ou pesquisa `portais` (259.200s = 3 dias reais). Dar a primeira relíquia garantida no primeiro chefe da onda 20 ensinaria o sistema enquanto ainda é decisão, não otimização. Mesma observação para os ramos de pesquisa mutuamente exclusivos (1 dia real cada) — os pares de Talento já resolvem isso melhor, disponíveis cedo na Fase 4.

🟡 **D7 — Metas do Dia é o único gancho de retenção entre sessões, e roda com 7 das 8 metas** (B2) e sem marco de sequência acima de `DAILY_STREAK_MAX = 10` — o exato momento em que o hábito se formaria fica sem recompensa adicional. Há eventos já registrados em `S` e não usados no pool (`market.stats.bought`, `npcs.requestsDone`, níveis de sala/Árvore do Mundo).

🟢 **D8 — o Códex já agrega 9 categorias de completude (`codexCompletion`, `expansion.js:747-766`) mas não tem indicador visível** fora do modal — um badge de % no botão do topbar é custo quase zero e dá um gancho de "colecionador" pro jogador que já esgotou a curva de números.

### 12.5 — Ordem de execução sugerida

B1 → B2 → B3 *(bugs silenciosos, poucas linhas cada — todos os três já corrigidos)* → P1 → P2 → P3 *(performance, ~80% do ganho)* → B5 + B6 *(consistência de regra campo vs. banco)* → O1 *(decidir destino de `monetization.js`)* → D1 *(rebalancear a Árvore do Mundo)* → resto.

**Resumo em uma frase:** o motor cresceu 2,6× desde julho mantendo a separação de responsabilidades honesta, mas cresceu sem cache — `synergyBonuses()` sozinho queima ~400k operações/s recalculando algo que só muda quando o jogador move uma sala — e os bugs de maior impacto (import de save inerte, meta impossível, Bolsa que nunca detecta melhoria) são todos código que *parece* funcionar e nunca executa o caminho que importa.
