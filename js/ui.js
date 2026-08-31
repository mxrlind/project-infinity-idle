// ===== Interface =====

const UI = {
  activeTab: 'prod',
  buyAmount: 1,           // 1 | 10 | 'max'
  baseSel: null,          // célula da grade da Base selecionada para mover (índice) | null
  baseDrag: null,         // índice da célula sendo arrastada (desktop) | null
  dirty: { tabs: true, prod: true, heroes: true, forge: true, base: true, talents: true, prestige: true, ach: true, config: true, left: true, pets: true, research: true, market: true, city: true, worldtree: true },
  R: {},                  // refs dinâmicos do tab ativo
  _seenIds: {},            // ids já renderizados por lista, pra animar só linhas novas

  dirtyAll() { for (const k in this.dirty) this.dirty[k] = true; },

  // true só na primeira vez que esse id aparece numa lista (usado pra não repetir a animação de entrada)
  isNewRow(listKey, id) {
    const set = this._seenIds[listKey] || (this._seenIds[listKey] = new Set());
    const isNew = !set.has(id);
    set.add(id);
    return isNew;
  },

  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  // escapa strings vindas do save (buffs) antes de injetar em innerHTML
  esc(s) {
    return String(s).replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  },

  // `src` ("img/talents/furia.jpg") tem arte de verdade no disco? Consulta o manifesto gerado
  // (js/art-manifest.js). Sem esta checagem, cada ícone de uma área ainda SEM arte — conquistas,
  // talentos, tiers da Forja, eventos, energia/conhecimento — disparava uma requisição 404: eram ~90
  // por carregamento, com o console cheio de erro vermelho escondendo qualquer erro real.
  hasArt(src) {
    const m = /^img\/([^/]+)\/([^/]+)\.[a-z]+$/i.exec(src);
    if (!m) return false;
    const group = ART[m[1]];
    return !!group && group.indexOf(m[2]) !== -1;
  },

  // ícone do herói: usa arte custom em img/hero-icons/{id}.jpg quando existe, senão cai no emoji (def.icon)
  heroIconHtml(def) {
    return this.iconImgHtml(`img/hero-icons/${def.id}.jpg`, def.icon, 'hero-icon', 'span', 'hero-icon-img');
  },

  // ícone genérico com arte custom + fallback pro emoji. Se a arte existe no manifesto, sai um <img>
  // (com onerror como rede de segurança, caso o arquivo suma sem o manifesto ser regerado); se não
  // existe, sai direto o <{tag}> com o emoji, sem requisição nenhuma. Assim uma área ganha arte item
  // a item sem que os itens ainda sem imagem custem um 404 cada.
  iconImgHtml(src, emoji, cls, tag = 'span', imgCls) {
    if (!this.hasArt(src)) return `<${tag} class="${cls}">${emoji}</${tag}>`;
    return `<img class="${imgCls || cls}" src="${src}" alt="" draggable="false"
      onerror="this.replaceWith(Object.assign(document.createElement('${tag}'),{className:'${cls}',textContent:'${emoji}'}))">`;
  },

  // ícone de um item de gear: arma equipada com tipo (wtype) usa a arte de img/weapons/{wtype}.jpg,
  // com fallback pro emoji da arma; amuletos (sem wtype) e tipos sem arte continuam no emoji.
  gearIconHtml(item) {
    if (item && item.wtype) return this.iconImgHtml(`img/weapons/${item.wtype}.jpg`, item.icon, 'gear-art');
    return item ? item.icon : '';
  },

  // ---------- Tabs ----------

  tabDefs() {
    return [
      { id: 'prod',     name: 'Produção',   icon: 'prod',     unlocked: true },
      { id: 'heroes',   name: 'Heróis',     icon: 'heroes',   unlocked: S.unlocked.heroes },
      { id: 'forge',    name: 'Forja',      icon: 'forge',    unlocked: S.unlocked.heroes && Game.forgeUnlocked() },
      { id: 'pets',     name: 'Mascotes',   emo: '🐾',        unlocked: Game.petsUnlocked(), hideLocked: true },
      { id: 'base',     name: 'Base',       icon: 'base',     unlocked: S.unlocked.base },
      { id: 'talents',  name: 'Talentos',   icon: 'talents',  unlocked: S.unlocked.talents },
      { id: 'research', name: 'Pesquisa',   emo: '🔬',        unlocked: S.unlocked.talents, hideLocked: true },
      { id: 'market',   name: 'Mercado',    emo: '📈',        unlocked: Game.marketUnlocked(), hideLocked: true },
      { id: 'city',     name: 'Cidade',     emo: '🏘️',        unlocked: Game.npcsUnlocked(), hideLocked: true },
      { id: 'prestige', name: 'Prestígio',  icon: 'prestige', unlocked: S.unlocked.prestige },
      { id: 'worldtree', name: 'Árvore do Mundo', emo: '🌳', unlocked: Game.worldTreeUnlocked(), hideLocked: true },
      { id: 'ach',      name: 'Conquistas', icon: 'ach',      unlocked: true },
      { id: 'guilds',   name: '???',        icon: 'locked',   unlocked: false, teaser: S.unlocked.phase7 },
      { id: 'config',   name: 'Ajustes',    icon: 'config',   unlocked: true },
    ];
  },

  renderTabs() {
    const nav = document.getElementById('tabs');
    nav.innerHTML = '';
    for (const t of this.tabDefs()) {
      if (t.id === 'guilds' && !t.teaser) continue; // teaser só aparece na fase 7
      if (t.hideLocked && !t.unlocked) continue;    // abas da expansão só aparecem quando desbloqueadas
      const b = this.el('button', 'tab-btn' + (this.activeTab === t.id ? ' active' : '') + (!t.unlocked ? ' locked' : ''));
      const iconHtml = t.emo
        ? `<span class="tab-icon tab-emo">${t.emo}</span>`
        : `<span class="tab-icon"><img src="img/tabs/${t.icon}.png" alt=""></span>`;
      b.innerHTML = t.unlocked
        ? `${iconHtml}${t.name}`
        : `<span class="tab-icon"><img src="img/tabs/locked.png" alt=""></span>???`;
      // sem isto o leitor de tela anuncia "???" e nada mais numa aba bloqueada, e não diz qual aba
      // está aberta (o estado ativo é só cor + classe CSS)
      b.setAttribute('aria-selected', this.activeTab === t.id ? 'true' : 'false');
      if (!t.unlocked) {
        b.setAttribute('aria-label', 'Bloqueado — continue jogando para desbloquear');
        b.setAttribute('aria-disabled', 'true');
      }
      if (t.unlocked) {
        b.onclick = () => { this.activeTab = t.id; this.dirty.tabs = true; this.dirty[t.id] = true; this.renderActive(); };
      } else {
        b.title = t.id === 'guilds' ? 'Rumores falam de guildas... continue crescendo.' : 'Continue crescendo para desbloquear...';
      }
      nav.appendChild(b);
    }
    this.dirty.tabs = false;
  },

  renderActive() {
    if (this.dirty.tabs) this.renderTabs();
    const c = document.getElementById('tab-content');
    const id = this.activeTab;
    if (!this.dirty[id]) return;
    c.innerHTML = '';
    this.R = {};
    switch (id) {
      case 'prod':     this.renderProd(c); break;
      case 'heroes':   this.renderHeroes(c); break;
      case 'forge':    this.renderForge(c); break;
      case 'pets':     this.renderPets(c); break;
      case 'base':     this.renderBase(c); break;
      case 'talents':  this.renderTalents(c); break;
      case 'research': this.renderResearch(c); break;
      case 'market':   this.renderMarket(c); break;
      case 'city':     this.renderCity(c); break;
      case 'prestige': this.renderPrestige(c); break;
      case 'worldtree': this.renderWorldTree(c); break;
      case 'ach':      this.renderAch(c); break;
      case 'config':   this.renderConfig(c); break;
    }
    this.dirty[id] = false;
    this.updateDynamic(); // aplica custos/afford imediatamente, sem esperar o próximo tick (evita flash de "indisponível")
  },

  // ---------- Seções recolhíveis ----------
  // O princípio das telas densas (Heróis, Base, Forja): a tela abre mostrando o que o jogador FAZ,
  // e tudo que é referência/consulta vira um cabeçalho de uma linha com o número que importa à
  // direita. Nada é removido do jogo — só deixa de ocupar a tela até ser pedido. É isso que faz o
  // conteúdo parecer profundo (tem muito lá dentro) em vez de assustador (tem muito na cara).
  //
  // REGRA DO PADRÃO `open`: uma seção só nasce aberta quando tem uma DECISÃO pendente para o jogador
  // (há uma relíquia pra encaixar num slot vago, há um herói contratável agora, há uma carta na bolsa
  // melhor que a equipada). Seção que é só consulta — sinergia, conjuntos — nasce fechada. Isso é o
  // que faz a tela pedir atenção só quando merece, em vez de gritar tudo o tempo todo.
  //
  // section(parent, { id, title, summary, open }) devolve o CORPO da seção, onde se append o conteúdo.
  // `id` é a chave de persistência em S.ui.sections; `open` é só o padrão da primeira vez.
  section(parent, opts) {
    const id = opts.id;
    const saved = S.ui && S.ui.sections ? S.ui.sections[id] : undefined;
    const open = saved === undefined ? !!opts.open : saved;

    const wrap = this.el('div', 'sec' + (open ? ' sec-open' : ''));
    const head = this.el('button', 'sec-head');
    head.innerHTML =
      `<span class="sec-caret">▸</span>` +
      `<span class="sec-title">${opts.title}</span>` +
      `<span class="sec-summary">${opts.summary || ''}</span>`;
    const body = this.el('div', 'sec-body');
    head.onclick = () => {
      const nowOpen = !wrap.classList.contains('sec-open');
      wrap.classList.toggle('sec-open', nowOpen);
      if (!S.ui) S.ui = { sections: {} };
      if (!S.ui.sections) S.ui.sections = {};
      S.ui.sections[id] = nowOpen;
      Sound.play('click');
    };
    wrap.appendChild(head);
    wrap.appendChild(body);
    parent.appendChild(wrap);
    // guardado para updateDynamic conseguir atualizar o resumo sem re-renderizar a seção inteira
    if (!this.R.sections) this.R.sections = {};
    this.R.sections[id] = { wrap, summaryEl: head.querySelector('.sec-summary') };
    return body;
  },

  // Chamado pelo motor após uma compra de gerador: força a checagem de "apareceu alguém novo na
  // lista?" no próximo tick, em vez de esperar o intervalo de 3s. Existe para que comprar NÃO precise
  // marcar a aba como suja (o que reconstruiria o DOM inteiro debaixo do clique do jogador).
  invalidateProdVisibility() {
    this._lastProdCheck = undefined;
  },

  // Atualiza o texto-resumo de uma seção já renderizada (chamado do updateDynamic).
  setSectionSummary(id, html) {
    const s = this.R.sections && this.R.sections[id];
    if (s && s.summaryEl.innerHTML !== html) s.summaryEl.innerHTML = html;
  },

  // ---------- Aba: Produção ----------

  renderProd(c) {
    // seletor de quantidade
    const bar = this.el('div', 'buy-bar');
    bar.appendChild(this.el('span', 'buy-label', 'Comprar:'));
    for (const amt of [1, 10, 'max']) {
      const b = this.el('button', 'buy-amt' + (this.buyAmount === amt ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
      // "×1 / ×10 / Máx" é um grupo de escolha: sem aria-pressed o leitor não diz qual está ativa
      b.setAttribute('aria-pressed', this.buyAmount === amt ? 'true' : 'false');
      b.setAttribute('aria-label', amt === 'max' ? 'Comprar o máximo possível' : `Comprar ${amt} por vez`);
      b.onclick = () => { this.buyAmount = amt; this.dirty.prod = true; this.renderActive(); };
      bar.appendChild(b);
    }
    c.appendChild(bar);

    // geradores
    const list = this.el('div', 'gen-list');
    this.R.gens = [];
    for (const g of GENERATORS) {
      if (g.reqPrestige && S.prestiges < g.reqPrestige) continue;
      const owned = S.gens[g.id] || 0;
      if (owned === 0 && S.earned < g.baseCost * 0.4) continue;

      const row = this.el('div', 'gen-row' + (this.isNewRow('gens', g.id) ? ' row-enter' : ''));
      row.title = g.flavor; // descrição vira tooltip (padrão Cookie Clicker) — linha a menos por gerador na lista

      if (this.hasArt(`img/gens/${g.id}.jpg`)) {
        const thumb = this.el('img', 'gen-thumb');
        thumb.src = `img/gens/${g.id}.jpg`;
        thumb.alt = '';
        thumb.onerror = () => thumb.replaceWith(Object.assign(document.createElement('span'), { className: 'gen-icon', textContent: g.icon }));
        row.appendChild(thumb);
      } else {
        row.appendChild(this.el('span', 'gen-icon', g.icon));
      }

      const info = this.el('div', 'gen-info');
      info.appendChild(this.el('div', 'gen-name', `${g.name} <span class="gen-owned">×${owned}</span>`));
      const prodEl = this.el('div', 'gen-prod', '');
      info.appendChild(prodEl);
      row.appendChild(info);

      const btn = this.el('button', 'buy-btn');
      btn.onclick = () => { if (Game.buyGen(g.id, this.buyAmount)) this.updateDynamic(); };
      row.appendChild(btn);
      list.appendChild(row);
      this.R.gens.push({ id: g.id, btn, prodEl, ownedEl: info.querySelector('.gen-owned') });
    }
    if (!this.R.gens.length) {
      list.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Clique na moeda para juntar seus primeiros 15 de ouro!"</i>`));
    }
    c.appendChild(list);

    // upgrades
    const ups = UPGRADES.filter(u => !S.upgrades[u.id] && S.earned >= u.cost * 0.25 && (!u.gen || (S.gens[u.gen] || 0) > 0 || S.earned >= u.cost))
      .sort((a, b) => a.cost - b.cost).slice(0, 9);
    if (ups.length) {
      c.appendChild(this.el('h3', 'section-title', 'Upgrades'));
      const grid = this.el('div', 'up-grid');
      this.R.ups = [];
      for (const u of ups) {
        const b = this.el('button', 'up-card');
        b.innerHTML = `${this.iconImgHtml(`img/upgrades/${u.id}.jpg`, u.icon, 'up-icon')}<div class="up-name">${u.name}</div><div class="up-desc">${u.desc}</div><div class="up-cost">${fmt(u.cost)} ouro</div>`;
        b.onclick = () => { if (Game.buyUpgrade(u.id)) { this.dirty.prod = true; this.renderActive(); } };
        grid.appendChild(b);
        this.R.ups.push({ cost: u.cost, btn: b });
      }
      c.appendChild(grid);
    }
  },

  // ---------- Aba: Heróis ----------

  renderHeroes(c) {
    // painel de combate
    const combat = this.el('div', 'combat-panel');
    const waveEl = this.el('div', 'combat-wave', '');
    combat.appendChild(waveEl);

    const enemy = this.el('button', 'enemy-box', '<img class="enemy-img" alt="">');
    enemy.title = 'Clique para atacar!';
    enemy.onclick = (ev) => {
      const r = Game.clickAttack();
      Sound.play('click');
      const o = this.floatOrigin(ev, enemy);
      // Crítico e ataque duplo merecem um número próprio (são o evento raro); o dano comum acumula,
      // pelo mesmo motivo do clique na moeda.
      if (r.crit) this.floatText(o.x, o.y, '★ CRIT! -' + fmt(r.dmg), '#ffd700');
      else if (r.dbl) this.floatText(o.x, o.y, '⚔️×2 -' + fmt(r.dmg), '#ff9d5e');
      else this.floatAccum('atk', o.x, o.y, r.dmg, '#ff6b5e', (v) => '-' + fmt(v));
      this.shakeEnemy();
    };
    combat.appendChild(enemy);

    const bossMechEl = this.el('div', 'boss-mech hidden', '');   // Chefes Inteligentes (#7)
    combat.appendChild(bossMechEl);

    const hpBar = this.el('div', 'hp-bar');
    const hpFill = this.el('div', 'hp-fill');
    hpBar.appendChild(hpFill);
    combat.appendChild(hpBar);
    const hpText = this.el('div', 'hp-text', '');
    combat.appendChild(hpText);
    const bossTimer = this.el('div', 'boss-timer', '');
    combat.appendChild(bossTimer);
    const dpsEl = this.el('div', 'team-dps', '');
    combat.appendChild(dpsEl);
    c.appendChild(combat);
    this.R.combat = { waveEl, enemy, hpFill, hpText, bossTimer, dpsEl, bossMechEl, lastMech: undefined };

    // seletor de quantidade (vale para subir níveis nos mini-cards)
    const bar = this.el('div', 'buy-bar');
    bar.appendChild(this.el('span', 'buy-label', 'Níveis por compra:'));
    for (const amt of [1, 10, 'max']) {
      const b = this.el('button', 'buy-amt' + (this.buyAmount === amt ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
      b.setAttribute('aria-pressed', this.buyAmount === amt ? 'true' : 'false');
      b.setAttribute('aria-label', amt === 'max' ? 'Subir o máximo de níveis possível' : `Subir ${amt} nível${amt > 1 ? 'is' : ''} por vez`);
      b.onclick = () => { this.buyAmount = amt; this.dirty.heroes = true; this.renderActive(); };
      bar.appendChild(b);
    }
    c.appendChild(bar);

    this.R.heroMinis = [];
    this.R.recruit = [];
    this.R.heroesVisible = HEROES.filter(d => (!d.reqPrestige || S.prestiges >= d.reqPrestige) && (S.heroes[d.id] || S.earned >= d.baseCost * 0.3)).length;

    // ORDEM E DENSIDADE: primeiro o que o jogador FAZ (o campo de batalha, onde ele posiciona e sobe
    // heróis), depois tudo que é consulta, recolhido atrás de um cabeçalho com o número que importa.
    // Antes desta reorganização a aba tinha 1841px de altura numa tela de 800 — e os 452px logo acima
    // dos heróis eram o painel de Sinergia, quase todo composto de linhas inativas.
    this.renderFieldGrid(c);
    this.renderSynergyBar(c);
    this.renderBench(c);
    this.renderRecruit(c);
    this.renderBag(c);
    if (this.renderGearSets) this.renderGearSets(c); // expansão: Conjuntos de Equipamento (gearsets-ui.js)
    if (this.renderRelics) this.renderRelics(c);     // expansão: Relíquias (relics-ui.js)
  },

  // Painel de sinergia de time: medidor 0–100% + faixas de bônus + Estado Perfeito (100%).
  renderSynergyBar(c) {
    Game.ensureSynergy();
    // A sinergia vira uma SEÇÃO: fechada, é uma linha com a porcentagem e a próxima faixa a atingir —
    // que é a única coisa que o jogador precisa saber de relance. Aberta, mostra a escada de faixas
    // inteira, a contagem por classe e os 8 combos de composição. Fechada por padrão porque nada aqui
    // é ação: é leitura, e ocupava um quarto da altura da tela.
    const body = this.section(c, { id: 'heroes.synergy', title: '⚡ Sinergia de Time', summary: '—', open: false });
    const bar = this.el('div', 'synergy-panel');

    // cabeçalho: título + porcentagem grande
    const head = this.el('div', 'syn-head');
    head.innerHTML = `<span class="syn-title">Medidor de equipe</span><span class="syn-pct">0%</span>`;
    bar.appendChild(head);

    // barra de progresso com marcadores de faixa
    const track = this.el('div', 'syn-track');
    const fill = this.el('div', 'syn-fill');
    track.appendChild(fill);
    for (const t of SYNERGY_TIERS) {
      const mk = this.el('div', 'syn-mark');
      mk.style.left = t.at + '%';
      track.appendChild(mk);
    }
    bar.appendChild(track);

    // contagem por classe + dica de como subir
    const classes = this.el('div', 'synergy-classes');
    const classRefs = {};
    for (const cls of ['tank', 'dps', 'support']) {
      const cd = HERO_CLASSES[cls];
      const item = this.el('div', 'synergy-class');
      item.style.color = cd.color;
      item.innerHTML = `<span class="sc-icon">${cd.icon}</span><span class="sc-count">0</span>`;
      item.title = `${cd.name} em campo (proporção-alvo ${Math.round(SYNERGY_TARGET[cls] * 100)}%)`;
      classes.appendChild(item);
      classRefs[cls] = item.querySelector('.sc-count');
    }
    const hint = this.el('div', 'syn-how', '');
    const clsWrap = this.el('div', 'syn-classrow');
    clsWrap.appendChild(classes);
    clsWrap.appendChild(hint);
    bar.appendChild(clsWrap);

    // escada de faixas
    const ladder = this.el('div', 'syn-tiers');
    const tierRefs = [];
    for (const t of SYNERGY_TIERS) {
      const row = this.el('div', 'syn-tier' + (t.key === 'mega' ? ' syn-tier-mega' : ''));
      row.innerHTML = `<span class="st-at">${t.at}%</span><span class="st-ico">${t.icon}</span><span class="st-label">${t.label}</span>`;
      ladder.appendChild(row);
      tierRefs.push({ at: t.at, row });
    }
    bar.appendChild(ladder);

    // Sinergia de Composição (#2): reino + elemento + arma dos heróis em campo
    const comp = this.el('div', 'syn-comp');
    comp.appendChild(this.el('div', 'syn-comp-title', '🧩 Composição de Time'));
    const compList = this.el('div', 'syn-comp-list');
    comp.appendChild(compList);
    bar.appendChild(comp);

    body.appendChild(bar);
    this.R.synergy = { bar, fill, pctEl: head.querySelector('.syn-pct'), classRefs, hint, tierRefs, compList, compSig: null, lastPct: -1, lastMega: null };
    this.updateSynergyPanel();
  },

  // atualização por tick do painel de sinergia (chamada em updateDynamic)
  updateSynergyPanel() {
    const R = this.R.synergy;
    if (!R) return;
    Game.ensureSynergy();
    const s = Game._lastSynergy;
    const pct = s.pct;
    for (const cls in R.classRefs) R.classRefs[cls].textContent = s.counts[cls];

    if (pct !== R.lastPct) {
      R.lastPct = pct;
      R.fill.style.width = pct + '%';
      R.pctEl.textContent = pct + '%';
      // Resumo da seção fechada: a porcentagem + quanto falta pra próxima faixa. É o suficiente pra
      // o jogador decidir se vale abrir; sem isso, recolher a seção esconderia informação de verdade.
      const next = SYNERGY_TIERS.find(t => pct < t.at);
      this.setSectionSummary('heroes.synergy',
        `<b class="sec-strong">${pct}%</b>` + (next ? `<span class="sec-next">→ ${next.at}% ${next.icon}</span>` : '<span class="sec-next">🌟 máximo</span>'));
      for (const tr of R.tierRefs) tr.row.classList.toggle('on', pct >= tr.at);
      // dica: o gargalo mais barato de resolver primeiro
      let how;
      if (s.n === 0) how = '⚠️ Sem heróis em campo — arraste heróis para o Campo de Batalha!';
      else if (s.fillScore < 1) how = `🪑 Preencha o campo (${s.n}/${s.slots} slots) para +sinergia.`;
      else if (s.specScore < 1) how = `🗡️ Equipe a ARMA IDEAL de cada herói (${s.matched}/${s.n} certos).`;
      else if (s.compScore < 1) how = '⚖️ Ajuste a composição para 🛡️1 : ⚔️2 : ✨1.';
      else how = '🌟 Equipe perfeita! Estado Perfeito ativo.';
      R.hint.innerHTML = how;
    }
    const mega = pct >= 100;
    if (mega !== R.lastMega) {
      R.lastMega = mega;
      R.bar.classList.toggle('mega-on', mega);
      const grid = this.R.fieldGrid;
      if (grid) grid.classList.toggle('mega-aura', mega);
      if (mega) this.toast('🌟 ESTADO PERFEITO! +50% em tudo!', '#e8a33d', true);
    }

    // Sinergia de Composição (#2): só reconstrói a lista quando algo realmente muda
    const sig = s.teamSynergies.map(t => `${t.id}:${t.active ? 1 : 0}:${t.have}`).join('|');
    if (sig !== R.compSig) {
      R.compSig = sig;
      R.compList.innerHTML = '';
      for (const t of s.teamSynergies) {
        const row = this.el('div', 'syn-comp-row' + (t.active ? ' on' : ''));
        row.title = t.desc;
        row.innerHTML = `<span class="scr-ico">${t.icon}</span><span class="scr-name">${t.name}</span><span class="scr-prog">${t.have}/${t.need}</span><span class="scr-mark">${t.active ? '✔' : '✖'}</span>`;
        R.compList.appendChild(row);
      }
    }
  },

  // grade de slots do campo (só heróis aqui lutam)
  renderFieldGrid(c) {
    c.appendChild(this.el('h3', 'section-title', '⚔️ Campo de Batalha'));
    const grid = this.el('div', 'field-grid');
    const bySlot = {};
    for (const id of Game.fieldHeroes()) bySlot[S.heroes[id].fieldSlot] = id;
    for (let i = 0; i < Game.fieldSlots(); i++) {
      const slot = this.el('div', 'field-slot');
      slot.dataset.slotIndex = i;
      const occ = bySlot[i];
      if (occ !== undefined) {
        slot.classList.add('filled');
        slot.appendChild(this.heroMini(occ));
      } else {
        slot.appendChild(this.el('div', 'fs-empty', `<span>Slot ${i + 1}</span>`));
        slot.onclick = () => this.slotClicked(i);
      }
      this.attachSlotDrop(slot, i);
      grid.appendChild(slot);
    }
    this.R.fieldGrid = grid;
    c.appendChild(grid);
  },

  // reserva: heróis contratados fora do campo (não contribuem DPS)
  renderBench(c) {
    const bench = Game.benchHeroes();
    const totalHired = Object.keys(S.heroes).length;
    // Decisão pendente = existe slot de campo vago E alguém no banco pra ocupá-lo.
    const canPlace = bench.length > 0 && Game.firstFreeFieldSlot() !== null;
    const body = this.section(c, {
      id: 'heroes.bench',
      title: '🏕️ Reserva',
      summary: canPlace
        ? `<b class="sec-strong sec-ok">slot vago!</b><span class="sec-next">${bench.length} no banco</span>`
        : `<b class="sec-strong">${bench.length}</b> no banco<span class="sec-next">${totalHired}/${HEROES.length} contratados</span>`,
      open: canPlace,
    });
    if (!bench.length) {
      body.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Todo herói contratado está em campo agora. Contrate mais para formar uma reserva."</i>`));
      return;
    }
    const grid = this.el('div', 'bench-grid');
    this.attachBenchDrop(grid);
    for (const id of bench) grid.appendChild(this.heroMini(id));
    body.appendChild(grid);
  },

  // heróis ainda não contratados
  renderRecruit(c) {
    const list = this.el('div', 'hero-list');
    let any = false, affordable = 0, count = 0;
    for (const def of HEROES) {
      if (def.reqPrestige && S.prestiges < def.reqPrestige) continue;
      if (S.heroes[def.id]) continue;
      if (S.earned < def.baseCost * 0.3) continue;
      any = true; count++;
      if (S.gold >= def.baseCost) affordable++;
      const row = this.el('div', 'hero-row hero-locked' + (this.isNewRow('recruit', def.id) ? ' row-enter' : ''));
      const portrait = this.el('div', 'hero-portrait');
      portrait.style.backgroundImage = `url("img/heroes/${def.id}.jpg")`;
      row.appendChild(portrait);
      const info = this.el('div', 'hero-info');
      const cd = HERO_CLASSES[def.class];
      const rd = Game.heroRole(def.id);
      const roleTag = rd ? ` <span class="hero-class-tag" style="color:${rd.color}" title="${this.esc(rd.tagline)}">${rd.icon} ${rd.name}</span>` : '';
      info.appendChild(this.el('div', 'hero-name', `${this.heroIconHtml(def)} <b>${def.name}</b> <span class="hero-title">${def.title}</span>${roleTag} <span class="hero-class-tag" style="color:${cd.color}">${cd.icon} ${cd.name}</span>`));
      info.appendChild(this.el('div', 'hero-story', def.story + (rd ? ` — ${rd.tagline}` : '')));
      row.appendChild(info);
      const btn = this.el('button', 'buy-btn hire-btn');
      btn.innerHTML = `Contratar<br><span class="btn-cost">${fmt(def.baseCost)} ouro</span>`;
      btn.onclick = () => { if (Game.hireHero(def.id)) { this.dirty.heroes = true; this.renderActive(); } };
      row.appendChild(btn);
      this.R.recruit.push({ id: def.id, btn, cost: def.baseCost });
      list.appendChild(row);
    }
    if (!any) return;
    // Aberta só quando dá pra contratar alguém AGORA — que é quando ela é uma ação, e não um catálogo.
    const body = this.section(c, {
      id: 'heroes.recruit',
      title: '🤝 Recrutar',
      summary: affordable
        ? `<b class="sec-strong sec-ok">${affordable}</b> disponível${affordable > 1 ? 'is' : ''} agora`
        : `${count} no horizonte`,
      open: affordable > 0,
    });
    body.appendChild(list);
    this.R.recruitSummary = { count };
  },

  // bolsa: cartas forjadas acumuladas
  renderBag(c) {
    const n = S.forge.inventory.length;
    // Decisão pendente = alguma carta na bolsa é MELHOR que a que o herói dela já usa. Sem isso a
    // bolsa é só um depósito, e um depósito não precisa estar aberto na cara do jogador.
    const upgrades = S.forge.inventory.filter(item => {
      const h = S.heroes[item.heroId];
      if (!h) return false;
      const cur = h.gear[item.slot];
      return !cur || Game.itemScore(item) > Game.itemScore(cur);
    }).length;
    const best = n ? Math.max(...S.forge.inventory.map(i => i.rarity || 0)) : -1;
    const bestRar = best >= 0 ? RARITIES[best] : null;
    const body = this.section(c, {
      id: 'heroes.bag',
      title: '🎒 Bolsa',
      summary: !n ? 'vazia'
        : upgrades
          ? `<b class="sec-strong sec-ok">${upgrades} melhoria${upgrades > 1 ? 's' : ''}!</b><span class="sec-next">${n}/${FORGE_INVENTORY_CAP}</span>`
          : `<b class="sec-strong">${n}</b>/${FORGE_INVENTORY_CAP}<span class="sec-next" style="color:${bestRar.color}">melhor: ${bestRar.name}</span>`,
      open: upgrades > 0,
    });
    if (!n) {
      body.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Forje cartas na aba Forja — elas se acumulam aqui para você equipar quando quiser."</i>`));
      return;
    }
    const grid = this.el('div', 'bag-grid');
    for (const item of S.forge.inventory) grid.appendChild(this.bagCard(item));
    body.appendChild(grid);
  },

  // mini-card de herói (campo ou reserva): arrastável, selecionável, com nível e gear
  heroMini(heroId) {
    const def = HEROES.find(x => x.id === heroId);
    const cd = HERO_CLASSES[def.class];
    const arch = Game.heroArchetype(heroId);
    const wt = arch ? WEAPON_TYPES.find(w => w.id === arch.weapon) : null;
    const matched = Game.heroMatched(heroId);
    const role = Game.heroRole(heroId);
    const cardSel = this._selected && this._selected.type === 'card';
    const delta = cardSel ? Game.itemDeltaForHero(this._selected.id, heroId) : 0;
    const card = this.el('div', 'hero-mini' + (matched ? ' spec-on' : '') + (this.isNewRow('heroMini', heroId) ? ' row-enter-sm' : ''));
    card.dataset.heroId = heroId;
    card.draggable = true;
    if (this._selected && this._selected.type === 'hero' && this._selected.id === heroId) card.classList.add('selected');
    if (cardSel) card.classList.add(delta > 0 ? 'eligible-up' : delta < 0 ? 'eligible-down' : 'eligible-eq');
    // Papel e arquétipo dividiam DUAS linhas do card cada um, empilhadas — cinco linhas de texto por
    // herói, num card de 130px. Viraram uma faixa só de etiquetas: o papel (que muda o combate) e o
    // arquétipo (que diz qual arma forjar). O detalhe completo continua no tooltip (specTip).
    const archTag = arch
      ? `<span class="hm-tag hm-arch${matched ? ' matched' : ''}" title="${this.specTip(heroId)}">${arch.icon} ${arch.name}`
        + (matched ? ` <span class="hm-spec-on">✦</span>` : ` <span class="hm-ideal">→${wt.icon}</span>`)
        + `</span>`
      : '';
    card.innerHTML = `
      <div class="hm-head">
        <div class="hero-portrait hm-portrait" style="background-image:url('img/heroes/${heroId}.jpg')"></div>
        <span class="hm-class" style="color:${cd.color}" title="${cd.name}">${cd.icon}</span>
        ${cardSel ? `<span class="hm-delta">${this.fmtScore(delta)}</span>` : ''}
      </div>
      <div class="hm-name">${this.heroIconHtml(def)} <b>${def.name}</b></div>
      <div class="hm-tags">
        ${role ? `<span class="hm-tag hm-role" style="border-color:${role.color};color:${role.color}" title="${this.esc(role.tagline)}">${role.icon} ${role.name}</span>` : ''}
        ${archTag}
      </div>
      <div class="hm-stats"></div>
      <div class="hero-gear hm-gear"></div>
      <button class="buy-btn hm-level"></button>`;
    const statsEl = card.querySelector('.hm-stats');
    const levelBtn = card.querySelector('.hm-level');
    this.renderMiniGear(card.querySelector('.hm-gear'), heroId);
    levelBtn.onclick = (e) => { e.stopPropagation(); if (Game.levelHero(heroId, this.buyAmount)) this.updateDynamic(); };
    card.onclick = () => this.selectableClicked('hero', heroId);
    card.ondragstart = (e) => this.startDrag(e, 'hero', heroId, card);
    card.ondragend = () => { card.classList.remove('dragging'); this._dragData = null; };
    this.attachMiniDrop(card, heroId);
    this.R.heroMinis.push({ id: heroId, statsEl, levelBtn });
    return card;
  },

  // chips de gear dentro do mini-card, clicáveis (equipar carta selecionada / desequipar)
  renderMiniGear(gearEl, heroId) {
    const h = S.heroes[heroId];
    const cardItem = this._selected && this._selected.type === 'card' ? Game.findForgeItem(this._selected.id) : null;
    gearEl.innerHTML = '';
    for (const slot of GEAR_SLOTS) {
      const item = h.gear[slot.id];
      const chip = this.el('span', 'gear-chip mini-chip');
      chip.dataset.slot = slot.id;
      if (item) {
        const r = RARITIES[item.rarity];
        chip.style.borderColor = r.color;
        chip.style.color = r.color;
        const affIcons = (item.affixes || []).map(a => this.affixDef(a).icon).join('');
        // marca de arma ideal (✦) quando o tipo da arma casa com o arquétipo do herói
        const arch = slot.id === 'arma' ? Game.heroArchetype(heroId) : null;
        const ideal = arch && Game.weaponType(item) === arch.weapon;
        if (slot.id === 'arma') chip.classList.add(ideal ? 'wt-match' : 'wt-mismatch');
        // Equipamentos 2.0 (#3): conjunto (badge) + elemento (glow colorido)
        const setDef = Game.itemSetDef ? Game.itemSetDef(item) : null;
        const elDef = Game.itemElementDef ? Game.itemElementDef(item) : null;
        if (elDef) chip.style.boxShadow = `0 0 6px ${elDef.color}`;
        chip.innerHTML = `${this.gearIconHtml(item)} +${Math.round(item.mult * 100)}%${ideal ? ' <span class="chip-ideal">✦</span>' : ''}${affIcons ? ' <span class="chip-aff">' + affIcons + '</span>' : ''}${setDef ? ` <span class="chip-set">${setDef.icon}</span>` : ''}`;
        chip.title = `${slot.name} ${r.name}: +${Math.round(item.mult * 100)}% DPS`
          + (slot.id === 'arma' ? `\nTipo: ${this.weaponTypeName(item)}${ideal ? ' ✦ (ideal — especialização ativa!)' : ` (ideal deste herói: ${(WEAPON_TYPES.find(w => w.id === arch.weapon) || {}).name})`}` : '')
          + ((item.affixes && item.affixes.length) ? '\n' + item.affixes.map(a => this.affixLabel(a)).join('\n') : '')
          + (setDef ? `\n${setDef.icon} Conjunto: ${setDef.name}` : '')
          + (elDef ? `\n${elDef.icon} Elemento: ${elDef.name}` : '')
          + '\nClique para desequipar (→ Bolsa)';
      } else {
        chip.classList.add('gear-empty');
        const arch = slot.id === 'arma' ? Game.heroArchetype(heroId) : null;
        const wt = arch ? WEAPON_TYPES.find(w => w.id === arch.weapon) : null;
        chip.innerHTML = `${slot.id === 'arma' ? (wt ? wt.icon : '🗡️') : '📿'} —`;
        chip.title = arch ? `${slot.name}: vazio — arma ideal: ${wt.icon} ${wt.name}` : `${slot.name}: vazio`;
      }
      if (cardItem && cardItem.slot === slot.id) {
        const delta = Game.itemDeltaForHero(this._selected.id, heroId);
        chip.classList.add('droptarget', delta > 0 ? 'eligible-up' : delta < 0 ? 'eligible-down' : 'eligible-eq');
      }
      chip.onclick = (e) => { e.stopPropagation(); this.gearChipClicked(heroId, slot.id); };
      gearEl.appendChild(chip);
    }
  },

  // carta da bolsa: arrastável, selecionável, com botão de desmanchar
  bagCard(item) {
    const r = RARITIES[item.rarity];
    const slotName = GEAR_SLOTS.find(s => s.id === item.slot).name;
    const card = this.el('div', 'bag-card' + (this.isNewRow('bag', item.uid) ? ' row-enter-sm' : ''));
    card.dataset.uid = item.uid;
    card.draggable = true;
    card.style.borderColor = r.color;
    if (this._selected && this._selected.type === 'card' && this._selected.id === item.uid) card.classList.add('selected');
    const affIcons = (item.affixes || []).map(a => this.affixDef(a).icon).join(' ');
    // Equipamentos 2.0 (#3): conjunto (badge) + elemento (glow colorido)
    const setDef = Game.itemSetDef ? Game.itemSetDef(item) : null;
    const elDef = Game.itemElementDef ? Game.itemElementDef(item) : null;
    if (elDef) card.style.boxShadow = `0 0 10px ${elDef.color}`;
    card.innerHTML = `
      <div class="bc-icon" style="color:${r.color}">${this.gearIconHtml(item)}${setDef ? ` <span class="chip-set">${setDef.icon}</span>` : ''}</div>
      <div class="bc-rar" style="color:${r.color}">${r.name}</div>
      <div class="bc-slot">${item.slot === 'arma' ? this.weaponTypeName(item) : slotName}</div>
      <div class="bc-mult">+${Math.round(item.mult * 100)}% DPS</div>
      <div class="bc-aff">${affIcons || '—'}</div>
      <button class="bc-scrap" title="Desmanchar por materiais">♻️</button>`;
    card.title = `${r.name} ${slotName}: +${Math.round(item.mult * 100)}% DPS`
      + ((item.affixes && item.affixes.length) ? '\n' + item.affixes.map(a => this.affixLabel(a)).join('\n') : '')
      + (setDef ? `\n${setDef.icon} Conjunto: ${setDef.name}` : '')
      + (elDef ? `\n${elDef.icon} Elemento: ${elDef.name}` : '')
      + '\nClique para selecionar · arraste até um herói para equipar';
    card.onclick = () => this.selectableClicked('card', item.uid);
    card.querySelector('.bc-scrap').onclick = (e) => {
      e.stopPropagation();
      if (Game.scrapItem(item.uid)) {
        if (this._selected && this._selected.type === 'card' && this._selected.id === item.uid) this._selected = null;
        this.dirty.heroes = true;
        this.renderActive();
      }
    };
    card.ondragstart = (e) => this.startDrag(e, 'card', item.uid, card);
    card.ondragend = () => { card.classList.remove('dragging'); this._dragData = null; };
    return card;
  },

  // ----- Seleção + arrastar/soltar (um só caminho de lógica para clique e drop) -----
  _selected: null,
  _dragData: null,

  selectableClicked(type, id) {
    const sel = this._selected;
    if (sel && sel.type === type && sel.id === id) this._selected = null;      // clicar de novo = desselecionar
    else if (!sel) this._selected = { type, id };                              // primeira seleção
    else if (sel.type === 'hero' && type === 'hero') { this.resolveHeroSwap(sel.id, id); this._selected = null; }
    else if (sel.type === 'card' && type === 'hero') { Game.equipItem(sel.id, id); this._selected = null; }
    else this._selected = { type, id };                                        // troca a seleção
    this.dirty.heroes = true;
    this.renderActive();
  },

  slotClicked(i) {
    const sel = this._selected;
    if (sel && sel.type === 'hero') Game.setFieldSlot(sel.id, i);
    this._selected = null;
    this.dirty.heroes = true;
    this.renderActive();
  },

  gearChipClicked(heroId, slotId) {
    const sel = this._selected;
    if (sel && sel.type === 'card') {
      const item = Game.findForgeItem(sel.id);
      if (item && item.slot === slotId) {
        Game.equipItem(sel.id, heroId);
        this._selected = null;
        this.dirty.heroes = true;
        this.renderActive();
      }
      return;
    }
    const h = S.heroes[heroId];
    if (h && h.gear[slotId]) {
      if (!Game.unequipItem(heroId, slotId)) { this.toast('🎒 Bolsa cheia!', '#ff6b5e'); return; }
      this.dirty.heroes = true;
      this.renderActive();
    }
  },

  // troca posições de dois heróis (campo↔campo, campo↔reserva); setFieldSlot desloca o ocupante
  resolveHeroSwap(selId, targetId) {
    if (selId === targetId) return;
    const sel = S.heroes[selId], tgt = S.heroes[targetId];
    if (!sel || !tgt) return;
    const selSlot = (sel.fieldSlot === undefined ? null : sel.fieldSlot);
    const tgtSlot = (tgt.fieldSlot === undefined ? null : tgt.fieldSlot);
    if (tgtSlot !== null) Game.setFieldSlot(selId, tgtSlot);
    else if (selSlot !== null) Game.setFieldSlot(targetId, selSlot);
    // ambos na reserva: sem troca de posição
  },

  startDrag(e, type, id, card) {
    this._dragData = { type, id };
    try { e.dataTransfer.setData('text/plain', type + ':' + id); e.dataTransfer.effectAllowed = 'move'; } catch (_) {}
    setTimeout(() => card.classList.add('dragging'), 0);
  },

  attachSlotDrop(slot, i) {
    slot.ondragover = (e) => { if (this._dragData) { e.preventDefault(); slot.classList.add('dragover'); } };
    slot.ondragleave = () => slot.classList.remove('dragover');
    slot.ondrop = (e) => {
      e.preventDefault();
      slot.classList.remove('dragover');
      const d = this._dragData;
      this._dragData = null;
      if (!d) return;
      if (d.type === 'hero') Game.setFieldSlot(d.id, i);
      else if (d.type === 'card') {
        const occ = Game.fieldHeroes().find(id => S.heroes[id].fieldSlot === i);
        if (occ) Game.equipItem(d.id, occ);
      }
      this._selected = null;
      this.dirty.heroes = true;
      this.renderActive();
    };
  },

  attachMiniDrop(card, heroId) {
    card.ondragover = (e) => { if (this._dragData) { e.preventDefault(); e.stopPropagation(); card.classList.add('dragover'); } };
    card.ondragleave = () => card.classList.remove('dragover');
    card.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('dragover');
      const d = this._dragData;
      this._dragData = null;
      if (!d) return;
      if (d.type === 'hero') this.resolveHeroSwap(d.id, heroId);
      else if (d.type === 'card') Game.equipItem(d.id, heroId);
      this._selected = null;
      this.dirty.heroes = true;
      this.renderActive();
    };
  },

  attachBenchDrop(grid) {
    grid.ondragover = (e) => { if (this._dragData && this._dragData.type === 'hero') { e.preventDefault(); grid.classList.add('dragover'); } };
    grid.ondragleave = () => grid.classList.remove('dragover');
    grid.ondrop = (e) => {
      e.preventDefault();
      grid.classList.remove('dragover');
      const d = this._dragData;
      this._dragData = null;
      if (!d || d.type !== 'hero') return;
      Game.benchHero(d.id);
      this._selected = null;
      this.dirty.heroes = true;
      this.renderActive();
    };
  },

  // um afixo pode ser genérico (FORGE_AFFIXES) ou elemental (FORGE_ELEMENT_AFFIXES, quando a.element existe)
  affixDef(a) {
    if (a.element) {
      const e = FORGE_ELEMENT_AFFIXES.find(x => x.type === a.type && x.element === a.element);
      if (e) return e;
    }
    return FORGE_AFFIXES.find(x => x.type === a.type);
  },

  affixLabel(a) {
    const def = this.affixDef(a);
    return `${def.icon} +${Math.round(a.val * 100)}% ${def.tip}`;
  },

  // nome legível do tipo de arma de um item (ou '' se não for arma)
  weaponTypeName(item) {
    const wt = Game.weaponType(item);
    const def = WEAPON_TYPES.find(w => w.id === wt);
    return def ? `${def.icon} ${def.name}` : '';
  },

  // tooltip de especialização do herói (arquétipo, arma ideal, perks e status)
  specTip(heroId) {
    const role = Game.heroRole(heroId);
    let t = '';
    if (role) {
      t += `${role.icon} PAPEL: ${role.name} — ${role.tagline}\n`;
      t += role.perks.map(p => '• ' + p).join('\n');
      t += '\n\n';
    }
    const arch = Game.heroArchetype(heroId);
    if (!arch) return t.trim();
    const wt = WEAPON_TYPES.find(w => w.id === arch.weapon);
    const matched = Game.heroMatched(heroId);
    t += `${arch.icon} ${arch.name} — arma ideal: ${wt.icon} ${wt.name}\n`;
    t += arch.perks.map(p => '• ' + p).join('\n');
    t += matched
      ? `\n✦ ESPECIALIZAÇÃO ATIVA (força ×${Game.specScale(S.heroes[heroId].gear.arma).toFixed(1)} pela raridade da arma)`
      : `\n⚠️ Equipe uma ${wt.name} para ativar estes bônus.`;
    return t;
  },

  // ---------- Forja de Armas ----------

  // Δ força de gear em pontos percentuais (itemScore está em unidades de multiplicador de DPS)
  fmtScore(delta) {
    const pct = Math.round(delta * 100);
    if (pct === 0) return '=';
    return (pct > 0 ? '▲ +' : '▼ ') + pct + '%';
  },

  // Chances de raridade de um tier da Forja.
  // Antes isto era uma fileira de porcentagens cruas e sem rótulo ("58% 32% 9% 1%") — o jogador via
  // quatro números sem saber do que eram nem qual tier era melhor. Agora é uma BARRA empilhada com a
  // cor de cada raridade (lê-se de relance qual tier empurra a distribuição pra direita) mais a linha
  // que carrega a decisão de verdade: a chance da melhor raridade possível ali. Os números exatos de
  // todas as faixas continuam disponíveis no tooltip.
  forgeOddsHtml(tier) {
    let sum = 0;
    for (const w of tier.weights) sum += w;
    const segs = tier.weights.map((w, i) =>
      w > 0 ? `<span class="ft-seg" style="width:${(w / sum) * 100}%;background:${RARITIES[i].color}" title="${RARITIES[i].name}: ${Math.round((w / sum) * 100)}%"></span>` : ''
    ).join('');
    // melhor raridade alcançável neste tier + a chance dela
    let bestIdx = -1;
    tier.weights.forEach((w, i) => { if (w > 0) bestIdx = i; });
    const bestPct = (tier.weights[bestIdx] / sum) * 100;
    const best = RARITIES[bestIdx];
    return `<div class="ft-bar">${segs}</div>` +
      `<div class="ft-best">até <b style="color:${best.color}">${best.name}</b>` +
      `<span class="ft-best-pct">${bestPct < 1 ? bestPct.toFixed(1) : Math.round(bestPct)}%</span></div>`;
  },

  // Tooltip do tier: a tabela completa de chances, que é referência e não precisa estar na tela.
  forgeOddsTip(tier) {
    let sum = 0;
    for (const w of tier.weights) sum += w;
    const lines = tier.weights.map((w, i) =>
      w > 0 ? `${RARITIES[i].name}: ${Math.round((w / sum) * 100)}%` : null).filter(Boolean);
    return `Chances de ${tier.name}\n` + lines.join('\n') +
      (tier.affixMax ? `\nAté ${tier.affixMax} afixo(s) por carta.` : '');
  },

  renderForge(c) {
    if (!Game.forgeUnlocked()) return;

    c.appendChild(this.el('h3', 'section-title', '🔨 Forja de Armas'));
    c.appendChild(this.el('p', 'forge-intro',
      'Gaste recursos para forjar equipamento. Cada carta revela raridade e <b>afixos</b> — as cartas vão para a <b>Bolsa</b> (na aba Heróis), onde você as equipa ou desmancha quando quiser.'));

    const panel = this.el('div', 'forge-panel');
    this.R.forge = { tiers: [], panel };

    const tiers = this.el('div', 'forge-tiers');
    for (const t of FORGE_TIERS) {
      const unlocked = Game.forgeTierUnlocked(t);
      const btn = this.el('button', 'forge-tier' + (unlocked ? '' : ' locked'));
      const npcName = t.unlockAt ? NPCS.find(n => n.id === t.unlockAt.npc).name : '';
      btn.innerHTML = `<div class="ft-head">${this.iconImgHtml(`img/forge-tiers/${t.id}.jpg`, t.icon, 'ft-ico')} ${t.name}</div>
        <div class="ft-odds">${unlocked ? this.forgeOddsHtml(t) : `<span class="ft-lock">🔒 amizade nv ${t.unlockAt.lvl} com ${npcName}</span>`}</div>
        <div class="ft-cost"></div>`;
      if (unlocked) btn.title = this.forgeOddsTip(t);
      btn.onclick = () => { if (Game.forgeItem(t.id)) this.updateDynamic(); };
      tiers.appendChild(btn);
      this.R.forge.tiers.push({ id: t.id, btn, costEl: btn.querySelector('.ft-cost') });
    }
    panel.appendChild(tiers);

    const stat = this.el('div', 'forge-stat', '');
    panel.appendChild(stat);
    this.R.forge.stat = stat;

    const cardArea = this.el('div', 'forge-card-area');
    panel.appendChild(cardArea);
    this.R.forge.cardArea = cardArea;

    c.appendChild(panel);
  },

  // painel de revelação: mostra a carta recém-forjada com animação (Forja de Armas)
  showForgeReveal(item) {
    if (!this.R.forge || !this.R.forge.cardArea) return;
    const r = RARITIES[item.rarity];
    const slotName = GEAR_SLOTS.find(s => s.id === item.slot).name;
    const affHtml = (item.affixes || []).map(a => this.affixLabel(a)).join('<br>');
    this.R.forge.cardArea.innerHTML = `<div class="forge-card">
      <div class="bc-icon" style="color:${r.color};font-size:34px">${this.gearIconHtml(item)}</div>
      <div>
        <div class="bc-rar" style="color:${r.color}">${r.name} · ${item.slot === 'arma' ? this.weaponTypeName(item) : slotName}</div>
        <div class="bc-mult">+${Math.round(item.mult * 100)}% DPS</div>
        <div class="bc-aff">${affHtml}</div>
      </div>
    </div>`;
    this.R.forge.cardArea.querySelector('.forge-card').classList.add('reveal');
  },

  // Atualização por tick da forja (custos/afford + estatística + teto da bolsa)
  updateForge() {
    if (!this.R.forge) return;
    const full = S.forge.inventory.length >= FORGE_INVENTORY_CAP;
    for (const ref of this.R.forge.tiers) {
      const t = FORGE_TIERS.find(x => x.id === ref.id);
      if (!Game.forgeTierUnlocked(t)) { ref.btn.disabled = true; continue; }
      const cost = Game.forgeCost(ref.id);
      const parts = [
        this.forgeCostPart('ouro', S.gold, cost.gold),
        this.forgeCostPart('⛓️', S.res.ferro, cost.ferro),
      ];
      if (cost.cristal > 0) parts.push(this.forgeCostPart('💠', S.res.cristal, cost.cristal));
      ref.costEl.innerHTML = parts.filter(Boolean).join(' · ');
      const ok = Game.canForge(ref.id);
      ref.btn.classList.toggle('afford', ok);
      ref.btn.disabled = !ok;
      ref.btn.title = full ? 'Bolsa cheia — equipe ou desmanche cartas na aba Heróis' : '';
    }
    this.R.forge.stat.innerHTML =
      `<span>Forjados: <b>${S.forge.forged}</b></span>` +
      `<span>Bolsa: <b>${S.forge.inventory.length}/${FORGE_INVENTORY_CAP}</b></span>` +
      (full ? '<span class="forge-wait">⚠️ bolsa cheia — equipe ou desmanche na aba Heróis</span>' : '');
  },

  forgeCostPart(label, have, need) {
    if (need <= 0) return '';
    const ok = have >= need;
    return `<span class="${ok ? '' : 'cost-missing'}">${fmt(need)} ${label}</span>`;
  },

  // ---------- Aba: Base ----------

  renderBase(c) {
    const cells = Game.ensureBaseGrid();

    // ----- cena viva da Base (cresce com os níveis das salas) -----
    this.renderBaseScene(c);

    // (O parágrafo de instruções que ficava aqui foi para dentro da seção "Afinidades", junto do que
    // ele explica. Quem ainda não tem nenhuma sinergia ativa recebe a dica curta na própria barra de
    // sinergias logo abaixo — a instrução aparece onde e quando é útil, não permanentemente.)

    // mapa célula → sinergias ativas em que ela participa (para destacar tiles e ligações)
    const syns = Game.activeSynergies();
    const complexes = Game.activeComplexes();
    const cellSyn = {};
    for (const s of syns) {
      (cellSyn[s.i] = cellSyn[s.i] || []).push(s);
      (cellSyn[s.j] = cellSyn[s.j] || []).push(s);
    }
    // célula → string com os NÍVEIS presentes ('v' vizinhança, 'c' combinação, 'x' complexo).
    // Vira um ponto colorido por nível no canto do tile: presença, não contagem.
    const cellTiers = {};
    const addTier = (idx, t) => { if (!cellTiers[idx]) cellTiers[idx] = ''; if (!cellTiers[idx].includes(t)) cellTiers[idx] += t; };
    for (const p of Game.adjacencyPairs()) { addTier(p.i, 'v'); addTier(p.j, 'v'); }
    for (const s of syns) { addTier(s.i, 'c'); addTier(s.j, 'c'); }
    for (const cx of complexes) for (const idx of cx.cells) addTier(idx, 'x');

    // conexões da sala SELECIONADA: célula → nível mais forte que a liga à seleção (para o realce)
    const conn = this.baseSel !== null ? Game.roomConnections(this.baseSel) : null;
    const linked = {};
    if (conn) {
      for (const v of conn.vizinhanca) linked[v.other] = 'v';
      for (const cb of conn.combinacoes) linked[cb.other] = 'c';
      for (const cx of conn.complexos) for (const idx of cx.cells) if (idx !== this.baseSel) linked[idx] = 'x';
    }

    // ----- painel de sinergias ativas -----
    const bonus = Game.synergyBonuses();
    const anyBonus = Object.values(bonus).some(v => v > 0);
    const sbar = this.el('div', 'syn-bar');
    if (anyBonus) {
      // contagem por NÍVEL à esquerda (o que você montou) e o efeito somado à direita (o que isso dá)
      const nViz = Game.adjacencyPairs().length;
      const counts = `<span class="syn-count sd-v" title="Pares de salas vizinhas">🟢 ${nViz}</span>` +
        `<span class="syn-count sd-c" title="Combinações específicas ativas">🔵 ${syns.length}</span>` +
        `<span class="syn-count sd-x" title="Complexos completos">🟣 ${complexes.length}</span>`;
      const tags = [];
      for (const k in bonus) if (bonus[k] > 0) tags.push(`<span class="syn-tag syn-${k}">+${Math.round(bonus[k] * 100)}% ${SYNERGY_LABELS[k]}</span>`);
      sbar.innerHTML = `${counts}<span class="syn-sep"></span>${tags.join('')}`;
    } else {
      sbar.innerHTML = `<span class="syn-bar-title">⚡ Sinergias</span> <span class="syn-empty">Construa salas e deixe-as vizinhas — toque numa sala para ver com quem ela se conecta.</span>`;
    }
    c.appendChild(sbar);

    // ----- layout: grade à esquerda, leitura à direita -----
    // A grade tinha `max-width: 560px` num painel de 1280: sobravam 720px de vazio à direita, e as
    // células ficavam pequenas demais para a arte aparecer. Agora a aba é uma coluna dupla — a grade
    // cresce até 760px e o painel de ligações + o manual ocupam a lateral, que antes era só buraco.
    // Abaixo de 1100px de largura o layout volta a ser uma coluna só (ver .base-layout no CSS).
    const layout = this.el('div', 'base-layout');
    const mainCol = this.el('div', 'base-main');
    const sideCol = this.el('aside', 'base-side');

    // ----- a grade -----
    // A grade vive dentro de um wrapper posicionado, porque um <svg> por cima dela desenha as
    // LIGAÇÕES da sala selecionada. A regra visual da Base: limpa por padrão, e as conexões daquela
    // peça aparecem só quando o jogador seleciona uma — em vez de todos os prédios exibindo os seus
    // vínculos ao mesmo tempo, que é o que transformaria a Base numa tela de informação.
    const gridWrap = this.el('div', 'base-grid-wrap');
    const links = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    links.setAttribute('class', 'base-links');
    gridWrap.appendChild(links);
    this.R.baseLinks = links;

    const grid = this.el('div', 'base-grid');
    grid.style.gridTemplateColumns = `repeat(${BASE_GRID_COLS}, 1fr)`;
    this.R.rooms = [];
    for (let i = 0; i < cells.length; i++) {
      const id = cells[i];
      const tile = this.el('div', 'base-cell' + (id ? '' : ' empty') + (this.baseSel === i ? ' selected' : ''));
      tile.dataset.index = i;
      // realce das peças ligadas à selecionada (a própria seleção já tem .selected)
      if (this.baseSel !== null && linked[i] && i !== this.baseSel) tile.classList.add('linked', 'link-' + linked[i]);
      else if (this.baseSel !== null && i !== this.baseSel) tile.classList.add('dimmed');

      // drag & drop (desktop) — no mobile o toque cuida do movimento
      tile.draggable = !!id;
      tile.addEventListener('dragstart', (e) => { this.baseDrag = i; e.dataTransfer.effectAllowed = 'move'; tile.classList.add('dragging'); });
      tile.addEventListener('dragend', () => { tile.classList.remove('dragging'); });
      tile.addEventListener('dragover', (e) => { e.preventDefault(); tile.classList.add('drop-hint'); });
      tile.addEventListener('dragleave', () => tile.classList.remove('drop-hint'));
      tile.addEventListener('drop', (e) => {
        e.preventDefault();
        tile.classList.remove('drop-hint');
        if (this.baseDrag !== null && this.baseDrag !== i) {
          Game.swapCells(this.baseDrag, i);
          this.baseSel = null; this.baseDrag = null;
          Sound.play('build');
          this.dirty.base = true; this.renderActive();
        }
      });
      // toque/clique: selecionar para mover / trocar (universal, funciona no mobile)
      tile.onclick = (e) => {
        if (e.target.closest('.base-build')) return; // botão de construir tem ação própria
        this.baseTileTap(i);
      };

      if (id) {
        const r = ROOMS.find(x => x.id === id);
        const lvl = Game.roomLvl(id);
        const tier = this.roomTier(lvl);
        if (lvl > 0) tile.classList.add('built', 'rt-' + tier);
        // Marcador discreto: um ponto por NÍVEL de sinergia em que a sala participa (verde/azul/roxo),
        // sem número e sem texto. Diz "tem algo aqui" sem virar informação na tela — o detalhe só
        // aparece ao selecionar. Substituiu o antigo selo "⚡3", que exibia contagem permanentemente.
        const tiers = cellTiers[i] || '';
        const badge = tiers
          ? `<span class="syn-dots" title="Clique para ver as ligações desta sala">` +
            tiers.split('').map(t => `<i class="syn-dot sd-${t}"></i>`).join('') + `</span>`
          : '';
        const decor = this.roomDecor(tier);
        tile.innerHTML =
          badge + this.iconImgHtml(`img/rooms/${id}.jpg`, r.icon, 'base-icon', 'span', 'base-art') +
          decor +
          `<span class="base-name">${r.name}</span>` +
          `<span class="room-lvl">Nv ${lvl}</span>`;
        tile.title = r.desc;
        const btn = this.el('button', 'buy-btn base-build');
        btn.onclick = (e) => {
          e.stopPropagation();                 // não deixa o clique virar "selecionar célula"
          if (Game.buildRoom(id)) { this.dirty.base = true; this.renderActive(); }
        };
        tile.appendChild(btn);
        this.R.rooms.push({ id, btn, lvlEl: tile.querySelector('.room-lvl'), tile });
      } else {
        tile.innerHTML = `<span class="base-empty-mark">＋</span>`;
      }
      grid.appendChild(tile);
    }
    gridWrap.appendChild(grid);
    mainCol.appendChild(gridWrap);

    // ----- painel de ligações da sala selecionada (coluna lateral) -----
    this.renderBaseConnections(sideCol, conn);

    layout.appendChild(mainCol);
    layout.appendChild(sideCol);
    c.appendChild(layout);
    // o SVG precisa da grade já no layout pra medir os centros das células
    requestAnimationFrame(() => this.drawBaseLinks());

    // ----- legenda de sinergias possíveis -----
    // Eram 667px fixos de tabela — as 21 afinidades do jogo listadas o tempo todo, embaixo da grade,
    // quase todas inativas. É a definição de referência: consulta-se ao planejar o arranjo, não a
    // cada segundo. Vira seção fechada, e o resumo já diz quantas das 21 você descobriu.
    const activeKeys = new Set(syns.map(s => s.def.name));
    const activeCx = new Set(complexes.map(cx => cx.def.id));
    // o manual mora na coluna lateral, junto do painel de ligações: é a área de LEITURA da aba
    const legendBody = this.section(sideCol, {
      id: 'base.affinities',
      title: '🧭 Manual de Adjacência',
      summary: `<b class="sec-strong${activeCx.size ? ' sec-ok' : ''}">${activeCx.size}</b>/${ROOM_COMPLEXES.length} complexos` +
        `<span class="sec-next">${activeKeys.size}/${ROOM_SYNERGIES.length} combinações</span>`,
      open: false,
    });
    legendBody.appendChild(this.el('p', 'tab-intro',
      'Só contam salas <b>construídas</b> e <b>ortogonalmente vizinhas</b> (lado a lado, nunca na diagonal). ' +
      'Todo bônus escala com o <b>MENOR nível</b> entre as salas envolvidas — subir só uma não adianta. ' +
      'Arraste (ou use <b>⇄ Mover</b>) para reposicionar.'));

    // 🟣 Complexos primeiro: são o topo do sistema e o que dá o objetivo de arranjo.
    legendBody.appendChild(this.el('div', 'syn-legend-title', '🟣 Complexos — 3 salas conectadas entre si'));
    const cxList = this.el('div', 'syn-legend');
    for (const d of ROOM_COMPLEXES) {
      const on = activeCx.has(d.id);
      const rooms = d.rooms.map(rid => { const r = ROOMS.find(x => x.id === rid); return `${r.icon} ${r.name}`; }).join(' + ');
      const effs = Object.keys(d.per).map(k => `+${Math.round(d.per[k] * 100)}%/nv ${SYNERGY_LABELS[k]}`).join(' · ');
      const row = this.el('div', 'syn-legend-row cx-row' + (on ? ' on' : ''));
      row.innerHTML = `<b>${d.icon} ${d.name}</b><span class="syn-legend-rooms">${rooms}</span>` +
        `<span class="syn-legend-eff">${effs}</span><span class="cx-desc">${d.desc}</span>`;
      cxList.appendChild(row);
    }
    legendBody.appendChild(cxList);

    // 🔵 Combinações
    legendBody.appendChild(this.el('div', 'syn-legend-title', '🔵 Combinações — 2 salas específicas lado a lado'));
    const legend = this.el('div', 'syn-legend');
    for (const d of ROOM_SYNERGIES) {
      const ra = ROOMS.find(x => x.id === d.a), rb = ROOMS.find(x => x.id === d.b);
      const on = activeKeys.has(d.name);
      const row = this.el('div', 'syn-legend-row' + (on ? ' on' : ''));
      row.innerHTML = `<span class="syn-legend-pair">${ra.icon}${rb.icon}</span> <b>${d.icon} ${d.name}</b> <span class="syn-legend-eff">${d.short}</span>`;
      legend.appendChild(row);
    }
    legendBody.appendChild(legend);

    // 🟢 Vizinhança
    legendBody.appendChild(this.el('div', 'syn-legend-title', '🟢 Vizinhança — qualquer par de salas construídas'));
    legendBody.appendChild(this.el('div', 'syn-legend-row on',
      `<span class="syn-legend-pair">▪️▪️</span> <b>Adjacência</b> ` +
      `<span class="syn-legend-eff">+${(ADJACENCY_BONUS * 100).toFixed(1)}%/nv de ouro por par — vale a pena não deixar buracos na grade</span>`));
  },

  // faixa visual de um edifício pelo nível (1..4) — dirige tamanho/decorações
  roomTier(lvl) { return lvl <= 0 ? 0 : lvl < 5 ? 1 : lvl < 10 ? 2 : lvl < 20 ? 3 : 4; },

  // decorações que surgem sobre o tile conforme o nível cresce (bandeiras, tochas, brilho)
  roomDecor(tier) {
    if (tier <= 1) return '';
    const bits = [];
    if (tier >= 2) bits.push('<span class="rd rd-flag">🚩</span>');
    if (tier >= 3) bits.push('<span class="rd rd-fire">🔥</span>');
    if (tier >= 4) bits.push('<span class="rd rd-star">✨</span>');
    return `<span class="room-decor">${bits.join('')}</span>`;
  },

  // ----- Cena viva da Base: horizonte que cresce, NPCs andando, fogueira, partículas -----
  renderBaseScene(c) {
    const totalLvl = ROOMS.reduce((s, r) => s + Game.roomLvl(r.id), 0);
    const devTier = totalLvl <= 0 ? 0 : totalLvl < 8 ? 1 : totalLvl < 20 ? 2 : totalLvl < 40 ? 3 : 4;
    const scene = this.el('div', 'base-scene');
    scene.dataset.tier = devTier;

    // horizonte: um "prédio" por sala construída, com altura pelo nível (sensação de crescimento)
    const skyline = this.el('div', 'bs-skyline');
    const built = ROOMS.filter(r => Game.roomLvl(r.id) > 0);
    if (!built.length) {
      skyline.appendChild(this.el('div', 'bs-empty', '🏕️ Terreno vazio — construa salas para erguer sua sede.'));
    } else {
      for (const r of built) {
        const lvl = Game.roomLvl(r.id);
        const h = Math.min(100, 30 + lvl * 7);
        const b = this.el('div', 'bs-building');
        b.style.height = h + '%';
        b.title = `${r.name} — Nv ${lvl}`;
        b.innerHTML = `${this.iconImgHtml(`img/rooms/${r.id}.jpg`, r.icon, 'bsb-ico')}<span class="bsb-lvl">${lvl}</span>`;
        skyline.appendChild(b);
      }
    }
    scene.appendChild(skyline);

    // chão + vida: NPCs caminhando (nº cresce com Quartel/Mercado), fogueira, bandeira do Castelo
    const ground = this.el('div', 'bs-ground');
    const npcCount = Math.min(9, 1 + Game.roomLvl('quartel') + Game.roomLvl('mercado') + Math.floor(totalLvl / 6));
    const walkers = ['🚶', '🧙', '🧝', '👷', '🛡️', '🐕', '🐎', '🧑‍🌾', '💂'];
    for (let i = 0; i < npcCount; i++) {
      const npc = this.el('div', 'bs-npc');
      npc.textContent = walkers[i % walkers.length];
      npc.style.animationDuration = (7 + (i % 5) * 2.5) + 's';
      npc.style.animationDelay = (-i * 1.7) + 's';
      npc.style.bottom = (2 + (i % 3) * 6) + 'px';
      ground.appendChild(npc);
    }
    if (Game.roomLvl('templo') > 0 || totalLvl > 5) ground.appendChild(this.el('div', 'bs-fire', '🔥'));
    if (Game.roomLvl('castelo') > 0) {
      const banners = this.el('div', 'bs-banners');
      banners.innerHTML = '🚩🏯🚩';
      ground.appendChild(banners);
    }
    scene.appendChild(ground);

    // partículas ambientais (brasas/pólen subindo) — intensidade pela fase de desenvolvimento
    const parts = this.el('div', 'bs-particles');
    const pn = Math.min(14, 3 + devTier * 3);
    for (let i = 0; i < pn; i++) {
      const p = this.el('div', 'bs-mote');
      p.style.left = (5 + (i * 97) % 90) + '%';
      p.style.animationDuration = (5 + (i % 6)) + 's';
      p.style.animationDelay = (-i * 0.9) + 's';
      parts.appendChild(p);
    }
    scene.appendChild(parts);

    // rótulo de crescimento
    const stages = ['Terreno', 'Acampamento', 'Vilarejo', 'Fortaleza', 'Cidadela Real'];
    scene.appendChild(this.el('div', 'bs-stage', `${['🏕️','🏕️','🏘️','🏰','🏯'][devTier]} ${stages[devTier]} · ${totalLvl} níveis`));

    c.appendChild(scene);
  },

  // Cores dos três níveis de sinergia da Base (usadas no SVG, nos pontos e no painel).
  SYN_TIER: {
    v: { key: 'v', icon: '🟢', name: 'Vizinhança', color: '#5fbf6b' },
    c: { key: 'c', icon: '🔵', name: 'Combinação', color: '#4fa8d8' },
    x: { key: 'x', icon: '🟣', name: 'Complexo',   color: '#a97ce8' },
  },

  // Desenha as ligações da sala selecionada por cima da grade. Só a selecionada — a Base fica limpa
  // enquanto nada estiver selecionado, que é a diferença entre "entender a relação entre estruturas"
  // e "olhar para todos os vínculos de todos os prédios ao mesmo tempo".
  drawBaseLinks() {
    const svg = this.R.baseLinks;
    if (!svg || !svg.isConnected) return;
    svg.innerHTML = '';
    if (this.baseSel === null) return;

    const wrap = svg.parentElement;
    const wr = wrap.getBoundingClientRect();
    if (!wr.width) return;
    svg.setAttribute('viewBox', `0 0 ${wr.width} ${wr.height}`);
    const center = (idx) => {
      const el = wrap.querySelector(`.base-cell[data-index="${idx}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
    };

    const conn = Game.roomConnections(this.baseSel);
    const from = center(this.baseSel);
    if (!from) return;

    // Um mesmo par de salas pode aparecer em mais de um nível ao mesmo tempo (vizinhas E numa
    // combinação E dentro de um complexo). Os BÔNUS acumulam — e o painel os lista todos —, mas
    // desenhar três traços sobrepostos entre as mesmas duas peças é ruído. Aqui fica só o traço do
    // nível mais forte por par.
    const RANK = { v: 0, c: 1, x: 2 };
    const seg = new Map();
    const add = (a, b, tier) => {
      const key = Math.min(a, b) + ':' + Math.max(a, b);
      const cur = seg.get(key);
      if (!cur || RANK[tier] > RANK[cur]) seg.set(key, tier);
    };

    for (const v of conn.vizinhanca) add(this.baseSel, v.other, 'v');
    for (const cb of conn.combinacoes) add(this.baseSel, cb.other, 'c');
    for (const cx of conn.complexos) {
      // um complexo é um grupo, não um par: liga cada membro aos membros VIZINHOS dele no grupo,
      // desenhando o contorno real da peça em vez de um leque saindo da selecionada.
      for (const a of cx.cells) for (const b of Game.cellAllNeighbors(a)) {
        if (b > a && cx.cells.includes(b)) add(a, b, 'x');
      }
    }

    // ordem de desenho: do nível mais fraco pro mais forte, pra linha roxa ficar por cima
    for (const tier of ['v', 'c', 'x']) {
      for (const [key, t] of seg) {
        if (t !== tier) continue;
        const [a, b] = key.split(':').map(Number);
        const pa = center(a), pb = center(b);
        if (!pa || !pb) continue;
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        el.setAttribute('x1', pa.x); el.setAttribute('y1', pa.y);
        el.setAttribute('x2', pb.x); el.setAttribute('y2', pb.y);
        el.setAttribute('class', 'bl-line bl-' + tier);
        if (tier === 'v') el.setAttribute('stroke-dasharray', '4 5');
        svg.appendChild(el);
      }
    }
  },

  // Painel abaixo da grade: o que a sala selecionada ganha, nível a nível. É o "Selecionando o
  // Quartel → ⚔️─🛡️ Sinergia Militar +20% Dano" do pedido, em forma de lista legível.
  renderBaseConnections(c, conn) {
    if (!conn) {
      c.appendChild(this.el('div', 'base-conn base-conn-empty',
        '👆 Toque numa sala para ver <b>com quem ela se conecta</b> — e toque em outra célula para trocá-las de lugar.'));
      return;
    }
    const g = Game.ensureBaseGrid();
    const selDef = ROOMS.find(r => r.id === g[this.baseSel]);
    const panel = this.el('div', 'base-conn');
    const roomName = (idx) => { const r = ROOMS.find(x => x.id === g[idx]); return r ? `${r.icon} ${r.name}` : '—'; };

    let html = `<div class="bc-head">${selDef.icon} <b>${selDef.name}</b> <span class="bc-lvl">Nv ${Game.roomLvl(selDef.id)}</span>` +
      `<button class="bc-move${this.baseMove ? ' armed' : ''}">${this.baseMove ? '⇄ toque no destino…' : '⇄ Mover'}</button></div>`;

    if (conn.complexos.length) {
      html += conn.complexos.map(cx => {
        const effs = Object.keys(cx.def.per)
          .map(k => `<span class="bc-eff">+${Math.round(cx.def.per[k] * cx.lvl * cx.mul * 100)}% ${SYNERGY_LABELS[k]}</span>`).join('');
        return `<div class="bc-row bc-x"><span class="bc-tier">🟣 Complexo</span>` +
          `<span class="bc-name">${cx.def.icon} ${cx.def.name}</span>` +
          `<span class="bc-with">${cx.cells.map(roomName).join(' ─ ')}</span>${effs}</div>`;
      }).join('');
    }
    if (conn.combinacoes.length) {
      html += conn.combinacoes.map(cb =>
        `<div class="bc-row bc-c"><span class="bc-tier">🔵 Combinação</span>` +
        `<span class="bc-name">${cb.def.icon} ${cb.def.name}</span>` +
        `<span class="bc-with">${roomName(cb.other)}</span>` +
        `<span class="bc-eff">+${Math.round(cb.value * 100)}% ${SYNERGY_LABELS[cb.def.type]}</span></div>`).join('');
    }
    if (conn.vizinhanca.length) {
      const total = conn.vizinhanca.reduce((a, v) => a + v.value, 0);
      html += `<div class="bc-row bc-v"><span class="bc-tier">🟢 Vizinhança</span>` +
        `<span class="bc-name">${conn.vizinhanca.length} sala${conn.vizinhanca.length > 1 ? 's' : ''} ao lado</span>` +
        `<span class="bc-with">${conn.vizinhanca.map(v => roomName(v.other)).join(' · ')}</span>` +
        `<span class="bc-eff">+${(total * 100).toFixed(1)}% ouro</span></div>`;
    }
    if (!conn.complexos.length && !conn.combinacoes.length && !conn.vizinhanca.length) {
      html += `<div class="bc-row bc-none">Nenhuma ligação — esta sala está isolada. Arraste-a para junto de outra.</div>`;
    }
    // o que FALTA: o gancho de puzzle. Diz quais complexos esta sala poderia formar e com quem.
    const potential = ROOM_COMPLEXES.filter(d => d.rooms.includes(selDef.id) && !conn.complexos.some(cx => cx.def.id === d.id));
    if (potential.length) {
      html += potential.map(d => {
        const faltam = d.rooms.filter(rid => rid !== selDef.id).map(rid => { const r = ROOMS.find(x => x.id === rid); return `${r.icon} ${r.name}`; });
        return `<div class="bc-row bc-todo"><span class="bc-tier">🟣 Possível</span>` +
          `<span class="bc-name">${d.icon} ${d.name}</span>` +
          `<span class="bc-with">junte com ${faltam.join(' + ')}</span></div>`;
      }).join('');
    }
    panel.innerHTML = html;
    panel.querySelector('.bc-move').onclick = () => {
      this.baseMove = !this.baseMove;
      this.dirty.base = true;
      this.renderActive();
    };
    c.appendChild(panel);
  },

  // toque numa célula da grade: seleciona / troca / cancela
  // Selecionar passou a significar INSPECIONAR (ver as ligações da sala), então o toque seguinte não
  // pode mais trocar as salas de lugar por padrão: o jogador explorando as conexões destruiria o
  // próprio arranjo sem querer. Mover virou modo explícito, armado pelo botão "⇄ Mover" do painel.
  // No desktop o arrastar continua funcionando direto, sem armar nada.
  baseTileTap(index) {
    const g = Game.ensureBaseGrid();
    if (this.baseSel !== null && this.baseMove && this.baseSel !== index) {
      Game.swapCells(this.baseSel, index);
      this.baseSel = null; this.baseMove = false;
      Sound.play('build');
      this.dirty.base = true; this.renderActive();
      return;
    }
    if (this.baseSel === index) { this.baseSel = null; this.baseMove = false; }
    else if (g[index]) { this.baseSel = index; this.baseMove = false; }
    else { this.baseSel = null; this.baseMove = false; }
    this.dirty.base = true;
    this.renderActive();
  },

  roomCostHtml(roomId) {
    const cost = Game.roomCost(roomId);
    const names = { gold: 'ouro', madeira: '🪵', pedra: '🪨', ferro: '⛓️' };
    const parts = [];
    for (const k in cost) {
      const have = k === 'gold' ? S.gold : S.res[k];
      const ok = have >= cost[k];
      parts.push(`<span class="${ok ? '' : 'cost-missing'}">${fmt(cost[k])} ${names[k] || k}</span>`);
    }
    return parts.join(' · ');
  },

  // ---------- Aba: Talentos ----------

  renderTalents(c) {
    const know = this.el('div', 'know-banner', '');
    c.appendChild(know);
    this.R.knowBanner = know;

    const wrap = this.el('div', 'talent-trees');
    this.R.talents = [];
    for (const treeId in TALENT_TREES) {
      const tree = TALENT_TREES[treeId];
      const col = this.el('div', 'talent-col');
      col.appendChild(this.el('h3', 'tree-title', `${tree.icon} ${tree.name}`));
      for (const t of TALENTS.filter(x => x.tree === treeId)) {
        const lvl = Game.talentLvl(t.id);
        const blocker = Game.talentExclusionBlocker(t.id);
        const card = this.el('button', 'talent-card' + (lvl >= t.max ? ' maxed' : '') + (blocker ? ' locked' : '') + (t.exclusiveWith ? ' rc-branch' : ''));
        const blockedDef = blocker ? TALENTS.find(x => x.id === blocker) : null;
        const costHtml = blocker ? `🔒 Bloqueado — você escolheu ${blockedDef.name}`
          : (lvl >= t.max ? 'MÁXIMO' : fmt(Game.talentCost(t.id)) + ' 📘 conhecimento');
        card.innerHTML = `${t.exclusiveWith ? '<div class="rc-branch-tag">⚔️ Ramo exclusivo — só um dos dois</div>' : ''}
          <div class="tal-head">${this.iconImgHtml(`img/talents/${t.id}.jpg`, t.icon, 'tal-ico')} <b>${t.name}</b> <span class="tal-lvl">${lvl}/${t.max}</span></div>
          <div class="tal-desc">${t.desc}</div>
          <div class="tal-cost">${costHtml}</div>`;
        card.onclick = () => { if (Game.buyTalent(t.id)) this.updateDynamic(); };
        col.appendChild(card);
        this.R.talents.push({ id: t.id, btn: card, max: t.max, lvlEl: card.querySelector('.tal-lvl'), costEl: card.querySelector('.tal-cost') });
      }
      wrap.appendChild(col);
    }
    c.appendChild(wrap);
    if (Game.knowledgePerSec() <= 0) {
      c.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Talentos custam Conhecimento 📘 — construa um <b>Laboratório</b> na sua Base!"</i>`));
    }
  },

  // ---------- Aba: Prestígio ----------

  renderPrestige(c) {
    const gain = Game.essenceGain();
    const box = this.el('div', 'prestige-box');
    box.appendChild(this.el('div', 'prestige-sigil', '✦'));
    box.appendChild(this.el('h2', 'prestige-title', 'Transcendência'));
    box.appendChild(this.el('p', 'prestige-text',
      `Abandone este mundo e renasça mais forte. Você perde ouro, geradores, upgrades, heróis e base — mas ganha <b>Essência</b> permanente.<br><br>
       Cada ✦ concede <b>+2% de produção global para sempre</b>.<br>
       Você mantém: conquistas, talentos, essência e sistemas desbloqueados.`));
    box.appendChild(this.el('div', 'prestige-current', `Essência atual: <b>✦ ${fmt(S.essence)}</b> (produção ×${(1 + 0.02 * S.essence).toFixed(2)})`));

    const btn = this.el('button', 'prestige-btn' + (gain >= 1 ? '' : ' disabled'));
    btn.innerHTML = gain >= 1
      ? `RENASCER<br><span class="btn-cost">+${fmt(gain)} ✦ Essência</span>`
      : `RENASCER<br><span class="btn-cost">precisa de mais ouro nesta run (ganho atual: 0 ✦)</span>`;
    btn.onclick = () => {
      if (Game.essenceGain() < 1) return;
      this.confirmModal(`Renascer agora por <b>+${fmt(Game.essenceGain())} ✦</b>?<br><small>Ouro, geradores, heróis e base serão resetados.</small>`, () => {
        Game.doPrestige();
        this.activeTab = 'prod';
        this.dirtyAll();
        this.renderActive();
      });
    };
    box.appendChild(btn);
    box.appendChild(this.el('div', 'prestige-hint', `Ouro ganho nesta run: ${fmt(S.earned)} — a Essência cresce de forma sublinear com o ouro acumulado (expoente 0.45 — dobrar o ouro rende ~1.37× de Essência). Prestígios feitos: ${S.prestiges}`));
    c.appendChild(box);
    if (this.renderAscension) this.renderAscension(c); // expansão: Progressão em Camadas (layers-ui.js)
  },

  // ---------- Aba: Conquistas ----------

  renderAch(c) {
    const total = ACHIEVEMENTS.length, got = Object.keys(S.ach).length;
    c.appendChild(this.el('div', 'ach-summary', `<b>${got}/${total}</b> conquistas · bônus atual: <b>+${got}%</b> de produção global`));
    const cats = [...new Set(ACHIEVEMENTS.map(a => a.cat))];
    for (const cat of cats) {
      c.appendChild(this.el('h3', 'section-title', cat));
      const grid = this.el('div', 'ach-grid');
      for (const a of ACHIEVEMENTS.filter(x => x.cat === cat)) {
        const done = !!S.ach[a.id];
        const hidden = a.secret && !done;
        const card = this.el('div', 'ach-card' + (done ? ' done' : '') + (hidden ? ' secret' : ''));
        card.innerHTML = hidden
          ? `<div class="ach-icon">❓</div><div class="ach-name">???</div><div class="ach-desc">Segredo...</div>`
          : `${this.iconImgHtml(`img/achievements/${a.id}.jpg`, a.icon, 'ach-icon', 'div')}<div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
        card.title = hidden ? 'Uma conquista secreta aguarda...' : a.desc;
        grid.appendChild(card);
      }
      c.appendChild(grid);
    }
  },

  // ---------- Aba: Ajustes ----------

  renderConfig(c) {
    const box = this.el('div', 'config-box');

    const soundBtn = this.el('button', 'cfg-btn', (S.sound ? '🔊 Som: Ligado' : '🔇 Som: Desligado'));
    soundBtn.onclick = () => {
      S.sound = !S.sound;
      Sound.ensure();
      if (!S.sound) Sound.stopMusic();
      else if (S.audio.music) Sound.startMusic();
      this.dirty.config = true;
      soundBtn.innerHTML = S.sound ? '🔊 Som: Ligado' : '🔇 Som: Desligado';
    };
    box.appendChild(soundBtn);

    // volume-mestre (efeitos + música)
    const volWrap = this.el('div', 'cfg-hand');
    volWrap.appendChild(this.el('div', 'cfg-hand-label', `🎚️ Volume <small>(efeitos e música)</small>`));
    const vol = this.el('input', 'cfg-vol');
    vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = Math.round((S.audio.vol || 0.7) * 100);
    vol.oninput = () => Sound.setVolume(vol.value / 100);
    vol.onchange = () => Sound.play('click');
    volWrap.appendChild(vol);
    box.appendChild(volWrap);

    // música ambiente gerativa
    const musicBtn = this.el('button', 'cfg-btn', (S.audio.music ? '🎵 Música ambiente: Ligada' : '🎵 Música ambiente: Desligada'));
    musicBtn.onclick = () => {
      S.audio.music = !S.audio.music;
      if (S.audio.music) { Sound.startMusic(); } else { Sound.stopMusic(); }
      musicBtn.innerHTML = S.audio.music ? '🎵 Música ambiente: Ligada' : '🎵 Música ambiente: Desligada';
    };
    box.appendChild(musicBtn);

    // Autocomprador (após a pesquisa)
    if (Game.hasResearch('autocomprador')) {
      const autoBtn = this.el('button', 'cfg-btn', (S.research.autoBuy ? '🤖 Autocomprador: Ligado' : '🤖 Autocomprador: Desligado'));
      autoBtn.onclick = () => {
        S.research.autoBuy = !S.research.autoBuy;
        autoBtn.innerHTML = S.research.autoBuy ? '🤖 Autocomprador: Ligado' : '🤖 Autocomprador: Desligado';
      };
      box.appendChild(autoBtn);
    }

    const flashBtn = this.el('button', 'cfg-btn', (S.flashFx ? '✨ Efeitos de tela cheia: Ligados' : '✨ Efeitos de tela cheia: Desligados'));
    flashBtn.onclick = () => { S.flashFx = !S.flashFx; flashBtn.innerHTML = S.flashFx ? '✨ Efeitos de tela cheia: Ligados' : '✨ Efeitos de tela cheia: Desligados'; };
    box.appendChild(flashBtn);

    // Mão preferida (mobile): posição da moeda de clique na barra superior
    const handWrap = this.el('div', 'cfg-hand');
    handWrap.appendChild(this.el('div', 'cfg-hand-label', '🖐️ Mão preferida <small>(posição da moeda no celular)</small>'));
    const seg = this.el('div', 'cfg-seg');
    const mkHand = (val, label) => {
      const b = this.el('button', 'cfg-seg-btn' + (S.hand === val ? ' active' : ''), label);
      b.onclick = () => { S.hand = val; this.applyHand(); this.dirty.config = true; this.renderActive(); };
      return b;
    };
    seg.appendChild(mkHand('left', '👈 Canhoto (esquerda)'));
    seg.appendChild(mkHand('right', 'Destro (direita) 👉'));
    handWrap.appendChild(seg);
    box.appendChild(handWrap);

    const saveBtn = this.el('button', 'cfg-btn', '💾 Salvar agora');
    saveBtn.onclick = () => { saveGame(); this.toast('💾 Jogo salvo!', '#5fbf6b'); };
    box.appendChild(saveBtn);

    const expBtn = this.el('button', 'cfg-btn', '📤 Exportar save');
    expBtn.onclick = () => {
      this.showModal(`<h3>Exportar save</h3><textarea class="save-area" readonly>${exportSave()}</textarea><p><small>Copie e guarde este código.</small></p>`, true);
    };
    box.appendChild(expBtn);

    const impBtn = this.el('button', 'cfg-btn', '📥 Importar save');
    impBtn.onclick = () => {
      const m = this.showModal(`<h3>Importar save</h3><textarea class="save-area" placeholder="Cole o código do save aqui"></textarea><button class="cfg-btn" id="imp-go">Importar</button>`, true);
      m.querySelector('#imp-go').onclick = () => {
        const ok = importSave(m.querySelector('textarea').value);
        if (ok) location.reload();
        else this.toast('❌ Save inválido', '#ff6b5e');
      };
    };
    box.appendChild(impBtn);

    const resetBtn = this.el('button', 'cfg-btn danger', '☠️ Resetar TUDO (apagar save)');
    resetBtn.onclick = () => {
      this.confirmModal('Apagar <b>todo o progresso</b>, incluindo essência e conquistas?<br><small>Isso não é prestígio. É o fim.</small>', () => {
        hardReset();
        location.reload();
      });
    };
    box.appendChild(resetBtn);

    // estatísticas
    const st = this.el('div', 'stats-box');
    const D = Game.derived();
    st.innerHTML = `<h3 class="section-title">Estatísticas</h3>
      <div>Ouro total (todas as runs): <b>${fmt(S.allEarned)}</b></div>
      <div>Cliques na moeda: <b>${fmt(S.clicks)}</b></div>
      <div>Monstros derrotados: <b>${fmt(S.combat.kills)}</b> · Chefes: <b>${fmt(S.combat.bossKills)}</b></div>
      <div>Maior onda: <b>${S.combat.maxWave}</b></div>
      <div>Moedas douradas coletadas: <b>${S.goldenClicks}</b></div>
      <div>Eventos testemunhados: <b>${S.eventsSeen}</b></div>
      <div>Prestígios: <b>${S.prestiges}</b> · Essência: <b>✦ ${fmt(S.essence)}</b></div>
      <div>Tempo de jogo: <b>${fmtTime(S.playTime)}</b></div>
      <div>Fase atual: <b>${Game.currentPhase().id} — ${Game.currentPhase().name}</b></div>`;
    box.appendChild(st);
    c.appendChild(box);
  },

  // ---------- Painel esquerdo ----------

  renderLeft() {
    // recursos visíveis
    const rb = document.getElementById('resources-box');
    const defs = [
      { k: 'madeira', icon: '🪵', name: 'Madeira' },
      { k: 'pedra', icon: '🪨', name: 'Pedra' },
      { k: 'ferro', icon: '⛓️', name: 'Ferro' },
      { k: 'energia', icon: '⚡', name: 'Energia' },
      { k: 'cristal', icon: '💠', name: 'Cristais' },
      { k: 'conhecimento', icon: '📘', name: 'Conhecimento' },
    ];
    rb.innerHTML = '';
    this.R.resEls = {};
    for (const d of defs) {
      if (S.res[d.k] < 1 && !(d.k !== 'cristal' && S.unlocked.base)) continue;
      const row = this.el('div', 'res-row');
      row.innerHTML = `${this.iconImgHtml(`img/materials/${d.k}.jpg`, d.icon, 'res-icon')}<span class="res-name">${d.name}</span><span class="res-val">${fmt(S.res[d.k])}</span>`;
      rb.appendChild(row);
      this.R.resEls[d.k] = row.querySelector('.res-val');
    }
    this.dirty.left = false;
  },

  updateBuffs() {
    const bb = document.getElementById('buffs-box');
    const now = Date.now();
    const active = S.buffs.filter(b => b.until > now);
    let html = active.map(b => `<div class="buff-chip">${this.esc(b.icon)} ${this.esc(b.name)} <span class="buff-t">${fmtTime((b.until - now) / 1000)}</span></div>`).join('');
    if (S.invasion > 0) html += `<div class="buff-chip">👹 Invasão <span class="buff-t">${S.invasion} restantes</span></div>`;
    bb.innerHTML = html;
  },

  updateClosestAch() {
    const box = document.getElementById('closest-ach-box');
    const res = Game.closestAchievement();
    if (!res) { box.innerHTML = ''; return; }
    const { ach, pct } = res;
    const hidden = ach.secret;
    const name = hidden ? '???' : ach.name;
    const icon = hidden ? '❓' : ach.icon;
    const desc = hidden ? 'Conquista secreta' : ach.desc;
    box.innerHTML = `
      <div class="closest-ach-title">Mais perto de desbloquear</div>
      <div class="closest-ach-card${hidden ? ' secret' : ''}">
        <div class="closest-ach-icon">${icon}</div>
        <div class="closest-ach-info">
          <div class="closest-ach-name">${name}</div>
          <div class="closest-ach-desc">${desc}</div>
          <div class="closest-ach-bar"><div class="closest-ach-fill" style="width:${(pct * 100).toFixed(1)}%"></div></div>
        </div>
      </div>`;
  },

  shakeEnemy() {
    const enemy = this.R.combat && this.R.combat.enemy;
    if (!enemy) return;
    enemy.classList.remove('shake');
    void enemy.offsetWidth;
    enemy.classList.add('shake');
  },

  flashHpBar(hpFill) {
    hpFill.classList.remove('flash');
    void hpFill.offsetWidth;
    hpFill.classList.add('flash');
  },

  // `big` (#14): momentos rarísssimos (Lendário, Relíquia, Ascensão...) ganham tremor de tela +
  // rajada de partículas além do flash de cor já existente.
  legendaryFlash(color, big) {
    if (!S.flashFx) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const flash = this.el('div', 'screen-flash' + (big ? ' shake-body' : ''));
    flash.style.background = color;
    document.body.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('show'));
    setTimeout(() => { flash.classList.remove('show'); setTimeout(() => flash.remove(), 300); }, 250);
    if (big) this.particleBurst(color);
  },

  // rajada de partículas (✦) a partir do centro da tela — usado por drops lendários e outros
  // marcos raros. Sempre respeita S.flashFx/prefers-reduced-motion (mesma checagem do legendaryFlash).
  particleBurst(color) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const p = this.el('div', 'fx-particle', '✦');
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const dist = 90 + Math.random() * 70;
      p.style.setProperty('--fx-x', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--fx-y', Math.sin(angle) * dist + 'px');
      p.style.color = color;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  },

  // explosão de confete — usado ao desbloquear uma conquista (#14)
  confettiBurst() {
    if (!S.flashFx) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#e8a33d', '#5fbf6b', '#4fa8d8', '#ff6b5e', '#b06fd8'];
    const n = 24;
    for (let i = 0; i < n; i++) {
      const c = this.el('div', 'fx-confetti');
      c.style.setProperty('--fx-left', Math.random() * 100 + 'vw');
      c.style.setProperty('--fx-color', colors[i % colors.length]);
      c.style.setProperty('--fx-dur', (0.9 + Math.random() * 0.6) + 's');
      c.style.setProperty('--fx-rot', (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360) + 'deg');
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 1600);
    }
  },

  // ---------- Atualização dinâmica (todo tick) ----------

  updateDynamic() {
    document.getElementById('gold-amount').textContent = fmt(S.gold);
    document.getElementById('gold-rate').textContent = fmtRate(Game.goldPerSec());
    document.getElementById('click-power-label').textContent = '+' + fmt(Game.clickPower()) + ' por clique';

    // O ouro não pode ser uma região viva (mudaria 10×/s e afogaria o leitor de tela), então o valor
    // atual vive no rótulo da moeda — que é onde o jogador cego tem o foco. Trocar aria-label não
    // dispara anúncio: só é lido quando ele consulta, que é exatamente o comportamento desejado.
    const coin = document.getElementById('click-coin');
    if (coin) coin.setAttribute('aria-label', `Minerar ouro. Você tem ${fmt(S.gold)} de ouro, ganhando ${fmtRate(Game.goldPerSec())}. Cada clique rende ${fmt(Game.clickPower())}.`);

    const phase = Game.currentPhase();
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][phase.id] || phase.id;
    document.getElementById('phase-badge').textContent = `Fase ${roman} — ${phase.name}`;

    const progFill = document.getElementById('phase-progress-fill');
    const np = Game.nextPhaseProgress();
    if (np) {
      progFill.style.width = (np.pct * 100) + '%';
      const desc = `Rumo à Fase ${np.next.id} — ${np.next.name}: ${fmt(S.earned)} / ${fmt(np.next.at)} ouro (nesta run)`;
      progFill.parentElement.title = desc;
      progFill.parentElement.setAttribute('aria-valuenow', Math.round(np.pct * 100));
      progFill.parentElement.setAttribute('aria-valuetext', desc);
    } else {
      progFill.style.width = '100%';
      progFill.parentElement.title = 'Todas as fases conhecidas foram alcançadas!';
      progFill.parentElement.setAttribute('aria-valuenow', 100);
      progFill.parentElement.setAttribute('aria-valuetext', 'Todas as fases conhecidas foram alcançadas');
    }

    const glow = Math.min(0.4, 0.08 + 0.015 * S.prestiges + 0.02 * Math.log2(1 + S.essence));
    document.documentElement.style.setProperty('--arcane-glow', glow.toFixed(3));

    const essBadge = document.getElementById('essence-badge');
    if (S.essence > 0 || S.unlocked.prestige) {
      essBadge.classList.remove('hidden');
      document.getElementById('essence-count').textContent = fmt(S.essence);
    }

    if (this.dirty.left) this.renderLeft();
    if (this.R.resEls) for (const k in this.R.resEls) this.R.resEls[k].textContent = fmt(S.res[k]);
    this.updateBuffs();
    this.updateDaily();
    this.updateClosestAch();
    this.ensureModalSanity();

    // elementos dinâmicos do tab ativo
    if (this.activeTab === 'prod' && this.R.gens) {
      for (const ref of this.R.gens) {
        const cost = Game.genCost(ref.id, this.buyAmount === 'max' ? Math.max(1, Game.genMaxBuy(ref.id)) : this.buyAmount);
        const n = this.buyAmount === 'max' ? Game.genMaxBuy(ref.id) : this.buyAmount;
        const afford = this.buyAmount === 'max' ? n > 0 : S.gold >= cost;
        ref.btn.innerHTML = `Comprar ${this.buyAmount === 'max' ? (n > 0 ? '×' + n : '×0') : '×' + this.buyAmount}<br><span class="btn-cost">${fmt(cost)} ouro</span>`;
        ref.btn.classList.toggle('afford', afford);
        ref.btn.disabled = !afford;
        ref.ownedEl.textContent = '×' + (S.gens[ref.id] || 0);
        ref.prodEl.textContent = fmtRate(Game.genProd(ref.id) * Game.globalProdMult());
      }
      if (this.R.ups) for (const ref of this.R.ups) {
        ref.btn.classList.toggle('afford', S.gold >= ref.cost);
        ref.btn.disabled = S.gold < ref.cost;
      }
      // novos geradores/upgrades podem ter ficado visíveis
      if (this._lastProdCheck === undefined || Date.now() - this._lastProdCheck > 3000) {
        this._lastProdCheck = Date.now();
        const visible = GENERATORS.filter(g => (!g.reqPrestige || S.prestiges >= g.reqPrestige) && ((S.gens[g.id] || 0) > 0 || S.earned >= g.baseCost * 0.4)).length;
        // mesmo filtro do renderProd (linha ~238), senão a contagem nunca bateria e a aba
        // re-renderizaria a cada 3s pra sempre
        const upsVisible = UPGRADES.filter(u => !S.upgrades[u.id] && S.earned >= u.cost * 0.25
          && (!u.gen || (S.gens[u.gen] || 0) > 0 || S.earned >= u.cost)).sort((a, b) => a.cost - b.cost).slice(0, 9).length;
        if (visible !== this.R.gens.length || (this.R.ups && upsVisible !== this.R.ups.length)) {
          this.dirty.prod = true;
          this.renderActive();
        }
      }
    }

    if (this.activeTab === 'heroes' && this.R.combat) {
      const cb = S.combat;
      const rc = this.R.combat;
      const special = cb.special ? SPECIAL_ENEMIES[cb.special] : null;
      rc.waveEl.innerHTML = `Onda <b>${cb.wave}</b>${special ? ` <span class="special-tag" title="${this.esc(special.desc)}">${special.icon} ${this.esc(special.name)}</span>` : ''}${cb.boss ? ` — <span class="boss-tag">${cb.secretBoss ? 'CHEFE SECRETO' : 'CHEFE'}</span>` : ''}${cb.bossCooldown > 0 ? ` <span class="cd-tag">(reagrupando: ${cb.bossCooldown})</span>` : ''}`;
      const enemyFile = cb.boss ? 'boss' : ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'][cb.wave % 8];
      const enemyImg = rc.enemy.querySelector('.enemy-img');
      if (enemyImg.dataset.file !== enemyFile) {
        enemyImg.src = `img/enemies/${enemyFile}.png`;
        enemyImg.dataset.file = enemyFile;
      }
      rc.enemy.classList.toggle('is-boss', cb.boss);
      rc.hpFill.parentElement.classList.toggle('hp-bar-boss', cb.boss);   // barra "gigante" (#14)
      const pct = cb.maxHp > 0 ? Math.max(0, cb.hp / cb.maxHp) : 0;
      if (this._lastHp !== undefined && cb.maxHp > 0 && this._lastHp > cb.hp) {
        const drop = (this._lastHp - cb.hp) / cb.maxHp;
        if (drop > 0.08 || (cb.boss && drop > 0.02)) this.flashHpBar(rc.hpFill);
      }
      this._lastHp = cb.hp;
      rc.hpFill.style.width = (pct * 100) + '%';
      rc.hpText.textContent = fmt(Math.max(0, cb.hp)) + ' / ' + fmt(cb.maxHp);
      rc.bossTimer.textContent = cb.boss ? '⏳ ' + fmtTime(cb.bossT) : '';
      rc.dpsEl.innerHTML = `DPS do time: <b>${fmt(Game.teamDps())}</b> · recompensa: <b>${fmt(Game.enemyGold(cb.wave, cb.boss))}</b> ouro`;

      // Chefes Inteligentes (#7): badge com a mecânica ativa + resistência atual (Rei Demônio)
      if (rc.lastMech !== cb.bossMech || (cb.bossMech === 'rei_demonio' && rc._lastShift !== cb.bossShiftPhys)) {
        rc.lastMech = cb.bossMech;
        rc._lastShift = cb.bossShiftPhys;
        const mech = cb.bossMech ? BOSS_MECHANICS.find(m => m.id === cb.bossMech) : null;
        if (mech) {
          let extra = '';
          if (mech.shifting) extra = ` — vulnerável a dano <b>${cb.bossShiftPhys ? 'MÁGICO' : 'FÍSICO'}</b> agora`;
          rc.bossMechEl.innerHTML = `${mech.icon} <b>${mech.name}</b>${extra}`;
          rc.bossMechEl.title = mech.desc;
          rc.bossMechEl.classList.remove('hidden');
        } else {
          rc.bossMechEl.classList.add('hidden');
        }
      }

      this.updateSynergyPanel();

      // mini-cards de heróis em campo/reserva: botão de nível + stats/DPS
      if (this.R.heroMinis) for (const ref of this.R.heroMinis) {
        const h = S.heroes[ref.id];
        if (!h) continue;
        const n = this.buyAmount === 'max' ? Game.heroMaxLevels(ref.id) : this.buyAmount;
        const cost = Game.heroLvlCost(ref.id, Math.max(1, n));
        ref.levelBtn.innerHTML = `Nv ×${n}<br><span class="btn-cost">${fmt(cost)}</span>`;
        const afford = n > 0 && S.gold >= cost;
        ref.levelBtn.classList.toggle('afford', afford);
        ref.levelBtn.disabled = !afford;
        ref.statsEl.innerHTML = `Nv <b>${h.lvl}</b> · DPS <b>${fmt(Game.heroDps(ref.id))}</b>`;
      }
      // botões de recrutar
      if (this.R.recruit) for (const ref of this.R.recruit) {
        const afford = S.gold >= ref.cost;
        ref.btn.classList.toggle('afford', afford);
        ref.btn.disabled = !afford;
      }

      // novos heróis visíveis?
      if (this._lastHeroCheck === undefined || Date.now() - this._lastHeroCheck > 3000) {
        this._lastHeroCheck = Date.now();
        const visible = HEROES.filter(d => (!d.reqPrestige || S.prestiges >= d.reqPrestige) && (S.heroes[d.id] || S.earned >= d.baseCost * 0.3)).length;
        if (visible !== this.R.heroesVisible) { this.dirty.heroes = true; this.renderActive(); }
      }
    }

    if (this.activeTab === 'forge' && this.R.forge) {
      this.updateForge();
    }

    if (this.activeTab === 'base' && this.R.rooms) {
      for (const ref of this.R.rooms) {
        ref.btn.innerHTML = `Construir<br><span class="btn-cost">${this.roomCostHtml(ref.id)}</span>`;
        const afford = Game.canAffordRoom(ref.id);
        ref.btn.classList.toggle('afford', afford);
        ref.btn.disabled = !afford;
        if (ref.lvlEl) ref.lvlEl.textContent = 'Nv ' + Game.roomLvl(ref.id);
      }
    }

    if (this.activeTab === 'talents') {
      if (this.R.knowBanner) this.R.knowBanner.innerHTML = `📘 Conhecimento: <b>${fmt(S.res.conhecimento)}</b> (${fmtRate(Game.knowledgePerSec())})`;
      if (this.R.talents) for (const ref of this.R.talents) {
        const lvl = Game.talentLvl(ref.id);
        const maxed = lvl >= ref.max;
        const blocker = Game.talentExclusionBlocker(ref.id);
        const afford = !maxed && !blocker && S.res.conhecimento >= Game.talentCost(ref.id);
        ref.btn.classList.toggle('afford', afford);
        ref.btn.classList.toggle('maxed', maxed);
        ref.btn.classList.toggle('locked', !!blocker);
        ref.btn.disabled = !afford;
        if (ref.lvlEl) ref.lvlEl.textContent = `${lvl}/${ref.max}`;
        if (ref.costEl) {
          if (blocker) ref.costEl.textContent = `🔒 Bloqueado — você escolheu ${TALENTS.find(x => x.id === blocker).name}`;
          else ref.costEl.textContent = maxed ? 'MÁXIMO' : fmt(Game.talentCost(ref.id)) + ' 📘 conhecimento';
        }
      }
    }

    if (this.updateExt) this.updateExt();   // abas da expansão (mundo, pesquisa, mercado, cidade, mascotes)

    if (this.dirty.tabs) this.renderTabs();
  },

  // ---------- Feedback visual ----------

  // Ponto de origem de um número flutuante. Um clique de TECLADO (segurar espaço/Enter com o botão
  // focado) dispara `click` com clientX/clientY = 0, o que mandava o número pro canto superior
  // esquerdo da tela — e, com a repetição automática da tecla, dezenas deles piscando lá. Quando o
  // evento não veio de um ponteiro (`ev.detail === 0`), usamos o centro do próprio botão.
  floatOrigin(ev, fallbackEl) {
    if (ev && ev.detail > 0 && (ev.clientX || ev.clientY)) return { x: ev.clientX, y: ev.clientY };
    const el = fallbackEl || (ev && ev.currentTarget) || null;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.35 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  },

  _floats: {},          // key -> acumulador ativo (ver floatAccum)
  FLOAT_MAX: 24,        // teto de números simultâneos na tela, qualquer que seja a origem

  floatText(x, y, text, color) {
    const layer = document.getElementById('float-layer');
    // Sem teto, uma rajada de cliques (autoclique, teclado repetindo) enche a camada de elementos
    // animando ao mesmo tempo — é o que fazia a tela "piscar".
    while (layer.children.length >= this.FLOAT_MAX) layer.firstChild.remove();
    const e = this.el('div', 'float-num', text);
    e.style.left = (x + (Math.random() * 40 - 20)) + 'px';
    e.style.top = (y - 10) + 'px';
    if (color) e.style.color = color;
    layer.appendChild(e);
    setTimeout(() => e.remove(), 1400);
    return e;
  },

  // Número flutuante que ACUMULA em vez de empilhar. Enquanto os cliques continuam chegando (janela
  // de FLOAT_ACCUM_MS), o mesmo elemento fica parado somando o total e dá um "bump"; quando o jogador
  // para, ele sobe e some. É o que torna o clique rápido legível: um "+412 Mi" crescendo, em vez de
  // vinte "+20 Mi" sobrepostos piscando no mesmo pixel.
  floatAccum(key, x, y, amount, color, fmtFn) {
    const FLOAT_ACCUM_MS = 350;
    const acc = this._floats[key];
    const format = fmtFn || ((v) => '+' + fmt(v));
    if (acc && document.body.contains(acc.el)) {
      acc.value += amount;
      acc.el.textContent = format(acc.value);
      acc.el.classList.remove('float-bump');
      void acc.el.offsetWidth;                 // reinicia a animação de bump
      acc.el.classList.add('float-bump');
      clearTimeout(acc.timer);
      acc.timer = setTimeout(() => this.floatRelease(key), FLOAT_ACCUM_MS);
      return;
    }
    const layer = document.getElementById('float-layer');
    while (layer.children.length >= this.FLOAT_MAX) layer.firstChild.remove();
    const el = this.el('div', 'float-num float-held', format(amount));
    el.style.left = x + 'px';
    el.style.top = (y - 10) + 'px';
    if (color) el.style.color = color;
    layer.appendChild(el);
    this._floats[key] = { el, value: amount, timer: setTimeout(() => this.floatRelease(key), FLOAT_ACCUM_MS) };
  },

  floatRelease(key) {
    const acc = this._floats[key];
    if (!acc) return;
    delete this._floats[key];
    acc.el.classList.remove('float-held', 'float-bump');
    acc.el.classList.add('float-num');        // (re)dispara a subida
    void acc.el.offsetWidth;
    acc.el.style.animation = 'floatUp 1.1s ease-out forwards';
    setTimeout(() => acc.el.remove(), 1100);
  },

  toast(msg, color, big) {
    const layer = document.getElementById('toast-layer');
    const t = this.el('div', 'toast' + (big ? ' toast-big' : ''), msg);
    if (color) { t.style.borderColor = color; if (big) t.style.boxShadow = `0 0 30px ${color}`; }
    layer.appendChild(t);
    setTimeout(() => t.classList.add('show'), 20);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
    while (layer.children.length > 4) layer.firstChild.remove();
  },

  log(html) {
    const feed = document.getElementById('log-feed');
    const e = this.el('div', 'log-entry', html);
    feed.prepend(e);
    while (feed.children.length > 60) feed.lastChild.remove();
  },

  // ---------- Moeda dourada ----------

  spawnGoldenCoin() {
    if (document.querySelector('.golden-coin')) return;
    const coin = this.el('button', 'golden-coin', '🌟');
    coin.title = 'Uma moeda dourada! Rápido!';
    const main = document.getElementById('main-panel').getBoundingClientRect();
    coin.style.left = (main.left + 40 + Math.random() * Math.max(50, main.width - 120)) + 'px';
    coin.style.top = (main.top + 60 + Math.random() * Math.max(50, main.height - 160)) + 'px';
    coin.onclick = (ev) => {
      const res = Game.clickGolden();
      const o = this.floatOrigin(ev, coin);
      if (res.kind === 'gold') this.floatText(o.x, o.y, '+' + fmt(res.amount), '#ffd700');
      else this.floatText(o.x, o.y, 'FRENESI ×7!', '#ffd700');
      coin.remove();
    };
    document.body.appendChild(coin);
    const lifespan = 13000;
    for (let i = 1; i <= 3; i++) {
      setTimeout(() => {
        if (!document.body.contains(coin)) return;
        coin.classList.add('golden-urgent');
        if (S.sound) { Sound.ensure(); Sound.tone(700 - i * 90, 0.12, 'sine', 0.06); }
      }, lifespan - i * 1000);
    }
    setTimeout(() => coin.remove(), lifespan);
  },

  // ---------- Eventos / banner ----------

  // a barra de abas pode ocupar 1 ou 2 linhas (flex-wrap, varia com nº de abas desbloqueadas e viewport);
  // reposiciona o banner sempre logo abaixo dela em vez de usar um `top` fixo no CSS (que sobrepunha as abas).
  // +30px (não +10) pra sobrar folga durante a animação de entrada (bannerIn desliza -20px no início).
  positionEventBanner(b) {
    const tabs = document.getElementById('tabs');
    b.style.top = (tabs.getBoundingClientRect().bottom + 30) + 'px';
  },

  showEventBanner(ev, extra) {
    const b = document.getElementById('event-banner');
    b.className = '';
    this.positionEventBanner(b);
    b.innerHTML = `${this.iconImgHtml(`img/events/${ev.id}.jpg`, ev.icon, 'ev-icon')} <b>${ev.name}</b> — ${ev.desc} ${extra ? '<b>' + extra + '</b>' : ''}`;
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 9000);
  },

  showMerchantOffer(price) {
    const b = document.getElementById('event-banner');
    b.className = '';
    this.positionEventBanner(b);
    b.innerHTML = `<span class="ev-icon">🧙</span> <b>Mercador Errante</b> — "Um pacto, viajante? Pode ser produção, poder... ou algo brilhante." `;
    const btn = this.el('button', 'merchant-btn', `Aceitar (${fmt(price)} ouro)`);
    btn.onclick = () => {
      if (Game.acceptMerchant(price)) b.classList.add('hidden');
      else this.toast('Ouro insuficiente!', '#ff6b5e');
    };
    b.appendChild(btn);
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 45000);
  },

  // ---------- Modais ----------

  showModal(html, closable) {
    const layer = document.getElementById('modal-layer');
    layer.className = '';
    layer.innerHTML = '';
    // Este modal substitui o que estivesse aberto — inclusive um modal de lore. Sem zerar a marca, a
    // fila de lore continuaria achando que há uma história aberta e passaria a ENFILEIRAR as próximas
    // em vez de mostrá-las.
    layer.dataset.loreOpen = '';
    const box = this.el('div', 'modal-box', html);
    if (closable) {
      const x = this.el('button', 'modal-close', '✕');
      x.onclick = () => this.closeModal();
      box.appendChild(x);
    }
    layer.appendChild(box);
    layer.onclick = (e) => { if (e.target === layer && closable) this.closeModal(); };
    this._modalClosable = !!closable;
    return box;
  },

  // Fechamento centralizado: esconde a camada E limpa o conteúdo. Deixar conteúdo para trás numa
  // camada só "escondida" é o que criava estados intermediários difíceis de depurar.
  closeModal() {
    const layer = document.getElementById('modal-layer');
    layer.classList.add('hidden');
    layer.dataset.loreOpen = '';
    layer.innerHTML = '';
  },

  // REDE DE SEGURANÇA (chamada a cada tick por updateDynamic).
  // `#modal-layer` é um elemento fixo, em tela cheia, com z-index 400 e pointer-events auto: a ÚNICA
  // coisa que impede ele de engolir todos os cliques do jogo é a classe `hidden`. Qualquer caminho que
  // esvazie o conteúdo sem repor a classe (ou que reponha a classe sem esvaziar) deixa uma placa de
  // vidro invisível sobre a tela — o jogo continua rodando, os números continuam subindo, e NADA é
  // clicável. Era exatamente o sintoma relatado como "o botão de compra fica congelado": não é o
  // botão, é a tela inteira, e o botão de compra é só onde se percebe primeiro.
  // Em vez de caçar cada caminho possível, a camada se conserta sozinha: sem caixa de modal dentro,
  // ela não tem motivo para estar visível.
  ensureModalSanity() {
    const layer = document.getElementById('modal-layer');
    if (layer.classList.contains('hidden')) return;
    if (!layer.querySelector('.modal-box')) {
      layer.classList.add('hidden');
      layer.dataset.loreOpen = '';
    }
  },

  confirmModal(html, onYes) {
    const box = this.showModal(`<div class="modal-text">${html}</div>`, true);
    const row = this.el('div', 'modal-row');
    const yes = this.el('button', 'cfg-btn danger', 'Confirmar');
    yes.onclick = () => { this.closeModal(); onYes(); };
    const no = this.el('button', 'cfg-btn', 'Cancelar');
    no.onclick = () => this.closeModal();
    row.appendChild(yes); row.appendChild(no);
    box.appendChild(row);
  },

  // modal narrativo de fase: conta a história do momento + explica a mecânica nova.
  // se outra lore já estiver aberta (ex.: várias fases desbloqueadas de uma vez após tempo offline),
  // enfileira em vez de sobrescrever, pra nenhuma história ser perdida.
  _loreQueue: [],

  showLoreModal(key) {
    if (!PHASE_LORE[key]) return;
    const layer = document.getElementById('modal-layer');
    if (!layer.classList.contains('hidden') && layer.dataset.loreOpen === '1') {
      if (!this._loreQueue.includes(key)) this._loreQueue.push(key);
      return;
    }
    this._openLoreModal(key);
  },

  _openLoreModal(key) {
    const data = PHASE_LORE[key];
    const box = this.showModal(`
      <div class="lore-head">
        <span class="lore-icon">${ADVISOR.icon}</span>
        <div>
          <h3>${data.title}</h3>
          <div class="lore-sub">${ADVISOR.name}</div>
        </div>
      </div>
      <div class="modal-text lore-body"></div>
      ${data.tip ? `<div class="lore-tip">💡 ${data.tip}</div>` : ''}
    `, true);
    const layer = document.getElementById('modal-layer');
    layer.dataset.loreOpen = '1';
    this.typewrite(box.querySelector('.lore-body'), data.body);
    const ok = this.el('button', 'cfg-btn', 'Continuar');
    ok.onclick = () => this._closeLoreModal();
    box.appendChild(ok);
    // garante que fechar pelo X ou clicando fora também avança a fila
    const xBtn = box.querySelector('.modal-close');
    if (xBtn) xBtn.onclick = () => this._closeLoreModal();
    layer.onclick = (e) => { if (e.target === layer) this._closeLoreModal(); };
  },

  _closeLoreModal() {
    const next = this._loreQueue.shift();
    this.closeModal();
    if (next) this._openLoreModal(next);
  },

  // revela o texto aos poucos (efeito de máquina de escrever); pula direto se o usuário preferir menos movimento
  typewrite(el, text) {
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = text; return; }
    let i = 0;
    const id = setInterval(() => {
      i++;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(id);
    }, 18);
  },

  // Códex: histórias das fases + Descobertas (lore oculta encontrada pelo mundo)
  showCodex() {
    const order = ['phase1', 'heroes', 'base', 'talents', 'prestige', 'events', 'phase7'];
    const seen = order.filter(k => k === 'phase1' || S.unlocked[k]);
    const rows = seen.map(k => `<button class="cfg-btn codex-entry" data-key="${k}">${ADVISOR.icon} <b>${PHASE_LORE[k].title}</b></button>`).join('');

    // descobertas: registradas automaticamente ao explorar o mundo; as não achadas ficam ocultas
    const found = LORE_ITEMS.filter(l => S.codex.lore[l.id]);
    const loreRows = found.map(l =>
      `<button class="cfg-btn codex-entry lore-found" data-lore="${l.id}">${l.icon} <b>${l.title}</b> <span class="codex-kind">${l.kind}</span></button>`).join('');
    const missing = LORE_ITEMS.length - found.length;

    // Roadmap #11: completude por categoria
    const comp = Game.codexCompletion();
    const compRows = Object.values(comp.cats).map(c => {
      const pct = c.total > 0 ? Math.round((c.have / c.total) * 100) : 100;
      return `<div class="codex-cat-row">
        <span class="codex-cat-icon">${c.icon}</span>
        <span class="codex-cat-name">${c.name}</span>
        <div class="codex-cat-bar"><div class="codex-cat-fill" style="width:${pct}%"></div></div>
        <span class="codex-cat-n">${c.have}/${c.total}</span>
      </div>`;
    }).join('');

    const box = this.showModal(`<h3>📖 Códex de ${ADVISOR.name}</h3>
      <div class="modal-text">Releia as histórias já vividas nesta jornada.</div>
      <div class="codex-list">${rows}</div>
      <h3 class="codex-sec">🗂️ Completude <span class="bag-count">${Math.round(comp.pct * 100)}%</span></h3>
      <div class="codex-cats">${compRows}</div>
      <h3 class="codex-sec">🏺 Descobertas <span class="bag-count">${found.length}/${LORE_ITEMS.length}</span></h3>
      <div class="codex-list">${loreRows || '<div class="modal-text"><i>Nada descoberto ainda. O mundo guarda segredos para quem explora...</i></div>'}</div>
      ${missing > 0 && found.length > 0 ? `<div class="modal-text codex-missing"><i>${missing} fragmento(s) ainda perdidos por aí.</i></div>` : ''}`, true);

    box.querySelectorAll('.codex-entry[data-key]').forEach(btn => {
      btn.onclick = () => this.showLoreModal(btn.dataset.key);
    });
    box.querySelectorAll('.codex-entry[data-lore]').forEach(btn => {
      btn.onclick = () => {
        const l = LORE_ITEMS.find(x => x.id === btn.dataset.lore);
        const b2 = this.showModal(`<div class="lore-head"><span class="lore-icon">${l.icon}</span><div><h3>${l.title}</h3><div class="lore-sub">${l.kind}</div></div></div>
          <div class="modal-text lore-body"></div>`, true);
        this.typewrite(b2.querySelector('.lore-body'), l.text);
      };
    });
  },

  welcomeBack(off) {
    const research = (off.research && off.research.length)
      ? '<br>🔬 Pesquisas concluídas: <b>' + off.research.map(id => Game.researchDef(id).name).join(', ') + '</b>'
      : '';
    const box = this.showModal(`<h3>🌙 Bem-vindo de volta!</h3>
      <div class="modal-text">Você ficou fora por <b>${fmtTime(off.seconds)}</b>.<br>
      Sua organização trabalhou sem você:<br><br>
      <b>+${fmt(off.gold)}</b> ouro${off.know > 0.5 ? `<br><b>+${fmt(off.know)}</b> 📘 conhecimento` : ''}${research}</div>`, true);
    const ok = this.el('button', 'cfg-btn', 'Coletar!');
    ok.onclick = () => { this.closeModal(); Sound.play('golden'); };
    box.appendChild(ok);
  },

  // ---------- Inicialização ----------

  init() {
    // clique principal
    const coin = document.getElementById('click-coin');
    coin.onclick = (ev) => {
      Sound.ensure();
      const gain = Game.clickPower();
      Game.gainGold(gain);
      S.clicks++;
      Game.dailyEvent('click', 1);      // Metas do Dia
      S.lastClickAt = Date.now();
      Sound.play('click');
      const o = this.floatOrigin(ev, coin);
      this.floatAccum('coin', o.x, o.y, gain, '#ffd700');
      coin.classList.remove('pulse');
      void coin.offsetWidth;
      coin.classList.add('pulse');
      if (S.clicks === 1) this.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.firstClick}"</i>`);
    };

    // colapsar painel esquerdo em telas estreitas
    document.getElementById('panel-toggle').onclick = () => {
      document.getElementById('left-panel').classList.toggle('open');
    };

    // segredo: cliques no título
    document.getElementById('game-title').onclick = () => {
      S.titleClicks++;
      if (S.titleClicks === 42) Game.checkAchievements();
    };

    document.getElementById('codex-btn').onclick = () => this.showCodex();

    // Esc fecha o modal aberto. Saída de emergência universal: nenhum modal deste jogo é obrigatório,
    // e ficar preso atrás de um é o pior estado possível numa tela que continua rodando por baixo.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const layer = document.getElementById('modal-layer');
      if (layer.classList.contains('hidden')) return;
      if (layer.dataset.loreOpen === '1') this._closeLoreModal();
      else this.closeModal();
    });

    this.applyHand();
    if (this.initExt) this.initExt();   // expansão: widget do mundo, segredos, música
    this.renderTabs();
    this.renderLeft();
    this.renderActive();
  },

  // aplica a mão preferida (canhoto/destro) no <body>; o CSS reposiciona a moeda no mobile
  applyHand() {
    document.body.dataset.hand = (S.hand === 'left' ? 'left' : 'right');
  },
};
