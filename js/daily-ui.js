// ===== UI das Metas do Dia (AUDIT item 10) =====
// Mora no painel ESQUERDO de propósito: retenção só funciona se estiver sempre à vista. Uma aba
// própria seria mais bonita e seria ignorada.
//
// O painel é reconstruído a cada mudança (não a cada tick), pra não brigar com o foco de um botão
// enquanto o jogador clica — mesma razão pela qual `buyGen` não marca dirty.prod (ver game.js).

Object.assign(UI, {

  // assinatura do estado visível: enquanto não muda, não há por que redesenhar
  _dailySig() {
    if (!S.daily || !S.daily.goals.length) return 'vazio';
    return S.daily.date + '|' + S.daily.streak + '|' + (S.daily.bonusClaimed ? 1 : 0) + '|' +
      S.daily.goals.map(g => `${g.id}:${g.prog}:${g.claimed ? 1 : 0}`).join(',');
  },

  updateDaily() {
    const box = document.getElementById('daily-box');
    if (!box) return;
    const sig = this._dailySig();
    if (sig === this._dailySigCache) return;
    this._dailySigCache = sig;

    if (!S.daily || !S.daily.goals.length) { box.innerHTML = ''; return; }

    const streak = S.daily.streak || 0;
    const tudoColetado = S.daily.goals.every(g => g.claimed);
    const podeBonus = tudoColetado && !S.daily.bonusClaimed;

    const linhas = S.daily.goals.map(g => {
      const def = Game.dailyDef(g.id);
      if (!def) return '';
      const pronto = Game.dailyDone(g);
      const pct = Math.min(100, (g.prog / g.need) * 100);
      const estado = g.claimed ? ' claimed' : (pronto ? ' ready' : '');
      const acao = g.claimed
        ? '<span class="daily-check" role="img" aria-label="prêmio coletado">✔</span>'
        : (pronto
          ? `<button class="daily-claim" data-daily="${this.esc(g.id)}" aria-label="Coletar prêmio de: ${this.esc(def.label(g.need))}">Coletar</button>`
          : `<span class="daily-prog" aria-hidden="true">${fmt(g.prog)}/${fmt(g.need)}</span>`);
      const texto = def.label(g.need);
      const situacao = g.claimed ? 'prêmio coletado' : (pronto ? 'cumprida, pronta para coletar' : `${fmt(g.prog)} de ${fmt(g.need)}`);
      return `
        <div class="daily-goal${estado}" role="listitem">
          <div class="daily-icon" aria-hidden="true">${this.iconImgHtml ? this.iconImgHtml(null, def.icon, 'daily') : def.icon}</div>
          <div class="daily-info">
            <div class="daily-label">${this.esc(texto)}</div>
            <div class="daily-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
                 aria-valuenow="${Math.round(pct)}" aria-label="${this.esc(texto)}: ${this.esc(situacao)}"
              ><div class="daily-fill" style="width:${pct.toFixed(1)}%"></div></div>
          </div>
          <div class="daily-action">${acao}</div>
        </div>`;
    }).join('');

    const selo = streak > 0
      ? `<span class="daily-streak" title="Recompensas ×${Game.dailyStreakMult().toFixed(1)} — cresce ${Math.round(DAILY_STREAK_BONUS * 100)}% por dia seguido, até ${DAILY_STREAK_MAX} dias"
           aria-label="Sequência de ${streak} dia${streak > 1 ? 's' : ''} seguidos, recompensas multiplicadas por ${Game.dailyStreakMult().toFixed(1)}">🔥 ${streak}d</span>`
      : '';

    const bonus = podeBonus
      ? `<button class="daily-bonus" data-daily-bonus="1">🎯 Coletar bônus do dia (+${fmt(Game.dailyBonusReward())} ouro)</button>`
      : (S.daily.bonusClaimed ? `<div class="daily-doneline">✔ Dia completo — volte amanhã para manter a sequência</div>` : '');

    box.innerHTML = `
      <div class="daily-title" id="daily-title">Metas do dia ${selo}</div>
      <div class="daily-list" role="list" aria-labelledby="daily-title">${linhas}</div>
      ${bonus}`;

    box.querySelectorAll('[data-daily]').forEach(btn => {
      btn.onclick = () => {
        Game.claimDaily(btn.getAttribute('data-daily'));
        this.updateDaily();
      };
    });
    const bb = box.querySelector('[data-daily-bonus]');
    if (bb) bb.onclick = () => { Game.claimDailyBonus(); this.updateDaily(); };
  },
});
