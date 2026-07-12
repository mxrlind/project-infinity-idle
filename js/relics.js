// ===== Relíquias (Roadmap #6) =====
// Itens rarísssimos, no máx. RELIC_SLOTS equipadas ao mesmo tempo, cada uma com um trade-off forte.
// Permanentes (S.relics não é tocado pelo reset do prestígio — ver Game.doPrestige em game.js).
// Integração com o motor original via os hooks ext*Mult já existentes (ver expansion.js) + um hook
// novo, extBossHpMult, aplicado em Game.enemyMaxHp (game.js).

Object.assign(Game, {

  relicDef(id) { return RELICS.find(r => r.id === id) || null; },
  relicOwned(id) { return !!S.relics.owned[id]; },
  relicEquippedIds() { return S.relics.equipped.filter(Boolean); },
  ownedRelicIds() { return Object.keys(S.relics.owned); },

  // produto entre as relíquias equipadas de effects[key] (default 1 = sem efeito)
  relicEffect(key) {
    let m = 1;
    for (const id of this.relicEquippedIds()) {
      const def = this.relicDef(id);
      if (def && def.effects && typeof def.effects[key] === 'number' && key !== 'drop') m *= def.effects[key];
    }
    return m;
  },

  // 'drop' é aditivo (mesma unidade da chance 0..1 de Game.dropChance), não multiplicativo
  relicDropBonus() {
    let b = 0;
    for (const id of this.relicEquippedIds()) {
      const def = this.relicDef(id);
      if (def && def.effects && typeof def.effects.drop === 'number') b += def.effects.drop;
    }
    return b;
  },

  // concede uma relíquia (aleatória entre as ainda não possuídas, ou uma específica) — fonte: chefe raro,
  // troca com o Colecionador, recompensa de pesquisa endgame.
  grantRelic(relicId) {
    let def;
    if (relicId) {
      def = this.relicDef(relicId);
      if (!def || this.relicOwned(def.id)) return null;
    } else {
      const pool = RELICS.filter(r => !this.relicOwned(r.id));
      if (!pool.length) return null;
      def = pool[Math.floor(Math.random() * pool.length)];
    }
    S.relics.owned[def.id] = true;
    UI.log(`${def.icon} <b>Relíquia encontrada: ${def.name}!</b> ${def.desc}`);
    UI.toast(`${def.icon} Relíquia: ${def.name}!`, '#e8a33d', true);
    UI.legendaryFlash('#e8a33d', true);
    Sound.play('drop');
    UI.dirty.heroes = true;
    return def;
  },

  // equipa relicId no slotIndex (desequipando quem já estava lá e removendo a mesma relíquia de outro slot)
  equipRelic(relicId, slotIndex) {
    if (!this.relicOwned(relicId)) return false;
    if (slotIndex < 0 || slotIndex >= RELIC_SLOTS) return false;
    const eq = S.relics.equipped;
    const already = eq.indexOf(relicId);
    if (already !== -1) eq[already] = null;
    eq[slotIndex] = relicId;
    UI.dirty.heroes = true;
    return true;
  },

  unequipRelicSlot(slotIndex) {
    if (slotIndex < 0 || slotIndex >= RELIC_SLOTS) return false;
    S.relics.equipped[slotIndex] = null;
    UI.dirty.heroes = true;
    return true;
  },
});
