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
  { id: 'io', name: 'Io', title: 'Golem de Areia Antiga', icon: '🗿', baseCost: 3.2e12, baseDps: 1.4e7, reqPrestige: 2, class: 'tank',
    story: 'Construído para guardar um templo que ninguém mais lembra onde fica. Ainda guarda.',
    lines: ['Areia não esquece. Eu também não.', 'Mil anos de pé. Nem uma rachadura.', 'Templo? Que templo?'] },
  { id: 'kael', name: 'Kael', title: 'Duelista Relâmpago', icon: '⚡', baseCost: 1.1e14, baseDps: 1.8e8, reqPrestige: 2, class: 'dps',
    story: 'Vence duelos antes do oponente perceber que começaram.',
    lines: ['Já acabou. Você só não viu.', 'Rápido demais pra ter medo.', 'Relâmpago não erra duas vezes.'] },
  { id: 'orin', name: 'Orin', title: 'Bardo do Fim dos Tempos', icon: '🕊️', baseCost: 3.8e15, baseDps: 2.3e9, reqPrestige: 3, class: 'support',
    story: 'Canta a mesma canção desde antes do primeiro prestígio. Ainda não chegou ao refrão.',
    lines: ['Essa música ainda não acabou. Nem vai.', 'Toda batalha precisa de trilha sonora.', 'Já vi isso terminar. E recomeçar.'] },
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
const FIELD_SLOTS = 4;
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

// ---- Grade da Base ----
// Topologia FIXA (mesma em todas as telas) — as sinergias dependem de quem é vizinho de quem,
// então a grade não pode mudar de forma conforme o tamanho do dispositivo.
const BASE_GRID_COLS = 3;
const BASE_GRID_ROWS = 4;           // 12 células para 8 salas + 4 vagas para arranjar

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
  // Mascotes
  { id: 'pt1', cat: 'Mascotes',  name: 'Melhor Amigo',        icon: '🐾', desc: 'Tenha seu primeiro mascote',            check: (S) => { for (const k in S.pets.owned) return true; return false; }, progress: (S) => [Object.keys(S.pets.owned).length, 1] },
  { id: 'pt2', cat: 'Mascotes',  name: 'Metamorfose',         icon: '🦋', desc: 'Evolua um mascote (nível 25)',          check: (S) => { for (const k in S.pets.owned) if (S.pets.owned[k].lvl >= 25) return true; return false; }, progress: (S) => { let m = 0; for (const k in S.pets.owned) m = Math.max(m, S.pets.owned[k].lvl); return [m, 25]; } },
  { id: 'pt3', cat: 'Mascotes',  name: 'Alcateia Completa',   icon: '🏞️', desc: 'Tenha os 4 mascotes',                   check: (S) => Object.keys(S.pets.owned).length >= 4, progress: (S) => [Object.keys(S.pets.owned).length, 4] },
  { id: 'pt4', cat: 'Mascotes',  name: 'Banquete',            icon: '🍖', desc: 'Alimente mascotes 50 vezes',            check: (S) => S.pets.fed >= 50, progress: (S) => [S.pets.fed, 50] },
  // Pesquisa
  { id: 'rs1', cat: 'Sabedoria', name: 'Eureka',              icon: '💡', desc: 'Conclua sua primeira pesquisa',         check: (S) => { for (const k in S.research.done) return true; return false; }, progress: (S) => [Object.keys(S.research.done).length, 1] },
  { id: 'rs2', cat: 'Sabedoria', name: 'Renascentista',       icon: '🎨', desc: 'Conclua 10 pesquisas',                  check: (S) => Object.keys(S.research.done).length >= 10, progress: (S) => [Object.keys(S.research.done).length, 10] },
  { id: 'rs3', cat: 'Sabedoria', name: 'Singularidade Mental', icon: '🧠', desc: 'Conclua todas as pesquisas',           check: (S) => Object.keys(S.research.done).length >= RESEARCH.length, progress: (S) => [Object.keys(S.research.done).length, RESEARCH.length] },
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
    perk: 'Cada nível de amizade: −3% nas taxas do Mercado' },
  { id: 'ferreiro',     name: 'Bruna',  title: 'Ferreira',     icon: '🧑‍🏭',
    story: 'Diz que todo metal tem uma forma escondida. Ela encontra na marreta.',
    lines: ['Isso aqui aguenta mais uma têmpera.', 'Aço bom não reclama.', 'Volta amanhã que eu melhoro.'],
    perk: 'Cada nível de amizade: +10% de ferro ao desmanchar cartas' },
  { id: 'mago',         name: 'Zephyr', title: 'Mago',         icon: '🧙',
    story: 'Especialista em encantamentos de curto prazo e desculpas de longo prazo.',
    lines: ['A magia expira. A fatura, não.', 'Um feitiço por dia mantém o tédio à distância.', 'Isso pode ou não explodir.'],
    perk: 'Cada nível de amizade: feitiços 10% mais baratos' },
  { id: 'alquimista',   name: 'Mira',   title: 'Alquimista',   icon: '⚗️',
    story: 'Transforma sobras de mineração em milagres engarrafados. Às vezes vinagre.',
    lines: ['Agite antes de usar. Sempre.', 'Isso é chá... provavelmente.', 'Efeitos colaterais? Só os bons.'],
    perk: 'Cada nível de amizade: poções 5% mais fortes' },
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
