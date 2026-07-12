// ===== Dados do jogo =====

// ---- Fases de progressão (desbloqueadas por ouro ganho na run, permanentes) ----
const PHASES = [
  { id: 1, name: 'O Despertar',       at: 0 },
  { id: 2, name: 'Chamado às Armas',  at: 2500 },        // heróis + combate
  { id: 3, name: 'Fundações',         at: 200e3 },       // base
  { id: 4, name: 'Iluminação',        at: 10e6 },        // talentos
  { id: 5, name: 'Transcendência',    at: 500e6 },       // prestígio
  { id: 6, name: 'Convergência',      at: 5e9 },         // eventos mundiais
  { id: 7, name: '???',               at: 500e9 },       // teaser guildas
  { id: 8, name: '???',               at: 100e12 },      // teaser megaprojetos
];

// ---- Geradores de ouro ----
const GENERATORS = [
  { id: 'aprendiz',   name: 'Aprendiz Coletor',    icon: '🪙', baseCost: 15,     prod: 0.5,   flavor: 'Cata moedas do chão com entusiasmo questionável.' },
  { id: 'mina',       name: 'Mina de Ouro',        icon: '⛏️', baseCost: 100,    prod: 4,     flavor: 'Buracos que cospem riqueza.' },
  { id: 'mercado',    name: 'Mercado',             icon: '🏪', baseCost: 1.2e3,  prod: 32,    flavor: 'Compre barato, venda caro, repita.' },
  { id: 'forja',      name: 'Forja',               icon: '🔥', baseCost: 14e3,   prod: 240,   flavor: 'Transforma suor em barras douradas.' },
  { id: 'banco',      name: 'Banco Anão',          icon: '🏦', baseCost: 160e3,  prod: 1.8e3, flavor: 'Juros compostos, literalmente escavados.' },
  { id: 'templo',     name: 'Templo Dourado',      icon: '🏛️', baseCost: 1.9e6,  prod: 14e3,  flavor: 'Dízimos fluem em uma só direção.' },
  { id: 'torre',      name: 'Torre Arcana',        icon: '🗼', baseCost: 24e6,   prod: 115e3, flavor: 'Transmuta tédio em ouro puro.' },
  { id: 'portal',     name: 'Portal Dimensional',  icon: '🌀', baseCost: 320e6,  prod: 1e6,   flavor: 'Importa riqueza de universos falidos.' },
  { id: 'santuario',  name: 'Santuário do Tempo',  icon: '⏳', baseCost: 4.5e9,  prod: 9.5e6, flavor: 'Cobra aluguel do passado e do futuro.' },
  { id: 'motor',      name: 'Motor Cósmico',       icon: '🌌', baseCost: 68e9,   prod: 95e6,  flavor: 'Gira galáxias. As galáxias pagam.' },
  { id: 'singular',   name: 'Singularidade',       icon: '🕳️', baseCost: 1.2e12, prod: 1.4e9, flavor: 'Nem a luz escapa. O ouro muito menos.', reqPrestige: 1 },
];
const GEN_COST_MULT = 1.15;
const GEN_MILESTONE = 25; // a cada 25 unidades, produção ×2

// ---- Upgrades ----
// type: 'click' (mult clique) | 'gen' (mult gerador) | 'global' (mult produção) | 'clickProd' (% da produção/s por clique)
const UPGRADES = [
  { id: 'luva1',   name: 'Luvas de Couro',       icon: '🧤', cost: 100,    type: 'click', mult: 2,    desc: 'Poder de clique ×2' },
  { id: 'luva2',   name: 'Luvas de Ferro',       icon: '🥊', cost: 2.5e3,  type: 'click', mult: 3,    desc: 'Poder de clique ×3' },
  { id: 'luva3',   name: 'Punhos Arcanos',       icon: '✊', cost: 120e3,  type: 'click', mult: 4,    desc: 'Poder de clique ×4' },
  { id: 'luva4',   name: 'Toque de Midas',       icon: '👑', cost: 40e6,   type: 'clickProd', pct: 0.01, desc: 'Cada clique ganha +1% da sua produção/s' },
  { id: 'luva5',   name: 'Mão do Infinito',      icon: '🌠', cost: 15e9,   type: 'clickProd', pct: 0.04, desc: 'Cada clique ganha +4% da sua produção/s' },

  { id: 'apr1',    name: 'Botas Novas',          icon: '👢', cost: 400,    type: 'gen', gen: 'aprendiz', mult: 2, desc: 'Aprendizes ×2' },
  { id: 'apr2',    name: 'Café Forte',           icon: '☕', cost: 8e3,    type: 'gen', gen: 'aprendiz', mult: 3, desc: 'Aprendizes ×3' },
  { id: 'mina1',   name: 'Picaretas de Aço',     icon: '⚒️', cost: 2e3,    type: 'gen', gen: 'mina', mult: 2, desc: 'Minas ×2' },
  { id: 'mina2',   name: 'Dinamite',             icon: '🧨', cost: 60e3,   type: 'gen', gen: 'mina', mult: 3, desc: 'Minas ×3' },
  { id: 'merc1',   name: 'Balanças Honestas*',   icon: '⚖️', cost: 25e3,   type: 'gen', gen: 'mercado', mult: 2, desc: 'Mercados ×2' },
  { id: 'merc2',   name: 'Rota de Caravanas',    icon: '🐪', cost: 700e3,  type: 'gen', gen: 'mercado', mult: 3, desc: 'Mercados ×3' },
  { id: 'forja1',  name: 'Foles Encantados',     icon: '💨', cost: 280e3,  type: 'gen', gen: 'forja', mult: 2, desc: 'Forjas ×2' },
  { id: 'forja2',  name: 'Fogo de Dragão',       icon: '🐉', cost: 9e6,    type: 'gen', gen: 'forja', mult: 3, desc: 'Forjas ×3' },
  { id: 'banco1',  name: 'Cofres Duplos',        icon: '🔐', cost: 3.2e6,  type: 'gen', gen: 'banco', mult: 2, desc: 'Bancos ×2' },
  { id: 'banco2',  name: 'Juros Malignos',       icon: '📈', cost: 90e6,   type: 'gen', gen: 'banco', mult: 3, desc: 'Bancos ×3' },
  { id: 'temp1',   name: 'Relíquias Sagradas',   icon: '📿', cost: 38e6,   type: 'gen', gen: 'templo', mult: 2, desc: 'Templos ×2' },
  { id: 'temp2',   name: 'Milagres Pagos',       icon: '🙏', cost: 1.1e9,  type: 'gen', gen: 'templo', mult: 3, desc: 'Templos ×3' },
  { id: 'torre1',  name: 'Grimórios Raros',      icon: '📕', cost: 480e6,  type: 'gen', gen: 'torre', mult: 2, desc: 'Torres ×2' },
  { id: 'torre2',  name: 'Pacto Estelar',        icon: '⭐', cost: 14e9,   type: 'gen', gen: 'torre', mult: 3, desc: 'Torres ×3' },
  { id: 'port1',   name: 'Âncoras Dimensionais', icon: '⚓', cost: 6.4e9,  type: 'gen', gen: 'portal', mult: 2, desc: 'Portais ×2' },
  { id: 'port2',   name: 'Alfândega do Vazio',   icon: '🛃', cost: 180e9,  type: 'gen', gen: 'portal', mult: 3, desc: 'Portais ×3' },
  { id: 'sant1',   name: 'Ampulheta Reversa',    icon: '⌛', cost: 90e9,   type: 'gen', gen: 'santuario', mult: 2, desc: 'Santuários ×2' },
  { id: 'sant2',   name: 'Dívida Temporal',      icon: '🕰️', cost: 2.6e12, type: 'gen', gen: 'santuario', mult: 3, desc: 'Santuários ×3' },
  { id: 'motor1',  name: 'Combustível Estelar',  icon: '☄️', cost: 1.4e12, type: 'gen', gen: 'motor', mult: 2, desc: 'Motores ×2' },
  { id: 'motor2',  name: 'Marcha Galáctica',     icon: '🌀', cost: 40e12,  type: 'gen', gen: 'motor', mult: 3, desc: 'Motores ×3' },
  { id: 'sing1',   name: 'Horizonte Duplo',      icon: '🌑', cost: 24e12,  type: 'gen', gen: 'singular', mult: 2, desc: 'Singularidades ×2' },

  { id: 'glob1',   name: 'Contabilidade Élfica', icon: '📜', cost: 50e3,   type: 'global', mult: 1.1,  desc: 'Toda produção +10%' },
  { id: 'glob2',   name: 'Bênção do Comércio',   icon: '🕊️', cost: 5e6,    type: 'global', mult: 1.15, desc: 'Toda produção +15%' },
  { id: 'glob3',   name: 'Sinergia Industrial',  icon: '⚙️', cost: 600e6,  type: 'global', mult: 1.2,  desc: 'Toda produção +20%' },
  { id: 'glob4',   name: 'Ordem Dourada',        icon: '🏵️', cost: 80e9,   type: 'global', mult: 1.25, desc: 'Toda produção +25%' },
  { id: 'glob5',   name: 'Lei da Abundância',    icon: '♾️', cost: 10e12,  type: 'global', mult: 1.3,  desc: 'Toda produção +30%' },
];

// ---- Heróis (NPCs com personalidade) ----
// kingdom/element (#2 Sinergia de Composição): camadas ORTOGONAIS extras a class/archetype/role,
// usadas só por TEAM_SYNERGIES (ver abaixo). solar=4 heróis (bran+sera+io+kael, o quarteto exato
// cabe nos FIELD_SLOTS), selvagem=3 (thora+vex+nyx), arcano=3 (magnus+lyra+orin).
const HEROES = [
  { id: 'bran', name: 'Bran', title: 'Escudeiro Teimoso', icon: '🛡️', baseCost: 200, baseDps: 4, class: 'tank', archetype: 'paladino', role: 'tank', kingdom: 'solar', element: 'sagrado',
    story: 'Ex-fazendeiro que decidiu que porcos não revidam, mas monstros sim.',
    lines: ['Meu escudo já foi uma porta de celeiro. Ainda range.', 'Se eu cair, me levantem. De novo.', 'Um dia serei cavaleiro. Hoje, aparo pancadas.'] },
  { id: 'lyra', name: 'Lyra', title: 'Arqueira do Crepúsculo', icon: '🏹', baseCost: 4e3, baseDps: 22, class: 'dps', archetype: 'arqueiro', role: 'duelista', kingdom: 'arcano', element: 'sombra',
    story: 'Nunca errou um alvo. Uma vez errou de propósito e ainda se arrepende.',
    lines: ['Vejo o ponto fraco daqui.', 'Uma flecha, uma história encerrada.', 'O vento me deve favores.'] },
  { id: 'magnus', name: 'Magnus', title: 'Mago Distraído', icon: '🔮', baseCost: 90e3, baseDps: 160, class: 'support', archetype: 'mago', role: 'mago', kingdom: 'arcano', element: 'fogo',
    story: 'Esqueceu mais feitiços do que a maioria dos magos aprendeu. Alguns explodem sozinhos.',
    lines: ['Hmm? Ah sim, a bola de fogo. Onde deixei mesmo...', 'A magia é 90% memória. Estou perdido.', 'Isso vai fazer BUM. Provavelmente.'] },
  { id: 'thora', name: 'Thora', title: 'Berserker Sorridente', icon: '🪓', baseCost: 2.2e6, baseDps: 1.3e3, class: 'dps', archetype: 'duelista', role: 'berserker', kingdom: 'selvagem', element: 'raio',
    story: 'Sorri durante a batalha. Os inimigos acham isso profundamente perturbador.',
    lines: ['HAHA! Mais! MAIS!', 'Meu machado tem nome: Segunda-feira.', 'Dor é só fraqueza fazendo cócegas.'] },
  { id: 'vex', name: 'Vex', title: 'Assassino Pontual', icon: '🗡️', baseCost: 60e6, baseDps: 11e3, class: 'dps', archetype: 'assassino', role: 'assassino', kingdom: 'selvagem', element: 'sombra',
    story: 'Chega sempre três segundos antes do necessário. Ninguém sabe como.',
    lines: ['Você não me viu. Ninguém nunca vê.', 'Contratos são sagrados. Alvos, nem tanto.', '...', ], },
  { id: 'sera', name: 'Seraphine', title: 'Paladina Radiante', icon: '✨', baseCost: 1.8e9, baseDps: 95e3, class: 'support', archetype: 'paladino', role: 'bardo', kingdom: 'solar', element: 'sagrado',
    story: 'Sua luz cega aliados desavisados. Ela pede desculpas. Sempre.',
    lines: ['A luz cobra caro, mas paga em dobro.', 'Perdão pela claridade. De novo.', 'Nenhuma sombra resiste para sempre.'] },
  { id: 'nyx', name: 'Nyx', title: 'Necromante Aposentada', icon: '💀', baseCost: 80e9, baseDps: 1.1e6, reqPrestige: 1, class: 'tank', archetype: 'necromante', role: 'necromante', kingdom: 'selvagem', element: 'sombra',
    story: 'Saiu da aposentadoria porque o plano de previdência do Além faliu.',
    lines: ['Os mortos trabalham de graça. Aprendam.', 'Aposentadoria era tediosa demais.', 'Todo fim é só um contrato renovável.'] },
  { id: 'io', name: 'Io', title: 'Golem de Areia Antiga', icon: '🗿', baseCost: 3.2e12, baseDps: 1.4e7, reqPrestige: 2, class: 'tank', archetype: 'paladino', role: 'tank', kingdom: 'solar', element: 'sagrado',
    story: 'Construído para guardar um templo que ninguém mais lembra onde fica. Ainda guarda.',
    lines: ['Areia não esquece. Eu também não.', 'Mil anos de pé. Nem uma rachadura.', 'Templo? Que templo?'] },
  { id: 'kael', name: 'Kael', title: 'Duelista Relâmpago', icon: '⚡', baseCost: 1.1e14, baseDps: 1.8e8, reqPrestige: 2, class: 'dps', archetype: 'duelista', role: 'duelista', kingdom: 'solar', element: 'raio',
    story: 'Vence duelos antes do oponente perceber que começaram.',
    lines: ['Já acabou. Você só não viu.', 'Rápido demais pra ter medo.', 'Relâmpago não erra duas vezes.'] },
  { id: 'orin', name: 'Orin', title: 'Bardo do Fim dos Tempos', icon: '🕊️', baseCost: 3.8e15, baseDps: 2.3e9, reqPrestige: 3, class: 'support', archetype: 'mago', role: 'bardo', kingdom: 'arcano', element: 'gelo',
    story: 'Canta a mesma canção desde antes do primeiro prestígio. Ainda não chegou ao refrão.',
    lines: ['Essa música ainda não acabou. Nem vai.', 'Toda batalha precisa de trilha sonora.', 'Já vi isso terminar. E recomeçar.'] },
];
const KINGDOMS = {
  solar:    { name: 'Reino Solar',    icon: '☀️', color: '#e8a33d' },
  selvagem: { name: 'Reino Selvagem', icon: '🐺', color: '#7ec98a' },
  arcano:   { name: 'Reino Arcano',   icon: '🔮', color: '#8f6fd8' },
};
const HERO_LVL_COST_MULT = 1.08;
const HERO_MILESTONE = 25; // a cada 25 níveis, DPS ×2

// ---- Classes e Campo de Batalha (sinergia de time) ----
// Cada herói pertence a uma classe. Só heróis alocados num slot de campo lutam (fieldSlot !== null);
// o resto fica na Reserva, sem contribuir DPS. O bônus de sinergia cresce conforme a composição
// do campo se aproxima da proporção-alvo (1 tank : 2 dps : 1 suporte) — contínuo, não binário.
const HERO_CLASSES = {
  tank:    { name: 'Tanque',  icon: '🛡️', color: '#4fa8d8' },
  dps:     { name: 'Dano',    icon: '⚔️', color: '#ff6b5e' },
  support: { name: 'Suporte', icon: '✨', color: '#5fbf6b' },
};
const FIELD_SLOTS = 4;
const SYNERGY_TARGET = { tank: 0.25, dps: 0.5, support: 0.25 };
const SYNERGY_MAX_BONUS = 0.30; // (legado) compat com saves — a sinergia agora é um medidor 0–100%

// ---- Especialização de classe (Arquétipo + Arma ideal) ----
// Cada herói tem um ARQUÉTIPO com uma ARMA IDEAL. Ao equipar (no slot 'arma') um item cujo
// wtype casa com a arma ideal, o herói ganha um PACOTE de especialização (multiplicadores que
// escalam com a RARIDADE da arma). Arma incompatível → só os atributos-base do item, sem bônus.
// Isso faz o jogador pensar em qual arma forjar para cada herói (não basta equipar qualquer coisa).
const WEAPON_TYPES = [
  { id: 'espada',   name: 'Espada',   icon: '⚔️' },
  { id: 'cajado',   name: 'Cajado',   icon: '🪄' },
  { id: 'arco',     name: 'Arco',     icon: '🏹' },
  { id: 'martelo',  name: 'Martelo',  icon: '🔨' },
  { id: 'adaga',    name: 'Adaga',    icon: '🗡️' },
  { id: 'grimorio', name: 'Grimório', icon: '📖' },
];
// migração: itens antigos guardavam só o ícone — mapeia ícone → tipo para não perder especialização
const WEAPON_ICON_TO_TYPE = { '🗡️': 'adaga', '⚔️': 'espada', '🪄': 'cajado', '🔨': 'martelo', '🏹': 'arco', '📖': 'grimorio' };

// spec: frações-base (escaladas pela raridade da arma em Game.specScale: Comum×1 … Lendário×3)
//   dps  → DPS só deste herói      team → aura de DPS p/ todo o time   gold → ouro por abate
//   crit → chance de crítico       mat  → chance de material           speed → +DPS (ataques rápidos)
//   boss → +DPS extra (dano em área, sabor)   special → mecânica literal no combate
const ARCHETYPES = {
  duelista:   { name: 'Duelista',   icon: '⚔️', weapon: 'espada',
    spec: { dps: 0.60, team: 0.05, speed: 0.10 }, special: 'double',
    perks: ['Grande aumento de Ataque', 'Chance de ataque duplo ao clicar', 'Pequeno bônus de velocidade'] },
  mago:       { name: 'Mago',       icon: '🔮', weapon: 'cajado',
    spec: { dps: 0.70, speed: 0.12, boss: 0.20 }, special: 'aoe',
    perks: ['Muito mais Poder Mágico', 'Menor tempo entre ataques', 'Dano em área (bônus contra chefes)'] },
  arqueiro:   { name: 'Arqueiro',   icon: '🏹', weapon: 'arco',
    spec: { dps: 0.45, crit: 0.10, gold: 0.06 }, special: 'crit',
    perks: ['Maior Chance Crítica', 'Maior Alcance (+ouro por abate)', 'Ataques mais rápidos'] },
  paladino:   { name: 'Paladino',   icon: '🛡️', weapon: 'martelo',
    spec: { dps: 0.30, team: 0.12, gold: 0.05 }, special: 'aura',
    perks: ['Aura que reforça TODO o time', 'Defesa elevada (presença protetora)', 'Bênção de ouro'] },
  assassino:  { name: 'Assassino',  icon: '🗡️', weapon: 'adaga',
    spec: { dps: 0.55, crit: 0.12, speed: 0.10 }, special: 'execute',
    perks: ['Muito crítico', 'Ataques extremamente rápidos', 'Executa inimigos com pouca vida'] },
  necromante: { name: 'Necromante', icon: '💀', weapon: 'grimorio',
    spec: { dps: 0.65, mat: 0.10, team: 0.05 }, special: 'summon',
    perks: ['Invocações mais fortes (+DPS)', 'Mais dano mágico', 'Colhe os caídos (+materiais)'] },
};

// ---- Papéis de combate (ROLE) ----
// Camada ORTOGONAL à classe/arquétipo: define a FUNÇÃO real de cada herói no combate.
// A classe (tank/dps/support) ainda alimenta o medidor de Sinergia; o arquétipo ainda decide a
// arma ideal. O role decide COMO o herói contribui no motor (ver Game.roleDpsMult / teamRoleEffects).
//   combat.selfDps → modificador do DPS PRÓPRIO do herói (pode ser negativo: tanques/bardos batem pouco)
//   combat.teamDps → aura: +% de DPS de TODO o time (somado entre heróis em campo)
//   combat.crit    → +chance de crítico do time (compartilha o teto FORGE_CRIT_CAP; vale no clique E no DPS idle)
//   combat.gold    → +ouro por abate      combat.research → +velocidade de pesquisa
//   combat.bossTime→ +segundos no tempo-limite de chefes (por herói)
//   combat.execute → executa inimigos comuns abaixo desta fração de vida
//   combat.aoe     → +DPS próprio em ondas comuns (dano em área; some contra chefe)
//   combat.armorPen→ o DPS deste herói ignora a armadura de chefes (semente para Chefes Inteligentes)
//   combat.summon  → invoca mortos: DPS EXTRA separado = DPS próprio × summon × (exército cresce c/ abates)
//   combat.rage    → +DPS próprio por segundo de luta (reseta ao abater); combat.rageMax = teto em segundos
const HERO_ROLES = {
  tank:       { name: 'Tanque',     icon: '🛡️', color: '#4fa8d8',
    tagline: 'Muralha: segura os chefes e concentra o fogo do time.',
    combat: { selfDps: -0.35, teamDps: 0.08, bossTime: 6 },
    perks: ['Provocação: +8% de DPS de todo o time', 'Segura os chefes: +6s no tempo-limite', 'Dano próprio baixo — é um protetor, não um atacante'] },
  duelista:   { name: 'Duelista',   icon: '⚔️', color: '#ff6b5e',
    tagline: 'Alvo único: dano cirúrgico, crítico e velocidade.',
    combat: { selfDps: 0.60, crit: 0.06 },
    perks: ['+60% de DPS próprio', '+6% de chance de crítico para o time', 'Domina o duelo de alvo único'] },
  mago:       { name: 'Mago',       icon: '🔮', color: '#b06fd8',
    tagline: 'Dano mágico: ignora armadura e atinge em área.',
    combat: { selfDps: 0.45, aoe: 0.30, armorPen: true },
    perks: ['+45% de DPS mágico próprio', '+30% de dano em ondas comuns (área)', 'Ignora a armadura de chefes blindados'] },
  assassino:  { name: 'Assassino',  icon: '🗡️', color: '#c7c7d6',
    tagline: 'Frágil e explosivo: crítico altíssimo e execução.',
    combat: { selfDps: 0.35, crit: 0.12, execute: 0.12 },
    perks: ['+35% de DPS próprio', '+12% de chance de crítico para o time', 'Executa inimigos comuns abaixo de 12% de vida'] },
  necromante: { name: 'Necromante', icon: '💀', color: '#5fbf6b',
    tagline: 'Invoca mortos: um exército que dá DPS separado.',
    combat: { selfDps: 0.20, summon: 0.50 },
    perks: ['+20% de DPS próprio', 'Invoca mortos: DPS EXTRA separado do time', 'O exército fica mais forte a cada abate'] },
  bardo:      { name: 'Bardo',      icon: '🎵', color: '#e8a33d',
    tagline: 'Maestro: pouco dano, mas fortalece todo o grupo.',
    combat: { selfDps: -0.50, teamDps: 0.14, gold: 0.10, research: 0.15 },
    perks: ['+14% de DPS de TODO o time', '+10% de ouro por abate', '+15% de velocidade de pesquisa'] },
  berserker:  { name: 'Berserker',  icon: '🪓', color: '#d84f4f',
    tagline: 'Fúria crescente: quanto mais longa a luta, mais forte.',
    combat: { selfDps: 0.20, rage: 0.05, rageMax: 24 },
    perks: ['Acumula fúria a cada segundo de luta (+5%/s)', 'No auge: +120% de DPS próprio', 'Devastador contra chefes (lutas longas)'] },
};

// ---- Sinergia de time (medidor 0–100%) ----
// A % é derivada de: composição de classes (40) + campo cheio (25) + heróis com arma ideal (35).
// Cada faixa concede um bônus PROGRESSIVO em um sistema diferente; 100% ativa o Estado Perfeito.
const SYNERGY_TIERS = [
  { at: 20,  label: '+5% Ataque',        key: 'atk',  icon: '⚔️' },
  { at: 40,  label: '+10% Ouro/abate',   key: 'gold', icon: '💰' },
  { at: 60,  label: '+15% Produção',     key: 'prod', icon: '🏭' },
  { at: 80,  label: '+20% Sabedoria',    key: 'know', icon: '📘' },
  { at: 100, label: 'ESTADO PERFEITO',   key: 'mega', icon: '🌟' },
];
const SYNERGY_TIER_VAL = { atk: 0.05, gold: 0.10, prod: 0.15, know: 0.20 };
const SYNERGY_MEGA = { atk: 0.50, gold: 0.50, prod: 0.50, know: 0.50 }; // buff de 100%: tudo +50%
const SYNERGY_WEIGHTS = { comp: 40, fill: 25, spec: 35 };

// ---- Sinergia de Composição (#2) ----
// ORTOGONAL ao medidor 0–100% acima: conta reino/elemento/arma dos heróis EM CAMPO (não depende de
// gear equipado) e ativa bônus extra quando o time se agrupa em torno de um tema. `when` tem uma
// única chave (kingdom|element|weapon|roles) + `count` mínimo entre os FIELD_SLOTS heróis em campo.
// `roles` é especial: conta PAPÉIS distintos (não um papel específico), premia times versáteis.
// bonus.dps/gold/research/crit somam direto no mesmo acumulador de Game._roleEff (teamDps/gold/research/crit).
const TEAM_SYNERGIES = [
  { id: 'reino_solar',    name: 'Ordem Solar',          icon: '☀️', when: { kingdom: 'solar',    count: 4 }, bonus: { gold: 0.25 },
    desc: 'Bran + Sera + Io + Kael em campo: +25% de ouro por abate.' },
  { id: 'reino_selvagem', name: 'Alcateia Selvagem',    icon: '🐺', when: { kingdom: 'selvagem', count: 3 }, bonus: { dps: 0.20 },
    desc: '3 heróis do Reino Selvagem em campo: +20% de DPS de todo o time.' },
  { id: 'reino_arcano',   name: 'Círculo Arcano',       icon: '🔮', when: { kingdom: 'arcano',   count: 3 }, bonus: { research: 0.20 },
    desc: '3 heróis do Reino Arcano em campo: +20% de velocidade de pesquisa.' },
  { id: 'sombra_x3',      name: 'Manto das Sombras',    icon: '🌑', when: { element: 'sombra',   count: 3 }, bonus: { crit: 0.15 },
    desc: '3 heróis do elemento Sombra em campo: +15% de crítico do time.' },
  { id: 'sagrado_x3',     name: 'Círculo Sagrado',      icon: '✨', when: { element: 'sagrado',  count: 3 }, bonus: { dps: 0.15 },
    desc: '3 heróis do elemento Sagrado em campo: +15% de DPS de todo o time.' },
  { id: 'raio_x2',        name: 'Duo Fulminante',       icon: '⚡', when: { element: 'raio',     count: 2 }, bonus: { dps: 0.10 },
    desc: '2 heróis do elemento Raio em campo: +10% de DPS de todo o time.' },
  { id: 'martelo_x3',     name: 'Linha de Frente',      icon: '🔨', when: { weapon: 'martelo',   count: 3 }, bonus: { gold: 0.10 },
    desc: '3 heróis de Martelo (arma ideal) em campo: +10% de ouro por abate.' },
  { id: 'equilibrado',    name: 'Esquadrão Equilibrado', icon: '⚖️', when: { roles: true,          count: 4 }, bonus: { dps: 0.10, gold: 0.10, research: 0.10 },
    desc: '4 papéis de combate DIFERENTES em campo: pequeno bônus em DPS, ouro e pesquisa.' },
];

// ---- Salas da Base ----
const ROOMS = [
  { id: 'serraria',   name: 'Serraria',    icon: '🪵', desc: '+2 madeira/s por nível',                     baseCost: { gold: 50e3 },                          costMult: 1.7 },
  { id: 'mina_r',     name: 'Mina Profunda', icon: '⛰️', desc: '+1,5 pedra/s e +0,5 ferro/s por nível',   baseCost: { gold: 120e3, madeira: 50 },            costMult: 1.7 },
  { id: 'gerador',    name: 'Gerador',     icon: '⚡', desc: '+1 energia/s e +8% produção das salas por nível', baseCost: { gold: 400e3, madeira: 120, pedra: 80 }, costMult: 1.8 },
  { id: 'lab',        name: 'Laboratório', icon: '🧪', desc: '+0,2 conhecimento/s por nível (para Talentos)', baseCost: { gold: 1e6, pedra: 150, ferro: 40 },  costMult: 1.8 },
  { id: 'quartel',    name: 'Quartel',     icon: '🏰', desc: '+10% de DPS dos heróis por nível',           baseCost: { gold: 800e3, madeira: 200, ferro: 60 }, costMult: 1.75 },
  { id: 'biblioteca', name: 'Biblioteca',  icon: '📚', desc: '+15% de conhecimento por nível',             baseCost: { gold: 2.5e6, madeira: 300, pedra: 200 }, costMult: 1.8 },
  { id: 'oficina',    name: 'Oficina',     icon: '🔧', desc: '+5% chance de drop e +10% poder de equipamentos por nível', baseCost: { gold: 5e6, ferro: 120 }, costMult: 1.8 },
  { id: 'cofre',      name: 'Cofre-Forte', icon: '💰', desc: '+6% de produção de ouro por nível',          baseCost: { gold: 10e6, pedra: 400, ferro: 200 },  costMult: 1.85 },
  // ---- Edifícios avançados (Fase da Base viva) ----
  { id: 'mercado',    name: 'Mercado',     icon: '🏪', desc: 'Renda de ouro PASSIVA por nível (escala com sua maior onda)', baseCost: { gold: 6e6, madeira: 250 },       costMult: 1.8 },
  { id: 'templo',     name: 'Templo',      icon: '⛩️', desc: '+4% de produção GLOBAL por nível (buff da Base)',  baseCost: { gold: 25e6, pedra: 600, cristal: 3 },  costMult: 1.9 },
  { id: 'torre',      name: 'Torre Arcana', icon: '🗼', desc: '+8% de DPS mágico do time por nível',            baseCost: { gold: 40e6, ferro: 400, cristal: 5 },  costMult: 1.9 },
  { id: 'arena',      name: 'Arena',       icon: '🏟️', desc: '+12% de ouro de chefes e +2s no tempo de chefe por nível', baseCost: { gold: 60e6, pedra: 800, ferro: 300 }, costMult: 1.9 },
  { id: 'castelo',    name: 'Castelo',     icon: '🏯', desc: 'Multiplicador GERAL: +10% em todas as sinergias e edifícios da Base por nível', baseCost: { gold: 120e6, madeira: 500, pedra: 500, ferro: 500 }, costMult: 2.0 },
];

// ---- Grade da Base ----
// Topologia FIXA (mesma em todas as telas) — as sinergias dependem de quem é vizinho de quem,
// então a grade não pode mudar de forma conforme o tamanho do dispositivo.
const BASE_GRID_COLS = 4;
const BASE_GRID_ROWS = 4;           // 16 células para 13 salas + 3 vagas para arranjar sinergias

// Sinergias de vizinhança: quando duas salas construídas (nível ≥ 1) ficam ortogonalmente
// adjacentes na grade, elas ativam um bônus que escala com o MENOR nível entre as duas.
// `type` define onde o bônus entra no motor (ver Game.synergyBonuses).
const ROOM_SYNERGIES = [
  { a: 'quartel',    b: 'oficina',    type: 'dps',       per: 0.04, icon: '⚔️', name: 'Arsenal',           short: '+DPS dos heróis' },
  { a: 'gerador',    b: 'lab',        type: 'knowledge', per: 0.05, icon: '🔌', name: 'Rede Elétrica',      short: '+Conhecimento/s' },
  { a: 'lab',        b: 'biblioteca', type: 'knowledge', per: 0.05, icon: '🎓', name: 'Academia',           short: '+Conhecimento/s' },
  { a: 'serraria',   b: 'mina_r',     type: 'material',  per: 0.06, icon: '⛏️', name: 'Distrito Minerador', short: '+Coleta de recursos' },
  { a: 'cofre',      b: 'gerador',    type: 'gold',      per: 0.05, icon: '💵', name: 'Tesouraria',         short: '+Produção de ouro' },
  { a: 'oficina',    b: 'mina_r',     type: 'equip',     per: 0.05, icon: '🛠️', name: 'Metalurgia',         short: '+Poder de equipamento' },
  { a: 'cofre',      b: 'quartel',    type: 'gold',      per: 0.04, icon: '🏴', name: 'Espólio de Guerra',  short: '+Produção de ouro' },
  { a: 'biblioteca', b: 'oficina',    type: 'equip',     per: 0.04, icon: '📐', name: 'Engenharia',         short: '+Poder de equipamento' },
  // ---- Sinergias dos edifícios avançados ----
  { a: 'mercado',    b: 'cofre',      type: 'gold',      per: 0.06, icon: '🏦', name: 'Bolsa de Valores',   short: '+Produção de ouro' },
  { a: 'templo',     b: 'biblioteca', type: 'knowledge', per: 0.05, icon: '📜', name: 'Escritório Sagrado', short: '+Conhecimento/s' },
  { a: 'torre',      b: 'lab',        type: 'knowledge', per: 0.06, icon: '🔭', name: 'Observatório',        short: '+Conhecimento/s' },
  { a: 'arena',      b: 'quartel',    type: 'dps',       per: 0.05, icon: '🎪', name: 'Coliseu',            short: '+DPS dos heróis' },
  { a: 'torre',      b: 'templo',     type: 'dps',       per: 0.05, icon: '🔮', name: 'Convergência Arcana', short: '+DPS dos heróis' },
  { a: 'castelo',    b: 'quartel',    type: 'dps',       per: 0.05, icon: '👑', name: 'Guarda Real',        short: '+DPS dos heróis' },
  { a: 'castelo',    b: 'mercado',    type: 'gold',      per: 0.05, icon: '💎', name: 'Cofres Reais',       short: '+Produção de ouro' },
  // ---- Roadmap #4: pares temáticos adicionais ----
  { a: 'serraria',   b: 'oficina',    type: 'equip',     per: 0.04, icon: '🪚', name: 'Carpintaria de Guerra', short: '+Poder de equipamento' },
  { a: 'mina_r',     b: 'torre',      type: 'dps',       per: 0.04, icon: '💠', name: 'Veio de Cristal',    short: '+DPS dos heróis' },
  { a: 'gerador',    b: 'torre',      type: 'dps',       per: 0.05, icon: '🌀', name: 'Amplificador Arcano', short: '+DPS dos heróis' },
  { a: 'arena',      b: 'oficina',    type: 'equip',     per: 0.05, icon: '🏹', name: 'Ferraria de Arena',  short: '+Poder de equipamento' },
  { a: 'templo',     b: 'castelo',    type: 'material',  per: 0.05, icon: '⛲', name: 'Coroação Sagrada',   short: '+Coleta de recursos' },
  { a: 'mercado',    b: 'biblioteca', type: 'gold',      per: 0.04, icon: '📊', name: 'Comércio de Saber',  short: '+Produção de ouro' },
];
const SYNERGY_LABELS = { gold: 'ouro', dps: 'DPS', knowledge: 'conhecimento', material: 'recursos', equip: 'equipamento' };

// ---- Talentos (3 árvores, custam Conhecimento) ----
const TALENTS = [
  // Economia
  { id: 'ganancia',  tree: 'eco', name: 'Ganância',        icon: '🤑', max: 20, baseCost: 5,  desc: '+5% produção de ouro por nível' },
  { id: 'maos',      tree: 'eco', name: 'Mãos Rápidas',    icon: '🖐️', max: 10, baseCost: 4,  desc: '+25% poder de clique por nível' },
  { id: 'barganha',  tree: 'eco', name: 'Barganha',        icon: '🪙', max: 10, baseCost: 8,  desc: '-1,5% custo dos geradores por nível' },
  { id: 'sonho',     tree: 'eco', name: 'Sonho Lucrativo', icon: '😴', max: 10, baseCost: 6,  desc: '+10% ganho offline por nível' },
  // Guerra
  { id: 'furia',     tree: 'war', name: 'Fúria',           icon: '😤', max: 20, baseCost: 5,  desc: '+10% DPS por nível' },
  { id: 'cacador',   tree: 'war', name: 'Caçador',         icon: '🎯', max: 10, baseCost: 6,  desc: '+8% ouro de monstros por nível' },
  { id: 'paciencia', tree: 'war', name: 'Paciência',       icon: '🧘', max: 5,  baseCost: 10, desc: '+3s no tempo de chefes por nível' },
  { id: 'pilhagem',  tree: 'war', name: 'Pilhagem',        icon: '💎', max: 10, baseCost: 8,  desc: '+4% chance de drop por nível' },
  // Arcano
  { id: 'sabedoria', tree: 'arc', name: 'Sabedoria',       icon: '🦉', max: 10, baseCost: 6,  desc: '+10% conhecimento por nível' },
  { id: 'transcend', tree: 'arc', name: 'Transcendência',  icon: '🌟', max: 10, baseCost: 12, desc: '+5% ganho de Essência por nível' },
  { id: 'fortuna',   tree: 'arc', name: 'Fortuna',         icon: '🍀', max: 10, baseCost: 8,  desc: 'Eventos e moedas douradas +10% mais frequentes por nível' },
  { id: 'harmonia',  tree: 'arc', name: 'Harmonia',        icon: '☯️', max: 10, baseCost: 15, desc: '+3% produção global por prestígio realizado, por nível' },
  // ---- Trade-offs reais (AUDIT item 8): pares mutuamente exclusivos, 1 nível só — escolher um
  // tranca o outro pra sempre nesta run, mesmo mecanismo `exclusiveWith` do roadmap #5 (Pesquisa),
  // só que decidido bem mais cedo (Talentos custam Conhecimento, disponível desde a Fase 4).
  { id: 'expansao_agressiva', tree: 'eco', name: 'Expansão Agressiva', icon: '📈', max: 1, baseCost: 40,
    desc: '−25% custo de geradores · +15% custo de heróis', exclusiveWith: ['tesouro_conservador'] },
  { id: 'tesouro_conservador', tree: 'eco', name: 'Tesouro Conservador', icon: '🪙', max: 1, baseCost: 40,
    desc: '−15% custo de heróis · +10% custo de geradores', exclusiveWith: ['expansao_agressiva'] },
  { id: 'assalto_total', tree: 'war', name: 'Assalto Total', icon: '🗡️', max: 1, baseCost: 50,
    desc: '+20% DPS · −10% chance de drop', exclusiveWith: ['guarda_calculada'] },
  { id: 'guarda_calculada', tree: 'war', name: 'Guarda Calculada', icon: '🛡️', max: 1, baseCost: 50,
    desc: '+15% chance de drop · −8% DPS', exclusiveWith: ['assalto_total'] },
];
const TALENT_TREES = { eco: { name: 'Economia', icon: '💰' }, war: { name: 'Guerra', icon: '⚔️' }, arc: { name: 'Arcano', icon: '🔮' } };
const TALENT_COST_MULT = 1.9;

// ---- Raridades de equipamento ----
const RARITIES = [
  { name: 'Comum',     color: '#9a9a8e', weight: 50, power: 0.08 },
  { name: 'Incomum',   color: '#5fbf6b', weight: 28, power: 0.15 },
  { name: 'Raro',      color: '#4fa8d8', weight: 14, power: 0.30 },
  { name: 'Épico',     color: '#b06fd8', weight: 6,  power: 0.60 },
  { name: 'Lendário',  color: '#e8a33d', weight: 2,  power: 1.20 },
];
const GEAR_SLOTS = [
  { id: 'arma',    name: 'Arma',    icons: ['🗡️', '⚔️', '🪄', '🔨', '🏹'] },
  { id: 'amuleto', name: 'Amuleto', icons: ['📿', '🧿', '💍', '🔱', '🪬'] },
];

// ---- Forja de Armas (loop ativo de craft: gastar recursos → revelar carta → equipar/desmanchar) ----
// Cada tier é uma aposta de risco×recompensa: custa mais (ouro escalado pela onda + ferro/cristais),
// mas melhora as odds de raridade e a quantidade de afixos. Odds são pesos relativos por raridade
// (índices casam com RARITIES: [Comum, Incomum, Raro, Épico, Lendário]).
//   goldMult  → custo em ouro = enemyGold(maiorOnda) × goldMult  (auto-escala, nunca fica obsoleto)
//   ferro/cristal → custo fixo em materiais (materiais também escalam com a onda ao dropar)
//   affixMax  → teto de afixos que a carta pode receber (raridade decide quantos, até esse teto)
const FORGE_TIERS = [
  { id: 'bancada',  name: 'Bancada',        icon: '🔨', goldMult: 8,   ferro: 6,  cristal: 0,  weights: [58, 32, 9, 1, 0],   affixMax: 1 },
  { id: 'fornalha', name: 'Fornalha',       icon: '⚒️', goldMult: 32,  ferro: 20, cristal: 1,  weights: [10, 34, 38, 15, 3], affixMax: 2 },
  { id: 'cadinho',  name: 'Cadinho Arcano', icon: '🌋', goldMult: 120, ferro: 55, cristal: 6,  weights: [0, 8, 32, 42, 18],  affixMax: 2 },
  // NPCs como Progressão (#9): desbloqueada na amizade máxima (nv 5) com a Ferreira (Bruna) —
  // único tier com affixMax 3, e só ele chega lá (rollAffixes só concede a 3ª peça em raridade Lendária).
  { id: 'lendaria', name: 'Forja Lendária', icon: '🏆', goldMult: 400, ferro: 150, cristal: 25, weights: [0, 0, 5, 35, 60],  affixMax: 3, unlockAt: { npc: 'ferreiro', lvl: 5 } },
];

// Afixos = a camada de "build". Valores são frações (0.10 = +10%). O roll final escala com a raridade.
//   scope 'hero'   → afeta só o herói que porta o item (aplicado em heroGearMult)
//   scope 'global' → agregado em cache (Game.gearBonus) e aplicado uma vez no sistema correspondente
const FORGE_AFFIXES = [
  { type: 'dps',  name: 'Afiada',     icon: '⚔️', scope: 'hero',   min: 0.06, max: 0.14, tip: 'DPS deste herói' },
  { type: 'team', name: 'Estandarte', icon: '🚩', scope: 'global', min: 0.03, max: 0.08, tip: 'DPS de todo o time' },
  { type: 'gold', name: 'Cobiça',     icon: '💰', scope: 'global', min: 0.05, max: 0.12, tip: 'ouro por abate' },
  { type: 'crit', name: 'Letal',      icon: '🎯', scope: 'global', min: 0.04, max: 0.10, tip: 'chance de crítico (×3) ao clicar no inimigo' },
  { type: 'mat',  name: 'Garimpo',    icon: '⛏️', scope: 'global', min: 0.06, max: 0.15, tip: 'chance de material por abate' },
];
const FORGE_CRIT_MULT = 3;      // dano do clique crítico
const FORGE_CRIT_CAP = 0.75;    // teto de chance de crítico (anti power-creep)
const FORGE_SCRAP_FERRO = 0.4;  // fração do ferro devolvida ao desmanchar
const FORGE_INVENTORY_CAP = 24; // teto de cartas na Bolsa (evita acúmulo infinito)

// ---- Conjuntos de Equipamento + Elementos (Equipamentos 2.0) ----
// Um item pode pertencer a um SET (2 peças equipadas entre os heróis do time = bônus, 4 peças = especial)
// e/ou carregar um ELEMENTO (afixo elemental, roda junto com os afixos normais em FORGE_AFFIXES).
// Chefes com mecânica (BOSS_MECHANICS) dropam preferencialmente peças do seu set temático.
const GEAR_SETS = [
  { id: 'dragao',  name: 'Conjunto Dragão',  icon: '🐉', bonus2: { dps: 0.20 },  bonus4: { special: 'burn',      dps: 0.15 }, desc4: 'Ataques causam queimadura (dano contínuo extra)' },
  { id: 'sombrio', name: 'Conjunto Sombrio', icon: '🌑', bonus2: { crit: 0.08 }, bonus4: { special: 'lifesteal', crit: 0.06 }, desc4: 'Roubo de vida: abates curam levemente o combate' },
  { id: 'golem',   name: 'Conjunto Golem',   icon: '🗿', bonus2: { team: 0.10 }, bonus4: { special: 'armorpen',  team: 0.08 }, desc4: 'DPS do time ignora armadura de chefes blindados' },
];
const ELEMENTS = [
  { id: 'fogo',    name: 'Fogo',    icon: '🔥', color: '#ff6b5e' },
  { id: 'gelo',    name: 'Gelo',    icon: '❄️', color: '#4fa8d8' },
  { id: 'raio',    name: 'Raio',    icon: '⚡', color: '#e8d83d' },
  { id: 'sagrado', name: 'Sagrado', icon: '✨', color: '#ffd700' },
  { id: 'sombra',  name: 'Sombra',  icon: '🌑', color: '#8f6fd8' },
];
// afixos elementais: mesma forma dos FORGE_AFFIXES (scope 'hero'), mas guardam `element` pra colorir o chip
const FORGE_ELEMENT_AFFIXES = [
  { type: 'dps', element: 'fogo',    name: 'Flamejante', icon: '🔥', scope: 'hero', min: 0.05, max: 0.12, tip: 'DPS deste herói (Fogo)' },
  { type: 'dps', element: 'gelo',    name: 'Glacial',    icon: '❄️', scope: 'hero', min: 0.05, max: 0.12, tip: 'DPS deste herói (Gelo)' },
  { type: 'dps', element: 'raio',    name: 'Fulminante', icon: '⚡', scope: 'hero', min: 0.05, max: 0.12, tip: 'DPS deste herói (Raio)' },
  { type: 'dps', element: 'sagrado', name: 'Radiante',   icon: '✨', scope: 'hero', min: 0.05, max: 0.12, tip: 'DPS deste herói (Sagrado)' },
  { type: 'dps', element: 'sombra',  name: 'Umbrio',     icon: '🌑', scope: 'hero', min: 0.05, max: 0.12, tip: 'DPS deste herói (Sombra)' },
];
const GEAR_SET_DROP_CHANCE = 0.35; // ao dropar/forjar um item, chance de vir de um set (senão item "solto")
const GEAR_ELEMENT_CHANCE = 0.30;  // chance independente de o item também receber um afixo elemental

// ---- Mecânicas de Chefe (Chefes Inteligentes) ----
// Cada chefe (a cada onda múltipla de 10) sorteia uma mecânica dentre as elegíveis pra faixa da onda.
// `req.role` → penaliza o DPS do time se nenhum herói com esse papel estiver em campo.
// `armor` → reduz o DPS FÍSICO (heróis sem armorPen) contra este chefe; heróis com armorPen (Mago) ignoram.
// `shifting` → alterna resistência física/mágica a cada N segundos (rei_demonio).
const BOSS_MECHANICS = [
  { id: 'dragao',      name: 'Dragão Alado',   icon: '🐉', minWave: 10,
    desc: 'Voa alto — só Duelistas (alvo único ágil) o alcançam bem.',
    req: { role: 'duelista' }, penalty: 0.15, dropSet: 'dragao' },
  { id: 'golem',       name: 'Golem de Pedra', icon: '🗿', minWave: 20,
    desc: 'Blindado: só dano MÁGICO fere de verdade.',
    armor: 0.85, dropSet: 'golem' },
  { id: 'necro',       name: 'Necromante',     icon: '💀', minWave: 40,
    desc: 'Invoca esqueletos que roubam o tempo de chefe (drena 50% mais rápido).',
    summonEnemies: true, drainMult: 1.5 },
  { id: 'rei_demonio', name: 'Rei Demônio',    icon: '😈', minWave: 60,
    desc: 'Troca de resistência (física ↔ mágica) a cada 8s.',
    shifting: true, shiftEvery: 8, dropSet: 'sombrio' },
];
const BOSS_MECH_SHIFT_ARMOR = 0.6; // armadura aplicada durante a fase "física" do Rei Demônio

// ---- Relíquias (itens rarísssimos, no máx. RELIC_SLOTS equipadas, mudam a gameplay com trade-offs) ----
// effects: chaves consumidas por Game.relicEffect(key) — produto entre as relíquias equipadas (default 1).
//   gold/dps/killGold/essence/material → multiplicadores nos hooks ext*Mult já existentes
//   heroCost/genCost/roomCost/research  → idem (custos e velocidade de pesquisa)
//   drop  → bônus ADITIVO de chance de drop (mesma unidade de dropChance(), soma a extDropBonus)
//   bossHp → multiplicador de HP de chefe (hook novo extBossHpMult, único fora do padrão ext* existente)
//   eventFreq → multiplicador da frequência de eventos mundiais/moedas douradas (>1 = mais raro, é um DIVISOR de frequência)
const RELIC_SLOTS = 3;
const RELICS = [
  { id: 'ampulheta',    name: 'Ampulheta Rachada',  icon: '⏳', rarity: 4,
    desc: '+40% velocidade de pesquisa · eventos 30% mais raros',
    effects: { research: 1.40, eventFreq: 0.70 } },
  { id: 'olho_dragao',  name: 'Olho do Dragão',     icon: '🐲', rarity: 5,
    desc: 'Chefes têm +400% HP, mas a chance de drop dobra',
    effects: { bossHp: 5.0, drop: 0.35 } },
  { id: 'coroa_quebrada', name: 'Coroa Quebrada',   icon: '👑', rarity: 5,
    desc: '+80% produção de ouro · heróis custam +100% para contratar/subir nível',
    effects: { gold: 1.80, heroCost: 2.0 } },
  { id: 'martelo_titan', name: 'Martelo do Titã',   icon: '🔨', rarity: 4,
    desc: '+60% DPS do time · geradores custam +50%',
    effects: { dps: 1.60, genCost: 1.50 } },
  { id: 'anel_avareza', name: 'Anel da Avareza',    icon: '💍', rarity: 3,
    desc: '+35% chance de drop de equipamento · ouro por abate −20%',
    effects: { drop: 0.35, killGold: 0.80 } },
  { id: 'lente_colecionador', name: 'Lente do Colecionador', icon: '🔍', rarity: 3,
    desc: '+30% coleta de materiais · produção de ouro −15%',
    effects: { material: 1.30, gold: 0.85 } },
  { id: 'grimorio_proibido', name: 'Grimório Proibido', icon: '📕', rarity: 4,
    desc: '+50% ganho de Essência · produção de ouro −25%',
    effects: { essence: 1.50, gold: 0.75 } },
  { id: 'bussola_perdida', name: 'Bússola Perdida', icon: '🧭', rarity: 3,
    desc: 'Salas da Base custam −20% · DPS do time −15%',
    effects: { roomCost: 0.80, dps: 0.85 } },
  { id: 'colar_vazio', name: 'Colar do Vazio',      icon: '🖤', rarity: 5,
    desc: '+150% ouro por abate · chefes têm +200% HP',
    effects: { killGold: 2.50, bossHp: 3.0 } },
  { id: 'pena_anjo', name: 'Pena de Anjo',          icon: '🪶', rarity: 4,
    desc: 'Eventos mundiais e moedas douradas o dobro da frequência · produção de ouro −10%',
    effects: { eventFreq: 2.0, gold: 0.90 } },
  { id: 'corrente_partida', name: 'Corrente Partida', icon: '⛓️', rarity: 3,
    desc: 'Heróis custam −30% para contratar/subir nível · DPS do time −10%',
    effects: { heroCost: 0.70, dps: 0.90 } },
  { id: 'cinzas_fenix', name: 'Cinzas de Fênix',    icon: '🔥', rarity: 5,
    desc: '+60% ganho de Essência · geradores custam +80%',
    effects: { essence: 1.60, genCost: 1.80 } },
  { id: 'selo_rachado', name: 'Selo Rachado',       icon: '🩸', rarity: 4,
    desc: '+45% DPS do time · pesquisa 25% mais lenta',
    effects: { dps: 1.45, research: 0.75 } },
  { id: 'moeda_destino', name: 'Moeda do Destino',  icon: '🪙', rarity: 3,
    desc: '+35% produção de ouro e ouro por abate · chance de drop −20%',
    effects: { gold: 1.35, killGold: 1.35, drop: -0.15 } },
];

// ---- Progressão em Camadas (roadmap #13) — Ascensão acima do Prestígio ----
// Run → Prestígio (existente) → Ascensão (aqui). Cada camada superior reseta a de baixo em troca
// de uma moeda mais rara e permanente. Config centralizada aqui; motor em js/layers.js.
const ASCENSION_ESSENCE_REQ = 50;    // essência mínima acumulada pra ganhar >=1 ponto de ascensão
const ASCENSION_PRESTIGE_REQ = 10;   // prestígios necessários (na camada atual) pra liberar o botão
const ASCENSION_BONUS_PER_POINT = 0.05; // +5% produção/DPS/essência por ⬟, permanente — nunca reseta
const LAYERS = [
  { id: 'prestige', name: 'Prestígio', icon: '🌅', currency: 'essence', currencyIcon: '✦' },
  { id: 'ascension', name: 'Ascensão', icon: '🌌', currency: 'ascPoints', currencyIcon: '⬟',
    unlockAt: { prestiges: ASCENSION_PRESTIGE_REQ } },
];

// ---- Árvore do Mundo (roadmap #12) — sumidouro de longuíssimo prazo ----
// Consome essência (#13) + conhecimento — ambos persistem entre prestígios/ascensões — e madeira/cristal
// da run atual. Nível é permanente (nunca reseta, nem no prestígio nem na ascensão) e dá um bônus pequeno
// e permanente por nível; cruzar um estágio concede Pontos de Ascensão de presente, fechando o ciclo com
// #13 (drops → build → chefes → recursos → recomeço). Custos são uma aproximação inicial, ajustável por
// playtesting — mesmo espírito de "implementação parcial, por design" do #13. Motor em js/worldtree.js.
const WORLD_TREE = {
  maxLevel: 1000,
  bonusPerLevel: 0.01,   // +1% produção/DPS/essência por nível, cumulativo
  costAt(lvl) {
    return {
      essence:      Math.floor(1   * Math.pow(1.15, lvl)),
      conhecimento: Math.floor(20  * Math.pow(1.20, lvl)),
      madeira:      Math.floor(300 * Math.pow(1.28, lvl)),
      cristal:      Math.floor(25  * Math.pow(1.32, lvl)),
    };
  },
  stages: [
    { at: 0,    name: 'Broto',            icon: '🌱' },
    { at: 10,   name: 'Muda',             icon: '🌿' },
    { at: 50,   name: 'Árvore Jovem',     icon: '🌳' },
    { at: 150,  name: 'Árvore Ancestral', icon: '🌲' },
    { at: 400,  name: 'Árvore Gigante',   icon: '🌴' },
    { at: 1000, name: 'Árvore Cósmica',   icon: '🌌' },
  ],
};

// ---- Eventos mundiais (Fase 6) ----
const WORLD_EVENTS = [
  { id: 'meteoro',  name: 'Meteorito!',      icon: '☄️', desc: 'Um meteorito caiu! Pedra e ferro em abundância.', type: 'instant' },
  { id: 'festival', name: 'Festival',        icon: '🎪', desc: 'Festival na cidade! Produção ×2 por 2 minutos.', type: 'buff', dur: 120, prod: 2 },
  { id: 'mercador', name: 'Mercador Errante', icon: '🧙', desc: 'Um mercador misterioso oferece um pacto...', type: 'offer' },
  { id: 'invasao',  name: 'Invasão!',        icon: '👹', desc: 'Monstros invadem! Os próximos 15 inimigos valem ×3 ouro.', type: 'invasion', count: 15 },
  { id: 'luavermelha', name: 'Lua Vermelha', icon: '🌕', desc: 'A Lua Vermelha nasce. DPS ×3 por 90 segundos.', type: 'buff', dur: 90, dps: 3 },
];

// ---- Conquistas (cada uma: +1% produção global) ----
// check recebe (S, D) => bool  [S = estado, D = derivados]
// progress recebe (S, D) => [valorAtual, valorAlvo]  (usada pelo painel "mais perto de desbloquear")
const ACHIEVEMENTS = [
  // Produção
  { id: 'c1',  cat: 'Produção', name: 'Primeira Moeda',      icon: '🪙', desc: 'Ganhe 1.000 de ouro',        check: (S) => S.allEarned >= 1e3, progress: (S) => [S.allEarned, 1e3] },
  { id: 'c2',  cat: 'Produção', name: 'Pequena Fortuna',     icon: '💰', desc: 'Ganhe 1 milhão de ouro',     check: (S) => S.allEarned >= 1e6, progress: (S) => [S.allEarned, 1e6] },
  { id: 'c3',  cat: 'Produção', name: 'Magnata',             icon: '🎩', desc: 'Ganhe 1 bilhão de ouro',     check: (S) => S.allEarned >= 1e9, progress: (S) => [S.allEarned, 1e9] },
  { id: 'c4',  cat: 'Produção', name: 'Além da Contagem',    icon: '🌌', desc: 'Ganhe 1 trilhão de ouro',    check: (S) => S.allEarned >= 1e12, progress: (S) => [S.allEarned, 1e12] },
  { id: 'c5',  cat: 'Produção', name: 'Absurdo Matemático',  icon: '♾️', desc: 'Ganhe 1 quatrilhão de ouro', check: (S) => S.allEarned >= 1e15, progress: (S) => [S.allEarned, 1e15] },
  { id: 'c6',  cat: 'Produção', name: 'Erro de Ponto Flutuante', icon: '🤯', desc: 'Ganhe 1 sextilhão de ouro', check: (S) => S.allEarned >= 1e21, progress: (S) => [S.allEarned, 1e21] },
  { id: 'g1',  cat: 'Produção', name: 'Empregador',          icon: '📋', desc: 'Possua 10 geradores',        check: (S, D) => D.totalGens >= 10, progress: (S, D) => [D.totalGens, 10] },
  { id: 'g2',  cat: 'Produção', name: 'Industrial',          icon: '🏭', desc: 'Possua 100 geradores',       check: (S, D) => D.totalGens >= 100, progress: (S, D) => [D.totalGens, 100] },
  { id: 'g3',  cat: 'Produção', name: 'Monopólio',           icon: '🐙', desc: 'Possua 300 geradores',       check: (S, D) => D.totalGens >= 300, progress: (S, D) => [D.totalGens, 300] },
  { id: 'g4',  cat: 'Produção', name: 'Você é a Economia',   icon: '🌍', desc: 'Possua 600 geradores',       check: (S, D) => D.totalGens >= 600, progress: (S, D) => [D.totalGens, 600] },
  // Cliques
  { id: 'k1',  cat: 'Produção', name: 'Dedo Curioso',        icon: '👆', desc: 'Clique 100 vezes',           check: (S) => S.clicks >= 100, progress: (S) => [S.clicks, 100] },
  { id: 'k2',  cat: 'Produção', name: 'Tendinite Honrosa',   icon: '🖱️', desc: 'Clique 2.500 vezes',         check: (S) => S.clicks >= 2500, progress: (S) => [S.clicks, 2500] },
  { id: 'k3',  cat: 'Produção', name: 'Máquina de Cliques',  icon: '🤖', desc: 'Clique 10.000 vezes',        check: (S) => S.clicks >= 10000, progress: (S) => [S.clicks, 10000] },
  // Combate
  { id: 'w1',  cat: 'Combate',  name: 'Primeiro Sangue',     icon: '🗡️', desc: 'Derrote 1 monstro',          check: (S) => S.combat.kills >= 1, progress: (S) => [S.combat.kills, 1] },
  { id: 'w2',  cat: 'Combate',  name: 'Exterminador',        icon: '⚔️', desc: 'Derrote 250 monstros',       check: (S) => S.combat.kills >= 250, progress: (S) => [S.combat.kills, 250] },
  { id: 'w3',  cat: 'Combate',  name: 'Lenda do Campo',      icon: '🏆', desc: 'Derrote 2.000 monstros',     check: (S) => S.combat.kills >= 2000, progress: (S) => [S.combat.kills, 2000] },
  { id: 'b1',  cat: 'Combate',  name: 'Caçador de Chefes',   icon: '👑', desc: 'Derrote 1 chefe',            check: (S) => S.combat.bossKills >= 1, progress: (S) => [S.combat.bossKills, 1] },
  { id: 'b2',  cat: 'Combate',  name: 'Pesadelo dos Tronos', icon: '💀', desc: 'Derrote 25 chefes',          check: (S) => S.combat.bossKills >= 25, progress: (S) => [S.combat.bossKills, 25] },
  { id: 'wv1', cat: 'Combate',  name: 'Marcha Implacável',   icon: '🥾', desc: 'Alcance a onda 50',          check: (S) => S.combat.maxWave >= 50, progress: (S) => [S.combat.maxWave, 50] },
  { id: 'wv2', cat: 'Combate',  name: 'Fronteira Sombria',   icon: '🌑', desc: 'Alcance a onda 150',         check: (S) => S.combat.maxWave >= 150, progress: (S) => [S.combat.maxWave, 150] },
  { id: 'h1',  cat: 'Combate',  name: 'Recrutador',          icon: '🤝', desc: 'Contrate seu primeiro herói', check: (S, D) => D.heroCount >= 1, progress: (S, D) => [D.heroCount, 1] },
  { id: 'h2',  cat: 'Combate',  name: 'Companhia Completa',  icon: '🎖️', desc: 'Contrate 6 heróis',          check: (S, D) => D.heroCount >= 6, progress: (S, D) => [D.heroCount, 6] },
  { id: 'h3',  cat: 'Combate',  name: 'Centurião',           icon: '💯', desc: 'Tenha um herói no nível 100', check: (S, D) => D.maxHeroLvl >= 100, progress: (S, D) => [D.maxHeroLvl, 100] },
  // Base
  { id: 'r1',  cat: 'Base',     name: 'Pedra Fundamental',   icon: '🧱', desc: 'Construa sua primeira sala', check: (S, D) => D.totalRooms >= 1, progress: (S, D) => [D.totalRooms, 1] },
  { id: 'r2',  cat: 'Base',     name: 'Arquiteto',           icon: '📐', desc: 'Some 15 níveis de salas',    check: (S, D) => D.totalRooms >= 15, progress: (S, D) => [D.totalRooms, 15] },
  { id: 'r3',  cat: 'Base',     name: 'Cidadela',            icon: '🏯', desc: 'Some 40 níveis de salas',    check: (S, D) => D.totalRooms >= 40, progress: (S, D) => [D.totalRooms, 40] },
  // Talentos
  { id: 't1',  cat: 'Sabedoria', name: 'Estudante',          icon: '📖', desc: 'Aprenda 1 talento',          check: (S, D) => D.totalTalents >= 1, progress: (S, D) => [D.totalTalents, 1] },
  { id: 't2',  cat: 'Sabedoria', name: 'Erudito',            icon: '🎓', desc: 'Some 20 níveis de talentos', check: (S, D) => D.totalTalents >= 20, progress: (S, D) => [D.totalTalents, 20] },
  { id: 't3',  cat: 'Sabedoria', name: 'Onisciente',         icon: '🧠', desc: 'Some 60 níveis de talentos', check: (S, D) => D.totalTalents >= 60, progress: (S, D) => [D.totalTalents, 60] },
  // Prestígio
  { id: 'p1',  cat: 'Prestígio', name: 'Renascido',          icon: '🔄', desc: 'Faça seu primeiro prestígio', check: (S) => S.prestiges >= 1, progress: (S) => [S.prestiges, 1] },
  { id: 'p2',  cat: 'Prestígio', name: 'Ciclo Eterno',       icon: '☸️', desc: 'Faça 3 prestígios',           check: (S) => S.prestiges >= 3, progress: (S) => [S.prestiges, 3] },
  { id: 'p3',  cat: 'Prestígio', name: 'Deus do Recomeço',   icon: '🌅', desc: 'Faça 10 prestígios',          check: (S) => S.prestiges >= 10, progress: (S) => [S.prestiges, 10] },
  { id: 'e1',  cat: 'Prestígio', name: 'Alma Brilhante',     icon: '✦',  desc: 'Acumule 50 de Essência',     check: (S) => S.essence >= 50, progress: (S) => [S.essence, 50] },
  // Eventos
  { id: 'ev1', cat: 'Exploração', name: 'Sorte Grande',      icon: '🌟', desc: 'Colete 1 moeda dourada',     check: (S) => S.goldenClicks >= 1, progress: (S) => [S.goldenClicks, 1] },
  { id: 'ev2', cat: 'Exploração', name: 'Caçador de Estrelas', icon: '💫', desc: 'Colete 25 moedas douradas', check: (S) => S.goldenClicks >= 25, progress: (S) => [S.goldenClicks, 25] },
  { id: 'ev3', cat: 'Exploração', name: 'Abençoado',         icon: '🔮', desc: 'Testemunhe 10 eventos mundiais', check: (S) => S.eventsSeen >= 10, progress: (S) => [S.eventsSeen, 10] },
  // Tempo
  { id: 'tm1', cat: 'Tempo',     name: 'Visitante',          icon: '⏰', desc: 'Jogue por 30 minutos (total)', check: (S) => S.playTime >= 1800, progress: (S) => [S.playTime, 1800] },
  { id: 'tm2', cat: 'Tempo',     name: 'Morador',            icon: '🏠', desc: 'Jogue por 5 horas (total)',    check: (S) => S.playTime >= 18000, progress: (S) => [S.playTime, 18000] },
  { id: 'tm3', cat: 'Tempo',     name: 'Este é meu lar agora', icon: '🛋️', desc: 'Jogue por 24 horas (total)', check: (S) => S.playTime >= 86400, progress: (S) => [S.playTime, 86400] },
  // Segredos (ocultas até desbloquear)
  { id: 's1',  cat: 'Segredos',  name: 'A Resposta',         icon: '🔢', desc: 'Clique no título do jogo 42 vezes', secret: true, check: (S) => S.titleClicks >= 42, progress: (S) => [S.titleClicks, 42] },
  { id: 's2',  cat: 'Segredos',  name: 'Número da Sorte',    icon: '🎰', desc: 'Possua exatamente 77 de um gerador', secret: true, check: (S) => S.luckyNumberSeen, progress: (S) => [S.luckyNumberSeen ? 1 : 0, 1] },
  { id: 's3',  cat: 'Segredos',  name: 'O Vazio Olha de Volta', icon: '🕳️', desc: 'Compre uma Singularidade', secret: true, check: (S) => (S.gens.singular || 0) >= 1, progress: (S) => [S.gens.singular || 0, 1] },
  { id: 's4',  cat: 'Segredos',  name: 'Paciência de Monge', icon: '🧘', desc: 'Fique 10 minutos sem clicar na moeda (com o jogo aberto)', secret: true, check: (S, D) => D.idleTime >= 600, progress: (S, D) => [D.idleTime, 600] },
  // Mascotes
  { id: 'pt1', cat: 'Mascotes',  name: 'Melhor Amigo',        icon: '🐾', desc: 'Tenha seu primeiro mascote',            check: (S) => { for (const k in S.pets.owned) return true; return false; }, progress: (S) => [Object.keys(S.pets.owned).length, 1] },
  { id: 'pt2', cat: 'Mascotes',  name: 'Metamorfose',         icon: '🦋', desc: 'Evolua um mascote (nível 25)',          check: (S) => { for (const k in S.pets.owned) if (S.pets.owned[k].lvl >= 25) return true; return false; }, progress: (S) => { let m = 0; for (const k in S.pets.owned) m = Math.max(m, S.pets.owned[k].lvl); return [m, 25]; } },
  { id: 'pt3', cat: 'Mascotes',  name: 'Alcateia Completa',   icon: '🏞️', desc: 'Tenha os 4 mascotes',                   check: (S) => Object.keys(S.pets.owned).length >= 4, progress: (S) => [Object.keys(S.pets.owned).length, 4] },
  { id: 'pt4', cat: 'Mascotes',  name: 'Banquete',            icon: '🍖', desc: 'Alimente mascotes 50 vezes',            check: (S) => S.pets.fed >= 50, progress: (S) => [S.pets.fed, 50] },
  // Pesquisa
  { id: 'rs1', cat: 'Sabedoria', name: 'Eureka',              icon: '💡', desc: 'Conclua sua primeira pesquisa',         check: (S) => { for (const k in S.research.done) return true; return false; }, progress: (S) => [Object.keys(S.research.done).length, 1] },
  { id: 'rs2', cat: 'Sabedoria', name: 'Renascentista',       icon: '🎨', desc: 'Conclua 10 pesquisas',                  check: (S) => Object.keys(S.research.done).length >= 10, progress: (S) => [Object.keys(S.research.done).length, 10] },
  { id: 'rs3', cat: 'Sabedoria', name: 'Singularidade Mental', icon: '🧠', desc: 'Conclua todas as pesquisas possíveis (ramos exclusivos contam só um lado)', check: (S) => Object.keys(S.research.done).length >= RESEARCH_MAX_COMPLETABLE, progress: (S) => [Object.keys(S.research.done).length, RESEARCH_MAX_COMPLETABLE] },
  // Mercado / Cidade
  { id: 'mk1', cat: 'Exploração', name: 'Primeira Barganha',  icon: '🤝', desc: 'Faça uma transação no Mercado',         check: (S) => S.market.stats.trades >= 1, progress: (S) => [S.market.stats.trades, 1] },
  { id: 'mk2', cat: 'Exploração', name: 'Tubarão do Mercado', icon: '🦈', desc: 'Faça 100 transações no Mercado',        check: (S) => S.market.stats.trades >= 100, progress: (S) => [S.market.stats.trades, 100] },
  { id: 'np1', cat: 'Exploração', name: 'Gente da Cidade',    icon: '🏘️', desc: 'Alcance amizade nível 3 com um NPC',    check: (S) => { for (const k in S.npcs.rep) if (S.npcs.rep[k] >= NPC_FRIEND_XP[3]) return true; return false; }, progress: (S) => { let m = 0; for (const k in S.npcs.rep) m = Math.max(m, S.npcs.rep[k]); return [m, NPC_FRIEND_XP[3]]; } },
  { id: 'np2', cat: 'Exploração', name: 'Pilar da Comunidade', icon: '🏆', desc: 'Cumpra 20 missões de NPCs',            check: (S) => S.npcs.missionsDone >= 20, progress: (S) => [S.npcs.missionsDone || 0, 20] },
  // Mundo
  { id: 'wd1', cat: 'Exploração', name: 'As Quatro Estações', icon: '🍥', desc: 'Testemunhe as 4 estações',              check: (S) => Object.keys(S.world.seenSeasons || {}).length >= 4, progress: (S) => [Object.keys(S.world.seenSeasons || {}).length, 4] },
  { id: 'wd2', cat: 'Exploração', name: 'Sob a Sombra',       icon: '🌑', desc: 'Testemunhe um eclipse',                 check: (S) => !!(S.world.seenWeathers && S.world.seenWeathers.eclipse), progress: (S) => [S.world.seenWeathers && S.world.seenWeathers.eclipse ? 1 : 0, 1] },
  { id: 'lo1', cat: 'Exploração', name: 'Arqueólogo',         icon: '🏺', desc: 'Descubra 5 fragmentos de lore',         check: (S) => Object.keys(S.codex.lore).length >= 5, progress: (S) => [Object.keys(S.codex.lore).length, 5] },
  { id: 'lo2', cat: 'Exploração', name: 'A História Completa', icon: '📚', desc: 'Descubra todos os fragmentos de lore', check: (S) => Object.keys(S.codex.lore).length >= LORE_ITEMS.length, progress: (S) => [Object.keys(S.codex.lore).length, LORE_ITEMS.length] },
  { id: 'cx1', cat: 'Exploração', name: 'Colecionador Completo', icon: '🗂️', desc: 'Complete 100% do Códex (Heróis, Chefes, Equipamentos, Relíquias, Eventos, NPCs, Lore, Mascotes, Monstros)', check: (S) => Game.codexCompletion().pct >= 1, progress: (S) => { const c = Game.codexCompletion(); return [c.have, c.total]; } },
  // Novos segredos (nunca dizemos como — desc genérica até desbloquear)
  { id: 's5',  cat: 'Segredos',  name: 'Palavra Mágica',      icon: '🔤', desc: 'Digite o nome de quem sempre esteve com você', secret: true, check: (S) => !!(S.secrets && S.secrets.aldric), progress: (S) => [S.secrets && S.secrets.aldric ? 1 : 0, 1] },
  { id: 's6',  cat: 'Segredos',  name: 'Poeira nos Cantos',   icon: '🕸️', desc: 'Encontre o ponto que ninguém vê',       secret: true, check: (S) => !!(S.secrets && S.secrets.dot), progress: (S) => [S.secrets && S.secrets.dot ? 1 : 0, 1] },
  { id: 's7',  cat: 'Segredos',  name: 'Timing Perfeito',     icon: '⏱️', desc: 'Venda no Mercado com o preço nas alturas (índice ≥ 2,2)', secret: true, check: (S) => !!(S.secrets && S.secrets.highSell), progress: (S) => [S.secrets && S.secrets.highSell ? 1 : 0, 1] },
  { id: 's8',  cat: 'Segredos',  name: 'Coração de Pedra',    icon: '🥶', desc: 'Desmanche uma carta Lendária',          secret: true, check: (S) => !!(S.secrets && S.secrets.scrapLegend), progress: (S) => [S.secrets && S.secrets.scrapLegend ? 1 : 0, 1] },
  { id: 's9',  cat: 'Segredos',  name: 'Caçador Lunar',       icon: '🌖', desc: 'Derrote um chefe sob a Lua Cheia',      secret: true, check: (S) => !!(S.secrets && S.secrets.moonBoss), progress: (S) => [S.secrets && S.secrets.moonBoss ? 1 : 0, 1] },
];

// ===================================================================
// ==== EXPANSÃO: Mundo Vivo · Mascotes · Pesquisa · Mercado · NPCs ====
// ===================================================================

// ---- Mundo Vivo: calendário interno ----
// 1 hora de jogo = 50s reais → 1 dia de jogo = 20 min. Estação = 7 dias de jogo.
const WORLD_MIN_PER_SEC = 1.2;   // minutos de jogo por segundo real
const WORLD_DAY_START = 6;       // hora em que amanhece
const WORLD_NIGHT_START = 20;    // hora em que anoitece
const SEASON_DAYS = 7;

// mults: multiplicadores aplicados no motor enquanto a estação está ativa
const SEASONS = [
  { id: 'primavera', name: 'Primavera', icon: '🌸', desc: '+20% coleta de materiais',        mults: { material: 1.2 } },
  { id: 'verao',     name: 'Verão',     icon: '☀️', desc: '+10% produção de ouro',            mults: { gold: 1.1 } },
  { id: 'outono',    name: 'Outono',    icon: '🍂', desc: '+15% conhecimento',                mults: { knowledge: 1.15 } },
  { id: 'inverno',   name: 'Inverno',   icon: '❄️', desc: '+15% DPS, −10% ouro',              mults: { dps: 1.15, gold: 0.9 } },
];

// Climas: sorteados a cada poucas horas de jogo; `only`/`not` restringem por estação,
// `night: true` só ocorre à noite. Duração em horas de jogo (faixa [min, max]).
const WEATHERS = [
  { id: 'chuva',      name: 'Chuva',      icon: '🌧️', weight: 30, hours: [2, 5], desc: '+30% materiais',                          mults: { material: 1.3 }, not: ['inverno'] },
  { id: 'tempestade', name: 'Tempestade', icon: '⛈️', weight: 12, hours: [1, 3], desc: '+60% energia, −10% ouro',                 mults: { gold: 0.9 }, energy: 1.6 },
  { id: 'neve',       name: 'Neve',       icon: '🌨️', weight: 30, hours: [2, 6], desc: '+20% chance de drop',                     drop: 0.2, only: ['inverno'] },
  { id: 'luacheia',   name: 'Lua Cheia',  icon: '🌕', weight: 14, hours: [3, 6], desc: '+25% DPS e monstros valem +20% ouro',     mults: { dps: 1.25 }, killGold: 1.2, night: true },
  { id: 'eclipse',    name: 'Eclipse',    icon: '🌑', weight: 3,  hours: [1, 2], desc: 'Conhecimento ×2 e XP de mascote +50%',    mults: { knowledge: 2 }, petXp: 1.5 },
];

// ---- Roadmap #8: inimigos temáticos por estação/clima (reflavor + leve mecânica, sem arte nova) ----
// `hpMult` empilha sobre enemyMaxHp; usa o mesmo sprite (e1-e8/boss.png) — a exclusividade é
// nome+ícone+HP, não arte nova (o projeto não tem sprite sheet extra pra isso ainda).
const SPECIAL_ENEMIES = {
  inverno:  { id: 'urso_gelo',  name: 'Urso de Gelo', icon: '🐻‍❄️', hpMult: 1.15, desc: 'Pelagem grossa do Inverno: +15% HP' },
  luacheia: { id: 'lobisomem',  name: 'Lobisomem',    icon: '🐺',    hpMult: 1.10, desc: 'Ataca em alcateia sob a Lua Cheia: +10% HP' },
};
// Eclipse (clima raríssimo, weight 3): chance por onda de um chefe SURPRESA fora do múltiplo de 10.
const ECLIPSE_SECRET_BOSS_CHANCE = 0.12;

// ---- Roadmap #11: catálogo de "Monstros" pro Códex (categoria de completude) ----
const MONSTER_CODEX = [
  { id: 'grunt',           name: 'Inimigo Comum',            icon: '👹' },
  { id: 'chefe',           name: 'Chefe de Onda',            icon: '💀' },
  { id: 'urso_gelo',       name: 'Urso de Gelo',             icon: '🐻‍❄️' },
  { id: 'lobisomem',       name: 'Lobisomem',                icon: '🐺' },
  { id: 'eclipse_secreto', name: 'Chefe Secreto do Eclipse', icon: '🌑' },
];

// ---- Música Dinâmica (roadmap #15) ----
// Cada contexto troca a escala/timbre/tempo da música ambiente gerativa (Sound.startMusic).
// `scale` em Hz (pentatônica-like), `interval` = ms entre notas, `decay`/`padDecay` = duração do
// envelope (s). Prioridade quando mais de um se aplica: boss > prestige > city > combat (padrão).
const MUSIC_CONTEXTS = {
  combat:   { scale: [220, 261.6, 293.7, 329.6, 392, 440, 523.3, 587.3], interval: 1900,
              wave: 'sine', vol: 0.055, decay: 1.8,
              padWave: 'triangle', padFreq: 110, padVol: 0.03, padDecay: 3.6, padEvery: 4 },
  boss:     { scale: [196, 233.1, 277.2, 311.1, 349.2, 415.3, 466.2], interval: 1100,
              wave: 'sawtooth', vol: 0.05, decay: 1.0,
              padWave: 'sawtooth', padFreq: 98, padVol: 0.045, padDecay: 2.2, padEvery: 2 },
  city:     { scale: [261.6, 329.6, 392, 440, 523.3, 587.3, 659.3], interval: 2600,
              wave: 'triangle', vol: 0.05, decay: 2.6,
              padWave: 'sine', padFreq: 130.8, padVol: 0.025, padDecay: 4.5, padEvery: 3 },
  prestige: { scale: [220, 277.2, 329.6, 415.3, 440, 554.4], interval: 3400,
              wave: 'sine', vol: 0.045, decay: 3.8,
              padWave: 'sine', padFreq: 110, padVol: 0.02, padDecay: 6, padEvery: 2 },
};

// ---- Mascotes ----
// bonus: valor POR NÍVEL (multiplicado pelo nível e pelo estágio de evolução).
//   dps/gold/knowledge/essence → multiplicadores; crit → chance aditiva (compartilha o teto FORGE_CRIT_CAP);
//   drop → chance aditiva de drop; research → velocidade de pesquisa; keep → fração do ouro da run
//   anterior que a Fênix devolve como "ninho" após o prestígio (teto PET_KEEP_CAP).
const PET_MAX_LVL = 100;
const PET_EVO_LEVELS = [25, 50];       // níveis em que o mascote evolui (estágio 2 e 3)
const PET_EVO_MULTS = [1, 1.5, 2];     // multiplicador do bônus por estágio
const PET_KEEP_CAP = 0.25;
const PETS = [
  { id: 'lobo',   name: 'Lobo',   icon: '🐺', rarity: 2, food: 'ferro',   foodBase: 8,
    desc: 'Caçador leal que corre com o seu time.', bonus: { dps: 0.015, crit: 0.002 },
    bonusTip: ['+1,5% DPS do time por nível', '+0,2% chance de crítico por nível'],
    evo: ['Lobo', 'Lobo de Guerra', 'Fenrir'],
    unlockText: 'Contrate seu primeiro herói — um lobo vai te adotar.' },
  { id: 'coruja', name: 'Coruja', icon: '🦉', rarity: 2, food: 'madeira', foodBase: 25,
    desc: 'Sábia e curiosa, sussurra ideias no seu ouvido.', bonus: { knowledge: 0.02, research: 0.01 },
    bonusTip: ['+2% conhecimento por nível', '+1% velocidade de pesquisa por nível'],
    evo: ['Coruja', 'Coruja-Oráculo', 'Athenix'],
    unlockText: 'Conclua a pesquisa "Domesticação".' },
  { id: 'dragao', name: 'Dragão', icon: '🐉', rarity: 3, food: 'pedra',   foodBase: 30,
    desc: 'Cobiçoso: fareja ouro e tesouros raros.', bonus: { gold: 0.02, drop: 0.003 },
    bonusTip: ['+2% produção de ouro por nível', '+0,3% chance de drop por nível'],
    evo: ['Dragonete', 'Dragão', 'Dragão Ancião'],
    unlockText: 'Troque 3 relíquias com o Colecionador, na Cidade.' },
  { id: 'fenix',  name: 'Fênix',  icon: '🔥', rarity: 4, food: 'cristal', foodBase: 1,
    desc: 'Renasce das cinzas — e você renasce com ela.', bonus: { essence: 0.01, keep: 0.002 },
    bonusTip: ['+1% ganho de Essência por nível', 'Após o prestígio, devolve +0,2% do ouro da run anterior por nível (ninho de ouro)'],
    evo: ['Fênix', 'Fênix Solar', 'Fênix Eterna'],
    unlockText: 'Faça seu primeiro prestígio.' },
];

// ---- Pesquisa (árvore tecnológica) ----
// time em segundos REAIS. cost: know (conhecimento) + goldMult (ouro = enemyGold(maiorOnda)×goldMult,
// auto-escala como a Forja) + materiais fixos. req: pré-requisitos. unlock: mecânica nova (não só "+X%").
const RESEARCH_CATS = {
  prod:   { name: 'Produção',    icon: '🏭' },
  war:    { name: 'Combate',     icon: '⚔️' },
  build:  { name: 'Construções', icon: '🏗️' },
  hero:   { name: 'Heróis',      icon: '🛡️' },
  prest:  { name: 'Prestígio',   icon: '✦' },
  auto:   { name: 'Automação',   icon: '⚙️' },
  eco:    { name: 'Economia',    icon: '💱' },
  magic:  { name: 'Magia',       icon: '🔮' },
  cosmos: { name: 'Universo',    icon: '🌌' },
};
const RESEARCH = [
  // Produção
  { id: 'metodos',      cat: 'prod',  name: 'Métodos de Produção', icon: '📊', time: 300,    cost: { know: 15 },                              desc: '+10% produção global', mult: { gold: 1.10 } },
  { id: 'industria',    cat: 'prod',  name: 'Industrialização',    icon: '🏭', time: 28800,  cost: { know: 120, goldMult: 60 },  req: ['metodos'],   desc: '+25% produção global', mult: { gold: 1.25 } },
  { id: 'logistica',    cat: 'prod',  name: 'Logística',           icon: '📦', time: 7200,   cost: { know: 60, madeira: 300 },   req: ['metodos'],   desc: 'Geradores custam −5%', genCost: 0.95 },
  // Combate
  { id: 'taticas',      cat: 'war',   name: 'Táticas de Guerra',   icon: '🗺️', time: 1800,   cost: { know: 30 },                              desc: '+15% DPS do time', mult: { dps: 1.15 } },
  { id: 'balistica',    cat: 'war',   name: 'Balística',           icon: '🏹', time: 7200,   cost: { know: 70, ferro: 120 },     req: ['taticas'],   desc: '+6% chance de drop de equipamento', drop: 0.06 },
  { id: 'cacada',       cat: 'war',   name: 'Caçada Ritual',       icon: '🩸', time: 28800,  cost: { know: 140, goldMult: 40 },  req: ['balistica'], desc: 'Monstros valem +20% ouro', killGold: 1.2 },
  // Ramo exclusivo (#5): dois caminhos opostos após Caçada Ritual — só um pode ser concluído por run.
  { id: 'furia_sangue',  cat: 'war', name: 'Fúria de Sangue',      icon: '🩸', time: 86400,  cost: { know: 300, goldMult: 150 }, req: ['cacada'], exclusiveWith: ['disciplina_ferro'],
    desc: '+25% DPS do time · −8% chance de drop de equipamento (tudo no ataque)', mult: { dps: 1.25 }, drop: -0.08 },
  { id: 'disciplina_ferro', cat: 'war', name: 'Disciplina de Ferro', icon: '🛡️', time: 86400, cost: { know: 300, goldMult: 150 }, req: ['cacada'], exclusiveWith: ['furia_sangue'],
    desc: '+12% chance de drop de equipamento · −10% DPS do time (farm disciplinado)', drop: 0.12, mult: { dps: 0.90 } },
  // Construções
  { id: 'engenharia',   cat: 'build', name: 'Engenharia Anã',      icon: '⛏️', time: 7200,   cost: { know: 60, pedra: 400 },                  desc: 'Salas da Base custam −10%', roomCost: 0.9 },
  { id: 'urbanismo',    cat: 'build', name: 'Urbanismo Arcano',    icon: '🏙️', time: 28800,  cost: { know: 150, madeira: 600, pedra: 600 }, req: ['engenharia'], desc: 'Sinergias de vizinhança da Base +25% mais fortes', synergy: 1.25 },
  // Heróis
  { id: 'treinamento',  cat: 'hero',  name: 'Campo de Treino',     icon: '🎽', time: 1800,   cost: { know: 35 },                              desc: 'Níveis de herói custam −5%', heroCost: 0.95 },
  { id: 'quinto_slot',  cat: 'hero',  name: 'Formação Estendida',  icon: '🖐️', time: 86400,  cost: { know: 250, goldMult: 120 }, req: ['treinamento'], desc: 'Desbloqueia o 5º slot do Campo de Batalha', unlock: 'slot5' },
  // Prestígio
  { id: 'alma',         cat: 'prest', name: 'Estudo da Alma',      icon: '🕯️', time: 28800,  cost: { know: 180 },                             desc: '+10% ganho de Essência', essence: 1.10 },
  { id: 'memoria',      cat: 'prest', name: 'Memória Persistente', icon: '🧬', time: 86400,  cost: { know: 350, goldMult: 150 }, req: ['alma'],     desc: 'Após o prestígio, você começa com 10 Aprendizes, 10 Minas e 10 Mercados', unlock: 'memoria' },
  // Automação
  { id: 'autocomprador', cat: 'auto', name: 'Autocomprador',       icon: '🤖', time: 7200,   cost: { know: 90, goldMult: 30 },                desc: 'Compra automaticamente o gerador mais barato a cada 10s (liga/desliga em Ajustes)', unlock: 'autobuy' },
  { id: 'autoclique',   cat: 'auto',  name: 'Mão Fantasma',        icon: '👻', time: 28800,  cost: { know: 160, goldMult: 80 }, req: ['autocomprador'], desc: 'Uma mão espectral clica na moeda por você (50% do seu clique, 1×/s)', unlock: 'autoclick' },
  // Economia
  { id: 'comercio',     cat: 'eco',   name: 'Rotas de Comércio',   icon: '⚖️', time: 1800,   cost: { know: 40, goldMult: 15 },  req: ['metodos'],   desc: 'Desbloqueia o MERCADO — compre e venda recursos com preços vivos', unlock: 'market' },
  { id: 'cidade',       cat: 'eco',   name: 'Distrito da Cidade',  icon: '🏘️', time: 7200,   cost: { know: 90, madeira: 400, pedra: 300 }, req: ['comercio'], desc: 'Desbloqueia a CIDADE e seus 5 NPCs (mercador, ferreira, mago, alquimista, colecionador)', unlock: 'npcs' },
  { id: 'especulacao',  cat: 'eco',   name: 'Especulação',         icon: '📈', time: 28800,  cost: { know: 200, goldMult: 90 }, req: ['cidade'],    desc: 'Taxas do Mercado caem pela metade', fee: 0.5 },
  // Ramo exclusivo (#5): dois caminhos opostos após Especulação — só um pode ser concluído por run.
  { id: 'monopolio',    cat: 'eco',   name: 'Monopólio Mercantil', icon: '👑', time: 86400,  cost: { know: 400, goldMult: 200 }, req: ['especulacao'], exclusiveWith: ['redistribuicao'],
    desc: '+40% produção de ouro · heróis custam +20% (ganância sem freio)', mult: { gold: 1.40 }, heroCost: 1.20 },
  { id: 'redistribuicao', cat: 'eco', name: 'Redistribuição Justa', icon: '🤲', time: 86400,  cost: { know: 400, goldMult: 200 }, req: ['especulacao'], exclusiveWith: ['monopolio'],
    desc: 'Heróis custam −15% para nivelar · produção de ouro −10% (crescimento sustentável)', heroCost: 0.85, mult: { gold: 0.90 } },
  // Magia
  { id: 'domesticacao', cat: 'magic', name: 'Domesticação',        icon: '🐾', time: 300,    cost: { know: 20 },                              desc: 'Desbloqueia a Coruja 🦉 (mascote de conhecimento)', unlock: 'coruja' },
  { id: 'vinculo',      cat: 'magic', name: 'Vínculo Animal',      icon: '💞', time: 28800,  cost: { know: 150 },               req: ['domesticacao'], desc: 'Permite 2 mascotes ativos ao mesmo tempo', unlock: 'petslot2' },
  { id: 'alquimia',     cat: 'magic', name: 'Alquimia Maior',      icon: '⚗️', time: 28800,  cost: { know: 180, cristal: 8 },   req: ['cidade'],    desc: 'Poções da Alquimista duram o dobro', potion: 2 },
  // Universo
  { id: 'astronomia',   cat: 'cosmos', name: 'Astronomia',         icon: '🔭', time: 1800,   cost: { know: 45 },                              desc: 'Prevê o próximo clima no calendário do mundo', unlock: 'forecast' },
  { id: 'portais',      cat: 'cosmos', name: 'Portais Estelares',  icon: '🌀', time: 259200, cost: { know: 800, goldMult: 400, cristal: 20 }, req: ['astronomia', 'alma'], desc: 'Chefes derrotados durante um ECLIPSE dão +1 ✦ Essência', unlock: 'eclipseBoss' },
];
const RESEARCH_QUEUE_MAX = 3;
const RESEARCH_CANCEL_REFUND = 0.5;
// Pesquisa 2.0 (#5): com ramos exclusivos, nunca dá pra concluir TODAS as pesquisas — cada par
// `exclusiveWith` só permite uma das duas. Máximo completável = total − metade das que têm par.
const RESEARCH_MAX_COMPLETABLE = RESEARCH.length - RESEARCH.filter(r => r.exclusiveWith).length / 2;

// ---- Economia Dinâmica (Mercado) ----
// Valor-base por unidade = enemyGold(maiorOnda) × k (auto-escala, nunca fica obsoleto).
// season/weather: pressão de demanda — empurra o índice de preço na direção do valor.
const MARKET_GOODS = [
  { id: 'madeira', icon: '🪵', name: 'Madeira', k: 0.06, season: { inverno: 1.5 } },
  { id: 'pedra',   icon: '🪨', name: 'Pedra',   k: 0.09, season: { primavera: 1.3 } },
  { id: 'ferro',   icon: '⛓️', name: 'Ferro',   k: 0.22, season: { verao: 1.25 }, weather: { tempestade: 1.5 } },
  { id: 'cristal', icon: '💠', name: 'Cristal', k: 9,    weather: { eclipse: 1.8, luacheia: 1.3 } },
];
const MARKET_FEE = 0.06;        // taxa sobre compra e venda (Especulação corta pela metade)
const MARKET_IDX_MIN = 0.35;    // piso do índice de preço
const MARKET_IDX_MAX = 2.8;     // teto do índice de preço
const MARKET_HIST = 48;         // pontos de histórico por recurso (1 por hora de jogo)
const MARKET_SCARCITY = 2.0;    // índice acima disso = "escassez"
const MARKET_PROMO = 0.7;       // índice abaixo disso = "promoção"

// ---- NPCs da Cidade ----
// Amizade sobe usando ofertas (+2), cumprindo missões (+8) e trocando relíquias (+15).
const NPC_FRIEND_XP = [0, 20, 60, 150, 400, 1000];  // XP acumulado para nível 0..5
const NPCS = [
  { id: 'mercador',     name: 'Dorian', title: 'Mercador',     icon: '🧑‍💼',
    story: 'Vende de tudo, inclusive o que ainda não tem. Cobra adiantado.',
    lines: ['Preço de amigo! Quase.', 'Hoje tem oferta. Amanhã, quem sabe.', 'Confie em mim. Eu confiaria.'],
    perk: 'Cada nível de amizade: −3% nas taxas do Mercado · nível 5: abre o 🏴 Mercado Negro' },
  { id: 'ferreiro',     name: 'Bruna',  title: 'Ferreira',     icon: '🧑‍🏭',
    story: 'Diz que todo metal tem uma forma escondida. Ela encontra na marreta.',
    lines: ['Isso aqui aguenta mais uma têmpera.', 'Aço bom não reclama.', 'Volta amanhã que eu melhoro.'],
    perk: 'Cada nível de amizade: +10% de ferro ao desmanchar cartas · nível 5: abre a 🏆 Forja Lendária' },
  { id: 'mago',         name: 'Zephyr', title: 'Mago',         icon: '🧙',
    story: 'Especialista em encantamentos de curto prazo e desculpas de longo prazo.',
    lines: ['A magia expira. A fatura, não.', 'Um feitiço por dia mantém o tédio à distância.', 'Isso pode ou não explodir.'],
    perk: 'Cada nível de amizade: feitiços 10% mais baratos · nível 5: abre o 🪄 Encantamento Arcano' },
  { id: 'alquimista',   name: 'Mira',   title: 'Alquimista',   icon: '⚗️',
    story: 'Transforma sobras de mineração em milagres engarrafados. Às vezes vinagre.',
    lines: ['Agite antes de usar. Sempre.', 'Isso é chá... provavelmente.', 'Efeitos colaterais? Só os bons.'],
    perk: 'Cada nível de amizade: poções 5% mais fortes · nível 5: abre o 🌟 Elixir Supremo' },
  { id: 'colecionador', name: 'Silas',  title: 'Colecionador', icon: '🧐',
    story: 'Compra relíquias que ninguém entende e paga com histórias que ninguém confere.',
    lines: ['Isso pertence a um museu. O meu.', 'Toda relíquia tem dono. Eu, geralmente.', 'O passado está em promoção.'],
    perk: 'Relíquias trocadas revelam fragmentos de lore (e 3 delas atraem um Dragão 🐉)' },
];
// Missões diárias por NPC: type é o gancho no motor (Game.missionEvent), n = faixa da meta
const NPC_MISSIONS = {
  mercador:     { type: 'sell',     text: 'Venda {n} unidades no Mercado',   n: [40, 160] },
  ferreiro:     { type: 'forge',    text: 'Forje {n} cartas na Forja',       n: [2, 4] },
  mago:         { type: 'research', text: 'Conclua {n} pesquisa(s)',         n: [1, 1] },
  alquimista:   { type: 'feed',     text: 'Alimente mascotes {n} vezes',     n: [3, 6] },
  colecionador: { type: 'boss',     text: 'Derrote {n} chefes',              n: [3, 8] },
};
// Roadmap #10: Pedidos de recurso — distinto da missão de atividade acima. O NPC pede uma entrega
// pontual (não rastreada ao longo do dia); o jogador entrega manualmente quando tiver o estoque,
// por uma recompensa MAIOR (rewardMult vs os ×40 da missão normal), escalada por enemyGold(maxWave).
const NPC_REQUESTS = {
  mercador:     { res: 'madeira', n: [200, 500],  rewardMult: 70 },
  ferreiro:     { res: 'ferro',   n: [150, 400],  rewardMult: 75 },
  mago:         { res: 'cristal', n: [5, 12],     rewardMult: 85 },
  alquimista:   { res: 'pedra',   n: [200, 450],  rewardMult: 70 },
  colecionador: { res: 'cristal', n: [8, 16],     rewardMult: 90 },
};
const NPC_RELICS_FOR_DRAGON = 3;

// ---- Lore Oculta (Codex → Descobertas) ----
// check(S, D) → bool, avaliado junto com as conquistas. Nunca dizemos COMO desbloquear.
const LORE_ITEMS = [
  { id: 'ruina1',    kind: 'Ruína',      icon: '🏛️', title: 'A Primeira Muralha',
    text: 'Na onda 25, entre os escombros, uma pedra angular com um selo: o mesmo símbolo do grimório de Aldric. Alguém construiu aqui antes de você. E também caiu.',
    check: (S) => S.combat.maxWave >= 25 },
  { id: 'ruina2',    kind: 'Ruína',      icon: '🗿', title: 'O Salão dos Nomes',
    text: 'Um salão soterrado, paredes cobertas de nomes riscados. No fim da lista, um espaço em branco — do tamanho exato do seu nome.',
    check: (S) => S.combat.maxWave >= 75 },
  { id: 'ruina3',    kind: 'Ruína',      icon: '⚰️', title: 'A Fronteira de Cinzas',
    text: 'Além da onda 200 o chão vira vidro. Aqui algo queimou tão forte que o mundo desistiu de crescer de volta. A Fênix evita olhar para este lugar.',
    check: (S) => S.combat.maxWave >= 200 },
  { id: 'livro1',    kind: 'Livro',      icon: '📕', title: 'Tratado do Ouro Vivo',
    text: '"O ouro não é metal. É atenção condensada. Quanto mais o mundo olha para você, mais pesa o seu bolso." — página 1 de 900. As outras 899 estão em branco.',
    check: (S) => S.market && S.market.stats.trades >= 1 },
  { id: 'pergaminho1', kind: 'Pergaminho', icon: '📜', title: 'Nota de Laboratório nº 0',
    text: 'Caligrafia de Aldric, décadas mais jovem: "A pesquisa não descobre o novo. Ela LEMBRA o que o mundo esqueceu de propósito."',
    check: (S) => { for (const k in S.research.done) return true; return false; } },
  { id: 'diario1',   kind: 'Diário',     icon: '📔', title: 'Diário de um Renascido',
    text: '"Segunda vez que recomeço. Os outros não lembram de nada — mas o lobo lembrou de mim. Os animais atravessam o véu. Nós só damos a volta."',
    check: (S) => S.prestiges >= 2 },
  { id: 'fragmento1', kind: 'Fragmento',  icon: '🌑', title: 'Fragmento do Eclipse',
    text: 'Durante o eclipse, as sombras apontam todas para o mesmo lugar: para cima. O que quer que esteja cobrando dízimo do sol, também anota o seu nome.',
    check: (S) => S.world.seenWeathers && S.world.seenWeathers.eclipse },
  { id: 'memoria1',  kind: 'Memória',    icon: '🌕', title: 'A Caçada da Lua',
    text: 'Sob a lua cheia, o chefe hesitou antes de atacar — como quem reconhece alguém. Os monstros das ondas não nascem. Eles voltam.',
    check: (S) => S.secrets && S.secrets.moonBoss },
  { id: 'monumento1', kind: 'Monumento', icon: '🏯', title: 'O Coração da Cidadela',
    text: 'Com todas as salas erguidas, a Base ressoa numa nota grave e contínua. A Serraria, o Cofre e o Laboratório batem no mesmo compasso. Isto não é uma construção. É um organismo.',
    check: (S) => { let n = 0; for (const k in S.rooms) if (S.rooms[k] >= 1) n++; return n >= 8; } },
  { id: 'carta1',    kind: 'Mensagem',   icon: '💌', title: 'Carta Nunca Enviada',
    text: '"Se você está lendo isto, ficamos amigos de verdade. Então preciso confessar: eu já te vendi coisas que eram suas." — assinatura ilegível, mas o perfume é de loja.',
    check: (S) => { for (const k in S.npcs.rep) if (S.npcs.rep[k] >= NPC_FRIEND_XP[3]) return true; return false; } },
  { id: 'ovo1',      kind: 'Memória',    icon: '🥚', title: 'A Terceira Forma',
    text: 'No estágio final, o seu mascote para de te seguir — e passa a te guiar. Os antigos não domesticavam animais. Eram escolhidos por eles.',
    check: (S) => { for (const id in S.pets.owned) if (S.pets.owned[id].lvl >= 50) return true; return false; } },
  { id: 'void1',     kind: 'Mensagem',   icon: '🕳️', title: 'Resposta do Vazio',
    text: 'Dez singularidades alinhadas emitem um padrão. Traduzido, diz apenas: "RECEBIDO. AGUARDE." Aguardar o quê, o grimório não explica.',
    check: (S) => (S.gens.singular || 0) >= 10 },
  { id: 'hino1',     kind: 'Livro',      icon: '🎼', title: 'Partitura Inacabada',
    text: 'A canção de Orin tem 47 movimentos escritos. O 48º é só um espaço em branco com uma anotação: "esperar o público certo." Ele olha para você quando canta.',
    check: (S) => !!S.heroes.orin },
  { id: 'genesis1',  kind: 'Pergaminho', icon: '🌌', title: 'Protocolo Gênese',
    text: 'A última página do grimório, visível só para quem esgotou uma árvore inteira de pesquisa: "Fase 9 não se desbloqueia. Fase 9 se constrói." O resto foi arrancado.',
    check: (S) => {
      for (const catId in RESEARCH_CATS) {
        const all = RESEARCH.filter(r => r.cat === catId);
        if (all.length && all.every(r => S.research.done[r.id])) return true;
      }
      return false;
    } },
];

// ---- Diálogos do conselheiro (tutoriais em forma de NPC) ----
const ADVISOR = { name: 'Mestre Aldric', icon: '🧙‍♂️' };
const ADVISOR_TIPS = {
  start:      'Bem-vindo! Clique na moeda para começar. Grandes impérios nascem de trocados.',
  firstClick: 'Isso mesmo. Sinta o peso do ouro na palma da mão — cada moeda conta, mesmo essa primeira.',
  firstGen:   'Um Aprendiz Coletor! Agora o ouro flui sozinho. É assim que começa... todos os impérios.',
  heroes:   'Ouço tambores... A aba de Heróis foi desbloqueada! Monte um time e deixe-os lutar por você.',
  fieldMigration: 'Reorganizei seu exército em um novo sistema de Campo de Batalha — seus heróis mais fortes já estão posicionados. Veja a aba Heróis!',
  base:     'Temos capital suficiente para uma Base! Cada sala tem uma função. Comece pela Serraria.',
  talents:  'O Laboratório produz Conhecimento — gaste-o na nova aba de Talentos. Escolha um caminho... ou todos.',
  prestige: 'Sinto uma energia estranha... O Prestígio foi desbloqueado. Recomeçar nunca foi tão lucrativo.',
  events:   'O mundo desperta! Eventos acontecerão de tempos em tempos. Fique atento aos céus.',
  phase7:   'Há rumores de Guildas se formando ao norte... mas ainda não é hora. (Em breve.)',
};

// ---- Fase 1: flavor do Aldric durante o clique puro, antes de Heróis desbloquear em 2.500 ouro ----
// (item 4 da AUDIT.md — os primeiros ~30s eram genéricos: só clicar e comprar "Aprendiz Coletor",
// sem nenhum gancho narrativo até a Fase 2.) Cada linha dispara uma única vez (S.advisorSeen[id]),
// verificado em Game.updatePhases() enquanto `!S.unlocked.heroes` — mesmo padrão de "avisa uma vez"
// já usado pelos outros ADVISOR_TIPS (gate por S.unlocked/S.advisorSeen, nunca por prestígio).
const PHASE1_FLAVOR = [
  { id: 'p1_50',   earned: 50,   line: 'O tilintar já está bom. Tudo o que você juntar agora, o Aprendiz Coletor multiplica sozinho.' },
  { id: 'p1_300',  earned: 300,  line: 'Vejo geradores girando por conta própria. Você mal precisa clicar... mas sei que vai clicar mesmo assim.' },
  { id: 'p1_1200', earned: 1200, line: 'O ouro se acumula rápido agora. Já ouço tambores ao longe — não vai demorar pra precisarmos de espadas.' },
];

// ---- Lore/tutorial por fase, exibido em modal ao desbloquear (e revisitável no Códex) ----
const PHASE_LORE = {
  phase1: {
    title: 'O Despertar',
    body: 'Você acorda num porão empoeirado, uma única moeda de cobre na mão e um grimório aberto sobre a mesa. Uma voz sai das páginas: "Ah, finalmente. Eu sou Mestre Aldric — vou te guiar enquanto você constrói algo grande a partir de quase nada." A moeda ainda está quente. Alguém — ou algo — quer que você comece a juntar ouro.',
    tip: 'Clique na moeda dourada para minerar ouro. Depois, use esse ouro para comprar seu primeiro gerador — ele trabalha por você mesmo enquanto você não está clicando.',
  },
  heroes: {
    title: 'Chamado às Armas',
    body: 'O ouro atraiu atenção — e nem toda ela é amigável. Aldric fecha o grimório com um estalo. "Monstros nas fronteiras. Vamos precisar de gente disposta a lutar." Ele te entrega uma lista de nomes: aventureiros, desertores, um ou outro fazendeiro teimoso — todos dispostos a vender a espada por uma fatia do seu ouro.',
    tip: 'Contrate heróis na aba Heróis e os posicione no Campo de Batalha. Eles causam dano automaticamente a cada segundo — suba o nível deles para acelerar o combate.',
  },
  base: {
    title: 'Fundações',
    body: '"Acampamento improvisado já não serve mais", diz Aldric, olhando ao redor com desdém. Com capital suficiente, é hora de erguer paredes de verdade — uma sede com salas dedicadas: madeira, pedra, conhecimento, o que for preciso para sustentar o que você está construindo.',
    tip: 'Construa e evolua salas na aba Base. Cada uma produz um recurso diferente — a Serraria é um bom começo, e o Laboratório abre caminho para os Talentos.',
  },
  talents: {
    title: 'Iluminação',
    body: 'O Laboratório zumbe baixinho, dia e noite. Aldric folheia anotações febris. "Conhecimento puro. Podemos moldar seu destino com ele — força, riqueza, o que você quiser perseguir." Três caminhos se abrem diante de você, e nada te obriga a escolher só um.',
    tip: 'Gaste Conhecimento 📘 (produzido pelo Laboratório) na aba Talentos para desbloquear bônus permanentes em três árvores diferentes.',
  },
  prestige: {
    title: 'Transcendência',
    body: 'Aldric fica estranhamente quieto por um momento. "Existe um jeito de recomeçar — abrir mão de tudo que você construiu aqui, e voltar mais forte do que nunca. Chamam isso de Essência. Eu chamo de coragem." A escolha, como sempre, é sua.',
    tip: 'Na aba Prestígio, "renasça" para trocar seu progresso atual por Essência ✦ permanente — cada ponto vale +2% de produção global para sempre, mesmo depois de recomeçar.',
  },
  events: {
    title: 'Convergência',
    body: '"O mundo notou você agora", murmura Aldric, os olhos virados para o céu. Ventos estranhos, moedas douradas fugidias, e às vezes um mercador enigmático batendo à sua porta com ofertas boas demais para ignorar — nada disso é acaso.',
    tip: 'Fique de olho no banner no topo da tela: eventos temporários e moedas douradas aparecem de tempos em tempos e valem a pena perseguir.',
  },
  phase7: {
    title: 'Rumores do Norte',
    body: 'Aldric baixa a voz, quase um sussurro. "Há quem esteja se organizando ao norte — bandeiras, juramentos, um poder maior que o de um só império." Ele não diz mais nada. Ainda não é hora.',
    tip: 'As Guildas ainda estão por vir — esta fase é só um aviso do que está guardado para o futuro.',
  },
};
