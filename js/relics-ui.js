// ===== UI de Relíquias (Roadmap #6) =====
// Painel dentro da aba Heróis: RELIC_SLOTS de equipar + inventário de relíquias já encontradas.
// Cada trade-off é colorido (verde = bom pra você, vermelho = custo) a partir de RELIC_EFFECT_META.

Object.assign(UI, {

  RELIC_EFFECT_META: {
    gold:      { label: 'Ouro',                 kind: 'mult', goodAbove1: true },
    dps:       { label: 'DPS do time',          kind: 'mult', goodAbove1: true },
    killGold:  { label: 'Ouro por abate',       kind: 'mult', goodAbove1: true },
    essence:   { label: 'Ganho de Essência',    kind: 'mult', goodAbove1: true },
    material:  { label: 'Materiais',            kind: 'mult', goodAbove1: true },
    research:  { label: 'Vel. de pesquisa',     kind: 'mult', goodAbove1: true },
    heroCost:  { label: 'Custo de heróis',      kind: 'mult', goodAbove1: false },
    genCost:   { label: 'Custo de geradores',   kind: 'mult', goodAbove1: false },
    roomCost:  { label: 'Custo de salas',       kind: 'mult', goodAbove1: false },
    bossHp:    { label: 'HP de chefes',         kind: 'mult', goodAbove1: false },
    eventFreq: { label: 'Frequência de eventos', kind: 'mult', goodAbove1: true },
    drop:      { label: 'Chance de drop',       kind: 'add',  goodAbove1: true },
  },

  relicEffectChips(def) {
    const out = [];
    for (const key in def.effects) {
      const meta = this.RELIC_EFFECT_META[key];
      if (!meta) continue;
      const val = def.effects[key];
      const above = meta.kind === 'add' ? val > 0 : val > 1;
      const good = above === meta.goodAbove1;
      const text = meta.kind === 'add' ? fmtPct(val) : fmtMult(val);
      out.push({ label: meta.label, text, good });
    }
    return out;
  },

  // painel completo: slots equipados + inventário de relíquias possuídas
  renderRelics(c) {
    const owned = Game.ownedRelicIds();
    c.appendChild(this.el('h3', 'section-title', `🔮 Relíquias <span class="bag-count">${owned.length}/${RELICS.length}</span>`));

    if (!owned.length) {
      c.appendChild(this.el('div', 'empty-hint',
        `${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"Relíquias são rarísssimas: chefes fortes as guardam, e o Colecionador na Cidade troca uma por vez. Cada uma muda profundamente como você joga — escolha com cuidado."</i>`));
      return;
    }

    const panel = this.el('div', 'relic-panel');

    // slots equipados
    const slots = this.el('div', 'relic-slots');
    for (let i = 0; i < RELIC_SLOTS; i++) {
      const relicId = S.relics.equipped[i];
      const slot = this.el('div', 'relic-slot' + (relicId ? ' filled' : ''));
      if (relicId) {
        const def = Game.relicDef(relicId);
        slot.innerHTML = `${this.iconImgHtml(`img/relics/${def.id}.jpg`, def.icon, 'relic-slot-icon', 'div')}<div class="relic-slot-name">${def.name}</div>`;
        slot.title = def.desc + '\nClique para desequipar.';
        slot.onclick = () => { Game.unequipRelicSlot(i); this.dirty.heroes = true; this.renderActive(); };
      } else {
        slot.innerHTML = `<div class="relic-slot-icon relic-slot-empty">✦</div><div class="relic-slot-name">Slot ${i + 1}</div>`;
        slot.title = 'Vazio — equipe uma relíquia do inventário abaixo.';
      }
      slots.appendChild(slot);
    }
    panel.appendChild(slots);

    // resumo do efeito líquido atual (soma o que está equipado agora)
    const activeIds = Game.relicEquippedIds();
    if (activeIds.length) {
      const seen = {};
      const chips = [];
      for (const id of activeIds) for (const ch of this.relicEffectChips(Game.relicDef(id))) {
        seen[ch.label] = seen[ch.label] || { label: ch.label, good: ch.good, texts: [] };
        seen[ch.label].texts.push(ch.text);
      }
      for (const k in seen) chips.push(seen[k]);
      const net = this.el('div', 'relic-net');
      net.innerHTML = chips.map(ch => `<span class="relic-chip ${ch.good ? 'good' : 'bad'}">${ch.label}: ${ch.texts.join(' ')}</span>`).join('');
      panel.appendChild(net);
    }

    // inventário: relíquias possuídas mas não equipadas
    const inv = owned.filter(id => !activeIds.includes(id));
    panel.appendChild(this.el('h3', 'section-title relic-inv-title', `Inventário <span class="bag-count">${inv.length}</span>`));
    if (!inv.length) {
      panel.appendChild(this.el('div', 'empty-hint', 'Todas as relíquias encontradas já estão equipadas.'));
    } else {
      const grid = this.el('div', 'relic-grid');
      for (const id of inv) grid.appendChild(this.relicCard(id));
      panel.appendChild(grid);
    }

    c.appendChild(panel);
  },

  relicCard(relicId) {
    const def = Game.relicDef(relicId);
    const card = this.el('div', 'relic-card' + (this.isNewRow('relic', relicId) ? ' row-enter-sm' : ''));
    const chips = this.relicEffectChips(def).map(ch => `<span class="relic-chip ${ch.good ? 'good' : 'bad'}">${ch.label}: ${ch.text}</span>`).join('');
    card.innerHTML = `
      ${this.iconImgHtml(`img/relics/${def.id}.jpg`, def.icon, 'rc-icon', 'div')}
      <div class="rc-name">${def.name}</div>
      <div class="rc-chips">${chips}</div>
      <button class="buy-btn rc-equip">Equipar</button>`;
    card.title = def.desc;
    card.querySelector('.rc-equip').onclick = () => {
      const free = S.relics.equipped.indexOf(null);
      if (free === -1) { this.toast('🔮 Todos os slots ocupados — desequipe uma primeiro.', '#ff6b5e'); return; }
      Game.equipRelic(relicId, free);
      this.dirty.heroes = true;
      this.renderActive();
    };
    return card;
  },
});
