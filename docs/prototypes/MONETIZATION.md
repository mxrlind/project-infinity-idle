# Project Infinity Idle — Modelo de Monetização

**Status:** Pronto para implementação  
**Atualizado:** 2026-08-30  
**Responsável:** Josué Marçin

---

## 📊 Estratégia Geral

Este documento descreve como Project Infinity Idle será monetizado em 4 fases:

| Fase | Timeline | Foco | Receita Esperada |
|------|----------|------|------------------|
| **1** | Semana 1-2 | Ads + Infrastructure | R$100-500/mês |
| **2** | Semana 3-4 | Cosmetics Shop | R$500-2k/mês |
| **3** | Semana 5-8 | Battle Pass + Gacha | R$2-5k/mês |
| **4** | Mês 3+ | Seasonal Content | R$5-15k/mês |

---

## 🎯 Premissa

- **Não é pay-to-win** — cosmetics apenas
- **Jogadores grátis felizes** — experiência completa sem pagar
- **Conversão realista** — 3-5% convertem em clientes pagantes
- **ARPU alvo** — R$2-5 por usuário/mês em regime estável

---

## 💰 Streams de Receita

### 1. Anúncios (Google AdSense / AdThrive)
- **Modelo:** CPM (custo por 1000 impressões)
- **Taxa esperada:** R$0.50-2.00 por 1k views
- **Audiência alvo:** 1-5k jogadores = R$50-500/mês
- **Implementação:** Google AdSense (banners + intersticial)

### 2. Battle Pass Premium (R$9.99 / trimestre)
- **Modelo:** Assinatura 90 dias
- **Conversão esperada:** 3-5% dos ativos
- **Recompensas:** 30 itens cosméticos exclusivos
- **Renovação automática** (com opt-out fácil)

### 3. Cosmetics Shop (R$0.99 - R$4.99 por item)
- **Modelo:** Microtransação
- **Conversão esperada:** 5-8% dos ativos
- **Itens:** Skins heróis, backgrounds, efeitos, títulos
- **Bundle semanal com desconto** (30% off)

### 4. Gacha / Caixas de Tesouro (R$0.99-4.99)
- **Modelo:** Loot box aleatória
- **Conversão esperada:** 2-3% dos ativos (whale segment)
- **Transparência:** Odds declaradas (ex: 2% lendário)
- **Não quebra gameplay** (cosméticos apenas)

### 5. Premium Analytics (R$2.99/mês)
- **Modelo:** Assinatura opcional
- **Conversão esperada:** 1-2% dos ativos
- **Inclui:** Stats, gráficos, export de dados
- **Ou: "No Ads" upgrade** (alternativa)

---

## 🏗️ Arquitetura de Monetização

```
┌─────────────────────────────────────────────┐
│        Project Infinity Idle (público)      │
├─────────────────────────────────────────────┤
│  Gameplay 100% funcional + Anúncios        │
│  (Google AdSense banners)                   │
└──────────────┬──────────────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    [Jogador]   [Modal Shop]
         │           │
    Continue   ┌─────┴────────┬──────────┐
    Jogo      │              │          │
             Shop     Battle Pass    Analytics
          Cosmetics   (R$9.99)        (R$2.99)
          (R$0.99-4.99)
             │
          Compra
             │
         Stripe /
         Mercado Pago
```

---

## 🛍️ Catálogo de Produtos

### Battle Pass Premium (R$9.99 - trimestral)

```
BATTLE_PASS = {
  free: {
    name: "Free Track",
    rewards: [
      { level: 1, item: 'hero_common_1', type: 'cosmetic' },
      { level: 10, item: 'background_free', type: 'cosmetic' },
      { level: 25, item: 'title_rookie', type: 'title' },
      // ... 10 recompensas simples
    ]
  },
  premium: {
    name: "Seasonal Pass",
    price: 9.99,
    rewards: [
      { level: 1, item: 'hero_rare_dragon', type: 'cosmetic' },
      { level: 5, item: '+25% XP Boost (7d)', type: 'temporary' },
      { level: 10, item: 'background_premium', type: 'cosmetic' },
      { level: 20, item: 'hero_epic_phoenix', type: 'cosmetic' },
      { level: 50, item: 'title_champion_s1', type: 'title' },
      // ... 30 recompensas premium (diferenciadas)
    ],
    duration: 90  // dias
  }
}
```

### Cosmetics Shop (Permanente)

```
COSMETICS_SHOP = {
  category: 'hero_skins',
  items: [
    { id: 'knight_dark', hero: 'knight', price: 2.99, name: 'Dark Knight' },
    { id: 'mage_fire', hero: 'mage', price: 2.99, name: 'Fire Mage' },
    { id: 'archer_shadow', hero: 'archer', price: 2.99, name: 'Shadow Archer' },
    { id: 'paladin_gold', hero: 'paladin', price: 1.99, name: 'Golden Paladin' },
  ]
}

COSMETICS_SHOP.backgrounds = [
  { id: 'bg_dark_forest', price: 0.99, name: 'Dark Forest' },
  { id: 'bg_nebula', price: 0.99, name: 'Nebula' },
  { id: 'bg_ancient_temple', price: 1.99, name: 'Ancient Temple' },
]

COSMETICS_SHOP.weekly_bundle = {
  name: "Summer Bundle",
  items: ['knight_dark', 'bg_nebula', 'title_summer'],
  regular_price: 6.97,
  bundle_price: 4.99,
  discount: 28,
  valid_until: '2026-09-06'
}
```

### Gacha / Caixas de Tesouro

```
GACHA_SHOP = {
  draws: [
    {
      id: 'common_draw',
      name: 'Treasure Chest (Common)',
      price: 0.99,
      items_count: 10,
      odds: {
        'common': 70,      // 70%
        'rare': 25,        // 25%
        'epic': 5          // 5%
      }
    },
    {
      id: 'legendary_draw',
      name: 'Legendary Chest',
      price: 4.99,
      items_count: 5,
      odds: {
        'rare': 40,
        'epic': 40,
        'legendary': 20    // 20% chance! (anunciado)
      }
    },
    {
      id: 'guaranteed_10',
      name: 'Guaranteed 10x (≥1 Rare)',
      price: 8.99,
      items_count: 10,
      guaranteed_rare: true
    }
  ]
}
```

---

## 📱 UI / UX Monetização

### Main Menu (Nova seção)

```
┌─────────────────────────────────────┐
│  Project Infinity Idle              │
├─────────────────────────────────────┤
│ [Play]  [Settings]  [Shop] ⭐NEW   │
│                      └─ Badge      │
└─────────────────────────────────────┘
```

### Shop Modal (Drawer ou Modal)

```
┌──────────────────────────────────────────┐
│  🛍️  SHOP                            [X] │
├──────────────────────────────────────────┤
│                                          │
│  Tabs: [Cosmetics] [Battle Pass] [Gacha]│
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Dark Knight Skin           R$2.99│   │
│  │ [Unlock with 1 click]           │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ Fire Mage Skin             R$2.99│   │
│  │ [Unlock with 1 click]           │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ⭐ WEEKLY BUNDLE (28% off)             │
│  ┌──────────────────────────────────┐   │
│  │ Summer Set: R$4.99 (was R$6.97) │   │
│  │ ✓ Dark Knight + Nebula + Title  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │ ✨ BATTLE PASS        R$9.99/90d │   │
│  │ 30 Exclusive Rewards             │   │
│  │ [View Details] [Subscribe]      │   │
│  └──────────────────────────────────┘   │
│                                          │
└──────────────────────────────────────────┘
```

### Purchase Flow

```
[Click "Unlock"] 
   ↓
[Modal: "Confirm Purchase"]
[Dark Knight Skin - R$2.99]
[Credit Card / Mercado Pago]
   ↓
[Stripe / Pagar.me]
   ↓
✓ Success → Apply cosmetic → Close modal
```

---

## 🔄 Ciclos Seasonais

### Season 1 (Setembro-Novembro 2026)

```
SEASON_1 = {
  name: "Rise of Dragons",
  duration: "2026-09-01 to 2026-11-30",
  battle_pass: {
    hero_reward: 'phoenix_epic',
    cosmetics_count: 30
  },
  gacha: {
    featured_item: 'dragon_rider_skin',
    odds_boost: 10  // +10% pra item em destaque
  },
  events: [
    { name: "Dragon Raid", reward: 'title_dragonslayer' },
    { name: "Phoenix Rising", reward: '2x XP (3 days)' }
  ]
}
```

### Season Roadmap

- **S1 (Set-Nov):** Dragons
- **S2 (Dez-Fev):** Winter / Frost theme
- **S3 (Mar-Mai):** Spring / Nature awakening
- **S4 (Jun-Ago):** Summer / Ocean

---

## 📈 Métricas-Chave (Analytics)

Rastrear no `js/state.js`:

```javascript
MONETIZATION_METRICS = {
  // Retention
  dau: 0,              // Daily Active Users
  mau: 0,              // Monthly Active Users
  
  // Revenue
  total_revenue: 0,
  revenue_by_source: {
    adsense: 0,
    cosmetics: 0,
    battle_pass: 0,
    gacha: 0,
    analytics_premium: 0
  },
  
  // Conversion
  paying_users: 0,
  arpu: 0,             // Average Revenue Per User
  conversion_rate: 0,  // % de usuarios que pagaram
  
  // LTV
  ltv_first_payment: 0,
  ltv_repeat_customers: 0,
  
  // Logs
  purchase_log: [
    { user_id, item, price, timestamp }
  ]
}
```

---

## ⚠️ Conformidade Legal

### GDPR / LGPD
- [ ] Política de Privacidade (link no rodapé)
- [ ] Termos de Serviço (checkout)
- [ ] Direito de arrependimento (refund em 14 dias)

### Gacha Transparency
- [ ] Odds declaradas no jogo
- [ ] Botão "View Odds" em cada caixa
- [ ] Aviso antes de compra (ex: "This is a random draw")

### Payment Safety
- [ ] Usar Stripe / Mercado Pago (PCI DSS compliant)
- [ ] Nunca armazenar números de cartão
- [ ] HTTPS em todas as transações

---

## 🚫 O Que NÃO Fazer

❌ Pay-to-win (ataques mais fortes, XP boost permanente)  
❌ Anúncios entre turns (muito frustrante)  
❌ Forçar compra pra continuar  
❌ Loot boxes com odds ocultadas  
❌ Autorrenovação sem aviso claro  
❌ Preços em USD apenas (localizar pra BRL)  

✅ Cosmetics bonitos  
✅ Battle Pass com renovação manual  
✅ Ads no menu / loading  
✅ Odds transparentes  
✅ Refund policy clara  

---

## 📞 Implementação

Veja **IMPLEMENTATION_PLAN.md** para passo a passo técnico.

---

**Próximo:** Implementar Fase 1 (Ads + Stripe)
