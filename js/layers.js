// ===== Progressão em Camadas (Roadmap #13) — Ascensão =====
// Uma camada acima do Prestígio: Run → Prestígio → Ascensão. Reseta Essência e Prestígios (além de
// tudo que o Prestígio já reseta) em troca de Pontos de Ascensão (⬟) — permanentes, não voltam nem
// com um novo Prestígio nem com uma nova Ascensão. Reaproveita Game.resetRunState() (game.js) em vez
// de duplicar a lógica de reset da run. Config em LAYERS/ASCENSION_* (js/data.js).

Object.assign(Game, {

  // essência acumulada nesta camada → pontos de ascensão (cresce sublinear, mesmo espírito do prestígio)
  ascensionGain() {
    if (S.essence < ASCENSION_ESSENCE_REQ) return 0;
    return Math.floor(Math.pow(S.essence / ASCENSION_ESSENCE_REQ, 0.5));
  },

  canAscend() { return S.prestiges >= ASCENSION_PRESTIGE_REQ && this.ascensionGain() >= 1; },

  // bônus permanente por ⬟ — aplicado em produção/DPS/essência (ver expansion.js ext*Mult)
  ascMult() { return 1 + ASCENSION_BONUS_PER_POINT * S.layers.ascPoints; },

  doAscend() {
    if (!this.canAscend()) return false;
    const gain = this.ascensionGain();
    const prevEarned = S.earned;
    S.layers.ascPoints += gain;
    S.layers.ascensions++;
    S.essence = 0;
    S.prestiges = 0;
    this.resetRunState();
    this._gearDirty = true; this._fieldDirty = true;
    this.onPrestigeExt(prevEarned);            // mesmos hooks de reset da Fênix/Memória Persistente
    this.spawnEnemy();
    UI.log(`🌌 <b>ASCENSÃO ${S.layers.ascensions}!</b> Você transcende o Prestígio com <b>+${gain} ⬟ Pontos de Ascensão</b> ` +
      `(agora ${S.layers.ascPoints} — produção/DPS/essência ×${this.ascMult().toFixed(2)}). Essência e Prestígios reiniciam.`);
    UI.toast(`⬟ +${gain} Ascensão!`, '#b06fd8', true);
    UI.legendaryFlash('#b06fd8', true);
    Sound.play('prestige');
    UI.dirtyAll();
    return true;
  },
});
