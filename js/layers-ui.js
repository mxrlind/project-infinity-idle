// ===== UI de Ascensão (Roadmap #13 — Progressão em Camadas) =====
// Painel dentro da aba Prestígio (chamado por UI.renderPrestige em ui.js). Só aparece depois do
// primeiro prestígio, pra não "spoilar" a camada seguinte antes da hora; fica bloqueado com barra
// de progresso até bater ASCENSION_PRESTIGE_REQ prestígios na camada atual.

Object.assign(UI, {

  renderAscension(c) {
    if (S.prestiges < 1 && S.layers.ascensions < 1) return;

    const unlocked = S.prestiges >= ASCENSION_PRESTIGE_REQ;
    const gain = Game.ascensionGain();
    const box = this.el('div', 'prestige-box ascension-box' + (unlocked ? '' : ' locked'));
    box.appendChild(this.el('div', 'prestige-sigil ascension-sigil', '🌌'));
    box.appendChild(this.el('h2', 'prestige-title ascension-title', 'Ascensão'));
    box.appendChild(this.el('p', 'prestige-text',
      `Transcenda o próprio Prestígio: reinicia <b>Essência e Prestígios</b> (junto com ouro, geradores, heróis e base) — mas concede <b>Pontos de Ascensão</b>, permanentes mesmo entre ascensões.<br><br>
       Cada ⬟ concede <b>+${Math.round(ASCENSION_BONUS_PER_POINT * 100)}% de produção, DPS e ganho de Essência para sempre</b>.`));
    box.appendChild(this.el('div', 'prestige-current',
      `Pontos de Ascensão: <b>⬟ ${fmt(S.layers.ascPoints)}</b> (bônus ×${Game.ascMult().toFixed(2)}) — Ascensões: ${S.layers.ascensions}`));

    if (!unlocked) {
      box.appendChild(this.el('div', 'prestige-hint',
        `🔒 Bloqueado — requer <b>${ASCENSION_PRESTIGE_REQ} prestígios</b> nesta camada (atual: ${S.prestiges}/${ASCENSION_PRESTIGE_REQ}).`));
    } else {
      const btn = this.el('button', 'prestige-btn ascension-btn' + (gain >= 1 ? '' : ' disabled'));
      btn.innerHTML = gain >= 1
        ? `ASCENDER<br><span class="btn-cost">+${fmt(gain)} ⬟ Ascensão</span>`
        : `ASCENDER<br><span class="btn-cost">precisa de mais Essência (ganho atual: 0 ⬟)</span>`;
      btn.onclick = () => {
        if (!Game.canAscend()) return;
        this.confirmModal(
          `Ascender agora por <b>+${fmt(Game.ascensionGain())} ⬟</b>?<br><small>Essência e Prestígios serão reiniciados, junto com ouro, geradores, heróis e base.</small>`,
          () => {
            Game.doAscend();
            this.activeTab = 'prod';
            this.dirtyAll();
            this.renderActive();
          });
      };
      box.appendChild(btn);
      box.appendChild(this.el('div', 'prestige-hint',
        `Essência atual: ${fmt(S.essence)} — a Ascensão cresce de forma sublinear com a Essência acumulada (expoente 0.5, mínimo ${ASCENSION_ESSENCE_REQ} essência).`));
    }
    c.appendChild(box);
  },
});
