// ===== Interface =====

const UI = {
  activeTab: 'prod',
  buyAmount: 1,           // 1 | 10 | 'max'
  dirty: { tabs: true, prod: true, heroes: true, base: true, talents: true, prestige: true, ach: true, config: true, left: true },
  R: {},                  // refs dinâmicos do tab ativo

  dirtyAll() { for (const k in this.dirty) this.dirty[k] = true; },

  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },

  // ---------- Tabs ----------

  tabDefs() {
    return [
      { id: 'prod',     name: 'Produção',   icon: '⚒️', unlocked: true },
      { id: 'heroes',   name: 'Heróis',     icon: '⚔️', unlocked: S.unlocked.heroes },
      { id: 'base',     name: 'Base',       icon: '🏰', unlocked: S.unlocked.base },
      { id: 'talents',  name: 'Talentos',   icon: '🌳', unlocked: S.unlocked.talents },
      { id: 'prestige', name: 'Prestígio',  icon: '✦',  unlocked: S.unlocked.prestige },
      { id: 'ach',      name: 'Conquistas', icon: '🏅', unlocked: true },
      { id: 'guilds',   name: '???',        icon: '🔒', unlocked: false, teaser: S.unlocked.phase7 },
      { id: 'config',   name: 'Ajustes',    icon: '⚙️', unlocked: true },
    ];
  },

  renderTabs() {
    const nav = document.getElementById('tabs');
    nav.innerHTML = '';
    for (const t of this.tabDefs()) {
      if (t.id === 'guilds' && !t.teaser) continue; // teaser só aparece na fase 7
      const b = this.el('button', 'tab-btn' + (this.activeTab === t.id ? ' active' : '') + (!t.unlocked ? ' locked' : ''));
      b.innerHTML = t.unlocked ? `<span class="tab-icon">${t.icon}</span>${t.name}` : `<span class="tab-icon">🔒</span>???`;
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
      case 'base':     this.renderBase(c); break;
      case 'talents':  this.renderTalents(c); break;
      case 'prestige': this.renderPrestige(c); break;
      case 'ach':      this.renderAch(c); break;
      case 'config':   this.renderConfig(c); break;
    }
    this.dirty[id] = false;
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

      const row = this.el('div', 'gen-row');
      const info = this.el('div', 'gen-info');
      info.appendChild(this.el('div', 'gen-name', `<span class="gen-icon">${g.icon}</span> ${g.name} <span class="gen-owned">×${owned}</span>`));
      info.appendChild(this.el('div', 'gen-flavor', g.flavor));
      const prodEl = this.el('div', 'gen-prod', '');
      info.appendChild(prodEl);
      row.appendChild(info);

      const btn = this.el('button', 'buy-btn');
      btn.onclick = () => { if (Game.buyGen(g.id, this.buyAmount)) { this.dirty.prod = true; this.renderActive(); } };
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
    const cb = S.combat;

    // painel de combate
    const combat = this.el('div', 'combat-panel');
    const waveEl = this.el('div', 'combat-wave', '');
    combat.appendChild(waveEl);

    const enemy = this.el('button', 'enemy-box', '');
    enemy.title = 'Clique para atacar!';
    enemy.onclick = (ev) => {
      const dmg = Game.clickAttack();
      Sound.play('click');
      this.floatText(ev.clientX, ev.clientY, '-' + fmt(dmg), '#ff6b5e');
      this.shakeEnemy();
    };
    combat.appendChild(enemy);

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
    this.R.combat = { waveEl, enemy, hpFill, hpText, bossTimer, dpsEl };

    // heróis
    c.appendChild(this.el('h3', 'section-title', 'Heróis'));
    const list = this.el('div', 'hero-list');
    this.R.heroes = [];
    for (const def of HEROES) {
      if (def.reqPrestige && S.prestiges < def.reqPrestige) continue;
      const h = S.heroes[def.id];
      if (!h && S.earned < def.baseCost * 0.3) continue;

      const row = this.el('div', 'hero-row' + (h ? '' : ' hero-locked'));
      const portrait = this.el('div', 'hero-portrait');
      portrait.style.backgroundImage = `url("img/heroes/${def.id}.jpg")`;
      row.appendChild(portrait);
      const info = this.el('div', 'hero-info');
      info.appendChild(this.el('div', 'hero-name', `<span class="hero-icon">${def.icon}</span> <b>${def.name}</b> <span class="hero-title">${def.title}</span>`));
      if (h) {
        const stats = this.el('div', 'hero-stats', '');
        info.appendChild(stats);
        const gearLine = this.el('div', 'hero-gear', '');
        info.appendChild(gearLine);
        this.updateHeroGear(gearLine, def.id);
        row.appendChild(info);
        const btn = this.el('button', 'buy-btn');
        btn.onclick = () => { if (Game.levelHero(def.id, this.buyAmount)) { this.dirty.heroes = true; this.renderActive(); } };
        row.appendChild(btn);
        this.R.heroes.push({ id: def.id, hired: true, btn, stats });
      } else {
        info.appendChild(this.el('div', 'hero-story', def.story));
        row.appendChild(info);
        const btn = this.el('button', 'buy-btn hire-btn');
        btn.innerHTML = `Contratar<br><span class="btn-cost">${fmt(def.baseCost)} ouro</span>`;
        btn.onclick = () => { if (Game.hireHero(def.id)) { this.dirty.heroes = true; this.renderActive(); } };
        row.appendChild(btn);
        this.R.heroes.push({ id: def.id, hired: false, btn, cost: def.baseCost });
      }
      list.appendChild(row);
    }
    c.appendChild(list);

    // seletor de quantidade também vale para níveis
    const bar = this.el('div', 'buy-bar');
    bar.appendChild(this.el('span', 'buy-label', 'Níveis por compra:'));
    for (const amt of [1, 10, 'max']) {
      const b = this.el('button', 'buy-amt' + (this.buyAmount === amt ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
      b.onclick = () => { this.buyAmount = amt; this.dirty.heroes = true; this.renderActive(); };
      bar.appendChild(b);
    }
    c.insertBefore(bar, c.children[1]);
  },

  updateHeroGear(elGear, heroId) {
    const h = S.heroes[heroId];
    let html = '';
    for (const slot of GEAR_SLOTS) {
      const item = h.gear[slot.id];
      if (item) {
        const r = RARITIES[item.rarity];
        html += `<span class="gear-chip" style="border-color:${r.color};color:${r.color}" title="${slot.name} ${r.name}: +${Math.round(item.mult * 100)}% DPS">${item.icon} +${Math.round(item.mult * 100)}%</span>`;
      } else {
        html += `<span class="gear-chip gear-empty" title="${slot.name}: vazio (chefes derrubam equipamentos)">${slot.id === 'arma' ? '🗡️' : '📿'} —</span>`;
      }
    }
    elGear.innerHTML = html;
  },

  // ---------- Aba: Base ----------

  renderBase(c) {
    c.appendChild(this.el('p', 'tab-intro', 'Sua organização precisa de uma sede. Cada sala tem uma função — construa e evolua.'));
    const grid = this.el('div', 'room-grid');
    this.R.rooms = [];
    for (const r of ROOMS) {
      const lvl = Game.roomLvl(r.id);
      const card = this.el('div', 'room-card');
      card.appendChild(this.el('div', 'room-head', `<span class="room-icon">${r.icon}</span> <b>${r.name}</b> <span class="room-lvl">Nv ${lvl}</span>`));
      card.appendChild(this.el('div', 'room-desc', r.desc));
      const btn = this.el('button', 'buy-btn room-btn');
      btn.onclick = () => { if (Game.buildRoom(r.id)) { this.dirty.base = true; this.renderActive(); } };
      card.appendChild(btn);
      grid.appendChild(card);
      this.R.rooms.push({ id: r.id, btn });
    }
    c.appendChild(grid);
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
        card.onclick = () => { if (Game.buyTalent(t.id)) { this.dirty.talents = true; this.renderActive(); } };
        col.appendChild(card);
        this.R.talents.push({ id: t.id, btn: card, max: t.max });
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
    box.appendChild(this.el('div', 'prestige-hint', `Ouro ganho nesta run: ${fmt(S.earned)} — a Essência cresce com a raiz do ouro acumulado. Prestígios feitos: ${S.prestiges}`));
    c.appendChild(box);
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
    soundBtn.onclick = () => { S.sound = !S.sound; Sound.ensure(); this.dirty.config = true; soundBtn.innerHTML = S.sound ? '🔊 Som: Ligado' : '🔇 Som: Desligado'; };
    box.appendChild(soundBtn);

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
    if (S.invasion > 0) {
      bb.innerHTML = active.map(b => `<div class="buff-chip">${b.icon} ${b.name} <span class="buff-t">${fmtTime((b.until - now) / 1000)}</span></div>`).join('')
        + `<div class="buff-chip">👹 Invasão <span class="buff-t">${S.invasion} restantes</span></div>`;
    } else {
      bb.innerHTML = active.map(b => `<div class="buff-chip">${b.icon} ${b.name} <span class="buff-t">${fmtTime((b.until - now) / 1000)}</span></div>`).join('');
    }
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
      rc.enemy.textContent = cb.boss ? '👹' : ['👺', '🧟', '🐗', '🦂', '🐍', '👻', '🕷️', '🐺'][cb.wave % 8];
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

      for (const ref of this.R.heroes) {
        if (ref.hired) {
          const h = S.heroes[ref.id];
          const n = this.buyAmount === 'max' ? Game.heroMaxLevels(ref.id) : this.buyAmount;
          const cost = Game.heroLvlCost(ref.id, Math.max(1, n));
          ref.btn.innerHTML = `Nível ×${n}<br><span class="btn-cost">${fmt(cost)} ouro</span>`;
          const afford = n > 0 && S.gold >= cost;
          ref.btn.classList.toggle('afford', afford);
          ref.btn.disabled = !afford;
          ref.stats.innerHTML = `Nv <b>${h.lvl}</b> · DPS: <b>${fmt(Game.heroDps(ref.id))}</b>`;
        } else {
          const afford = S.gold >= ref.cost;
          ref.btn.classList.toggle('afford', afford);
          ref.btn.disabled = !afford;
        }
      }
      // novos heróis visíveis?
      if (this._lastHeroCheck === undefined || Date.now() - this._lastHeroCheck > 3000) {
        this._lastHeroCheck = Date.now();
        const visible = HEROES.filter(d => (!d.reqPrestige || S.prestiges >= d.reqPrestige) && (S.heroes[d.id] || S.earned >= d.baseCost * 0.3)).length;
        if (visible !== this.R.heroes.length) { this.dirty.heroes = true; this.renderActive(); }
      }
    }

    if (this.activeTab === 'base' && this.R.rooms) {
      for (const ref of this.R.rooms) {
        ref.btn.innerHTML = `Construir<br><span class="btn-cost">${this.roomCostHtml(ref.id)}</span>`;
        const afford = Game.canAffordRoom(ref.id);
        ref.btn.classList.toggle('afford', afford);
        ref.btn.disabled = !afford;
      }
    }

    if (this.activeTab === 'talents') {
      if (this.R.knowBanner) this.R.knowBanner.innerHTML = `📘 Conhecimento: <b>${fmt(S.res.conhecimento)}</b> (${fmtRate(Game.knowledgePerSec())})`;
      if (this.R.talents) for (const ref of this.R.talents) {
        const lvl = Game.talentLvl(ref.id);
        const afford = lvl < ref.max && S.res.conhecimento >= Game.talentCost(ref.id);
        ref.btn.classList.toggle('afford', afford);
        ref.btn.disabled = !afford;
      }
    }

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

  welcomeBack(off) {
    const box = this.showModal(`<h3>🌙 Bem-vindo de volta!</h3>
      <div class="modal-text">Você ficou fora por <b>${fmtTime(off.seconds)}</b>.<br>
      Sua organização trabalhou sem você:<br><br>
      <b>+${fmt(off.gold)}</b> ouro${off.know > 0.5 ? `<br><b>+${fmt(off.know)}</b> 📘 conhecimento` : ''}</div>`, true);
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

    this.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.start}"</i>`);
    this.renderTabs();
    this.renderLeft();
    this.renderActive();
  },
};
