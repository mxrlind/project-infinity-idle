// ===== Equipamentos 2.0 — Conjuntos + Elementos (Roadmap #3) =====
// Um item pode carregar `set` (GEAR_SETS) e/ou `element` (ELEMENTS), sorteados no drop/forja
// (ver Game.rollGear/forgeItem em game.js). Conjuntos dão bônus por nº de peças EQUIPADAS entre
// todos os heróis (2pç e 4pç); o bônus entra no mesmo cache de Game.gearBonus (recomputeGearBonuses,
// _gearDirty), então não precisa de tick próprio. Especiais 4pç conectam com outros sistemas:
// 'armorpen' (Golem) é lido por Game.bossArmorMults (bosses.js); 'lifesteal' (Sombrio) por
// Game.bossTimeLimit (game.js); 'burn' (Dragão) já é só o número extra de DPS do próprio bonus4.

Object.assign(Game, {

  itemSetDef(item) { return (item && item.set) ? GEAR_SETS.find(s => s.id === item.set) : null; },
  itemElementDef(item) { return (item && item.element) ? ELEMENTS.find(e => e.id === item.element) : null; },

  // sorteia set/elemento pra um item novo. preferSetId (loot temático de chefe) puxa a chance pro set dele.
  rollItemSetElement(preferSetId) {
    let set = null;
    if (preferSetId && Math.random() < 0.6) set = preferSetId;
    else if (Math.random() < GEAR_SET_DROP_CHANCE) set = GEAR_SETS[Math.floor(Math.random() * GEAR_SETS.length)].id;
    const element = Math.random() < GEAR_ELEMENT_CHANCE ? ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)].id : null;
    return { set, element };
  },

  // peças EQUIPADAS por set, somando os dois slots de todos os heróis contratados
  activeSetCounts() {
    const counts = {};
    for (const id in S.heroes) {
      for (const slot of GEAR_SLOTS) {
        const item = S.heroes[id].gear[slot.id];
        if (item && item.set) counts[item.set] = (counts[item.set] || 0) + 1;
      }
    }
    return counts;
  },

  // bônus agregados dos conjuntos ativos: { team (dps de time), crit, special:{burn|lifesteal|armorpen: true} }
  activeSetBonuses() {
    const counts = this.activeSetCounts();
    const out = { team: 0, crit: 0, special: {} };
    const apply = (obj) => {
      for (const k in obj) {
        if (k === 'special') out.special[obj[k]] = true;
        else if (k === 'dps' || k === 'team') out.team += obj[k];
        else if (k === 'crit') out.crit += obj[k];
      }
    };
    for (const setDef of GEAR_SETS) {
      const n = counts[setDef.id] || 0;
      if (n >= 2) apply(setDef.bonus2);
      if (n >= 4) { apply(setDef.bonus4); if (S.codex) S.codex.gearSets[setDef.id] = true; }   // Roadmap #11: Códex de Equipamentos (set completo)
    }
    return out;
  },

  gearSetArmorPenActive()  { return !!this.activeSetBonuses().special.armorpen; },
  gearSetLifestealActive() { return !!this.activeSetBonuses().special.lifesteal; },
  // 'burn' (Conjunto Dragão) não tem helper próprio: seu efeito já é o DPS extra somado em bonus4.
});
