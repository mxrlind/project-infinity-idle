# Features — Project Infinity Idle

Documentação completa de todas as funcionalidades implementadas, organizadas por sistema. Números e fórmulas refletem `js/data.js` e `js/game.js` no estado atual do projeto.

## Índice

1. [Progressão por Fases](#1-progressão-por-fases)
2. [Economia e Clique](#2-economia-e-clique)
3. [Geradores](#3-geradores)
4. [Upgrades](#4-upgrades)
5. [Heróis e Combate](#5-heróis-e-combate)
6. [Equipamentos](#6-equipamentos)
7. [Base (Salas)](#7-base-salas)
8. [Talentos](#8-talentos)
9. [Prestígio (Essência)](#9-prestígio-essência)
10. [Eventos Mundiais](#10-eventos-mundiais)
11. [Moedas Douradas](#11-moedas-douradas)
12. [Conquistas](#12-conquistas)
13. [NPCs e Narrativa](#13-npcs-e-narrativa)
14. [Save, Offline e Persistência](#14-save-offline-e-persistência)
15. [Áudio](#15-áudio)
16. [Interface e Feedback Visual](#16-interface-e-feedback-visual)
17. [Segredos](#17-segredos)

---

## 1. Progressão por Fases

O jogo é dividido em fases que desbloqueiam progressivamente, com base no **ouro ganho na run atual** (`S.earned`, zerado a cada prestígio — mas as fases desbloqueadas permanecem, não é preciso re-desbloquear após prestigiar).

| # | Nome | Gatilho | O que desbloqueia |
|---|------|---------|--------------------|
| 1 | O Despertar | início | Clique, geradores, upgrades |
| 2 | Chamado às Armas | 2.500 ouro | Aba Heróis, combate automático, equipamentos |
| 3 | Fundações | 200 mil ouro | Aba Base (salas) |
| 4 | Iluminação | 10 milhões | Aba Talentos |
| 5 | Transcendência | 500 milhões | Aba Prestígio |
| 6 | Convergência | 5 bilhões (ou 1º prestígio, o que vier primeiro) | Eventos mundiais |
| 7 | ??? | 500 bilhões | Teaser: aba "🔒???" aparece na navegação com dica do Mestre Aldric |
| 8 | ??? | 100 trilhões | Reservado para conteúdo futuro (Megaprojetos) |

Cada desbloqueio dispara: uma fala do **Mestre Aldric** nas Crônicas, um toast "🔓 Novo sistema desbloqueado!", um efeito sonoro e a exibição da nova aba na navegação. A lógica vive em `Game.updatePhases()`.

O badge de fase no topo (`#phase-badge`) mostra sempre a fase mais alta já atingida, com numeração romana (I–VIII).

---

## 2. Economia e Clique

- **Ouro** é o recurso central; toda ação de compra consome ouro (exceto talentos, que usam Conhecimento).
- **Poder de clique**: começa em 1 e é multiplicado por upgrades de clique, pelo talento *Mãos Rápidas* (+25%/nível) e pela Essência (+2%/ponto). Upgrades do tipo `clickProd` (Toque de Midas, Mão do Infinito) somam uma fração da produção/s ao valor do clique, fazendo o clique escalar junto com a produção passiva em vez de ficar obsoleto.
- **Clique também ataca inimigos**: na aba Heróis, clicar no monstro causa dano igual a `max(1, DPS_do_time × 0.05 + poder_de_clique × 0.5)`.
- Números exibidos usam sufixos (K, Mi, Bi, Tri, Qa, Qi, Sx, Sp, Oc, No, Dc...) e caem para notação científica além disso — ver `js/format.js`.

---

## 3. Geradores

11 geradores de ouro passivo, cada um com custo exponencial (×1.15 por unidade comprada) e produção base fixa. Ficam visíveis na aba **Produção** assim que o jogador tem ~40% do custo do próximo.

| Gerador | Custo base | Produção/un. | Observação |
|---|---:|---:|---|
| 🪙 Aprendiz Coletor | 15 | 0.5/s | primeiro gerador |
| ⛏️ Mina de Ouro | 100 | 4/s | |
| 🏪 Mercado | 1.2 K | 32/s | |
| 🔥 Forja | 14 K | 240/s | |
| 🏦 Banco Anão | 160 K | 1.8 K/s | |
| 🏛️ Templo Dourado | 1.9 Mi | 14 K/s | |
| 🗼 Torre Arcana | 24 Mi | 115 K/s | |
| 🌀 Portal Dimensional | 320 Mi | 1 Mi/s | |
| ⏳ Santuário do Tempo | 4.5 Bi | 9.5 Mi/s | |
| 🌌 Motor Cósmico | 68 Bi | 95 Mi/s | |
| 🕳️ Singularidade | 1.2 Tri | 1.4 Bi/s | **requer 1º prestígio** |

**Marco de quantidade**: a cada **25 unidades** de um mesmo gerador, sua produção dobra (×2 cumulativo — 50 unidades = ×4, 75 = ×8...). Isso é anunciado no log e por toast.

**Compra em lote**: seletor ×1 / ×10 / Máx acima da lista. "Máx" calcula quantas unidades cabem no ouro atual, resolvido analiticamente (soma geométrica em fórmula fechada — sem teto artificial).

**Desconto de custo**: o talento *Barganha* reduz o custo de todos os geradores em 1.5%/nível (até -15% no nível máximo).

---

## 4. Upgrades

31 upgrades no total, comprados uma única vez cada, agrupados em 4 tipos:

- **5 de clique** (`type: click` ou `clickProd`): multiplicam o poder de clique direto (×2, ×3, ×4) ou somam uma % da produção/s ao clique (Toque de Midas +1%, Mão do Infinito +4%).
- **21 específicos de gerador** (`type: gen`): 2 por gerador (exceto Singularidade, que tem só 1), cada um multiplicando a produção daquele gerador por ×2 ou ×3.
- **5 globais** (`type: global`): multiplicam **toda** a produção — +10%, +15%, +20%, +25%, +30%.

Upgrades só aparecem na lista quando o jogador já tem ~25% do custo (ou, para os de gerador, já possui pelo menos 1 unidade daquele gerador) — a lista mostra os 9 mais baratos disponíveis por vez, para não sobrecarregar a tela.

---

## 5. Heróis e Combate

7 heróis contratáveis, cada um com nome, título, ícone, retrato ilustrado, história e falas próprias que aparecem nas Crônicas. O retrato aparece em tons de cinza até o herói ser contratado, e colorido depois (`img/heroes/`).

| Herói | Título | Custo | DPS base |
|---|---|---:|---:|
| 🛡️ Bran | Escudeiro Teimoso | 200 | 4 |
| 🏹 Lyra | Arqueira do Crepúsculo | 4 K | 22 |
| 🔮 Magnus | Mago Distraído | 90 K | 160 |
| 🪓 Thora | Berserker Sorridente | 2.2 Mi | 1.3 K |
| 🗡️ Vex | Assassino Pontual | 60 Mi | 11 K |
| ✨ Seraphine | Paladina Radiante | 1.8 Bi | 95 K |
| 💀 Nyx | Necromante Aposentada | 80 Bi | 1.1 Mi | **requer 1º prestígio** |

**Combate é 100% automático**: o time inteiro ataca o inimigo atual continuamente (`DPS do time × dt` a cada tick). O jogador só precisa contratar, nivelar e equipar — clicar no inimigo é um bônus opcional de dano extra.

- **Nível de herói**: custo cresce ×1.08 por nível; DPS do herói = `DPS_base × nível × 2^⌊nível/25⌋ × multiplicador_de_equipamento`. Ou seja, marco a cada 25 níveis também dobra o DPS daquele herói.
- **DPS do time** = soma do DPS de todos os heróis, multiplicado por: `(1 + 10%×nível do Quartel) × (1 + 10%×talento Fúria) × (1 + 1%×conquistas) × buffs ativos`.
- **Ondas**: o inimigo atual sobe de onda a cada abate. HP do inimigo = `15 × 1.45^(onda-1)`, ×9 se for chefe. Cada onda exibe uma ilustração de monstro (8 inimigos comuns alternando em ciclo, mais uma arte exclusiva de chefe) em vez de um emoji.
- **Chefes**: aparecem a cada onda múltipla de 10. Têm um cronômetro (30s + 3s por nível do talento *Paciência*) — se não forem derrotados a tempo, o time recua para "treinar" (5 abates de inimigos normais antes de desafiar o chefe de novo).
- **Recompensa de ouro por abate** = `4 × 1.42^(onda-1)`, ×14 se for chefe, ×3 durante invasões, +8%/nível do talento *Caçador*.
- **Materiais**: a partir da onda 12, há 30% de chance de ganhar pedra/ferro por abate; chefes a partir da onda 30 têm 40% de chance de dropar 1 Cristal.
- **Falas espontâneas**: heróis têm 25% de chance de comentar algo após derrotar um chefe, e sempre falam ao atingir um marco de nível (25, 50, 75...) ou ao serem contratados.

---

## 6. Equipamentos

Cada herói tem 2 slots: **Arma** 🗡️ e **Amuleto** 📿. Equipamentos só vêm de drops (chefes, ou do Mercador Errante).

**5 raridades**, com peso de sorteio e poder de bônus:

| Raridade | Cor | Peso relativo | Poder base |
|---|---|---:|---:|
| Comum | cinza | 50 | +8% |
| Incomum | verde | 28 | +15% |
| Raro | azul | 14 | +30% |
| Épico | roxo | 6 | +60% |
| Lendário | dourado | 2 | +120% |

- **Chance de drop de chefe**: `35% + 5%/nível da Oficina + 4%/nível do talento Pilhagem` (máx. 95%).
- Ondas mais altas aumentam a chance de raridades Épico/Lendário (bônus de peso até ×3 na onda 200+).
- O bônus final de um item = `poder_da_raridade × (1 + onda/40) × variação_aleatória_de_±15%`.
- **Auto-equip inteligente**: ao dropar, o item só substitui o equipado se for **estritamente melhor**; caso contrário é vendido automaticamente por `5× a recompensa de ouro da onda atual`.
- O bônus de DPS de cada peça equipada é amplificado por `1 + 10%/nível da Oficina`.

---

## 7. Base (Salas)

8 salas construíveis, cada uma melhorável indefinidamente (custo cresce por um multiplicador próprio por nível). Custos podem exigir ouro + madeira/pedra/ferro.

| Sala | Efeito por nível | Custo inicial | Multiplicador |
|---|---|---|---:|
| 🪵 Serraria | +2 madeira/s | 50 mil ouro | ×1.70 |
| ⛰️ Mina Profunda | +1.5 pedra/s, +0.5 ferro/s | 120 mil ouro + 50 madeira | ×1.70 |
| ⚡ Gerador | +1 energia/s, +8% produção das salas | 400 mil ouro + madeira/pedra | ×1.80 |
| 🧪 Laboratório | +0.2 conhecimento/s (para Talentos) | 1 Mi ouro + pedra/ferro | ×1.80 |
| 🏰 Quartel | +10% DPS dos heróis | 800 mil ouro + madeira/ferro | ×1.75 |
| 📚 Biblioteca | +15% de conhecimento | 2.5 Mi ouro + madeira/pedra | ×1.80 |
| 🔧 Oficina | +5% chance de drop, +10% poder de equip. | 5 Mi ouro + ferro | ×1.80 |
| 💰 Cofre-Forte | +6% de produção de ouro | 10 Mi ouro + pedra/ferro | ×1.85 |

O **Gerador** é multiplicativo sobre a produção de madeira/pedra/ferro/energia das outras salas (`+8%/nível`), tornando-o prioritário cedo. O **Laboratório** é a única fonte de Conhecimento, o recurso usado nos Talentos — sem ele, a aba de Talentos fica bloqueada mesmo desbloqueada.

---

## 8. Talentos

3 árvores, custeadas em **Conhecimento** (produzido pelo Laboratório). 12 talentos no total, cada um com um teto de níveis próprio.

### 💰 Economia
| Talento | Máx | Efeito/nível |
|---|---:|---|
| Ganância | 20 | +5% produção de ouro |
| Mãos Rápidas | 10 | +25% poder de clique |
| Barganha | 10 | -1.5% custo dos geradores |
| Sonho Lucrativo | 10 | +10% ganho offline |

### ⚔️ Guerra
| Talento | Máx | Efeito/nível |
|---|---:|---|
| Fúria | 20 | +10% DPS |
| Caçador | 10 | +8% ouro de monstros |
| Paciência | 5 | +3s no tempo de chefes |
| Pilhagem | 10 | +4% chance de drop |

### 🔮 Arcano
| Talento | Máx | Efeito/nível |
|---|---:|---|
| Sabedoria | 10 | +10% conhecimento |
| Transcendência | 10 | +5% ganho de Essência |
| Fortuna | 10 | +10% frequência de eventos e moedas douradas |
| Harmonia | 10 | +3% produção global por prestígio já realizado |

Custo de cada nível = `custo_base × 1.9^nível_atual` (arredondado para cima). Nenhuma árvore é obrigatória — builds diferentes (econômica, militar, arcana) são todas viáveis.

---

## 9. Prestígio (Essência)

Disponível a partir da Fase 5 (500 Mi de ouro ganho na run).

- **Ganho de Essência** = `⌊(ouro_ganho_na_run / 100 milhões)^0.45⌋`, ajustado por `+5%/nível` do talento *Transcendência*. Só é possível prestigiar com ganho ≥ 1 (ou seja, ouro_ganho_na_run ≥ 100 Mi).
- **Cada ponto de Essência dá +2% de produção global permanente**, empilhado com todos os outros multiplicadores.
- **Ao prestigiar, é resetado**: ouro, geradores, upgrades, heróis, salas e recursos de madeira/pedra/ferro/energia/cristal.
- **É mantido**: Essência, contador de prestígios, conquistas, talentos, conhecimento acumulado, fases já desbloqueadas, estatísticas de combate/tempo/cliques.
- A ação pede confirmação explícita (modal) antes de executar, já que é irreversível na run atual.
- Prestigiar desbloqueia automaticamente a Fase 6 (eventos mundiais) mesmo que o limiar de ouro ainda não tenha sido atingido.
- A Singularidade (gerador) e Nyx (herói) só ficam disponíveis após o 1º prestígio.

---

## 10. Eventos Mundiais

Disponíveis a partir da Fase 6. Um evento aleatório dispara a cada **160–340 segundos** (mais frequente com o talento *Fortuna*). 5 tipos:

| Evento | Efeito |
|---|---|
| ☄️ Meteorito! | Ganho instantâneo de pedra e ferro (escala com a maior onda alcançada) |
| 🎪 Festival | Produção de ouro ×2 por 2 minutos |
| 🧙 Mercador Errante | Oferece um pacto por 15% do ouro atual (mín. 100): 45% chance de produção ×3 por 4 min, 35% chance de DPS ×4 por 4 min, 20% chance de equipamento misterioso |
| 👹 Invasão! | Os próximos 15 inimigos derrotados valem ×3 de ouro |
| 🌕 Lua Vermelha | DPS ×3 por 90 segundos |

Eventos aparecem em um banner no topo da tela e também são registrados nas Crônicas.

---

## 11. Moedas Douradas

Ativas **desde o início do jogo** (não depende de fase). Uma moeda 🌟 aparece em posição aleatória no painel central a cada **70–220 segundos** (mais frequente com *Fortuna*) e some sozinha após 13 segundos se não for clicada.

Ao clicar:
- 50% de chance: ouro instantâneo = `max(poder_de_clique × 150, produção/s × 90)`.
- 50% de chance: **Frenesi Dourado** — produção ×7 por 30 segundos.

---

## 12. Conquistas

43 conquistas em 8 categorias, cada uma concedendo **+1% de produção global permanente** ao ser desbloqueada (empilha linearmente — 43/43 = +43%).

| Categoria | Quantidade | Exemplos |
|---|---:|---|
| Produção | 13 | marcos de ouro total (1 mil → 1 sextilhão), quantidade de geradores, cliques totais |
| Combate | 10 | monstros/chefes derrotados, onda máxima, heróis contratados/nivelados |
| Base | 3 | níveis de salas construídos |
| Sabedoria | 3 | níveis de talentos aprendidos |
| Prestígio | 4 | número de prestígios, Essência acumulada |
| Exploração | 3 | moedas douradas coletadas, eventos testemunhados |
| Tempo | 3 | tempo total jogado (30 min / 5h / 24h) |
| Segredos | 4 | ver [seção 17](#17-segredos) — aparecem como "???" até serem desbloqueadas |

A verificação roda a cada 2 segundos (`Game.checkAchievements`), então o delay entre cumprir o requisito e ver o toast é mínimo.

---

## 13. NPCs e Narrativa

- **Mestre Aldric** 🧙‍♂️ é o conselheiro/tutorial: fala nas Crônicas sempre que uma nova fase é desbloqueada, guiando o jogador para o próximo sistema (heróis → base → talentos → prestígio → eventos → teaser da fase 7).
- Cada um dos 7 heróis tem uma **história de fundo** (1 frase, visível antes de ser contratado) e um conjunto de **3 falas** que aparecem: ao ser contratado, ao atingir um marco de nível, e aleatoriamente (25% de chance) após vencer um chefe.
- O log de **Crônicas** (painel esquerdo) mantém as últimas 60 mensagens — compras, conquistas, falas, eventos, prestígio.

---

## 14. Save, Offline e Persistência

- **Save automático** a cada 15 segundos, mais em `beforeunload` e ao esconder a aba (`visibilitychange`).
- **Progresso offline**: ao voltar após ≥60 segundos fora (até um teto de 12h), o jogo calcula produção de ouro, conhecimento e materiais de sala à **50% da taxa normal** (melhorável até 100% com o talento *Sonho Lucrativo*, +10%/nível) e mostra um modal de boas-vindas com o resumo do que foi ganho.
- **Exportar/Importar**: na aba Ajustes, o save inteiro pode ser exportado como uma string Base64 (para backup manual ou transferência entre navegadores) e reimportado depois.
- **Reset completo**: apaga literalmente tudo (diferente do prestígio, que preserva Essência/conquistas/talentos) — pede confirmação dupla.
- Estado é armazenado em `localStorage` sob a chave `project-infinity-idle-save`.

---

## 15. Áudio

Todo o áudio é **sintetizado via Web Audio API** (osciladores simples) — não há arquivos de som. Cada ação tem um "acorde" próprio (2–5 tons com pequenos atrasos): clique, compra, upgrade, contratação de herói, conquista, drop de equipamento, moeda dourada, desbloqueio de fase, evento mundial, prestígio (arpejo de 5 notas), construção de sala. Pode ser silenciado na aba Ajustes.

---

## 16. Interface e Feedback Visual

- **Arte visual**: retratos dos heróis, ilustrações dos inimigos/chefe, a moeda de clique e a textura de fundo usam artes estáticas em `img/` (ver [ARCHITECTURE.md](ARCHITECTURE.md#assets-visuais-img)) — o resto da interface (geradores, upgrades, salas, talentos, conquistas) permanece em emoji.
- **Painel esquerdo fixo**: ouro atual + taxa/s, botão de clique (moeda de ouro ilustrada), poder de clique, recursos da base (aparecem só quando relevantes), buffs ativos com cronômetro, e o log de Crônicas.
- **Abas centrais**: Produção, Heróis, Base, Talentos, Prestígio, Conquistas, Ajustes — cada uma só aparece na navegação quando desbloqueada; abas bloqueadas mostram "🔒???" com tooltip.
- **Seletor de quantidade (×1 / ×10 / Máx)**: compartilhado entre a compra de geradores e o nivelamento de heróis. "Máx" sempre mostra o custo total real e a quantidade real que será comprada — não uma estimativa de 1 unidade.
- **Números flutuantes**: ganhos de ouro/dano aparecem subindo e desaparecendo no ponto do clique.
- **Toasts**: notificações temporárias no canto inferior direito (conquistas, marcos, desbloqueios).
- **Banner de evento**: aparece no topo durante eventos mundiais, incluindo um botão de ação para o Mercador Errante.
- **Modais**: confirmação (prestígio, reset), boas-vindas offline, exportar/importar save.

---

## 17. Segredos

> Pule esta seção se não quiser spoilers.

- Clicar no **título do jogo** 42 vezes desbloqueia a conquista secreta "A Resposta".
- Possuir **exatamente 77 unidades** de qualquer gerador desbloqueia "Número da Sorte".
- Comprar a primeira **Singularidade** desbloqueia "O Vazio Olha de Volta".
- Ficar **10 minutos sem clicar na moeda** (com o jogo aberto) desbloqueia "Paciência de Monge".

Todas ficam listadas como "???" na aba Conquistas até serem desbloqueadas.
