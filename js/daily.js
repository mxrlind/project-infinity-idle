// ===== Metas do Dia (AUDIT item 10) =====
// O único sistema de retenção do jogo que atravessa sessões: dá um motivo concreto pra abrir o jogo
// amanhã, que prestígio e conquistas não dão (esses são progressão de dentro da run).
//
// Por que data REAL e não o dia do mundo: o calendário do jogo roda 1 dia a cada 20 minutos, então
// missões atreladas a ele giram várias vezes na mesma sessão — servem de ritmo interno, não de
// retorno. As metas daqui viram à meia-noite local do jogador.
//
// Sem backend, sem relógio de servidor: a seleção é determinística pela data (`_seededRng` do
// expansion.js), então todo jogador pega as mesmas 3 metas no mesmo dia sem nada ser sincronizado.
// Um jogador pode adiantar o relógio do sistema pra pular o dia — é o mesmo nível de "trapaça no
// console" que o resto do jogo já aceita por ser client-side (ver ARCHITECTURE.md), e a única defesa
// real seria um servidor de autoridade.

Object.assign(Game, {

  // 'YYYY-MM-DD' no fuso LOCAL — nunca toISOString(), que converte pra UTC e viraria o dia na hora
  // errada pra quem está a oeste de Greenwich (o Brasil inteiro).
  todayKey(d) {
    d = d || new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  },

  // 'YYYY-MM-DD' -> número de dias desde a época, pra comparar dias sem aritmética de fuso
  _dayNumber(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  },

  // semente estável a partir da data: mesmo dia => mesmas metas
  _dailySeed(key) {
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },

  // sorteia DAILY_COUNT metas distintas entre as que o jogador tem como cumprir hoje
  rollDailyGoals(key) {
    const rng = this._seededRng(this._dailySeed(key));
    const pool = DAILY_GOALS.filter(g => { try { return g.req(S); } catch (e) { return false; } });
    const escolhidas = [];
    const restantes = pool.slice();
    while (escolhidas.length < DAILY_COUNT && restantes.length) {
      const def = restantes.splice(Math.floor(rng() * restantes.length), 1)[0];
      const need = Math.ceil(def.n[0] + rng() * (def.n[1] - def.n[0]));
      escolhidas.push({ id: def.id, need, prog: 0, claimed: false });
    }
    return escolhidas;
  },

  dailyDef(id) { return DAILY_GOALS.find(g => g.id === id) || null; },

  // vira o dia quando a data local mudou. Chamado do tick — barato (compara duas strings).
  ensureDaily() {
    const hoje = this.todayKey();
    if (S.daily.date === hoje) return;

    // quebrou a sequência? só conta como consecutivo quem fechou o dia ANTERIOR
    if (S.daily.lastDone && this._dayNumber(hoje) - this._dayNumber(S.daily.lastDone) > 1) {
      S.daily.streak = 0;
    }
    const primeiraVez = S.daily.date === null;
    S.daily.date = hoje;
    S.daily.goals = this.rollDailyGoals(hoje);
    S.daily.bonusClaimed = false;
    if (!primeiraVez) {
      UI.log('🎯 <b>Novas Metas do Dia!</b> Confira o painel à esquerda.');
      UI.toast('🎯 Metas do Dia renovadas!', '#e8a33d');
    }
    UI.dirty.left = true;
  },

  // progresso: chamado pelos sistemas (click/gen/kill/boss/forge/sell/research/feed)
  dailyEvent(type, n) {
    if (!S.daily || !S.daily.goals.length) return;
    for (const g of S.daily.goals) {
      const def = this.dailyDef(g.id);
      if (!def || def.type !== type || g.prog >= g.need) continue;
      g.prog = Math.min(g.need, g.prog + n);
      if (g.prog >= g.need) {
        UI.toast(`${def.icon} Meta do Dia cumprida! Colete o prêmio.`, '#5fbf6b');
        Sound.play('achievement');
      }
      UI.dirty.left = true;
    }
  },

  dailyDone(g) { return g.prog >= g.need; },
  dailyAllDone() { return S.daily.goals.length > 0 && S.daily.goals.every(g => this.dailyDone(g)); },

  // multiplicador de sequência: +10%/dia até o teto
  dailyStreakMult() {
    return 1 + DAILY_STREAK_BONUS * Math.min(S.daily.streak, DAILY_STREAK_MAX);
  },

  // recompensa escala com o progresso do jogador (mesma base das missões de NPC), nunca fica obsoleta
  dailyReward(g) {
    const def = this.dailyDef(g.id);
    if (!def) return 0;
    return Math.ceil(this.enemyGold(S.combat.maxWave, false) * def.reward * this.dailyStreakMult());
  },

  dailyBonusReward() {
    return Math.ceil(this.enemyGold(S.combat.maxWave, false) * 40 * DAILY_COMPLETE_BONUS * this.dailyStreakMult());
  },

  claimDaily(id) {
    const g = S.daily.goals.find(x => x.id === id);
    if (!g || !this.dailyDone(g) || g.claimed) return false;
    g.claimed = true;
    const def = this.dailyDef(id);
    const reward = this.dailyReward(g);
    this.gainGold(reward);                 // recompensa é ouro NOVO (não devolução) — ver Game.refundGold
    S.daily.totalDone = (S.daily.totalDone || 0) + 1;
    UI.log(`${def.icon} <b>Meta do Dia cumprida:</b> ${def.label(g.need)} — <b>+${fmt(reward)}</b> ouro!`);
    Sound.play('golden');
    UI.dirty.left = true;
    return true;
  },

  // fecha o dia: só depois de COLETAR as 3 (senão o streak subiria sem o jogador voltar ao jogo)
  claimDailyBonus() {
    if (S.daily.bonusClaimed) return false;
    if (!S.daily.goals.length || !S.daily.goals.every(g => g.claimed)) return false;
    S.daily.bonusClaimed = true;
    // o streak só avança uma vez por dia, e só se este dia ainda não tinha sido fechado
    if (S.daily.lastDone !== S.daily.date) {
      S.daily.streak++;
      S.daily.lastDone = S.daily.date;
      S.daily.best = Math.max(S.daily.best || 0, S.daily.streak);
    }
    const reward = this.dailyBonusReward();
    this.gainGold(reward);
    UI.log(`🎯 <b>Todas as Metas do Dia cumpridas!</b> Bônus de <b>+${fmt(reward)}</b> ouro · sequência de <b>${S.daily.streak}</b> dia${S.daily.streak > 1 ? 's' : ''} (×${this.dailyStreakMult().toFixed(1)} nas recompensas).`);
    UI.toast(`🎯 Sequência: ${S.daily.streak} dias!`, '#e8a33d', true);
    UI.legendaryFlash('#e8a33d', true);
    Sound.play('prestige');
    UI.dirty.left = true;
    return true;
  },
});
