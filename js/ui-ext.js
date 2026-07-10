// ===== UI da expansão: Mascotes, Pesquisa, Mercado, Cidade, Mundo Vivo, Segredos =====
// Carregado depois de ui.js — adiciona renderizadores ao objeto UI.

Object.assign(UI, {

  // ---------- Aba: Mascotes ----------

  renderPets(c) {
    c.appendChild(this.el('h3', 'section-title', `🐾 Mascotes <span class="bag-count">${S.pets.active.length}/${Game.petSlots()} ativos</span>`));
    c.appendChild(this.el('p', 'tab-intro',
      'Mascotes <b>ativos</b> concedem seus bônus. Eles ganham XP com abates (e mais rápido em eclipses); ' +
      'alimente-os com recursos para acelerar. Aos níveis <b>25</b> e <b>50</b> eles <b>evoluem</b> (bônus ×1,5 e ×2).' +
      (Game.hasResearch('vinculo') ? '' : ' A pesquisa <b>Vínculo Animal</b> 💞 permite 2 ativos ao mesmo tempo.')));

    const grid = this.el('div', 'pet-grid');
    this.R.pets = [];
    const resIcons = { madeira: '🪵', pedra: '🪨', ferro: '⛓️', cristal: '💠' };
    for (const def of PETS) {
      const p = S.pets.owned[def.id];
      if (!p) {
        const card = this.el('div', 'pet-card pet-locked');
        card.innerHTML = `<div class="pet-icon">❔</div><div class="pet-name">???</div>
          <div class="pet-desc">${def.unlockText}</div>`;
        grid.appendChild(card);
        continue;
      }
      const stage = Game.petStage(p.lvl);
      const active = S.pets.active.includes(def.id);
      const rar = RARITIES[def.rarity];
      const card = this.el('div', 'pet-card' + (active ? ' pet-active' : '') + (this.isNewRow('pets', def.id) ? ' row-enter' : ''));
      card.style.borderColor = active ? rar.color : '';
      const bonusHtml = Object.keys(def.bonus).map((k, i) => {
        const val = def.bonus[k] * p.lvl * PET_EVO_MULTS[stage];
        const label = { dps: '⚔️ DPS', crit: '🎯 Crítico', knowledge: '📘 Conhecimento', research: '🔬 Pesquisa', gold: '💰 Ouro', drop: '💎 Drop', essence: '✦ Essência', keep: '🪺 Ninho de ouro' }[k] || k;
        return `<div class="pet-bonus" title="${def.bonusTip[i] || ''}">${label}: <b>+${(val * 100).toFixed(1)}%</b></div>`;
      }).join('');
      card.innerHTML = `
        <div class="pet-head">
          <span class="pet-icon">${def.icon}</span>
          <div>
            <div class="pet-name" style="color:${rar.color}">${def.evo[stage]}</div>
            <div class="pet-rar" style="color:${rar.color}">${rar.name}${active ? ' · <b>ATIVO</b>' : ''}</div>
          </div>
        </div>
        <div class="pet-desc">${def.desc}</div>
        <div class="pet-lvl">Nível <b class="pl-num">${p.lvl}</b>/${PET_MAX_LVL}</div>
        <div class="pet-xp-bar"><div class="pet-xp-fill"></div></div>
        ${bonusHtml}
        <div class="pet-actions">
          <button class="buy-btn pet-feed"></button>
          <button class="cfg-btn pet-toggle">${active ? '💤 Descansar' : '✨ Ativar'}</button>
        </div>`;
      card.querySelector('.pet-toggle').onclick = () => { Game.togglePetActive(def.id); this.dirty.pets = true; this.renderActive(); };
      card.querySelector('.pet-feed').onclick = () => {
        if (Game.feedPet(def.id)) { this.updateDynamic(); }
        else Sound.play('error');
      };
      grid.appendChild(card);
      this.R.pets.push({
        id: def.id, resIcons,
        lvlEl: card.querySelector('.pl-num'),
        fillEl: card.querySelector('.pet-xp-fill'),
        feedBtn: card.querySelector('.pet-feed'),
      });
    }
    c.appendChild(grid);
  },

  // ---------- Aba: Pesquisa ----------

  renderResearch(c) {
    const speed = Game.researchSpeed();
    c.appendChild(this.el('h3', 'section-title', '🔬 Pesquisa'));
    c.appendChild(this.el('p', 'tab-intro',
      'Tecnologias levam <b>tempo real</b> para concluir (e continuam <b>offline</b>). Fila de até ' +
      `${RESEARCH_QUEUE_MAX}; cancelar devolve 50% do custo.` +
      (speed > 1 ? ` Velocidade atual: <b>×${speed.toFixed(2)}</b> (Coruja 🦉).` : '')));

    // fila
    const queueBox = this.el('div', 'rq-box');
    this.R.research = { queue: [], cards: [] };
    if (!S.research.queue.length) {
      queueBox.appendChild(this.el('div', 'empty-hint', `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"O laboratório está ocioso. Escolha uma tecnologia abaixo!"</i>`));
    }
    S.research.queue.forEach((q, i) => {
      const def = Game.researchDef(q.id);
      const row = this.el('div', 'rq-row' + (i === 0 ? ' rq-current' : ''));
      row.innerHTML = `<span class="rq-icon">${def.icon}</span>
        <div class="rq-info">
          <div class="rq-name"><b>${def.name}</b> ${i > 0 ? '<span class="rq-wait">na fila</span>' : ''}</div>
          <div class="rq-bar"><div class="rq-fill"></div></div>
          <div class="rq-time"></div>
        </div>`;
      const cancel = this.el('button', 'bc-scrap', '✕');
      cancel.title = 'Cancelar (devolve 50%)';
      cancel.onclick = () => { Game.cancelResearch(i); this.dirty.research = true; this.renderActive(); };
      row.appendChild(cancel);
      queueBox.appendChild(row);
      this.R.research.queue.push({ def, q, fillEl: row.querySelector('.rq-fill'), timeEl: row.querySelector('.rq-time') });
    });
    c.appendChild(queueBox);

    // disponíveis, por categoria
    const avail = Game.researchAvailable();
    for (const catId in RESEARCH_CATS) {
      const cat = RESEARCH_CATS[catId];
      const list = avail.filter(r => r.cat === catId);
      const doneN = RESEARCH.filter(r => r.cat === catId && S.research.done[r.id]).length;
      const totalN = RESEARCH.filter(r => r.cat === catId).length;
      if (!list.length && !doneN) continue;
      c.appendChild(this.el('h3', 'section-title', `${cat.icon} ${cat.name} <span class="bag-count">${doneN}/${totalN}</span>`));
      if (!list.length) continue;
      const grid = this.el('div', 'research-grid');
      for (const def of list) {
        const card = this.el('div', 'research-card' + (this.isNewRow('research', def.id) ? ' row-enter' : ''));
        card.innerHTML = `
          <div class="rc-head">${def.icon} <b>${def.name}</b> <span class="rc-time">⏱️ ${fmtTime(def.time)}</span></div>
          <div class="rc-desc">${def.desc}</div>
          <div class="rc-cost"></div>`;
        const btn = this.el('button', 'buy-btn rc-start', 'Pesquisar');
        btn.onclick = () => { if (Game.startResearch(def.id)) { this.dirty.research = true; this.renderActive(); } else Sound.play('error'); };
        card.appendChild(btn);
        grid.appendChild(card);
        this.R.research.cards.push({ def, btn, costEl: card.querySelector('.rc-cost') });
      }
      c.appendChild(grid);
    }
  },

  researchCostHtml(def) {
    const cost = Game.researchCost(def);
    const names = { madeira: '🪵', pedra: '🪨', ferro: '⛓️', cristal: '💠' };
    const parts = [];
    parts.push(`<span class="${S.res.conhecimento >= cost.know ? '' : 'cost-missing'}">${fmt(cost.know)} 📘</span>`);
    if (cost.gold > 0) parts.push(`<span class="${S.gold >= cost.gold ? '' : 'cost-missing'}">${fmt(cost.gold)} ouro</span>`);
    for (const k in cost.mats) parts.push(`<span class="${(S.res[k] || 0) >= cost.mats[k] ? '' : 'cost-missing'}">${fmt(cost.mats[k])} ${names[k] || k}</span>`);
    return parts.join(' · ');
  },

  // ---------- Aba: Mercado ----------

  marketSpark(goodId) {
    const h = S.market.hist[goodId] || [];
    if (h.length < 2) return '<svg class="spark" viewBox="0 0 120 32"></svg>';
    const min = Math.min(...h), max = Math.max(...h);
    const span = Math.max(0.001, max - min);
    const pts = h.map((v, i) => `${(i / (h.length - 1)) * 120},${30 - ((v - min) / span) * 28}`).join(' ');
    const up = h[h.length - 1] >= h[0];
    return `<svg class="spark" viewBox="0 0 120 32" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${up ? '#5fbf6b' : '#ff6b5e'}" stroke-width="1.5"/></svg>`;
  },

  renderMarket(c) {
    Game.ensureMarket();
    const fee = Game.marketFee();
    c.appendChild(this.el('h3', 'section-title', '📈 Mercado'));
    c.appendChild(this.el('p', 'tab-intro',
      `Os preços <b>vivem</b>: mudam a cada hora do mundo com estações, climas e o acaso. Compre na baixa, ` +
      `estoque e venda na alta. Taxa atual: <b>${(fee * 100).toFixed(1)}%</b>` +
      (Game.npcLevel('mercador') > 0 ? ` (amizade com Dorian já desconta)` : '') + '.'));

    // seletor de quantidade
    const bar = this.el('div', 'buy-bar');
    bar.appendChild(this.el('span', 'buy-label', 'Quantidade:'));
    for (const amt of [10, 100, 'max']) {
      const b = this.el('button', 'buy-amt' + (this._mktAmt === amt || (!this._mktAmt && amt === 10) ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
      b.onclick = () => { this._mktAmt = amt; this.dirty.market = true; this.renderActive(); };
      bar.appendChild(b);
    }
    c.appendChild(bar);

    const w = Game.worldInfo();
    const list = this.el('div', 'market-list');
    this.R.market = [];
    for (const g of MARKET_GOODS) {
      const idx = S.market.idx[g.id];
      const h = S.market.hist[g.id] || [];
      const prev = h.length > 1 ? h[h.length - 2] : idx;
      const delta = ((idx - prev) / prev) * 100;
      const badges = [];
      if (idx >= MARKET_SCARCITY) badges.push('<span class="mkt-badge mkt-scarce">ESCASSEZ</span>');
      if (idx <= MARKET_PROMO) badges.push('<span class="mkt-badge mkt-promo">PROMOÇÃO</span>');
      if (g.season && g.season[w.season.id]) badges.push(`<span class="mkt-badge mkt-season">${w.season.icon} demanda alta</span>`);
      if (g.weather && w.weather && g.weather[w.weather.id]) badges.push(`<span class="mkt-badge mkt-season">${w.weather.icon} demanda alta</span>`);

      const row = this.el('div', 'market-row');
      row.innerHTML = `
        <div class="mkt-good"><span class="mkt-icon">${g.icon}</span><div><b>${g.name}</b><div class="mkt-owned">você tem <b class="mo-num">${fmt(S.res[g.id] || 0)}</b></div></div></div>
        <div class="mkt-chart">${this.marketSpark(g.id)}
          <div class="mkt-idx">índice <b>${idx.toFixed(2)}</b> <span class="${delta >= 0 ? 'mkt-up' : 'mkt-down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%</span></div>
          <div class="mkt-badges">${badges.join(' ')}</div>
        </div>
        <div class="mkt-actions">
          <button class="buy-btn mkt-buy"></button>
          <button class="buy-btn mkt-sell"></button>
        </div>`;
      const amt = this._mktAmt || 10;
      row.querySelector('.mkt-buy').onclick = () => { if (Game.marketBuy(g.id, amt)) this.updateDynamic(); else Sound.play('error'); };
      row.querySelector('.mkt-sell').onclick = () => { if (Game.marketSell(g.id, amt)) this.updateDynamic(); else Sound.play('error'); };
      list.appendChild(row);
      this.R.market.push({ id: g.id, buyBtn: row.querySelector('.mkt-buy'), sellBtn: row.querySelector('.mkt-sell'), ownedEl: row.querySelector('.mo-num') });
    }
    c.appendChild(list);
    c.appendChild(this.el('div', 'forge-stat', `Transações: <b>${fmt(S.market.stats.trades)}</b> · unidades vendidas: <b>${fmt(S.market.stats.sold)}</b> · compradas: <b>${fmt(S.market.stats.bought)}</b>`));
  },

  // ---------- Aba: Cidade (NPCs) ----------

  renderCity(c) {
    Game.ensureNpcDay();
    const w = Game.worldInfo();
    c.appendChild(this.el('h3', 'section-title', `🏘️ Cidade <span class="bag-count">Dia ${w.day}</span>`));
    c.appendChild(this.el('p', 'tab-intro',
      'Os moradores renovam <b>estoque e missões a cada dia do mundo</b> (20 min reais). ' +
      'Usar ofertas e cumprir missões aumenta a <b>amizade</b> — e amizade destrava vantagens permanentes.'));

    this.R.city = [];
    for (const def of NPCS) {
      const lvl = Game.npcLevel(def.id);
      const xp = S.npcs.rep[def.id] || 0;
      const nextXp = NPC_FRIEND_XP[lvl + 1];
      const rng = Game._seededRng(w.day * 31 + def.id.charCodeAt(1));
      const line = def.lines[Math.floor(rng() * def.lines.length)];

      const card = this.el('div', 'npc-card' + (this.isNewRow('npc', def.id) ? ' row-enter' : ''));
      card.innerHTML = `
        <div class="npc-head">
          <span class="npc-icon">${def.icon}</span>
          <div>
            <div class="npc-name"><b>${def.name}</b> <span class="hero-title">${def.title}</span></div>
            <div class="npc-line">"${line}"</div>
          </div>
          <div class="npc-friend" title="${def.perk}">
            <div class="npc-friend-lvl">💛 nv <b>${lvl}</b></div>
            <div class="npc-friend-bar"><div class="npc-friend-fill" style="width:${nextXp ? Math.min(100, (xp - NPC_FRIEND_XP[lvl]) / (nextXp - NPC_FRIEND_XP[lvl]) * 100) : 100}%"></div></div>
          </div>
        </div>
        <div class="npc-perk">⭐ ${def.perk}</div>
        <div class="npc-mission"></div>
        <div class="npc-offers"></div>`;

      // missão do dia
      const m = S.npcs.mission[def.id];
      const mBox = card.querySelector('.npc-mission');
      if (m) {
        const mt = NPC_MISSIONS[def.id].text.replace('{n}', m.need);
        if (m.claimed) mBox.innerHTML = `📜 <s>${mt}</s> <span class="mkt-up">✓ concluída</span>`;
        else if (m.done) {
          mBox.innerHTML = `📜 ${mt} — `;
          const claim = this.el('button', 'buy-btn afford npc-claim', 'Coletar recompensa');
          claim.onclick = () => { if (Game.claimMission(def.id)) { this.dirty.city = true; this.renderActive(); } };
          mBox.appendChild(claim);
        } else {
          mBox.innerHTML = `📜 ${mt} <span class="npc-prog">(${fmt(Math.min(m.prog, m.need))}/${m.need})</span>`;
        }
      }

      // ofertas do dia
      const oBox = card.querySelector('.npc-offers');
      const offers = S.npcs.offers[def.id] || [];
      offers.forEach((_, i) => {
        const info = Game.npcOfferInfo(def.id, i);
        if (!info) return;
        const used = S.npcs.used[def.id] && S.npcs.used[def.id][i];
        const row = this.el('div', 'npc-offer' + (used ? ' used' : ''));
        const costHtml = Object.keys(info.cost).map(k => {
          const have = k === 'gold' ? S.gold : (S.res[k] || 0);
          const names = { gold: 'ouro', madeira: '🪵', pedra: '🪨', ferro: '⛓️', cristal: '💠' };
          return `<span class="${have >= info.cost[k] ? '' : 'cost-missing'}">${fmt(info.cost[k])} ${names[k] || k}</span>`;
        }).join(' · ');
        row.innerHTML = `<div class="npc-offer-label">${info.label}</div>`;
        const btn = this.el('button', 'buy-btn npc-offer-btn');
        btn.innerHTML = used ? 'Esgotado hoje' : `Comprar<br><span class="btn-cost">${costHtml}</span>`;
        btn.disabled = used || !Game.canAffordOffer(info.cost);
        btn.classList.toggle('afford', !used && Game.canAffordOffer(info.cost));
        btn.onclick = () => { if (Game.useOffer(def.id, i)) { this.dirty.city = true; this.renderActive(); } else Sound.play('error'); };
        row.appendChild(btn);
        oBox.appendChild(row);
        this.R.city.push({ npcId: def.id, i, btn, used });
      });

      c.appendChild(card);
    }
  },

  // ---------- Widget do Mundo (painel esquerdo) ----------

  _worldKey: '',

  updateWorld() {
    const box = document.getElementById('world-box');
    if (!box) return;
    const w = Game.worldInfo();
    const weatherKey = w.weather ? w.weather.id : '-';
    const key = `${w.hour}|${w.day}|${w.season.id}|${weatherKey}`;
    if (key === this._worldKey) return;
    this._worldKey = key;
    const sky = w.isNight ? '🌙' : (w.hour < 10 ? '🌅' : '☀️');
    let html = `<div class="world-line">
      <span class="world-sky">${sky}</span> <b>${String(w.hour).padStart(2, '0')}h</b>
      <span class="world-season">${w.season.icon} ${w.season.name}</span>
      <span class="world-day">dia ${w.day}</span>
    </div>`;
    if (w.weather) html += `<div class="world-weather" title="${w.weather.desc}">${w.weather.icon} <b>${w.weather.name}</b> — ${w.weather.desc}</div>`;
    if (Game.hasResearch('astronomia')) {
      const hLeft = Math.max(0, (S.world.nextAt - S.world.min) / 60);
      html += `<div class="world-forecast">🔭 próximo evento climático em ~${Math.ceil(hLeft)}h do mundo</div>`;
    }
    box.innerHTML = html;
    box.onclick = () => this.showWorldModal();
  },

  showWorldModal() {
    const w = Game.worldInfo();
    const seasonRows = SEASONS.map(s =>
      `<div class="cal-row${s.id === w.season.id ? ' cal-now' : ''}">${s.icon} <b>${s.name}</b> — ${s.desc}${s.id === w.season.id ? ' <span class="mkt-up">← agora</span>' : ''}</div>`).join('');
    const weatherRows = WEATHERS.map(d => {
      const seen = S.world.seenWeathers[d.id];
      return `<div class="cal-row">${seen ? `${d.icon} <b>${d.name}</b> — ${d.desc}` : '❔ <i>clima ainda não testemunhado</i>'}</div>`;
    }).join('');
    this.showModal(`<h3>🗓️ Calendário do Mundo</h3>
      <div class="modal-text">
        Dia <b>${w.day}</b>, <b>${String(w.hour).padStart(2, '0')}h</b> (${w.isNight ? '🌙 noite: +15% conhecimento, −5% ouro' : '☀️ dia'})<br>
        Estação: <b>${w.season.icon} ${w.season.name}</b> (${SEASON_DAYS} dias do mundo cada; 1 dia = 20 min reais)
      </div>
      <h3 class="codex-sec">Estações</h3><div class="cal-list">${seasonRows}</div>
      <h3 class="codex-sec">Climas</h3><div class="cal-list">${weatherRows}</div>`, true);
  },

  // ---------- Atualização por tick das abas da expansão ----------

  updateExt() {
    this.updateWorld();

    if (this.activeTab === 'pets' && this.R.pets) {
      for (const ref of this.R.pets) {
        const p = S.pets.owned[ref.id];
        if (!p) continue;
        ref.lvlEl.textContent = p.lvl;
        const need = Game.petXpNeed(ref.id);
        ref.fillEl.style.width = (p.lvl >= PET_MAX_LVL ? 100 : Math.min(100, (p.xp / need) * 100)) + '%';
        const cost = Game.petFeedCost(ref.id);
        const ok = p.lvl < PET_MAX_LVL && (S.res[cost.res] || 0) >= cost.amount;
        ref.feedBtn.innerHTML = p.lvl >= PET_MAX_LVL ? 'MÁXIMO' : `🍖 Alimentar<br><span class="btn-cost">${fmt(cost.amount)} ${ref.resIcons[cost.res] || cost.res}</span>`;
        ref.feedBtn.disabled = !ok;
        ref.feedBtn.classList.toggle('afford', ok);
      }
    }

    if (this.activeTab === 'research' && this.R.research) {
      for (const ref of this.R.research.queue) {
        const pct = ref.q === S.research.queue[0] ? (1 - ref.q.left / ref.def.time) * 100 : 0;
        ref.fillEl.style.width = Math.max(0, Math.min(100, pct)) + '%';
        ref.timeEl.textContent = '⏱️ ' + fmtTime(ref.q.left / Game.researchSpeed());
      }
      // fila terminou um item? re-renderiza
      if (this.R.research.queue.length !== S.research.queue.length) { this.dirty.research = true; this.renderActive(); return; }
      for (const ref of this.R.research.cards) {
        ref.costEl.innerHTML = this.researchCostHtml(ref.def);
        const ok = Game.canStartResearch(ref.def.id);
        ref.btn.disabled = !ok;
        ref.btn.classList.toggle('afford', ok);
      }
    }

    if (this.activeTab === 'market' && this.R.market) {
      const amt = this._mktAmt || 10;
      for (const ref of this.R.market) {
        const owned = Math.floor(S.res[ref.id] || 0);
        ref.ownedEl.textContent = fmt(owned);
        const buyN = amt === 'max' ? Math.floor(S.gold / Game.marketBuyPrice(ref.id)) : amt;
        const sellN = amt === 'max' ? owned : amt;
        const buyCost = Game.marketBuyPrice(ref.id) * Math.max(1, buyN);
        const sellGain = Game.marketSellPrice(ref.id) * Math.max(1, sellN);
        ref.buyBtn.innerHTML = `Comprar ×${fmt(Math.max(0, buyN))}<br><span class="btn-cost">${fmt(buyCost)} ouro</span>`;
        ref.sellBtn.innerHTML = `Vender ×${fmt(Math.max(0, sellN))}<br><span class="btn-cost">+${fmt(sellGain)} ouro</span>`;
        const canBuy = buyN > 0 && S.gold >= Game.marketBuyPrice(ref.id) * buyN;
        const canSell = sellN > 0 && owned >= sellN;
        ref.buyBtn.disabled = !canBuy;
        ref.buyBtn.classList.toggle('afford', canBuy);
        ref.sellBtn.disabled = !canSell;
        ref.sellBtn.classList.toggle('afford', canSell);
      }
    }

    if (this.activeTab === 'city' && this.R.city) {
      for (const ref of this.R.city) {
        if (ref.used) continue;
        const info = Game.npcOfferInfo(ref.npcId, ref.i);
        if (!info) continue;
        const ok = Game.canAffordOffer(info.cost);
        ref.btn.disabled = !ok;
        ref.btn.classList.toggle('afford', ok);
      }
    }
  },

  // ---------- Inicialização da expansão ----------

  initExt() {
    // widget do mundo no painel esquerdo (antes dos recursos)
    const extra = document.getElementById('left-extra');
    if (extra && !document.getElementById('world-box')) {
      const box = this.el('div', '');
      box.id = 'world-box';
      box.title = 'Calendário do mundo — clique para detalhes';
      extra.insertBefore(box, extra.firstChild);
    }

    // segredo "Palavra Mágica": digitar o nome do conselheiro em qualquer lugar
    let typed = '';
    document.addEventListener('keydown', (e) => {
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === 'aldric' && !S.secrets.aldric) {
        S.secrets.aldric = true;
        UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"...você me chamou? Impressionante. Poucos lembram do meu nome."</i>`);
        UI.toast('🔤 Algo respondeu...', '#b06fd8', true);
        Sound.play('lore');
        Game.checkAchievements();
      }
    });

    // segredo "Poeira nos Cantos": um pontinho quase invisível no canto da tela
    if (!document.getElementById('void-dot')) {
      const dot = this.el('button', '');
      dot.id = 'void-dot';
      dot.setAttribute('aria-label', '');
      dot.onclick = () => {
        if (S.secrets.dot) return;
        S.secrets.dot = true;
        UI.log('🕸️ Você tocou algo que não deveria existir. Ele gostou.');
        UI.toast('🕸️ ...o quê?', '#b06fd8', true);
        Sound.play('portal');
        Game.checkAchievements();
      };
      document.body.appendChild(dot);
    }

    // retoma a música ambiente se estava ligada (o AudioContext destrava no 1º clique)
    if (S.audio.music && S.sound) Sound.startMusic();
  },
});
