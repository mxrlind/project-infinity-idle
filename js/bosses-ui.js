// ===== UI de Chefes Inteligentes (Roadmap #7) =====
// Banner de intro reaproveitando o #event-banner já usado pelos eventos mundiais; o resto
// (badge de mecânica ativa + resistência do Rei Demônio) é atualizado inline em ui.js/updateDynamic,
// junto do resto do painel de combate (mesmo padrão do updateSynergyPanel).

Object.assign(UI, {
  showBossBanner(mech) {
    const b = document.getElementById('event-banner');
    b.className = 'boss-banner';
    b.innerHTML = `<span class="ev-icon">${mech.icon}</span> <b>${mech.name}</b> — ${mech.desc}`;
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 7000);
    Sound.play('event');
  },
});
