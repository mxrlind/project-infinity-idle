// ===== Árvore do Mundo (Roadmap #12) — sumidouro de recursos, objetivo de longuíssimo prazo =====
// Consome essência (#13) + conhecimento (ambos persistem entre prestígios/ascensões) e materiais da
// run atual (madeira/cristal). S.worldTree.level é permanente — não é tocado por resetRunState nem
// por Game.doAscend. Cada nível dá um bônus pequeno e permanente (worldTreeMult, plugado em
// expansion.js ext*Mult); cruzar um estágio concede Pontos de Ascensão de presente, fechando o ciclo
// com a Progressão em Camadas (#13). Config em WORLD_TREE (js/data.js).

Object.assign(Game, {

  worldTreeUnlocked() { return S.prestiges >= 1 || S.layers.ascensions >= 1; },

  worldTreeMaxed() { return S.worldTree.level >= WORLD_TREE.maxLevel; },

  worldTreeCost() { return WORLD_TREE.costAt(S.worldTree.level); },

  worldTreeStage(level) {
    if (level === undefined) level = S.worldTree.level;
    let stage = WORLD_TREE.stages[0];
    for (const st of WORLD_TREE.stages) if (level >= st.at) stage = st;
    return stage;
  },

  worldTreeNextStage() {
    const cur = this.worldTreeStage();
    return WORLD_TREE.stages.find(st => st.at > cur.at) || null;
  },

  // bônus permanente aplicado em produção/DPS/essência (expansion.js), mesmo padrão do ascMult()
  worldTreeMult() { return 1 + WORLD_TREE.bonusPerLevel * S.worldTree.level; },

  canGrowWorldTree() {
    if (this.worldTreeMaxed()) return false;
    const cost = this.worldTreeCost();
    return S.essence >= cost.essence && S.res.conhecimento >= cost.conhecimento &&
      S.res.madeira >= cost.madeira && S.res.cristal >= cost.cristal;
  },

  // cresce 1 nível; retorna o estágio cruzado agora (objeto), ou null se não cruzou nenhum, ou
  // undefined se não foi possível crescer (recursos insuficientes / nível máximo)
  _growWorldTreeStep() {
    if (!this.canGrowWorldTree()) return undefined;
    const cost = this.worldTreeCost();
    S.essence -= cost.essence;
    S.res.conhecimento -= cost.conhecimento;
    S.res.madeira -= cost.madeira;
    S.res.cristal -= cost.cristal;
    const prevStage = this.worldTreeStage();
    S.worldTree.level++;
    const newStage = this.worldTreeStage();
    if (newStage.at !== prevStage.at) {
      const gift = WORLD_TREE.stages.indexOf(newStage); // +1 ⬟ no 1º estágio acima do Broto, +2 no 2º...
      S.layers.ascPoints += gift;
      return { stage: newStage, gift };
    }
    return null;
  },

  // times: número de níveis, ou 'max' pra crescer o máximo possível agora (mesmo padrão de buyAmount)
  growWorldTree(times) {
    const n = times === 'max' ? WORLD_TREE.maxLevel : (times || 1);
    let grown = 0, lastGift = null;
    for (let i = 0; i < n; i++) {
      const r = this._growWorldTreeStep();
      if (r === undefined) break;
      grown++;
      if (r) lastGift = r;
    }
    if (!grown) return false;
    Sound.play('upgrade');
    UI.log(`🌳 <b>Árvore do Mundo</b> cresce ${grown > 1 ? grown + ' níveis' : '1 nível'}, agora nível <b>${S.worldTree.level}</b> (bônus ×${this.worldTreeMult().toFixed(2)}).`);
    if (lastGift) {
      UI.log(`${lastGift.stage.icon} A Árvore floresce em <b>${lastGift.stage.name}</b>! +${lastGift.gift} ⬟ Pontos de Ascensão de bônus.`);
      UI.toast(`${lastGift.stage.icon} Árvore: ${lastGift.stage.name}!`, '#5fd97a', true);
      UI.legendaryFlash('#5fd97a', true);
    }
    UI.dirty.worldtree = true; UI.dirty.left = true;
    return true;
  },
});
