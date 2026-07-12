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

  // ---------- Aba: Produção ----------

  renderProd(c) {
    // seletor de quantidade
    const bar = this.el('div', 'buy-bar');
    bar.appendChild(this.el('span', 'buy-label', 'Comprar:'));
    for (const amt of [1, 10, 'max']) {
      const b = this.el('button', 'buy-amt' + (this.buyAmount === amt ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
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

      const thumb = this.el('img', 'gen-thumb');
      thumb.src = `img/gens/${g.id}.jpg`;
      thumb.alt = '';
      thumb.onerror = () => thumb.replaceWith(Object.assign(document.createElement('span'), { className: 'gen-icon', textContent: g.icon }));
      row.appendChild(thumb);

      const info = this.el('div', 'gen-info');
      info.appendChild(this.el('div', 'gen-name', `${g.name} <span class="gen-owned">×${owned}</span>`));
      info.appendChild(this.el('div', 'gen-flavor', g.flavor));
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
        b.innerHTML = `<div class="up-icon">${u.icon}</div><div class="up-name">${u.name}</div><div class="up-desc">${u.desc}</div><div class="up-cost">${fmt(u.cost)} ouro</div>`;
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
      if (r.crit) this.floatText(ev.clientX, ev.clientY, '★ CRIT! -' + fmt(r.dmg), '#ffd700');
      else if (r.dbl) this.floatText(ev.clientX, ev.clientY, '⚔️×2 -' + fmt(r.dmg), '#ff9d5e');
      else this.floatText(ev.clientX, ev.clientY, '-' + fmt(r.dmg), '#ff6b5e');
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
      b.onclick = () => { this.buyAmount = amt; this.dirty.heroes = true; this.renderActive(); };
      bar.appendChild(b);
    }
    c.appendChild(bar);

    this.R.heroMinis = [];
    this.R.recruit = [];
    this.R.heroesVisible = HEROES.filter(d => (!d.reqPrestige || S.prestiges >= d.reqPrestige) && (S.heroes[d.id] || S.earned >= d.baseCost * 0.3)).length;

    this.renderSynergyBar(c);
    this.renderFieldGrid(c);
    this.renderBench(c);
    this.renderRecruit(c);
    this.renderBag(c);
    if (this.renderGearSets) this.renderGearSets(c); // expansão: Conjuntos de Equipamento (gearsets-ui.js)
    if (this.renderRelics) this.renderRelics(c);     // expansão: Relíquias (relics-ui.js)
  },

  // Painel de sinergia de time: medidor 0–100% + faixas de bônus + Estado Perfeito (100%).
  renderSynergyBar(c) {
    Game.ensureSynergy();
    const bar = this.el('div', 'synergy-panel');

    // cabeçalho: título + porcentagem grande
    const head = this.el('div', 'syn-head');
    head.innerHTML = `<span class="syn-title">⚡ Sinergia de Time</span><span class="syn-pct">0%</span>`;
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

    c.appendChild(bar);
    this.R.synergy = { bar, fill, pctEl: head.querySelector('.syn-pct'), classRefs, hint, tierRefs, lastPct: -1, lastMega: null };
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
    c.appendChild(this.el('h3', 'section-title', `🏕️ Reserva <span class="bag-count">${totalHired}/${HEROES.length}</span>`));
    if (!bench.length) {
      c.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Todo herói contratado está em campo agora. Contrate mais para formar uma reserva."</i>`));
      return;
    }
    const grid = this.el('div', 'bench-grid');
    this.attachBenchDrop(grid);
    for (const id of bench) grid.appendChild(this.heroMini(id));
    c.appendChild(grid);
  },

  // heróis ainda não contratados
  renderRecruit(c) {
    const list = this.el('div', 'hero-list');
    let any = false;
    for (const def of HEROES) {
      if (def.reqPrestige && S.prestiges < def.reqPrestige) continue;
      if (S.heroes[def.id]) continue;
      if (S.earned < def.baseCost * 0.3) continue;
      any = true;
      const row = this.el('div', 'hero-row hero-locked' + (this.isNewRow('recruit', def.id) ? ' row-enter' : ''));
      const portrait = this.el('div', 'hero-portrait');
      portrait.style.backgroundImage = `url("img/heroes/${def.id}.jpg")`;
      row.appendChild(portrait);
      const info = this.el('div', 'hero-info');
      const cd = HERO_CLASSES[def.class];
      const rd = Game.heroRole(def.id);
      const roleTag = rd ? ` <span class="hero-class-tag" style="color:${rd.color}" title="${this.esc(rd.tagline)}">${rd.icon} ${rd.name}</span>` : '';
      info.appendChild(this.el('div', 'hero-name', `<span class="hero-icon">${def.icon}</span> <b>${def.name}</b> <span class="hero-title">${def.title}</span>${roleTag} <span class="hero-class-tag" style="color:${cd.color}">${cd.icon} ${cd.name}</span>`));
      info.appendChild(this.el('div', 'hero-story', def.story + (rd ? ` — ${rd.tagline}` : '')));
      row.appendChild(info);
      const btn = this.el('button', 'buy-btn hire-btn');
      btn.innerHTML = `Contratar<br><span class="btn-cost">${fmt(def.baseCost)} ouro</span>`;
      btn.onclick = () => { if (Game.hireHero(def.id)) { this.dirty.heroes = true; this.renderActive(); } };
      row.appendChild(btn);
      this.R.recruit.push({ id: def.id, btn, cost: def.baseCost });
      list.appendChild(row);
    }
    if (any) {
      c.appendChild(this.el('h3', 'section-title', '🤝 Recrutar'));
      c.appendChild(list);
    }
  },

  // bolsa: cartas forjadas acumuladas
  renderBag(c) {
    c.appendChild(this.el('h3', 'section-title', `🎒 Bolsa <span class="bag-count">${S.forge.inventory.length}/${FORGE_INVENTORY_CAP}</span>`));
    if (!S.forge.inventory.length) {
      c.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Forje cartas na aba Forja — elas se acumulam aqui para você equipar quando quiser."</i>`));
      return;
    }
    const grid = this.el('div', 'bag-grid');
    for (const item of S.forge.inventory) grid.appendChild(this.bagCard(item));
    c.appendChild(grid);
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
    const archTag = arch
      ? `<div class="hm-arch${matched ? ' matched' : ''}" title="${this.specTip(heroId)}">${arch.icon} ${arch.name}`
        + (matched ? ` <span class="hm-spec-on">✦ ESPECIALIZADO</span>` : ` <span class="hm-ideal">ideal: ${wt.icon}${wt.name}</span>`)
        + `</div>`
      : '';
    card.innerHTML = `
      <div class="hm-head">
        <div class="hero-portrait hm-portrait" style="background-image:url('img/heroes/${heroId}.jpg')"></div>
        <span class="hm-class" style="color:${cd.color}" title="${cd.name}">${cd.icon}</span>
        ${cardSel ? `<span class="hm-delta">${this.fmtScore(delta)}</span>` : ''}
      </div>
      <div class="hm-name">${def.icon} <b>${def.name}</b></div>
      ${role ? `<div class="hm-role" style="border-color:${role.color};color:${role.color}" title="${this.esc(role.tagline)}">${role.icon} ${role.name}</div>` : ''}
      ${archTag}
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
        chip.innerHTML = `${item.icon} +${Math.round(item.mult * 100)}%${ideal ? ' <span class="chip-ideal">✦</span>' : ''}${affIcons ? ' <span class="chip-aff">' + affIcons + '</span>' : ''}${setDef ? ` <span class="chip-set">${setDef.icon}</span>` : ''}`;
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
      <div class="bc-icon" style="color:${r.color}">${item.icon}${setDef ? ` <span class="chip-set">${setDef.icon}</span>` : ''}</div>
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

  forgeOddsHtml(tier) {
    let sum = 0;
    for (const w of tier.weights) sum += w;
    return tier.weights.map((w, i) =>
      w > 0 ? `<span style="color:${RARITIES[i].color}">${Math.round((w / sum) * 100)}%</span>` : null
    ).filter(Boolean).join(' ');
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
      const btn = this.el('button', 'forge-tier');
      btn.innerHTML = `<div class="ft-head">${t.icon} ${t.name}</div>
        <div class="ft-odds">${this.forgeOddsHtml(t)}</div>
        <div class="ft-cost"></div>`;
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
      <div class="bc-icon" style="color:${r.color};font-size:34px">${item.icon}</div>
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
    this.R.forge.stat.innerHTML = `Itens forjados: <b>${S.forge.forged}</b> · Bolsa: <b>${S.forge.inventory.length}/${FORGE_INVENTORY_CAP}</b>`
      + (full ? ' · <span class="forge-wait">bolsa cheia</span>' : '');
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

    c.appendChild(this.el('p', 'tab-intro',
      'Sua sede é uma <b>grade</b>: arraste (ou toque para selecionar e toque em outra célula para trocar) as salas de lugar. ' +
      'Salas <b>vizinhas</b> com afinidade formam <b>sinergias</b>. Cada <b>nível</b> faz o edifício crescer na cena acima.'));

    // mapa célula → sinergias ativas em que ela participa (para destacar tiles e ligações)
    const syns = Game.activeSynergies();
    const cellSyn = {};
    for (const s of syns) {
      (cellSyn[s.i] = cellSyn[s.i] || []).push(s);
      (cellSyn[s.j] = cellSyn[s.j] || []).push(s);
    }

    // ----- painel de sinergias ativas -----
    const bonus = Game.synergyBonuses();
    const anyBonus = Object.values(bonus).some(v => v > 0);
    const sbar = this.el('div', 'syn-bar');
    if (anyBonus) {
      const tags = [];
      for (const k in bonus) if (bonus[k] > 0) tags.push(`<span class="syn-tag syn-${k}">+${Math.round(bonus[k] * 100)}% ${SYNERGY_LABELS[k]}</span>`);
      sbar.innerHTML = `<span class="syn-bar-title">⚡ Sinergias ativas</span> ${tags.join('')}`;
    } else {
      sbar.innerHTML = `<span class="syn-bar-title">⚡ Sinergias</span> <span class="syn-empty">Aproxime salas com afinidade para ativar bônus.</span>`;
    }
    c.appendChild(sbar);

    // ----- a grade -----
    const grid = this.el('div', 'base-grid');
    grid.style.gridTemplateColumns = `repeat(${BASE_GRID_COLS}, 1fr)`;
    this.R.rooms = [];
    for (let i = 0; i < cells.length; i++) {
      const id = cells[i];
      const tile = this.el('div', 'base-cell' + (id ? '' : ' empty') + (this.baseSel === i ? ' selected' : '') + (cellSyn[i] ? ' syn-active' : ''));
      tile.dataset.index = i;

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
        const badge = cellSyn[i] ? `<span class="syn-badge" title="${cellSyn[i].map(s => s.def.name).join(', ')}">⚡${cellSyn[i].length}</span>` : '';
        const decor = this.roomDecor(tier);
        tile.innerHTML =
          `${badge}<img class="base-art" src="img/rooms/${id}.jpg" alt="" draggable="false" ` +
          `onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'base-icon',textContent:'${r.icon}'}))">` +
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
    c.appendChild(grid);

    // ----- legenda de sinergias possíveis -----
    const legend = this.el('div', 'syn-legend');
    legend.appendChild(this.el('div', 'syn-legend-title', 'Afinidades (salas vizinhas):'));
    const activeKeys = new Set(syns.map(s => s.def.name));
    for (const d of ROOM_SYNERGIES) {
      const ra = ROOMS.find(x => x.id === d.a), rb = ROOMS.find(x => x.id === d.b);
      const on = activeKeys.has(d.name);
      const row = this.el('div', 'syn-legend-row' + (on ? ' on' : ''));
      row.innerHTML = `<span class="syn-legend-pair">${ra.icon}${rb.icon}</span> <b>${d.icon} ${d.name}</b> <span class="syn-legend-eff">${d.short}</span>`;
      legend.appendChild(row);
    }
    c.appendChild(legend);
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
        b.innerHTML = `<span class="bsb-ico">${r.icon}</span><span class="bsb-lvl">${lvl}</span>`;
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

  // toque numa célula da grade: seleciona / troca / cancela
  baseTileTap(index) {
    const g = Game.ensureBaseGrid();
    if (this.baseSel === null) {
      if (g[index]) { this.baseSel = index; this.dirty.base = true; this.renderActive(); }
    } else if (this.baseSel === index) {
      this.baseSel = null; this.dirty.base = true; this.renderActive();
    } else {
      Game.swapCells(this.baseSel, index);
      this.baseSel = null;
      Sound.play('build');
      this.dirty.base = true; this.renderActive();
    }
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
        const card = this.el('button', 'talent-card' + (lvl >= t.max ? ' maxed' : ''));
        card.innerHTML = `<div class="tal-head">${t.icon} <b>${t.name}</b> <span class="tal-lvl">${lvl}/${t.max}</span></div>
          <div class="tal-desc">${t.desc}</div>
          <div class="tal-cost">${lvl >= t.max ? 'MÁXIMO' : fmt(Game.talentCost(t.id)) + ' 📘 conhecimento'}</div>`;
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
          : `<div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;
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
      row.innerHTML = `<span class="res-icon">${d.icon}</span><span class="res-name">${d.name}</span><span class="res-val">${fmt(S.res[d.k])}</span>`;
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

  legendaryFlash(color) {
    if (!S.flashFx) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const flash = this.el('div', 'screen-flash');
    flash.style.background = color;
    document.body.appendChild(flash);
    requestAnimationFrame(() => flash.classList.add('show'));
    setTimeout(() => { flash.classList.remove('show'); setTimeout(() => flash.remove(), 300); }, 250);
  },

  // ---------- Atualização dinâmica (todo tick) ----------

  updateDynamic() {
    document.getElementById('gold-amount').textContent = fmt(S.gold);
    document.getElementById('gold-rate').textContent = fmtRate(Game.goldPerSec());
    document.getElementById('click-power-label').textContent = '+' + fmt(Game.clickPower()) + ' por clique';

    const phase = Game.currentPhase();
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][phase.id] || phase.id;
    document.getElementById('phase-badge').textContent = `Fase ${roman} — ${phase.name}`;

    const progFill = document.getElementById('phase-progress-fill');
    const np = Game.nextPhaseProgress();
    if (np) {
      progFill.style.width = (np.pct * 100) + '%';
      progFill.parentElement.title = `Rumo à Fase ${np.next.id} — ${np.next.name}: ${fmt(S.earned)} / ${fmt(np.next.at)} ouro (nesta run)`;
    } else {
      progFill.style.width = '100%';
      progFill.parentElement.title = 'Todas as fases conhecidas foram alcançadas!';
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
    this.updateClosestAch();

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
        if (visible !== this.R.gens.length) { this.dirty.prod = true; this.renderActive(); }
      }
    }

    if (this.activeTab === 'heroes' && this.R.combat) {
      const cb = S.combat;
      const rc = this.R.combat;
      rc.waveEl.innerHTML = `Onda <b>${cb.wave}</b>${cb.boss ? ' — <span class="boss-tag">CHEFE</span>' : ''}${cb.bossCooldown > 0 ? ` <span class="cd-tag">(reagrupando: ${cb.bossCooldown})</span>` : ''}`;
      const enemyFile = cb.boss ? 'boss' : ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'][cb.wave % 8];
      const enemyImg = rc.enemy.querySelector('.enemy-img');
      if (enemyImg.dataset.file !== enemyFile) {
        enemyImg.src = `img/enemies/${enemyFile}.png`;
        enemyImg.dataset.file = enemyFile;
      }
      rc.enemy.classList.toggle('is-boss', cb.boss);
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
        const afford = !maxed && S.res.conhecimento >= Game.talentCost(ref.id);
        ref.btn.classList.toggle('afford', afford);
        ref.btn.classList.toggle('maxed', maxed);
        ref.btn.disabled = !afford;
        if (ref.lvlEl) ref.lvlEl.textContent = `${lvl}/${ref.max}`;
        if (ref.costEl) ref.costEl.textContent = maxed ? 'MÁXIMO' : fmt(Game.talentCost(ref.id)) + ' 📘 conhecimento';
      }
    }

    if (this.updateExt) this.updateExt();   // abas da expansão (mundo, pesquisa, mercado, cidade, mascotes)

    if (this.dirty.tabs) this.renderTabs();
  },

  // ---------- Feedback visual ----------

  floatText(x, y, text, color) {
    const layer = document.getElementById('float-layer');
    const e = this.el('div', 'float-num', text);
    e.style.left = (x + (Math.random() * 40 - 20)) + 'px';
    e.style.top = (y - 10) + 'px';
    if (color) e.style.color = color;
    layer.appendChild(e);
    setTimeout(() => e.remove(), 1400);
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
      if (res.kind === 'gold') this.floatText(ev.clientX, ev.clientY, '+' + fmt(res.amount), '#ffd700');
      else this.floatText(ev.clientX, ev.clientY, 'FRENESI ×7!', '#ffd700');
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

  showEventBanner(ev, extra) {
    const b = document.getElementById('event-banner');
    b.className = '';
    b.innerHTML = `<span class="ev-icon">${ev.icon}</span> <b>${ev.name}</b> — ${ev.desc} ${extra ? '<b>' + extra + '</b>' : ''}`;
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 9000);
  },

  showMerchantOffer(price) {
    const b = document.getElementById('event-banner');
    b.className = '';
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
    const box = this.el('div', 'modal-box', html);
    if (closable) {
      const x = this.el('button', 'modal-close', '✕');
      x.onclick = () => layer.classList.add('hidden');
      box.appendChild(x);
    }
    layer.appendChild(box);
    layer.onclick = (e) => { if (e.target === layer && closable) layer.classList.add('hidden'); };
    return box;
  },

  confirmModal(html, onYes) {
    const box = this.showModal(`<div class="modal-text">${html}</div>`, true);
    const row = this.el('div', 'modal-row');
    const yes = this.el('button', 'cfg-btn danger', 'Confirmar');
    yes.onclick = () => { document.getElementById('modal-layer').classList.add('hidden'); onYes(); };
    const no = this.el('button', 'cfg-btn', 'Cancelar');
    no.onclick = () => document.getElementById('modal-layer').classList.add('hidden');
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
    const layer = document.getElementById('modal-layer');
    layer.classList.add('hidden');
    layer.dataset.loreOpen = '';
    const next = this._loreQueue.shift();
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

    const box = this.showModal(`<h3>📖 Códex de ${ADVISOR.name}</h3>
      <div class="modal-text">Releia as histórias já vividas nesta jornada.</div>
      <div class="codex-list">${rows}</div>
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
    ok.onclick = () => { document.getElementById('modal-layer').classList.add('hidden'); Sound.play('golden'); };
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
      S.lastClickAt = Date.now();
      Sound.play('click');
      this.floatText(ev.clientX, ev.clientY, '+' + fmt(gain), '#ffd700');
      coin.classList.remove('pulse');
      void coin.offsetWidth;
      coin.classList.add('pulse');
      if (S.clicks === 1) this.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.firstGen}"</i>`);
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
