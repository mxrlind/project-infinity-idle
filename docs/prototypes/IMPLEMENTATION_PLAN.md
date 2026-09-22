# Project Infinity Idle — Plano de Implementação

**Objetivo:** Monetizar em 4 fases sem quebrar o jogo  
**Timeline total:** 8 semanas  
**Prioridade:** Fase 1 + 2 primeiro (ganha experiência antes de gacha)

---

## 📅 FASE 1: Ads + Infrastructure (Semana 1-2)

### 1.1 Google AdSense (1-2 horas)

**Pré-requisito:** Conta Google ativa

**Passo 1:** Inscrever-se
1. Abra https://www.google.com/adsense
2. "Sign up" → entre com Gmail
3. Coloque:
   - Site: `https://mxrlind.github.io/project-infinity-idle/`
   - Categoria: "Games"
   - Frequência de atualização: "Multiple times per week"
4. Aguarde aprovação (24-72h)

**Passo 2:** Copiar código de anúncio

Após aprovação, Google fornece:
```
<script async src="https://pagead2.googleapis.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```

**Passo 3:** Adicionar anúncios em `index.html`

```html
<!-- No <head> -->
<script async src="https://pagead2.googleapis.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>

<!-- Top da página (728×90 horizontal banner) -->
<div id="ads-top" style="text-align: center; margin: 10px 0;">
  <ins class="adsbygoogle"
       style="display:inline-block;width:728px;height:90px"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="YYYYYYYYYYYYYY"></ins>
</div>

<!-- Depois de </head> -->
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>

<!-- Em meio do gameplay (300×250 sidebar) -->
<div style="float: right; margin: 10px;">
  <ins class="adsbygoogle"
       style="display:inline-block;width:300px;height:250px"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="ZZZZZZZZZZZZZZ"></ins>
</div>

<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

**Passo 4:** Testar (levará 1-2 dias pra ads aparecerem)

**Dica:** Se quiser ads melhores, depois passe para **AdThrive** (precisa 100k+ pageviews/mês).

---

### 1.2 Criar Stripe Account (30 min)

1. Acesse https://stripe.com/br
2. Sign up com email pessoal
3. Ative pra Brasil (CPF/CNPJ)
4. Aguarde verificação (24-48h)
5. Copie suas **chaves de API:**
   - `pk_live_xxxxx` (public, pode ir no código)
   - `sk_live_xxxxx` (secret, NUNCA coloque no código público)

**Segurança:** As transações vão pra um servidor (backend) que não existe ainda. **Por enquanto**, use Stripe Checkout (redirecionamento seguro).

---

### 1.3 Adicionar Stripe Checkout em `index.html`

```html
<!-- Script Stripe -->
<script src="https://js.stripe.com/v3/"></script>

<!-- Modal de compra (hidden por padrão) -->
<div id="checkout-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:1000;">
  <div style="background:white; margin: auto; width:90%; max-width:500px; padding:20px; border-radius:8px; top:50%; position:relative; transform:translateY(-50%);">
    <h2>Checkout</h2>
    <div id="card-element"></div>
    <button id="submit-checkout" style="margin-top:10px; padding:10px 20px; background:#007bff; color:white; border:none; cursor:pointer;">
      Confirmar Pagamento
    </button>
    <button onclick="document.getElementById('checkout-modal').style.display='none'" style="margin-top:10px; padding:10px 20px;">
      Cancelar
    </button>
  </div>
</div>

<script>
// STRIPE SETUP
const stripe = Stripe('pk_live_xxxxx');  // Sua chave pública
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

// Handle compra
document.getElementById('submit-checkout').addEventListener('click', async () => {
  const {token} = await stripe.createToken(cardElement);
  
  if (token) {
    // Enviar token pro seu backend (futuro)
    // Por enquanto, usar Stripe Checkout (redirecionamento)
    window.location.href = `https://checkout.stripe.com/pay/...`; // Stripe gera link
  } else {
    alert('Erro ao processar cartão');
  }
});
</script>
```

**Nota:** Stripe Checkout (com redirecionamento) não precisa de backend. Ele cria um link seguro que você abre:

```javascript
// Abrir checkout Stripe
function openStripeCheckout(productId) {
  const STRIPE_CHECKOUT_URLS = {
    'cosmetic_knight_dark': 'https://checkout.stripe.com/pay/cs_live_xxxxx',
    'battle_pass': 'https://checkout.stripe.com/pay/cs_live_yyyyy',
  };
  
  window.location.href = STRIPE_CHECKOUT_URLS[productId];
}
```

---

### 1.4 Adicionar Mercado Pago (alternativa pra Brasil)

```html
<script src="https://sdk.mercadopago.com/js/v2"></script>

<script>
const mp = new MercadoPago('PUBLIC_KEY_HERE');

function openMercadoPago(productId) {
  const preference = {
    items: [
      {
        title: 'Dark Knight Skin',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 2.99
      }
    ],
    back_urls: {
      success: window.location.href,
      failure: window.location.href,
    },
    auto_return: 'approved',
  };

  mp.checkout({
    preference: preference,
    render: 'wallet', // Botão integrado
  });
}
</script>

<!-- Botão no Shop -->
<button onclick="openMercadoPago('cosmetic_knight_dark')">
  Comprar com Mercado Pago
</button>
```

---

### 1.5 Rastrear Compras Localmente

Em `js/state.js`, adicionar:

```javascript
MONETIZATION = {
  purchases: [],
  total_spent: 0,
  items_owned: [],
  
  recordPurchase(itemId, price) {
    this.purchases.push({
      itemId,
      price,
      timestamp: Date.now(),
      platform: 'stripe' // ou 'mercadopago'
    });
    this.total_spent += price;
    this.items_owned.push(itemId);
    
    // Salvar em localStorage
    localStorage.setItem('infinity_monetization', JSON.stringify(MONETIZATION));
  }
};
```

---

## 📊 FASE 2: Cosmetics Shop (Semana 3-4)

### 2.1 Estrutura de Dados (2 horas)

Em `js/data.js`, adicionar:

```javascript
COSMETICS = {
  hero_skins: [
    { 
      id: 'knight_dark',
      name: 'Dark Knight',
      hero: 'knight',
      price: 2.99,
      rarity: 'rare',
      icon: 'img/cosmetics/knight_dark.png'
    },
    { 
      id: 'mage_fire',
      name: 'Fire Mage',
      hero: 'mage',
      price: 2.99,
      rarity: 'rare',
      icon: 'img/cosmetics/mage_fire.png'
    },
    // ... 10-15 skins
  ],
  
  backgrounds: [
    {
      id: 'bg_dark_forest',
      name: 'Dark Forest',
      price: 0.99,
      icon: 'img/cosmetics/bg_dark_forest.png'
    },
    // ... 5-8 backgrounds
  ],
  
  titles: [
    {
      id: 'title_rookie',
      name: 'Rookie',
      price: 0,  // Desbloqueável grátis
      unlock_condition: 'reach_level_10'
    },
    {
      id: 'title_champion',
      name: 'Champion',
      price: 1.99,
      unlock_condition: null  // Cosmetic puro
    }
  ]
};

SHOP = {
  weekly_bundle: null,  // Será rotacionado
  current_season: 'S1_Dragons'
};

// Função auxiliar pra gerar bundle semanal
function generateWeeklyBundle() {
  const allItems = [
    ...COSMETICS.hero_skins,
    ...COSMETICS.backgrounds,
    ...COSMETICS.titles.filter(t => t.price > 0)
  ];
  
  // Sortear 3 itens + calcular desconto
  const selectedItems = [];
  const used = new Set();
  
  while (selectedItems.length < 3) {
    const idx = Math.floor(Math.random() * allItems.length);
    if (!used.has(idx)) {
      selectedItems.push(allItems[idx]);
      used.add(idx);
    }
  }
  
  const regularPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const bundlePrice = Math.round(regularPrice * 0.7 * 100) / 100; // 30% off
  
  SHOP.weekly_bundle = {
    name: 'Weekly Bundle',
    items: selectedItems,
    regular_price: regularPrice,
    bundle_price: bundlePrice,
    valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };
}
```

### 2.2 UI da Shop (3 horas)

Criar `js/shop-ui.js`:

```javascript
class ShopUI {
  constructor() {
    this.modal = null;
    this.activeTab = 'cosmetics';
  }
  
  open() {
    this.modal = document.createElement('div');
    this.modal.id = 'shop-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    this.modal.innerHTML = `
      <div style="background: #1a1a1a; border: 2px solid #ffaa00; border-radius: 8px; padding: 20px; max-width: 600px; max-height: 80vh; overflow-y: auto; color: white; font-family: Arial;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #ffaa00;">🛍️ SHOP</h2>
          <button onclick="SHOP_UI.close()" style="background: red; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 4px;">×</button>
        </div>
        
        <!-- Abas -->
        <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #ffaa00;">
          <button onclick="SHOP_UI.switchTab('cosmetics')" class="shop-tab-btn" style="color: #ffaa00; border: none; background: transparent; padding: 10px; cursor: pointer; font-size: 14px;">🎨 Cosmetics</button>
          <button onclick="SHOP_UI.switchTab('battle-pass')" class="shop-tab-btn" style="color: #666; border: none; background: transparent; padding: 10px; cursor: pointer; font-size: 14px;">⭐ Battle Pass</button>
          <button onclick="SHOP_UI.switchTab('gacha')" class="shop-tab-btn" style="color: #666; border: none; background: transparent; padding: 10px; cursor: pointer; font-size: 14px;">🎲 Gacha</button>
        </div>
        
        <!-- Conteúdo -->
        <div id="shop-content" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <!-- Dinâmico, preenchido por switchTab() -->
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    this.switchTab('cosmetics');
  }
  
  switchTab(tab) {
    this.activeTab = tab;
    const content = document.getElementById('shop-content');
    
    if (tab === 'cosmetics') {
      content.innerHTML = this._renderCosmetics();
    } else if (tab === 'battle-pass') {
      content.innerHTML = this._renderBattlePass();
    } else if (tab === 'gacha') {
      content.innerHTML = this._renderGacha();
    }
  }
  
  _renderCosmetics() {
    let html = '';
    
    // Bundle semanal no topo
    if (SHOP.weekly_bundle) {
      const bundle = SHOP.weekly_bundle;
      const discount = Math.round((1 - bundle.bundle_price / bundle.regular_price) * 100);
      html += `
        <div style="grid-column: 1 / -1; background: linear-gradient(135deg, #ffaa00, #ff6600); padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <div style="color: white; font-weight: bold; margin-bottom: 10px;">⭐ WEEKLY BUNDLE (${discount}% off)</div>
          <div style="font-size: 12px; color: #f0f0f0; margin-bottom: 10px;">
            ${bundle.items.map(i => i.name).join(' + ')}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span style="text-decoration: line-through; opacity: 0.7;">R$${bundle.regular_price.toFixed(2)}</span>
              <span style="font-size: 18px; font-weight: bold; margin-left: 10px;">R$${bundle.bundle_price.toFixed(2)}</span>
            </div>
            <button onclick="SHOP_UI.buyBundle()" style="background: white; border: none; padding: 8px 16px; cursor: pointer; border-radius: 4px; font-weight: bold;">Buy</button>
          </div>
        </div>
      `;
    }
    
    // Itens cosmetics
    COSMETICS.hero_skins.forEach(skin => {
      html += `
        <div style="background: #2a2a2a; padding: 12px; border-radius: 6px; border: 1px solid #444; text-align: center;">
          <img src="${skin.icon}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${skin.name}</div>
          <div style="color: #ffaa00; margin-bottom: 8px; font-size: 12px;">For ${skin.hero}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">R$${skin.price.toFixed(2)}</span>
            <button onclick="SHOP_UI.buyItem('${skin.id}')" style="background: #ffaa00; border: none; color: black; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 12px;">Unlock</button>
          </div>
        </div>
      `;
    });
    
    return html;
  }
  
  _renderBattlePass() {
    return `
      <div style="grid-column: 1 / -1; background: linear-gradient(135deg, #6666ff, #3333ff); padding: 20px; border-radius: 8px; color: white;">
        <h3 style="margin: 0 0 10px 0;">⭐ Seasonal Pass</h3>
        <p style="margin: 0 0 10px 0; font-size: 14px;">Get 30 exclusive rewards every 3 months</p>
        <ul style="margin: 0 0 15px 0; font-size: 12px; padding-left: 20px;">
          <li>Exclusive hero skins</li>
          <li>Unique backgrounds</li>
          <li>Champion titles</li>
          <li>+25% XP Boost</li>
        </ul>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">R$9.99</div>
          <button onclick="SHOP_UI.buyBattlePass()" style="background: white; color: #3333ff; border: none; padding: 10px 20px; cursor: pointer; border-radius: 4px; font-weight: bold;">Subscribe</button>
        </div>
      </div>
    `;
  }
  
  _renderGacha() {
    return `
      <div style="grid-column: 1 / -1; background: #2a2a2a; padding: 15px; border-radius: 8px; border: 1px solid #444; margin-bottom: 15px;">
        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 10px;">🎲 Odds Transparency</div>
        <table style="width: 100%; font-size: 12px;">
          <tr>
            <td>Common</td>
            <td style="text-align: right;">70%</td>
          </tr>
          <tr>
            <td>Rare</td>
            <td style="text-align: right;">25%</td>
          </tr>
          <tr>
            <td>Epic</td>
            <td style="text-align: right;">5%</td>
          </tr>
        </table>
      </div>
      
      <div style="grid-column: 1 / -1; background: #2a2a2a; padding: 15px; border-radius: 8px; border: 1px solid #444;">
        <div style="font-weight: bold; margin-bottom: 10px;">Treasure Chest (Common)</div>
        <div style="color: #999; font-size: 12px; margin-bottom: 10px;">10 random cosmetics</div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">R$0.99</span>
          <button onclick="SHOP_UI.buyGacha('common')" style="background: #ffaa00; border: none; color: black; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">Draw</button>
        </div>
      </div>
      
      <div style="grid-column: 1 / -1; background: linear-gradient(135deg, #ffcc00, #ff9900); padding: 15px; border-radius: 8px;">
        <div style="font-weight: bold; margin-bottom: 10px;">✨ Legendary Chest</div>
        <div style="color: rgba(0,0,0,0.7); font-size: 12px; margin-bottom: 10px;">20% chance for Legendary!</div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">R$4.99</span>
          <button onclick="SHOP_UI.buyGacha('legendary')" style="background: white; border: none; color: #ff9900; padding: 6px 12px; cursor: pointer; border-radius: 4px; font-weight: bold;">Draw</button>
        </div>
      </div>
    `;
  }
  
  buyItem(itemId) {
    const item = COSMETICS.hero_skins.find(s => s.id === itemId);
    if (!item) return;
    
    if (confirm(`Comprar ${item.name} por R$${item.price.toFixed(2)}?`)) {
      // Redirecionar pra Stripe Checkout
      openStripeCheckout(itemId);
    }
  }
  
  buyBundle() {
    if (confirm(`Comprar Weekly Bundle por R$${SHOP.weekly_bundle.bundle_price.toFixed(2)}?`)) {
      openStripeCheckout('weekly_bundle');
    }
  }
  
  buyBattlePass() {
    if (confirm(`Inscrever em Battle Pass por R$9.99/90 dias?`)) {
      openStripeCheckout('battle_pass');
    }
  }
  
  buyGacha(type) {
    const prices = { common: 0.99, legendary: 4.99 };
    if (confirm(`Abrir ${type} chest por R$${prices[type].toFixed(2)}?`)) {
      openStripeCheckout(`gacha_${type}`);
    }
  }
  
  close() {
    if (this.modal) this.modal.remove();
  }
}

const SHOP_UI = new ShopUI();
```

### 2.3 Adicionar botão "Shop" ao Menu Principal

Em `js/ui.js` (na renderização do menu):

```javascript
// Renderizar botão Shop
function renderShopButton() {
  const shopBtn = document.createElement('button');
  shopBtn.id = 'shop-btn';
  shopBtn.textContent = '🛍️ SHOP';
  shopBtn.style.cssText = `
    position: fixed;
    top: 10px; right: 10px;
    padding: 10px 20px;
    background: #ffaa00;
    color: black;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    z-index: 100;
  `;
  
  shopBtn.addEventListener('click', () => SHOP_UI.open());
  
  // Adicionar badge se tem novos itens
  if (SHOP.weekly_bundle) {
    const badge = document.createElement('span');
    badge.style.cssText = `
      position: absolute;
      top: 0; right: 0;
      background: red;
      color: white;
      border-radius: 50%;
      width: 20px; height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    `;
    badge.textContent = 'NEW';
    shopBtn.appendChild(badge);
  }
  
  document.body.appendChild(shopBtn);
}
```

---

## 🎲 FASE 3: Battle Pass + Gacha (Semana 5-8)

### 3.1 Sistema de Battle Pass (4 horas)

Em `js/state.js`:

```javascript
BATTLE_PASS = {
  is_active: false,
  expires_at: null,
  current_level: 0,
  max_level: 100,
  progress_to_next: 0,
  rewards_claimed: [],
  
  subscribe() {
    if (this.is_active) return alert('Already subscribed!');
    
    // Chamar Stripe
    openStripeCheckout('battle_pass');
  },
  
  claim_level_reward(level) {
    if (this.rewards_claimed.includes(level)) {
      return alert('Already claimed!');
    }
    
    const reward = BATTLE_PASS_REWARDS[level];
    if (!reward) return;
    
    // Aplicar recompensa
    if (reward.type === 'cosmetic') {
      MONETIZATION.items_owned.push(reward.item_id);
    } else if (reward.type === 'xp_boost') {
      // Aplicar buff por 7 dias
      STATE.xp_multiplier = 1.25;
      STATE.xp_multiplier_expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    }
    
    this.rewards_claimed.push(level);
    STATE.save();
  }
};

BATTLE_PASS_REWARDS = {
  1: { type: 'cosmetic', item_id: 'hero_phoenix', name: 'Phoenix Hero' },
  10: { type: 'title', item_id: 'title_s1', name: 'S1 Challenger' },
  25: { type: 'cosmetic', item_id: 'bg_dragon_lair', name: 'Dragon Lair Background' },
  50: { type: 'xp_boost', duration: 7, multiplier: 1.25 },
  100: { type: 'cosmetic', item_id: 'title_legend_s1', name: 'Season 1 Legend' }
};
```

### 3.2 Rastreamento de Progresso do Battle Pass

Battle Pass sobe de nível baseado em XP. Adicionar em `js/game.js`:

```javascript
function gainXP(amount) {
  STATE.xp += amount;
  
  // Aplicar multiplicador se Battle Pass ativo
  if (BATTLE_PASS.is_active) {
    amount *= 1.25;  // +25% bonus
  }
  
  // Progresso do Battle Pass
  if (BATTLE_PASS.is_active) {
    BATTLE_PASS.progress_to_next += amount;
    
    const xp_per_level = 10000;
    while (BATTLE_PASS.progress_to_next >= xp_per_level) {
      BATTLE_PASS.progress_to_next -= xp_per_level;
      BATTLE_PASS.current_level += 1;
      
      // Notificar jogador
      GAME.log(`📈 Battle Pass Level ${BATTLE_PASS.current_level}!`);
    }
  }
}
```

---

## 🔐 FASE 4: Refinamentos + Analytics (Semana 9+)

### 4.1 Servidor Backend (opcional, pra segurança)

Se quiser maior segurança, montar servidor Node/Express simples:

```javascript
// backend.js (Node.js)
const express = require('express');
const stripe = require('stripe')('sk_live_xxxxx');
const app = express();

app.post('/verify-purchase', async (req, res) => {
  const { sessionId } = req.body;
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      res.json({ 
        success: true, 
        item: session.metadata.itemId,
        userId: session.metadata.userId 
      });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

Depois integrar em `js/state.js`:

```javascript
async function verifyPurchase(sessionId) {
  const response = await fetch('/verify-purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, userId: STATE.user_id })
  });
  
  const data = await response.json();
  
  if (data.success) {
    MONETIZATION.recordPurchase(data.item, /* price */);
  }
}
```

### 4.2 Dashboard Analytics (Google Sheets / Tableau)

Rastrear em Google Sheets:
- Daily Active Users (DAU)
- Paying Users
- Revenue por fonte
- Average Revenue Per User (ARPU)
- Churn rate

---

## ✅ Checklist de Implementação

### Fase 1 (Ads)
- [ ] Google AdSense aprovado
- [ ] Anúncios funcionando no topo
- [ ] Anúncios funcionando no sidebar
- [ ] Testar em incógnito

### Fase 2 (Cosmetics Shop)
- [ ] Dados de cosmetics em `js/data.js`
- [ ] UI da Shop funcionando
- [ ] Stripe Checkout integrado
- [ ] Botão "Shop" no menu
- [ ] Cosmetics aparecem após compra

### Fase 3 (Battle Pass)
- [ ] Sistema de Battle Pass em `js/state.js`
- [ ] Progresso do BP funcionando
- [ ] Rewards ao subir de nível
- [ ] Descrição clara dos benefícios

### Fase 4 (Gacha)
- [ ] Odds transparentes
- [ ] Draw animations
- [ ] Histórico de pulls
- [ ] Sistema de garantia

---

## 📞 Links Úteis

| Recurso | Link |
|---------|------|
| **Stripe Docs** | https://stripe.com/docs |
| **Stripe Checkout** | https://stripe.com/docs/payments/checkout |
| **Google AdSense** | https://www.google.com/adsense |
| **Mercado Pago** | https://developer.mercadopago.com |
| **Game Monetization Best Practices** | https://www.gamedesigning.org/monetization |

---

## 🎯 Próximos Passos

1. **Esta semana:** Começar Fase 1 (AdSense + Stripe)
2. **Próxima semana:** Ter Shop pronta (Fase 2)
3. **2 semanas:** Battle Pass testado (Fase 3)
4. **Publicar:** Com tudo junto + push em comunidades

---

**Pronto pra começar? Comece pela Fase 1 hoje!**
