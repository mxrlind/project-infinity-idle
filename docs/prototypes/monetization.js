/**
 * Project Infinity Idle — Monetization Module
 * Gerencia todas as operações de pagamento, cosmetics e battle pass
 *
 * Uso:
 *   - Chamar MONETIZATION.init() no boot
 *   - MONETIZATION.recordPurchase(itemId, price) ao comprar
 *   - MONETIZATION.unlockCosmetic(cosmeticId) para aplicar cosmetic
 */

const MONETIZATION = {
  // ===== CONFIG =====
  STRIPE_PUBLIC_KEY: 'pk_live_xxxxx',  // TODO: Substitua pela sua chave
  PRICES: {
    'cosmetic_knight_dark': 2.99,
    'cosmetic_mage_fire': 2.99,
    'cosmetic_bg_forest': 0.99,
    'battle_pass': 9.99,
    'gacha_common': 0.99,
    'gacha_legendary': 4.99,
    'weekly_bundle': 4.99
  },

  // ===== STATE =====
  user_id: null,
  purchases: [],
  owned_cosmetics: [],
  battle_pass_active: false,
  battle_pass_expires_at: null,
  total_spent_usd: 0,
  total_spent_brl: 0,

  // ===== INIT =====
  init() {
    this.loadFromLocalStorage();
    this.renderShopButton();
    this.trackRevenue();
  },

  loadFromLocalStorage() {
    const saved = localStorage.getItem('infinity_monetization');
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(this, data);
    }
  },

  save() {
    localStorage.setItem('infinity_monetization', JSON.stringify({
      purchases: this.purchases,
      owned_cosmetics: this.owned_cosmetics,
      battle_pass_active: this.battle_pass_active,
      battle_pass_expires_at: this.battle_pass_expires_at,
      total_spent_usd: this.total_spent_usd,
      total_spent_brl: this.total_spent_brl
    }));
  },

  // ===== SHOP BUTTON =====
  renderShopButton() {
    const btn = document.createElement('button');
    btn.id = 'shop-btn';
    btn.innerHTML = '🛍️ SHOP';
    btn.style.cssText = `
      position: fixed;
      top: 10px; right: 10px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #ffaa00, #ff6600);
      color: white;
      border: 2px solid #ff6600;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      z-index: 100;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(255, 170, 0, 0.3);
      transition: all 0.2s;
    `;

    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 16px rgba(255, 170, 0, 0.5)';
    });

    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(255, 170, 0, 0.3)';
    });

    btn.addEventListener('click', () => this.openShop());

    document.body.appendChild(btn);
  },

  // ===== SHOP MODAL =====
  openShop() {
    const existing = document.getElementById('shop-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'shop-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
      border: 3px solid #ffaa00;
      border-radius: 10px;
      padding: 30px;
      max-width: 700px;
      max-height: 85vh;
      overflow-y: auto;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 0 30px rgba(255, 170, 0, 0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #ffaa00; padding-bottom: 15px;';
    header.innerHTML = `
      <h2 style="margin: 0; color: #ffaa00; font-size: 28px;">🛍️ SHOP</h2>
      <button onclick="document.getElementById('shop-modal').remove()" style="background: #ff0000; border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 24px; font-weight: bold;">×</button>
    `;
    content.appendChild(header);

    // Tabs
    const tabs = document.createElement('div');
    tabs.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #444;';

    const tabButtons = [
      { id: 'cosmetics', label: '🎨 Cosmetics' },
      { id: 'battle-pass', label: '⭐ Battle Pass' },
      { id: 'gacha', label: '🎲 Gacha' }
    ];

    tabButtons.forEach(tab => {
      const btn = document.createElement('button');
      btn.textContent = tab.label;
      btn.style.cssText = `
        border: none;
        background: transparent;
        color: #ffaa00;
        padding: 12px 16px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        border-bottom: 3px solid #ffaa00;
      `;

      btn.addEventListener('click', () => {
        // Remove active de todos
        content.querySelectorAll('[data-tab]').forEach(el => el.style.display = 'none');
        // Ativa a aba clicada
        const tabContent = content.querySelector(`[data-tab="${tab.id}"]`);
        if (tabContent) tabContent.style.display = 'grid';
      });

      tabs.appendChild(btn);
    });
    content.appendChild(tabs);

    // Conteúdo das abas
    const cosmetics_tab = this._renderCosmeticsTab();
    cosmetics_tab.setAttribute('data-tab', 'cosmetics');
    content.appendChild(cosmetics_tab);

    const battlepass_tab = this._renderBattlePassTab();
    battlepass_tab.setAttribute('data-tab', 'battle-pass');
    battlepass_tab.style.display = 'none';
    content.appendChild(battlepass_tab);

    const gacha_tab = this._renderGachaTab();
    gacha_tab.setAttribute('data-tab', 'gacha');
    gacha_tab.style.display = 'none';
    content.appendChild(gacha_tab);

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  _renderCosmeticsTab() {
    const container = document.createElement('div');
    container.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;';

    const cosmetics = [
      { id: 'knight_dark', name: 'Dark Knight', hero: 'knight', price: 2.99 },
      { id: 'mage_fire', name: 'Fire Mage', hero: 'mage', price: 2.99 },
      { id: 'bg_forest', name: 'Dark Forest', type: 'background', price: 0.99 },
      { id: 'bg_nebula', name: 'Nebula', type: 'background', price: 0.99 }
    ];

    cosmetics.forEach(cosmetic => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: #333;
        border: 2px solid #555;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
      `;

      card.addEventListener('mouseover', () => {
        card.style.borderColor = '#ffaa00';
        card.style.boxShadow = '0 0 15px rgba(255, 170, 0, 0.3)';
      });

      card.addEventListener('mouseout', () => {
        card.style.borderColor = '#555';
        card.style.boxShadow = 'none';
      });

      card.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px; color: #ffaa00;">${cosmetic.name}</div>
        <div style="font-size: 12px; color: #aaa; margin-bottom: 8px;">
          ${cosmetic.hero || cosmetic.type}
        </div>
        <div style="font-weight: bold; color: white; font-size: 14px;">
          R$${cosmetic.price.toFixed(2)}
        </div>
        <button onclick="MONETIZATION.buyItem('${cosmetic.id}', ${cosmetic.price})" style="
          margin-top: 8px;
          width: 100%;
          padding: 6px;
          background: #ffaa00;
          color: black;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 12px;
        ">Buy</button>
      `;

      container.appendChild(card);
    });

    return container;
  },

  _renderBattlePassTab() {
    const container = document.createElement('div');
    container.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 15px;';

    const card = document.createElement('div');
    card.style.cssText = `
      background: linear-gradient(135deg, #6666ff, #3333ff);
      border: 2px solid #6666ff;
      border-radius: 8px;
      padding: 20px;
      color: white;
    `;

    card.innerHTML = `
      <h3 style="margin: 0 0 10px 0; font-size: 20px;">⭐ Seasonal Pass</h3>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #ddd;">
        Desbloqueie 30 recompensas exclusivas a cada 3 meses
      </p>
      <ul style="margin: 0 0 15px 0; font-size: 12px; padding-left: 20px; color: #ddd;">
        <li>Skins de heróis exclusivos</li>
        <li>Backgrounds premium</li>
        <li>Títulos de campeão</li>
        <li>+25% bônus de XP</li>
        <li>Sem anúncios</li>
      </ul>
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 15px;">
        <div>
          <div style="font-size: 26px; font-weight: bold;">R$9.99</div>
          <div style="font-size: 11px; color: #aaa;">90 dias</div>
        </div>
        <button onclick="MONETIZATION.buyBattlePass()" style="
          background: white;
          color: #3333ff;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          font-size: 14px;
        ">Subscribe</button>
      </div>
    `;

    container.appendChild(card);
    return container;
  },

  _renderGachaTab() {
    const container = document.createElement('div');
    container.style.cssText = 'display: grid; grid-template-columns: 1fr; gap: 15px;';

    // Odds
    const odds = document.createElement('div');
    odds.style.cssText = `
      background: #2a2a2a;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
    `;

    odds.innerHTML = `
      <div style="color: #ffaa00; font-weight: bold; margin-bottom: 10px;">🎲 Odds Transparency</div>
      <table style="width: 100%; font-size: 13px;">
        <tr><td>Common</td><td style="text-align: right; color: #aaa;">70%</td></tr>
        <tr><td>Rare</td><td style="text-align: right; color: #66ff66;">25%</td></tr>
        <tr><td>Epic</td><td style="text-align: right; color: #ff66ff;">5%</td></tr>
      </table>
    `;
    container.appendChild(odds);

    // Common Draw
    const common = document.createElement('div');
    common.style.cssText = `
      background: #2a2a2a;
      border: 2px solid #444;
      border-radius: 8px;
      padding: 15px;
    `;

    common.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">🎁 Treasure Chest (Common)</div>
      <div style="font-size: 12px; color: #aaa; margin-bottom: 12px;">10 itens aleatórios</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; color: #ffaa00;">R$0.99</span>
        <button onclick="MONETIZATION.buyGacha('common')" style="
          background: #ffaa00;
          color: black;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        ">Draw</button>
      </div>
    `;
    container.appendChild(common);

    // Legendary Draw
    const legendary = document.createElement('div');
    legendary.style.cssText = `
      background: linear-gradient(135deg, #ffcc00, #ff9900);
      border: 2px solid #ff9900;
      border-radius: 8px;
      padding: 15px;
    `;

    legendary.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #000;">✨ Legendary Chest</div>
      <div style="font-size: 12px; color: rgba(0,0,0,0.7); margin-bottom: 12px;">20% chance de Lendário!</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; color: #000;">R$4.99</span>
        <button onclick="MONETIZATION.buyGacha('legendary')" style="
          background: white;
          color: #ff9900;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        ">Draw</button>
      </div>
    `;
    container.appendChild(legendary);

    return container;
  },

  // ===== PURCHASES =====
  buyItem(itemId, price) {
    const confirmed = confirm(`Comprar ${itemId} por R$${price.toFixed(2)}?`);
    if (!confirmed) return;

    // Aqui você redirecionaria pra Stripe em produção
    // Por enquanto, simular compra local
    this.simulatePurchase(itemId, price);
  },

  buyBattlePass() {
    const confirmed = confirm(`Inscrever em Battle Pass por R$9.99/90 dias?`);
    if (!confirmed) return;

    this.simulatePurchase('battle_pass', 9.99);
    this.activateBattlePass();
  },

  buyGacha(type) {
    const prices = { common: 0.99, legendary: 4.99 };
    const price = prices[type];
    const confirmed = confirm(`Abrir ${type} chest por R$${price.toFixed(2)}?`);
    if (!confirmed) return;

    this.simulatePurchase(`gacha_${type}`, price);
    this.performGacha(type);
  },

  simulatePurchase(itemId, price) {
    this.purchases.push({
      itemId,
      price,
      timestamp: Date.now()
    });

    this.total_spent_usd += price;
    this.total_spent_brl += price * 5.2;  // Conversão aproximada

    this.save();
    alert(`✅ Compra de ${itemId} registrada! (Teste local)`);
  },

  // ===== COSMETICS =====
  unlockCosmetic(cosmeticId) {
    if (!this.owned_cosmetics.includes(cosmeticId)) {
      this.owned_cosmetics.push(cosmeticId);
      this.save();
      console.log(`[MONETIZATION] Cosmetic desbloqueado: ${cosmeticId}`);
    }
  },

  hasCosmeticUnlocked(cosmeticId) {
    return this.owned_cosmetics.includes(cosmeticId);
  },

  // ===== BATTLE PASS =====
  activateBattlePass() {
    this.battle_pass_active = true;
    this.battle_pass_expires_at = Date.now() + 90 * 24 * 60 * 60 * 1000;  // 90 dias
    this.save();
    console.log('[MONETIZATION] Battle Pass ativado!');
  },

  isBattlePassActive() {
    if (!this.battle_pass_active || !this.battle_pass_expires_at) return false;
    if (Date.now() > this.battle_pass_expires_at) {
      this.battle_pass_active = false;
      this.save();
      return false;
    }
    return true;
  },

  // ===== GACHA =====
  performGacha(type) {
    const odds = type === 'common'
      ? [
          { rarity: 'common', chance: 0.70, items: ['item1', 'item2', 'item3'] },
          { rarity: 'rare', chance: 0.25, items: ['rare1', 'rare2'] },
          { rarity: 'epic', chance: 0.05, items: ['epic1'] }
        ]
      : [
          { rarity: 'rare', chance: 0.40, items: ['rare1', 'rare2'] },
          { rarity: 'epic', chance: 0.40, items: ['epic1', 'epic2'] },
          { rarity: 'legendary', chance: 0.20, items: ['legendary1'] }
        ];

    const rand = Math.random();
    let sum = 0;
    for (const tier of odds) {
      sum += tier.chance;
      if (rand <= sum) {
        const item = tier.items[Math.floor(Math.random() * tier.items.length)];
        this.unlockCosmetic(item);
        alert(`🎉 Você ganhou: ${item} (${tier.rarity})`);
        return;
      }
    }
  },

  // ===== ANALYTICS =====
  trackRevenue() {
    // Enviar analytics a cada 5 minutos
    setInterval(() => {
      const metrics = {
        total_spent_usd: this.total_spent_usd,
        total_spent_brl: this.total_spent_brl,
        owned_cosmetics: this.owned_cosmetics.length,
        battle_pass_active: this.isBattlePassActive(),
        purchases: this.purchases.length
      };

      console.log('[MONETIZATION ANALYTICS]', metrics);
      // TODO: Enviar pra servidor real
    }, 5 * 60 * 1000);
  },

  // ===== DASHBOARD =====
  getStats() {
    return {
      total_spent: `R$${this.total_spent_brl.toFixed(2)}`,
      purchases_count: this.purchases.length,
      owned_cosmetics: this.owned_cosmetics.length,
      battle_pass_active: this.isBattlePassActive(),
      arpu: this.purchases.length > 0
        ? (this.total_spent_brl / this.purchases.length).toFixed(2)
        : 0
    };
  }
};

// ===== AUTO-INIT =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MONETIZATION.init());
} else {
  MONETIZATION.init();
}
