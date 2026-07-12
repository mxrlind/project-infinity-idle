// ===== Loop principal =====

(function boot() {
  const loaded = loadGame();
  const showFieldMigrationNotice = !!S._fieldSlotMigrated;
  delete S._fieldSlotMigrated;
  let offline = null;
  if (loaded) {
    offline = Game.computeOffline();
  }

  Game.scheduleEvent();
  Game.scheduleGolden();
  if (S.combat.maxHp <= 0) Game.spawnEnemy();

  UI.init();
  if (!loaded) {
    UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.start}"</i>`);
    UI.showLoreModal('phase1');
  }
  if (offline && offline.gold >= 1) UI.welcomeBack(offline);
  if (showFieldMigrationNotice) {
    UI.log(`${ADVISOR.icon} <b>${ADVISOR.name}:</b> <i>"${ADVISOR_TIPS.fieldMigration}"</i>`);
    UI.toast('⚔️ Novo: Campo de Batalha!', '#4fa8d8', true);
  }

  let lastTick = performance.now();
  let achTimer = 0;
  let saveTimer = 0;
  let slowTimer = 0;

  setInterval(() => {
    const now = performance.now();
    let dt = (now - lastTick) / 1000;
    lastTick = now;
    dt = Math.min(dt, 2); // aba em segundo plano: processa no máximo 2s por tick (offline cobre o resto)

    Game.tick(dt);
    UI.renderActive();
    UI.updateDynamic();

    achTimer += dt;
    if (achTimer >= 2) { achTimer = 0; Game.checkAchievements(); }

    slowTimer += dt;
    if (slowTimer >= 3) {
      slowTimer = 0;
      // abas com números que mudam com o tempo precisam de re-render ocasional
      if (UI.activeTab === 'prestige') { UI.dirty.prestige = true; UI.renderActive(); }
      if (UI.activeTab === 'worldtree') { UI.dirty.worldtree = true; UI.renderActive(); }
      if (UI.activeTab === 'ach' && UI.dirty.ach) { UI.renderActive(); }
    }

    saveTimer += dt;
    if (saveTimer >= 15) { saveTimer = 0; saveGame(); }
  }, 100);

  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
})();
