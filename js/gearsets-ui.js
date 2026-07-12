// ===== UI de Conjuntos de Equipamento (Roadmap #3) =====
// Painel dentro da aba Heróis: progresso 0/2/4 de cada Conjunto (peças equipadas em qualquer herói).
// Só aparece depois que pelo menos uma peça de algum conjunto já foi vista (evita ruído antes da Forja).

Object.assign(UI, {
  renderGearSets(c) {
    const counts = Game.activeSetCounts ? Game.activeSetCounts() : {};
    // só mostra o painel se o jogador já viu ao menos uma peça de conjunto (equipada OU na bolsa)
    const everSeen = Object.keys(counts).length > 0 ||
      S.forge.inventory.some(i => i.set) ||
      Object.values(S.heroes).some(h => (h.gear.arma && h.gear.arma.set) || (h.gear.amuleto && h.gear.amuleto.set));
    if (!everSeen) return;

    c.appendChild(this.el('h3', 'section-title', '🧩 Conjuntos'));
    const grid = this.el('div', 'gearset-grid');
    for (const setDef of GEAR_SETS) {
      const n = counts[setDef.id] || 0;
      const card = this.el('div', 'gearset-card' + (n >= 4 ? ' gs-4' : n >= 2 ? ' gs-2' : ''));
      const bonus4Special = setDef.bonus4.special;
      card.innerHTML = `
        <div class="gs-icon">${setDef.icon}</div>
        <div class="gs-name">${setDef.name}</div>
        <div class="gs-progress">${Math.min(n, 4)}/4 peças</div>
        <div class="gs-tiers">
          <span class="gs-tier${n >= 2 ? ' on' : ''}">2pç: ${this.gearSetBonusText(setDef.bonus2)}</span>
          <span class="gs-tier${n >= 4 ? ' on' : ''}">4pç: ${this.gearSetBonusText(setDef.bonus4)} — ${setDef.desc4}</span>
        </div>`;
      card.title = `${setDef.name}: ${n} peça(s) equipada(s) entre seus heróis.`;
      grid.appendChild(card);
    }
    c.appendChild(grid);
  },

  gearSetBonusText(obj) {
    const parts = [];
    for (const k in obj) {
      if (k === 'special') continue;
      if (k === 'dps' || k === 'team') parts.push(`+${Math.round(obj[k] * 100)}% DPS`);
      else if (k === 'crit') parts.push(`+${Math.round(obj[k] * 100)}% crítico`);
    }
    return parts.join(' · ') || '—';
  },
});
