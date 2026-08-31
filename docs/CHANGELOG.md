# Changelog

## Não lançado

### O modelo de confiança, documentado (AUDIT item 15)

`ARCHITECTURE.md` ganhou a seção **"O jogo é 100% client-side — o que isso permite e o que impede"**.
A limitação já era real, mas estava implícita: quem chegasse no projeto podia começar a construir um
leaderboard sem perceber que ele seria decorativo.

O que a seção fixa, além do óbvio:

- **O critério de revisão de código** que separa *exploit acidental* (comprar/vender no Mercado em
  loop inflava `earned` ~8× com dois botões da UI — bug grave, com teste de regressão) de *trapaça
  deliberada* (`S.gold = 1e30` no console — não é bug, é a natureza da plataforma). Confundir os dois
  leva a gastar esforço blindando o que não dá pra blindar e a ignorar o que quebra sozinho.
- **A lista do que não pode existir** sobre esta arquitetura: ranking, PvP, troca entre contas, venda
  com posse verificada no cliente, conquistas com peso social.
- **O caminho de saída**, se algum deles virar meta: reconstruir a economia com o servidor como fonte
  da verdade — projeto à parte, não refactor incremental. E o meio-termo barato (backend só como
  sincronização de save, sem prometer integridade).

Na mesma passagem foi corrigida uma afirmação **obsoleta** na lista de limitações, que ainda descrevia
o teto de 200/500 iterações em `genMaxBuy`/`heroMaxLevels` — removido quando essas funções passaram a
resolver a soma geométrica por fórmula fechada.

### Metas do Dia e acessibilidade (AUDIT itens 10 e 13)

**Metas do Dia** — o primeiro sistema de retenção que atravessa sessões. Prestígio e conquistas são
progressão de dentro da run; nada no jogo dava motivo pra abrir ele *amanhã*.

3 metas por dia (`DAILY_GOALS` em `data.js`), sorteadas deterministicamente pela **data real** — não
pelo dia do mundo, que dura 20 minutos e giraria várias vezes na mesma sessão. Sem backend: a mesma
data gera as mesmas metas pra todo mundo. Motor em `js/daily.js`, UI em `js/daily-ui.js`, painel
esquerdo (retenção só funciona se estiver à vista).

- O pool é filtrado por `req(S)`: quem está na fase 1 nunca recebe "forje 8 equipamentos". Meta
  impossível é pior que meta nenhuma — em compensação, o novato vê 2 metas em vez de 3 até
  desbloquear mais sistemas.
- Recompensa escala com `enemyGold(maxWave)`, então não fica obsoleta; **sequência** de dias
  consecutivos multiplica em +10%/dia até ×2.
- A sequência só avança depois de **coletar** as 3 (senão subiria sem o jogador voltar ao jogo), e
  só uma vez por dia.
- `S.daily` é permanente: sobrevive a prestígio e ascensão, porque é progresso de hábito do jogador,
  não da run.
- Hooks: `dailyEvent` entra no topo de `missionEvent` (herda sell/forge/research/feed/boss de graça,
  mas antes do guard de NPCs, porque as metas valem desde o começo do jogo), mais três chamadas
  diretas — clique, compra de gerador e abate.
- `todayKey()` usa o fuso **local**, nunca `toISOString()`: às 23h30 de 1º de janeiro no Brasil, o
  UTC já diz 2 de janeiro, e as metas virariam na hora errada.

**Acessibilidade.** O `#click-coin` — o botão mais usado do jogo — era um `<button>` vazio, anunciado
como só "botão" por leitor de tela. Agora tem rótulo dinâmico com ouro, produção e valor do clique.

- Crônicas (`role="log"`) e toasts (`role="status"`) viraram regiões vivas `polite`.
- O ouro **não** virou região viva de propósito: muda 10×/s e afogaria o leitor. O valor vive no
  rótulo da moeda, lido sob demanda.
- Abas com `aria-selected` (o estado ativo era só cor); abas bloqueadas dizem que estão bloqueadas
  em vez de anunciar "???" sem contexto — mantendo o mistério do nome.
- Seletor ×1/×10/Máx com `aria-pressed` e rótulos ("Comprar o máximo possível").
- Barra de fase e barras das metas viraram `role="progressbar"` com `aria-valuetext`.
- Decoração (números flutuantes, brilho da moeda) escondida com `aria-hidden`.

Suíte 50 → **59**: determinismo por data, fuso local, meta nunca impossível, coleta única, e as
quatro regras de sequência (sobe, zera ao pular, não avança sem completar, não infla no mesmo dia).

### O "botão de compra congelado" e a aba Pesquisa

- **🐛 A camada de modal invisível travava a tela inteira (`js/ui.js`, `style.css`)** — a causa real do
  relato de que "às vezes o botão de compra fica congelado". `#modal-layer` é um elemento `fixed`, em
  tela cheia, com `z-index: 400` e `pointer-events: auto`: a **única** coisa que o impede de engolir
  todos os cliques do jogo é a classe `hidden`. Qualquer caminho que esvazie o conteúdo sem repor a
  classe deixa uma **placa de vidro invisível** sobre a tela — o jogo continua rodando, os números
  continuam subindo, e nada é clicável. Confirmado medindo `document.elementFromPoint()` no centro do
  botão de compra: voltava a camada, não o botão. Não é o botão que congela, é a tela; o botão de
  compra é só onde se percebe primeiro. Em vez de caçar cada caminho possível, três travas
  independentes: `#modal-layer:empty { pointer-events: none }` no CSS (uma camada sem conteúdo nunca
  bloqueia); `UI.ensureModalSanity()` rodando a cada tick (camada visível sem `.modal-box` dentro se
  esconde sozinha); e **Esc fecha o modal aberto**, saída de emergência universal. O fechamento também
  foi centralizado em `UI.closeModal()`, que esconde E limpa — deixar conteúdo para trás numa camada
  só "escondida" era o que criava os estados intermediários.
- **🐛 Cada compra reconstruía a aba inteira (`js/game.js`, `js/ui.js`)**: `buyGen` e `levelHero`
  marcavam a aba como suja, e `renderActive` responde a isso com `innerHTML = ''` — ou seja, **o botão
  sob o cursor era destruído e recriado a cada clique**. Verificado: a identidade do nó do botão não
  sobrevivia a uma única compra. Isso mata o `:active`, corta a animação de clique e faz um segundo
  clique rápido cair no vazio do rebuild. `updateDynamic` já atualiza custo, quantidade, produção,
  DPS e afford de cada linha a cada tick, então o re-render era puro desperdício. Agora o nó sobrevive
  a compras repetidas (verificado com 8 seguidas) e só a APARIÇÃO de uma linha nova re-renderiza —
  via `UI.invalidateProdVisibility()`, que a compra dispara para a checagem rodar no tick seguinte em
  vez de esperar os 3s do intervalo. A checagem também passou a considerar os upgrades, não só os
  geradores.
- **🔬 Aba Pesquisa: painéis de categoria lado a lado (`js/ui-ext.js`, `style.css`)**. A separação por
  categoria sempre foi certa — um jogador novo precisa ver que existem **nove ramos** de pesquisa e o
  que cada um faz. O que estava errado era a **distribuição**: nove cabeçalhos `<h3>` empilhados na
  vertical, cada um seguido de uma grade que quase sempre continha **um card só**, porque só aparece a
  tecnologia cujos pré-requisitos já foram cumpridos. Dava **1710px** de rolagem para mostrar 8 cartas
  numa coluna estreita, com a tela larga vazia à direita.
  Agora cada categoria é um **painel com moldura própria** (ícone, nome e progresso `2/3` no
  cabeçalho), e os painéis fluem numa grade responsiva: 4 colunas a 1750px, 2 a 1300px, 1 no celular.
  A separação ficou **mais** forte, não menor — e dá para ver vários ramos de uma vez em vez de rolar
  por eles. Dentro de cada painel, hierarquia por peso visual:
  - a tecnologia **disponível agora** é a única com card completo e botão — é a única que tem ação;
  - **na fila**, **🔒 bloqueadas** (com o que falta: "após Táticas de Guerra") e **✔ concluídas** são
    linhas de uma altura só. As bloqueadas ficam visíveis de propósito: é o que mostra ao jogador novo
    que o ramo continua e para onde vai.

### Correções visuais: a moeda deformada e a Base com 720px de vazio

- **🐛 A moeda encolhia sozinha e virava elipse (`style.css`)**: `#left-panel` é um flex **coluna**, e o
  `flex-shrink: 1` padrão come a ALTURA dos filhos quando o conteúdo do painel passa da altura da
  janela. A moeda saía de 140×140 para **140×64** — medido — e, pior, mudava de forma a cada vez que o
  painel crescia ou encolhia: um buff entrando, o log ganhando linhas, um recurso novo aparecendo.
  Daí a sensação de que ela "ficava se redimensionando". Fix: `flex: 0 0 auto` para tirá-la da conta do
  encolhimento, mais `aspect-ratio: 1` como rede de segurança. Auditado o painel inteiro: nenhum outro
  filho estava sendo esmagado.
- **📐 A Base desperdiçava 720px de tela (`js/ui.js`, `style.css`)**: a grade tinha `max-width: 560px`
  dentro de um painel de 1280 — sobrava dois terços da largura em vazio, e as células ficavam com
  130px, pequenas demais para a arte das salas aparecer. A aba virou **duas colunas** acima de 1250px
  de janela: a grade cresce até 760px (células de **184px**) e a lateral, que antes era buraco, recebe
  o painel de ligações e o Manual de Adjacência. Abaixo desse corte volta a ser uma coluna só — o
  limite é 1250 e não menos porque, mais estreito que isso, uma coluna de 330px ao lado deixaria as
  células MENORES do que eram antes.
- **🏚️ Salas não construídas pareciam iguais às construídas**: as 13 salas apareciam como cards de arte
  completa mesmo no nível 0, então a Base lia como um catálogo de prédios à venda em vez da base que o
  jogador levantou. Agora nível 0 é uma **planta**: arte dessaturada e recuada, borda tracejada, só o
  botão Construir mantendo contraste. Passar o mouse revela a arte.
- **🌆 O horizonte da cena**: prédios de 30px fixos e centralizados num banner de mais de mil pixels —
  com poucas salas, um punhado de coisinhas espremidas no meio do vazio. Agora eles crescem para
  dividir a largura (até 68px) e se distribuem.

### Base: adjacência em três níveis e conexões sob demanda
Redesenho do sistema de Base a pedido do usuário, com referências declaradas: **Dorfromantik** (o
jogador pensa em quais estruturas devem ficar próximas), **Kingdom Two Crowns** (leitura visual das
relações entre estruturas) e **Melvor Idle** (organizar muitos sistemas sem poluir a tela). O objetivo
é transformar a Base num mini-puzzle: a pergunta deixa de ser só "qual sala dá mais produção?" e passa
a ser **"onde eu ponho essa sala para formar a melhor combinação?"**.

- **🟢🔵🟣 Três níveis de sinergia (`js/data.js`, `js/game.js`)**, do genérico ao específico — e é a
  especificidade que paga:
  - **Vizinhança** (`ADJACENCY_BONUS`, novo): qualquer par de salas construídas lado a lado rende
    +0,4%/nível de ouro. É o piso do sistema — recompensa ocupar a grade de forma compacta, sem
    buracos, mesmo sem afinidade nenhuma entre as salas.
  - **Combinação** (`ROOM_SYNERGIES`, já existia): duas salas *específicas* lado a lado. 21 pares.
  - **Complexo** (`ROOM_COMPLEXES`, novo): **3 salas específicas formando um grupo conectado entre
    si** — não basta estarem na grade, elas têm que formar uma peça só (linha, L ou bloco). Seis
    complexos: Centro Militar, Distrito Arcano, Complexo Industrial, Distrito Financeiro, Cidadela
    Sagrada e Academia de Guerra. Eles **compartilham salas de propósito** (o Quartel está no Centro
    Militar e na Academia de Guerra; o Castelo, no Distrito Financeiro e na Cidadela Sagrada): em 16
    células não dá para ter todos, então montar a Base é escolher quais combinações valem mais para
    a sua run. É aqui que mora o puzzle.
- **🔗 Conexões só quando você pede (`js/ui.js`, `style.css`)**: o risco de um sistema de adjacência é
  todo prédio exibir seus vínculos ao mesmo tempo e a base virar uma tela de informação. A Base fica
  **limpa por padrão**; ao selecionar uma sala, um `<svg>` sobre a grade desenha as ligações **daquela
  peça** — verde tracejado para vizinhança, azul para combinação, roxo grosso para o contorno do
  complexo — as salas ligadas ganham borda colorida e **todo o resto recua** (`.dimmed`). Um par que
  aparece em mais de um nível é desenhado **uma vez só**, no nível mais forte (os bônus continuam
  cumulativos; a dedupe é só visual).
- **🔎 Painel de ligações**: abaixo da grade, o que a sala selecionada ganha, nível a nível —
  `🟣 Complexo · Academia de Guerra · 🏰 Quartel ─ 📚 Biblioteca ─ 🔧 Oficina · +14% DPS +14% equipamento`.
  E o gancho de puzzle: uma linha **🟣 Possível** listando os complexos que aquela sala *poderia*
  formar e com quem (`junte com 🔧 Oficina + 🏟️ Arena`).
- **⚫ O selo "⚡3" saiu**: cada célula agora tem só **pontos coloridos** — um por nível em que a sala
  participa. Presença em vez de contagem, para a grade continuar uma cena e não um painel de números.
- **⇄ Mover virou modo explícito**: selecionar passou a significar *inspecionar*, então o toque
  seguinte não pode mais trocar as salas de lugar por padrão — quem estivesse explorando as conexões
  destruiria o próprio arranjo sem querer. Agora existe um botão `⇄ Mover` no painel que arma a troca.
  No desktop, arrastar continua funcionando direto.
- **🧭 Manual de Adjacência**: a antiga legenda virou uma referência organizada pelos três níveis, com
  os complexos primeiro (são o objetivo de arranjo), e resumo `2/6 complexos · 6/21 combinações`.
- **🧪 Testes**: 27 → **35**. Cobrem a conectividade (linha, L, buraco no meio, diagonal que *não*
  conecta), a exigência de sala construída, o escalonamento pelo menor nível, a contagem de pares sem
  duplicar e a soma cumulativa dos três níveis.

Impacto no ritmo, medido no simulador (`tests/sim.html`, 90 min): as fases saem em 0/3/9/21/40/43/46/50
min contra 0/3/11/25/46/49/51/55 antes — cerca de 10% mais rápido, com as mesmas paredes de chefe. O
sistema adiciona profundidade sem desfazer o balanceamento.

### Usabilidade: número do clique, e telas densas que respiram
Passe de usabilidade a pedido do usuário, com uma regra só: a tela mostra o que o jogador FAZ, e tudo
que é referência fica a um clique de distância. Nada foi removido do jogo — só reorganizado, para o
conteúdo impressionar por profundidade em vez de assustar por volume.

- **🐛 O número do clique piscava, e com a barra de espaço ia para o canto superior esquerdo
  (`js/ui.js`, `style.css`)**: `#click-coin` é um `<button>`, então segurar espaço/Enter com ele focado
  dispara `click` por TECLADO — e um clique de teclado tem `clientX/clientY = 0`. O número flutuante ia
  parar em (0,0), e a repetição automática da tecla empilhava dezenas deles no mesmo pixel, piscando.
  Duas correções: `UI.floatOrigin()` detecta ativação por teclado (`ev.detail === 0`) e usa o centro do
  próprio botão; e o número agora **acumula** em vez de empilhar (`UI.floatAccum`) — enquanto os cliques
  chegam, o mesmo elemento fica parado somando o total com um "bump" a cada clique, e só sobe quando o
  jogador para. Clicar rápido virou um "+412 Mi" crescendo e legível. Vale também para o clique de
  ataque no inimigo (crítico e ataque duplo seguem com número próprio — são o evento raro que merece
  destaque). Somado a isso, um teto de 24 números simultâneos na camada, para nenhuma outra fonte de
  clique conseguir encher a tela de novo.
- **📐 Seções recolhíveis (`UI.section`, `js/ui.js`, `style.css`, `js/state.js`)**: componente novo —
  cabeçalho de uma linha com o título à esquerda e **o número que importa** à direita, expansível. O
  padrão de abertura segue uma regra explícita: **uma seção só nasce aberta quando tem uma decisão
  pendente** (existe slot de campo vago E alguém no banco; existe herói contratável agora; existe carta
  na bolsa melhor que a equipada; existe relíquia achada e slot livre). Seção que é só consulta nasce
  fechada. A escolha do jogador fica salva em `S.ui.sections`.
- **🦸 Aba Heróis: de 1841px para ~1050px** numa tela de 800. O painel de Sinergia sozinho ocupava
  **452px** — um quarto da página inteira — logo acima dos heróis, quase todo composto de linhas
  inativas (as 8 composições de time, a escada de faixas, a contagem por classe). Virou uma linha:
  `⚡ Sinergia de Time · 65% → 80% 📘`. O Campo de Batalha subiu para logo abaixo do combate, que é
  onde o jogador age. Reserva, Recrutar, Bolsa, Conjuntos e Relíquias viraram seções com resumo
  próprio ("3 melhorias!", "slot vago!", "2/3 equipadas"). Os mini-cards de herói gastavam **duas
  linhas empilhadas** com papel e arquétipo por herói; viraram uma faixa de etiquetas, com o nome da
  arma ideal indo para o tooltip e ficando no card só o ícone (`→🔨`) enquanto a arma não estiver
  equipada — dica acionável fica, referência sai.
- **🏰 Aba Base: de 1960px para ~1290px.** A legenda de afinidades era uma tabela **fixa de 667px** com
  as 21 sinergias possíveis do jogo listadas permanentemente embaixo da grade, quase todas inativas —
  a definição de conteúdo de consulta. Virou a seção `🧭 Afinidades`, com resumo `3/21 ativas`. O
  parágrafo de instruções que ficava no topo foi para dentro dessa seção, junto do que ele explica;
  quem ainda não tem nenhuma sinergia recebe a dica curta na própria barra de sinergias.
- **🔨 Aba Forja: as chances viraram legíveis.** Cada tier mostrava uma fileira de porcentagens cruas e
  **sem nenhum rótulo** — "58% 32% 9% 1%" — sem dizer do que eram nem qual tier compensava. Agora cada
  tier tem uma **barra empilhada** colorida por raridade (comparar dois tiers virou comparar dois
  desenhos) mais a linha que carrega a decisão: `até Lendário · 18%`. A tabela completa de chances foi
  para o tooltip. O rodapé de estatísticas ganhou separador e o aviso de bolsa cheia virou explícito
  ("equipe ou desmanche na aba Heróis").
- **🐛 `Game.npcLevel` derrubava o tick com estado incompleto (`js/expansion.js`)**: lia
  `S.npcs.rep[npcId]` sem verificar `S.npcs.rep`, e é chamado de `forgeTierUnlocked`, que a UI consulta
  a cada render — uma exceção por segundo, no laço principal. Agora um estado incompleto vale nível 0.

### Jogabilidade: combate viável, paredes com saída e compras que valem a pena
Passe focado em jogabilidade a pedido do usuário ("remover todos os erros, atualizar a dinâmica do
jogo e o equilíbrio das compras"). Todo diagnóstico saiu de medição, não de sensação: foi criado um
**simulador headless** (`tests/sim.html` + `tests/sim.js`) que roda um jogador automático sobre o
motor real e reporta ritmo de fase, curva de ouro/s, evolução da onda e onde a run trava.

- **⚔️ O combate era matematicamente impossível de sustentar (`js/data.js`, `HERO_MILESTONE`)**: o HP
  do inimigo cresce ×1,45/onda (×41 a cada 10 ondas), mas com o marco de DPS a cada 25 níveis subir o
  DPS ×41 exigia ~111 níveis, ou **×2200 de ouro** — contra uma renda que cresce só ×33 nas mesmas 10
  ondas. A divergência era permanente e crescente: medindo com o time INTEIRO no nível 80, todas as
  salas, todas as pesquisas, 12 prestígios e 500 de essência, o chefe da onda 75 ainda pedia
  **50.000× mais DPS** do que qualquer investimento entregava. Marco 25 → **18**: as mesmas ×41
  passam a custar ~×490, então o combate anda atrás da economia (que é o que mantém os geradores como
  espinha dorsal) mas dentro do alcance dela. Medido no simulador: a onda máxima em 90 min foi de 70
  para 91, e a pior parede caiu de **28 minutos para 14**.
- **🔍 Estudo do Inimigo, mecânica nova (`js/game.js`, `js/data.js`, `js/state.js`)**: cada tentativa
  falha no chefe atual dá **+15% de dano contra ele**, acumulativo até ×3, zerando quando ele cai.
  Falhar num chefe congela a onda — e, com ela, quase toda a progressão de combate —, então sem isso
  o jogador ficava parado por tempo indeterminado sem nenhum sinal de avanço. Agora a parede é uma
  contagem regressiva. O teto de ×3 é deliberado: não trivializa uma parede grande, só elimina o
  bloqueio infinito. Junto: ao falhar, o log passa a dizer **quanto DPS faltou** (`×2,3`), virando
  meta concreta em vez de "resistiu".
- **💠 Cristal tinha UMA fonte no jogo inteiro (`js/game.js`)**: 40% de chance de 1 unidade ao abater
  um chefe de onda ≥ 30 — exatamente o ponto onde o jogador mais empacava — contra cinco consumidores
  (Forja, Árvore do Mundo, salas avançadas, poções, ofertas de NPC). Numa run de 2h medida no
  simulador o jogador terminava com **2 cristais**, com a Árvore do Mundo travada no nível 0 por falta
  de 25. Agora a **Mina Profunda rende +0,02 cristal/s a partir do nível 5** (fluxo previsível) e os
  chefes soltam a partir da onda 20, com quantidade acompanhando a onda (`1 + ⌊onda/25⌋`, 50%). Mesma
  run agora termina com ~19 mil.
- **🏰 A Base travava de vez por volta do nível 10 (`js/game.js`, `Game.roomYield`)**: o custo de uma
  sala cresce ×1,7–2,0 por nível (exponencial) contra uma produção de materiais que crescia só
  LINEARMENTE com o nível — a partir de certo ponto nenhuma quantidade de tempo alcançava o próximo
  nível de Castelo/Torre/Arena (o Castelo empacava no nível 2). Novo **marco de extração**
  (`ROOM_MILESTONE = 10`): a cada 10 níveis a sala produtora dobra o que rende. Na mesma run medida,
  o Castelo passou de nível 2 para 7.
- **🏭 Os geradores de topo eram armadilha (`js/data.js`)**: o custo por ouro/s crescia ×1,53 por tier
  e um gerador recém-desbloqueado começa sem nenhum marco de ×2 enquanto os antigos já acumulam
  vários — o payback do Portal/Santuário/Motor era de 175s/259s/392s contra ~120s dos iniciais. Ou
  seja: comprar o gerador que você acabou de desbloquear era **sempre a pior compra do jogo**, e o
  jogador ótimo ignorava metade da aba Produção. Produção dos quatro últimos tiers elevada para que o
  ratio cresça ×1,25 no topo: continuam progressivamente mais caros por ouro/s, mas entram na disputa.
- **🦸 A escada de contratação de heróis tinha um degrau que criava a pior parede da run
  (`js/data.js`)**: os saltos iam de 27× a 44×, e o pulo Thora (2,2 Mi) → Vex (60 Mi) deixava o time
  no teto dos 3 heróis disponíveis por **~25 minutos sem nenhuma compra de combate possível**. Os seis
  últimos heróis foram barateados para degraus de ~20–30×.
- **🖼️ ~90 requisições 404 por carregamento de página (`js/art-manifest.js`, `js/ui.js`,
  `js/ui-ext.js`, `tools/gen-art-manifest.py`)**: o sistema de "arte com fallback pro emoji" emitia um
  `<img>` para TODO ícone, então cada área ainda sem arte — conquistas, talentos, tiers da Forja,
  eventos, energia/conhecimento — disparava um 404 por item. Visualmente funcionava (o `onerror` cai
  no emoji), mas o console ficava vermelho de erro, escondendo erros de verdade. Novo manifesto
  gerado do disco (`python tools/gen-art-manifest.py`) que a UI consulta antes de emitir o `<img>`;
  quando não há arte, sai o emoji direto, sem requisição. Console limpo, zero 404.
- **🔧 Fórmula de materiais duplicada (`js/game.js`, `Game.matPerSec`)**: `tick()` e `offlineGains()`
  mantinham cópias separadas do mesmo cálculo, e já haviam divergido — o tick aplicava
  `extEnergyMult` (tempestade turbina a energia), o offline não. Unificadas numa função só.
- **🧪 Testes (`tests/`)**: 19 → **27 casos**. Cobrem `roomYield`, o portão de cristal em `matPerSec`,
  `bossStudyMult` (inclusive o teto e o fato de não valer contra inimigo comum) e duas travas de
  balanceamento que impedem reintroduzir os problemas acima — nenhum tier de gerador pode custar mais
  que ×1,6 por ouro/s que o anterior, e nenhum degrau da escada de heróis pode passar de 32×. O
  harness ganhou stubs de `UI`/`Sound`, porque partes do motor chamam `UI.log`/`Sound.play` no meio da
  lógica e sem eles era impossível testá-las.

### Responsividade mobile: modais roláveis + alvos de toque
Validação ponta a ponta da experiência no celular (medição de layout via DOM em 375px, 320px e
paisagem 812×375 — as 13 abas), a pedido do usuário. Zero overflow horizontal em todas as abas nas
duas larguras; gaveta de recursos ☰, modo canhoto/destro e clamp de layout em paisagem
(`100vh − 57px`) confirmados corretos.

- **🐛 Modais altos ficavam impossíveis de fechar no celular (`style.css`)**: `.modal-box` não tinha
  `max-height` nem `overflow-y`, então um modal mais alto que a tela (Códex media 1245px em 812px)
  empurrava o título e o botão ✕ para **fora do topo da viewport** (topo em −236px), sem rolagem
  possível — o usuário ficava preso. Fix: `max-height: 90vh; overflow-y: auto;`. Depois: o modal cabe
  (731px), rola por dentro e o ✕ fica visível e clicável. Também afetava boas-vindas offline e
  confirmações longas. Validado em retrato e paisagem.
- **🎯 Alvos de toque confortáveis no mobile (`style.css`, dentro de `@media max-width:900px`)**: vários
  controles estavam abaixo do confortável (44px) e dois abaixo do piso WCAG 2.5.8 de 24px. Ampliados só
  no mobile (desktop intacto): `.buy-btn` 34→44px (botão mais tocado), `.buy-amt` (×1/×10/Máx) 26→40px,
  `.cfg-seg-btn` 38→44px, `#codex-btn` 26→40px, `.bc-scrap` 20→34px, `.cfg-vol` (slider de volume)
  16→26px. Reconfirmado 0 overflow após as mudanças.

### Auditoria técnica: migração de save, testes automatizados, narrativa da Fase 1, trade-offs de Talentos
Trata 4 itens do backlog de [AUDIT.md](AUDIT.md) (itens 6, 7, 4 e 8 da Parte 9), a pedido do usuário
depois do roadmap de conteúdo fechado.

- **🔧 Migração de save real (item 6)**: `js/state.js` ganhou `deepMerge(base, data)` genérico — mescla
  `data` (save) sobre um `defaultState()` fresco recursivamente, descendo um nível sempre que os dois
  lados têm um objeto plano na mesma chave. Substitui as ~15 linhas de merge campo-a-campo
  (`S.res = Object.assign(base.res, data.res||{})`, uma por sistema) por uma chamada só —
  **e corrige a classe inteira** do bug de self-merge encontrado na sessão anterior (não só
  `S.npcs`/`S.codex`, que tinham sido corrigidos manualmente ali): o `S = Object.assign(base, data)`
  raso no topo sobrescrevia a referência de QUALQUER objeto aninhado que o save já tivesse, antes das
  linhas de merge específicas rodarem, fazendo "mesclar com o default" virar mesclar um objeto com ele
  mesmo. `SAVE_VERSION` (bump pra 3) ganhou um comentário-âncora pro dia em que uma migração precisar de
  transformação de verdade (renomear/remodelar campo), não só adição — coisa que `deepMerge` sozinho já
  resolve hoje. Verificado com 3 cenários no preview: save real, save v1 sintético (só os campos mais
  antigos) e save intermediário (com `npcs`/`codex` só parcialmente novos) — todos migram sem erro e
  preservam os dados existentes.
- **🧪 Testes automatizados (item 7)**: pasta `tests/` nova (sem npm/build, mesma filosofia do projeto)
  — `tests/index.html` carrega só o "motor" (`format.js` → `worldtree.js`, nunca `ui.js`/`main.js`, já
  que as fórmulas testadas não tocam DOM) + `tests/framework.js` (mini test runner, ~40 linhas,
  `test()`/`assertEqual`/`assertClose`/`assertTrue`) + `tests/formulas.test.js` (19 casos cobrindo
  `genCost`/`genMaxBuy`/`heroLvlCost`/`heroMaxLevels`/`essenceGain`/`enemyGold`/`enemyMaxHp`/`roomCost`/
  `ascensionGain`/`worldTreeCost`, incluindo comparação fórmula-fechada vs força-bruta). Achou uma
  imprecisão real (não um bug, um efeito colateral do `Math.floor`): os níveis 0 e 1 da Árvore do Mundo
  empatam em 1 de custo de essência — documentado no teste em vez de alterado (rebalancear não foi
  pedido). Abrir `tests/index.html` roda tudo e mostra pass/fail na página + console.
- **📖 Narrativa da Fase 1 (item 4)**: Aldric agora comenta durante o clique puro, antes de Heróis
  desbloquear em 2.500 ouro (antes, os únicos comentários eram no clique 1 — com o texto ERRADO, ver
  abaixo — e no desbloqueio de Heróis). `PHASE1_FLAVOR` novo (`js/data.js`, 3 marcos por `S.earned`:
  50/300/1200), disparado uma única vez cada em `Game.updatePhases()` (`js/game.js`) via
  `S.advisorSeen{}` novo (permanente, nunca resetado — mesmo padrão de "avisa uma vez" de
  `S.unlocked`). De quebra, corrigido um bug de conteúdo real: `ADVISOR_TIPS.firstGen` ("Um Aprendiz
  Coletor! Agora o ouro flui sozinho...") disparava no **1º CLIQUE** (`ui.js`), não na compra do
  1º gerador — texto sobre um gerador que ainda nem existia. Agora `firstClick` (texto novo, sobre o
  próprio clique) dispara no clique 1, e `firstGen` dispara de verdade em `Game.buyGen()` quando é o
  1º gerador de qualquer tipo comprado na run.
- **⚖️ Trade-offs em Talentos (item 8)**: 2 pares `exclusiveWith` novos em `TALENTS` (`js/data.js`,
  `max:1` cada, mesmo mecanismo do roadmap #5 na Pesquisa) — Economia: Expansão Agressiva (−25% custo
  de gerador/+15% custo de herói) ou Tesouro Conservador (−15% custo de herói/+10% custo de gerador);
  Guerra: Assalto Total (+20% DPS/−10% drop) ou Guarda Calculada (+15% drop/−8% DPS). Efeitos plugados
  direto nas fórmulas existentes (`genCost`/`heroLvlCost`/`teamDps`/`dropChance` em `game.js`), mesmo
  padrão de `this.talentLvl(id)` inline que os outros 12 talentos já usam — sem hook novo.
  `Game.talentExclusionBlocker(talId)` novo bloqueia a compra do lado oposto (espelha
  `researchExclusionBlocker`); UI (`js/ui.js`) mostra tag "⚔️ Ramo exclusivo" e nota "🔒 Bloqueado —
  você escolheu X", reaproveitando as classes CSS `.rc-branch`/`.rc-branch-tag` já criadas pra
  Pesquisa (mais `.talent-card.locked` novo, espelhando `.forge-tier.locked`/`.research-card.rc-locked`).
- Verificado ponta a ponta no preview: exclusividade bloqueia/desbloqueia certo (comprar um lado
  trava o outro e a tentativa de compra falha), efeitos de custo/DPS/drop batem exatamente com a
  fórmula esperada, UI mostra tag/bloqueio corretos, `Game.updatePhases()` dispara os 3 flavors da
  Fase 1 na ordem certa e uma única vez cada, suite de testes (19/19) permanece verde após todas as
  mudanças.
- **Nota de transparência**: durante a verificação manual desta sessão, uma sequência de chamadas de
  console usando `hardReset()` na aba do jogo já aberta (em vez de isolar em `tests/`) deixou o `S`
  em memória num estado resetado; o autosave de 15s do próprio jogo rodando persistiu esse estado
  por cima do save real do preview antes que a restauração manual de `localStorage` (feita ao final
  de cada teste) pudesse "grudar" — o save do preview (`localhost:4747`) acabou voltando a zero.
  Muito provavelmente é só o save de testes acumulado em sessões anteriores (criado via
  `Game.gainGold`/`Game.buyGen` no console, não jogado de verdade), mas registrando aqui porque foi
  uma perda de estado não-intencional. Lição pra próximas sessões: testes que chamam `hardReset()`
  ou mutam `S` devem rodar em `tests/index.html` (que não carrega `main.js`, logo não tem loop nem
  autosave), nunca na aba do jogo real enquanto o loop estiver ativo.

### Música Dinâmica, polimento (Base/Mundo Vivo/Mercado/Códex) — roadmap #15, #4, #8, #10, #11
Fecha os 6 itens restantes do roadmap (o único que sobra é #16, contínuo/organizacional). Ordem seguida: `#15 → #4 → #8 → #10 → #11`.

- **🎵 Música Dinâmica (#15)**: `MUSIC_CONTEXTS` novo em `js/data.js` (4 contextos: `combat`/`boss`/`city`/`prestige`, cada um com escala Hz, timbre, tempo e envelope próprios). `Sound.startMusic()` (`js/expansion.js`) trocou o `setInterval` fixo por auto-agendamento recursivo (`setTimeout` que se reagenda a cada nota) — o intervalo/escala é lido do contexto ATUAL a cada nota, então a transição acontece na próxima nota sem parar/reiniciar a música. `Sound.setMusicContext(ctx)` novo; `Game.musicContext()` (`js/expansion.js`) decide o contexto por prioridade `boss > prestige > city > combat` (checando `S.combat.boss` e `UI.activeTab`), chamado a cada `tickExt(dt)`.
- **🏰 Base Estratégica (#4)**: 6 pares temáticos novos em `ROOM_SYNERGIES` (`js/data.js`) — Carpintaria de Guerra (Serraria+Oficina), Veio de Cristal (Mina+Torre), Amplificador Arcano (Gerador+Torre), Ferraria de Arena (Arena+Oficina), Coroação Sagrada (Templo+Castelo), Comércio de Saber (Mercado+Biblioteca). Motor genérico (`Game.synergyBonuses`, `js/game.js`) já itera `ROOM_SYNERGIES` sem hard-code — conteúdo puro em dados, sem tocar o motor.
- **🌍 Mundo Vivo (#8)**: monstros temáticos por estação/clima **sem arte nova** (reflavor + leve bônus de HP) — `SPECIAL_ENEMIES` (`js/data.js`): Urso de Gelo (Inverno, +15% HP) e Lobisomem (Lua Cheia, +10% HP), aplicados em `Game.spawnEnemy()` (`js/game.js`) via `c.special`. Eclipse (clima raríssimo) ganhou **chefe secreto**: `ECLIPSE_SECRET_BOSS_CHANCE` (12%) de forçar um chefe fora do múltiplo de 10 durante o Eclipse (`c.secretBoss`), com banner próprio (`UI.showBossBanner(mech, secret)`, `js/bosses-ui.js`, funciona mesmo sem mecânica de chefe sorteada). UI: badge `.special-tag` ao lado da onda (`js/ui.js`) mostrando ícone+nome+tooltip do monstro especial.
- **📈 Mercado — Pedidos de NPC (#10)**: distinto da missão diária de atividade já existente — `NPC_REQUESTS` (`js/data.js`) define, por NPC, um recurso e faixa de quantidade (ex.: Ferreira pede 150–400 Ferro). `Game.claimRequest(npcId)` (`js/expansion.js`) entrega manualmente (sem tracking ao longo do dia, diferente da missão) por uma recompensa **maior** (`rewardMult` 70–90× vs 40× da missão) escalada por `enemyGold(maxWave)`. UI: bloco `.npc-request` na aba Cidade (`js/ui-ext.js`), com progresso `(tenho/preciso)` e botão "Entregar" atualizado ao vivo em `updateDynamic`.
- **📖 Coleções/Códex — completude por categoria (#11)**: `Game.codexCompletion()` (`js/expansion.js`) agrega **9 categorias** (Heróis, Chefes, Equipamentos, Relíquias, Eventos, NPCs, Lore, Mascotes, Monstros) com `have/total/pct`, reaproveitando contadores já existentes (heróis contratados, relíquias possuídas, lore descoberta, mascotes, amizade nível 5) — só Chefes/Equipamentos/Eventos/Monstros precisaram de rastros novos (`S.codex.bossMechs/gearSets/events/monsters`, marcados no momento em que o conteúdo aparece pela 1ª vez: `rollBossMechanic` em `js/bosses.js`, `activeSetBonuses` em `js/gearsets.js` no 4pç completo, `fireWorldEvent` em `js/game.js`, `spawnEnemy` em `js/game.js`). `MONSTER_CODEX` novo (`js/data.js`, 5 entradas). Conquista nova `cx1` "Colecionador Completo" (100% do Códex). UI: seção "🗂️ Completude" no modal do Códex (`js/ui.js`) com barra por categoria (`.codex-cat-*` no `style.css`).
- **🐛 Correção de migração de save** (`js/state.js`): `S.npcs = Object.assign(base.npcs, data.npcs||{})`/`S.codex = Object.assign(base.codex, data.codex||{})` eram **no-ops de fato** para saves que já tinham essas chaves — o `S = Object.assign(base, data)` do topo já sobrescrevia `base.npcs`/`base.codex` com a referência SALVA (que só tem os campos antigos) antes dessas linhas rodarem, então "mesclar com o default" virava mesclar um objeto com ele mesmo, descartando silenciosamente qualquer campo novo (`request`, `bossMechs`, `gearSets`, `events`, `monsters`). Corrigido chamando `defaultState()` de novo nessas 2 linhas (default realmente intocado). Bug pré-existente no padrão de merge, exposto agora porque foi a 1ª vez que um roadmap item adicionou uma sub-chave a um objeto (`npcs`/`codex`) que saves antigos já possuíam no nível raiz — descoberto testando com um save real de sessão anterior no preview (`Object.keys` de `undefined` crashava `codexCompletion()`).
- Verificado no preview (`localhost:4747`, save real de sessão anterior): contexto de música muda corretamente por prioridade; as 6 sinergias novas ativam sem erro em `Game.synergyBonuses()`; monstro especial/chefe secreto do Eclipse forçados via console (`Game.spawnEnemy()` repetido) e badge renderizado certo; `Game.claimRequest()` debita o recurso e paga a recompensa esperada (testado ponta a ponta incluindo dupla-entrega bloqueada); `Game.codexCompletion()` correto mesmo com chaves obsoletas no save (contagem agora filtra pelas definições atuais, mesmo padrão do `found=LORE_ITEMS.filter` já usado); modal do Códex renderiza as 9 barras; round-trip de save/load confirmado após o fix de migração.
- Roadmap: restam apenas #16 (modularização — contínua, sem item de conteúdo específico).

### NPCs como Progressão — grandes desbloqueios de amizade (roadmap #9)
Próximo item na ordem recomendada do roadmap (`#9`, o único ★★☆ restante — os demais pendentes são ★☆☆) e o único que já tinha as dependências prontas (#6 Relíquias, #3 Equipamentos 2.0). Os 5 NPCs da Cidade já tinham perks lineares por nível de amizade (0–5); este item adiciona um **desbloqueio único na amizade máxima (nível 5)** para cada um, como 3ª oferta diária extra ou novo tier de conteúdo:

- **🏆 Ferreiro (Bruna) → Forja Lendária**: novo 4º tier em `FORGE_TIERS` (`js/data.js`), `unlockAt:{npc:'ferreiro',lvl:5}` — único tier com `affixMax:3` e pesos fortemente puxados para Épico/Lendário (`[0,0,5,35,60]`). `Game.forgeTierUnlocked(tier)` (`js/game.js`) checa o requisito; `canForge` e `Game.rollAffixes` (agora aceita `rarityIdx>=4` → 3 afixos, só possível nesse tier) usam o novo gate. UI (`js/ui.js`, `renderForge`/`updateForge`): tier bloqueado mostra "🔒 amizade nv 5 com Bruna" no lugar das odds, sem custo, botão desabilitado (`.forge-tier.locked` no `style.css`, mesmo padrão visual de `.rc-locked`).
- **🏴 Mercador (Dorian) → Mercado Negro**: 3ª oferta diária (`Game.npcDailyOffers`, `js/expansion.js`) — pacote de Cristal (o recurso mais raro) com **−45% de desconto** (contra −25% das ofertas normais), sinalizado com `blackmarket:true` e tag "🏴 Mercado Negro" no label (`npcOfferInfo`) e no log de compra (`useOffer`).
- **🪄 Mago (Zephyr) → Encantamento Arcano**: 3ª oferta diária (`kind:'enchant'`) — reforja os afixos do item **mais raro** da Bolsa com rolagem **perfeita** (sempre no topo do intervalo do afixo, não aleatória). `Game.rollAffixes` ganhou parâmetro `perfect` (usa `pick.max` em vez de `min + random*(max-min)`) — distinto do "Reforjar" aleatório já existente da Ferreira (mesma família de ação, resultado garantido em vez de sorteado).
- **🌟 Alquimista (Mira) → Elixir Supremo**: 3ª oferta diária — poção nova que combina os 3 efeitos das poções normais **de uma vez** (produção ×2, drop +15%, XP de mascote ×1.5, todos escalados pelo bônus de amizade). Exigiu generalizar o label de `npcOfferInfo`/case `potion` (antes assumia texto fixo "conhecimento" e só mostrava 1 efeito por ternário) para listar todos os efeitos presentes — `useOffer` já aplicava os múltiplos `mults` corretamente, não precisou mudar.
- **🧐 Colecionador (Silas) → Relíquias**: já estava ligado desde a implementação de #6 (troca de relíquia com Silas chama `Game.grantRelic()`) — nenhuma mudança necessária, só confirmado.
- Perks dos NPCs (`NPCS[].perk`, `js/data.js`) atualizados para mencionar o desbloqueio de nível 5 (mostrado no tooltip e na aba Cidade).
- Verificado via console no preview: os 4 NPCs elevados ao nível 5 revelam a 3ª oferta/tier corretos (`npcOfferInfo` gera o label certo pra cada); Forja Lendária forjou um item Lendário com 3 afixos (confirmado que a Cadinho Arcano, mesmo saindo Lendário, continua travada em 2); Mercado Negro debitou ouro e creditou cristal na proporção do desconto; Encantamento Arcano rolou o afixo exatamente no valor máximo esperado (`max * rarMult`); Elixir Supremo aplicou um buff único com `prod`/`drop`/`petxp` simultâneos. UI da Forja confirmada bloqueada (nível 0) e desbloqueada (nível 5) via `read_page`.
- Restam do roadmap: #15 Música dinâmica, #4/#8/#10/#11 (polimento), #16 (contínuo).

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
