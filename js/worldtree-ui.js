// ===== UI da Árvore do Mundo (Roadmap #12) =====
// Aba própria (mesmo estilo visual do Prestígio/Ascensão, acento verde). Mostra o estágio atual
// (arte por texto/ícone, evolui por nível), custo multi-recurso do próximo nível e botão de crescer
// com seletor 1×/10×/Máx — mesmo padrão de "Comprar" da aba Produção.

Object.assign(UI, {

  wtBuyAmount: 1, // 1 | 10 | 'max' — não precisa persistir no save (preferência de sessão)

  worldTreeCostHtml() {
    const cost = Game.worldTreeCost();
    const names = { essence: '✦ essência', conhecimento: '📘 conhecimento', madeira: '🪵 madeira', cristal: '💠 cristal' };
    const have = { essence: S.essence, conhecimento: S.res.conhecimento, madeira: S.res.madeira, cristal: S.res.cristal };
    const parts = [];
    for (const k in cost) {
      const ok = have[k] >= cost[k];
      parts.push(`<span class="${ok ? '' : 'cost-missing'}">${fmt(cost[k])} ${names[k]}</span>`);
    }
    return parts.join(' · ');
  },

  renderWorldTree(c) {
    const box = this.el('div', 'prestige-box worldtree-box');
    const stage = Game.worldTreeStage();
    const next = Game.worldTreeNextStage();

    box.appendChild(this.el('div', 'prestige-sigil worldtree-sigil', stage.icon));
    box.appendChild(this.el('h2', 'prestige-title worldtree-title', `Árvore do Mundo — ${stage.name}`));
    box.appendChild(this.el('p', 'prestige-text',
      `Meta-construção permanente: consome <b>Essência</b> e <b>Conhecimento</b> acumulados (nunca são perdidos, sobrevivem a Prestígio e Ascensão) além de <b>Madeira</b>/<b>Cristal</b> desta run. ` +
      `Cada nível dá <b>+${(WORLD_TREE.bonusPerLevel * 100).toFixed(0)}% de produção, DPS e Essência para sempre</b>. Ao florescer num novo estágio, ela presenteia <b>Pontos de Ascensão ⬟</b>.`));

    box.appendChild(this.el('div', 'prestige-current',
      `Nível: <b>${fmt(S.worldTree.level)}</b>${Game.worldTreeMaxed() ? ' (MÁXIMO)' : ' / ' + fmt(WORLD_TREE.maxLevel)} — bônus atual ×${Game.worldTreeMult().toFixed(2)}`));

    if (next) {
      const pct = Math.min(100, ((S.worldTree.level - stage.at) / (next.at - stage.at)) * 100);
      const bar = this.el('div', 'wt-progress');
      const fill = this.el('div', 'wt-progress-fill');
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      box.appendChild(bar);
      box.appendChild(this.el('div', 'prestige-hint',
        `Próximo estágio: ${next.icon} <b>${next.name}</b> no nível ${next.at} (${fmt(Math.max(0, next.at - S.worldTree.level))} níveis restantes).`));
    } else {
      box.appendChild(this.el('div', 'prestige-hint', '🌌 A Árvore atingiu seu estágio final.'));
    }

    if (!Game.worldTreeMaxed()) {
      const bar = this.el('div', 'buy-bar wt-buy-bar');
      bar.appendChild(this.el('span', 'buy-label', 'Crescer:'));
      for (const amt of [1, 10, 'max']) {
        const b = this.el('button', 'buy-amt' + (this.wtBuyAmount === amt ? ' active' : ''), amt === 'max' ? 'Máx' : '×' + amt);
        b.onclick = () => { this.wtBuyAmount = amt; this.dirty.worldtree = true; this.renderActive(); };
        bar.appendChild(b);
      }
      box.appendChild(bar);

      const btn = this.el('button', 'prestige-btn worldtree-btn');
      btn.classList.toggle('disabled', !Game.canGrowWorldTree());
      btn.innerHTML = `CRESCER<br><span class="btn-cost">${this.worldTreeCostHtml()}</span>`;
      btn.onclick = () => {
        if (!Game.canGrowWorldTree()) return;
        Game.growWorldTree(this.wtBuyAmount);
        this.dirty.worldtree = true;
        this.renderActive();
      };
      box.appendChild(btn);
    }

    c.appendChild(box);
  },
});
