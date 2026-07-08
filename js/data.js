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
const HEROES = [
  { id: 'bran', name: 'Bran', title: 'Escudeiro Teimoso', icon: '🛡️', baseCost: 200, baseDps: 4, class: 'tank',
    story: 'Ex-fazendeiro que decidiu que porcos não revidam, mas monstros sim.',
    lines: ['Meu escudo já foi uma porta de celeiro. Ainda range.', 'Se eu cair, me levantem. De novo.', 'Um dia serei cavaleiro. Hoje, aparo pancadas.'] },
  { id: 'lyra', name: 'Lyra', title: 'Arqueira do Crepúsculo', icon: '🏹', baseCost: 4e3, baseDps: 22, class: 'dps',
    story: 'Nunca errou um alvo. Uma vez errou de propósito e ainda se arrepende.',
    lines: ['Vejo o ponto fraco daqui.', 'Uma flecha, uma história encerrada.', 'O vento me deve favores.'] },
  { id: 'magnus', name: 'Magnus', title: 'Mago Distraído', icon: '🔮', baseCost: 90e3, baseDps: 160, class: 'support',
    story: 'Esqueceu mais feitiços do que a maioria dos magos aprendeu. Alguns explodem sozinhos.',
    lines: ['Hmm? Ah sim, a bola de fogo. Onde deixei mesmo...', 'A magia é 90% memória. Estou perdido.', 'Isso vai fazer BUM. Provavelmente.'] },
  { id: 'thora', name: 'Thora', title: 'Berserker Sorridente', icon: '🪓', baseCost: 2.2e6, baseDps: 1.3e3, class: 'dps',
    story: 'Sorri durante a batalha. Os inimigos acham isso profundamente perturbador.',
    lines: ['HAHA! Mais! MAIS!', 'Meu machado tem nome: Segunda-feira.', 'Dor é só fraqueza fazendo cócegas.'] },
  { id: 'vex', name: 'Vex', title: 'Assassino Pontual', icon: '🗡️', baseCost: 60e6, baseDps: 11e3, class: 'dps',
    story: 'Chega sempre três segundos antes do necessário. Ninguém sabe como.',
    lines: ['Você não me viu. Ninguém nunca vê.', 'Contratos são sagrados. Alvos, nem tanto.', '...', ], },
  { id: 'sera', name: 'Seraphine', title: 'Paladina Radiante', icon: '✨', baseCost: 1.8e9, baseDps: 95e3, class: 'support',
    story: 'Sua luz cega aliados desavisados. Ela pede desculpas. Sempre.',
    lines: ['A luz cobra caro, mas paga em dobro.', 'Perdão pela claridade. De novo.', 'Nenhuma sombra resiste para sempre.'] },
  { id: 'nyx', name: 'Nyx', title: 'Necromante Aposentada', icon: '💀', baseCost: 80e9, baseDps: 1.1e6, reqPrestige: 1, class: 'tank',
    story: 'Saiu da aposentadoria porque o plano de previdência do Além faliu.',
    lines: ['Os mortos trabalham de graça. Aprendam.', 'Aposentadoria era tediosa demais.', 'Todo fim é só um contrato renovável.'] },
];
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
const FIELD_SLOTS = 5;
const SYNERGY_TARGET = { tank: 0.25, dps: 0.5, support: 0.25 };
const SYNERGY_MAX_BONUS = 0.30; // +30% DPS de time com composição perfeita

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
];

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
  { id: 'bancada',  name: 'Bancada',        icon: '🔨', goldMult: 8,   ferro: 6,  cristal: 0, weights: [58, 32, 9, 1, 0],   affixMax: 1 },
  { id: 'fornalha', name: 'Fornalha',       icon: '⚒️', goldMult: 32,  ferro: 20, cristal: 1, weights: [10, 34, 38, 15, 3], affixMax: 2 },
  { id: 'cadinho',  name: 'Cadinho Arcano', icon: '🌋', goldMult: 120, ferro: 55, cristal: 6, weights: [0, 8, 32, 42, 18],  affixMax: 2 },
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
];

// ---- Diálogos do conselheiro (tutoriais em forma de NPC) ----
const ADVISOR = { name: 'Mestre Aldric', icon: '🧙‍♂️' };
const ADVISOR_TIPS = {
  start:    'Bem-vindo! Clique na moeda para começar. Grandes impérios nascem de trocados.',
  firstGen: 'Um Aprendiz Coletor! Agora o ouro flui sozinho. É assim que começa... todos os impérios.',
  heroes:   'Ouço tambores... A aba de Heróis foi desbloqueada! Monte um time e deixe-os lutar por você.',
  fieldMigration: 'Reorganizei seu exército em um novo sistema de Campo de Batalha — seus heróis mais fortes já estão posicionados. Veja a aba Heróis!',
  base:     'Temos capital suficiente para uma Base! Cada sala tem uma função. Comece pela Serraria.',
  talents:  'O Laboratório produz Conhecimento — gaste-o na nova aba de Talentos. Escolha um caminho... ou todos.',
  prestige: 'Sinto uma energia estranha... O Prestígio foi desbloqueado. Recomeçar nunca foi tão lucrativo.',
  events:   'O mundo desperta! Eventos acontecerão de tempos em tempos. Fique atento aos céus.',
  phase7:   'Há rumores de Guildas se formando ao norte... mas ainda não é hora. (Em breve.)',
};
