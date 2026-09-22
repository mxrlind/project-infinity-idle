# 💰 Project Infinity Idle — Monetization Quickstart

Você tem **4 documentos** na pasta para começar a monetizar o jogo:

## 📚 Os Arquivos

### 1. **MONETIZATION.md** — Modelo estratégico completo
Explica:
- 4 fases de monetização (Ads → Cosmetics → Battle Pass → Gacha)
- Catálogo de produtos com preços
- Métricas-chave pra rastrear
- Conformidade legal

**Leia primeiro isso** pra entender a estratégia.

### 2. **IMPLEMENTATION_PLAN.md** — Passo a passo técnico
Guia detalhado com:
- Fase 1: Google AdSense (30 min)
- Fase 2: Shop com Stripe (8h)
- Fase 3: Battle Pass (4h)
- Fase 4: Gacha (4h)

**Use isso** como checklist de implementação.

### 3. **js/monetization.js** — Código pronto pra copiar
Módulo JavaScript com:
- UI da Shop (toda construída)
- Sistema de cosmetics
- Battle Pass logic
- Gacha com odds

**Inclua em `index.html`** e customize.

### 4. **QUICKSTART_MONETIZATION.md** — Este arquivo
Resumo + primeiros passos.

---

## 🚀 Primeiros Passos (30 min)

### Passo 1: Ler a estratégia
```bash
Abra: MONETIZATION.md
Tempo: 10 min
```

### Passo 2: Criar contas (15 min)
1. **Google AdSense** — https://www.google.com/adsense
   - Inscrever-se
   - Aguardar aprovação (24-72h)

2. **Stripe** — https://stripe.com/br
   - Sign up
   - Ativar pra Brasil
   - Copiar chaves (`pk_live_...` e `sk_live_...`)

### Passo 3: Adicionar código (5 min)
Em `index.html`, no `<head>`:

```html
<!-- Google AdSense -->
<script async src="https://pagead2.googleapis.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>

<!-- Stripe -->
<script src="https://js.stripe.com/v3/"></script>

<!-- Seu módulo de monetização -->
<script src="js/monetization.js"></script>
```

Depois, em `js/monetization.js`, substitua:
```javascript
STRIPE_PUBLIC_KEY: 'pk_live_xxxxx'  // ← Sua chave pública
```

### Passo 4: Testar
```bash
npm run serve
# Abra http://localhost:4444
# Clique no botão 🛍️ SHOP
# Teste as compras (modo simulado local)
```

---

## 💡 Workflow Recomendado

### Semana 1: Ads + Infrastructure
```
[Seg] Criar Google AdSense + Stripe
[Ter] Adicionar código de anúncios
[Qua] Testar anúncios localmente
[Qui] Aguardar aprovação Google
[Sex] Fazer push pra produção
```

**Resultado:** R$100-500/mês com tráfego pequeno

### Semana 2: Shop Funcionando
```
[Seg] Customizar cosmetics em monetization.js
[Ter-Qua] Testar todas as compras
[Qui] Criar 5-10 cosmetics (skins, backgrounds)
[Sex] Publicar com Shop pronto
```

**Resultado:** +R$500-2k/mês se tiver 1k+ jogadores

### Semana 3: Battle Pass
```
[Seg-Ter] Estudar IMPLEMENTATION_PLAN.md (Fase 3)
[Qua-Qui] Implementar progresso do BP + rewards
[Sex] Testar + publicar
```

**Resultado:** +R$1-3k/mês se 20-30% dos jogadores comprarem

---

## 🛠️ Customizar pra Seu Jogo

### Adicionar/Remover Cosmetics
Em `monetization.js`, procure `_renderCosmeticsTab()`:

```javascript
const cosmetics = [
  { id: 'knight_dark', name: 'Dark Knight', hero: 'knight', price: 2.99 },
  // ADICIONE AQUI:
  { id: 'seu_item', name: 'Seu Nome', hero: 'hero_type', price: 3.99 }
];
```

### Trocar Preços
Em `monetization.js`, top do arquivo:

```javascript
PRICES: {
  'cosmetic_knight_dark': 3.99,  // Aumentou de 2.99
  'battle_pass': 14.99,          // Aumentou de 9.99
  // ...
}
```

### Mudar cor / design da Shop
Search por `style.cssText` em `monetization.js` e customize:

```javascript
background: linear-gradient(135deg, #ffaa00, #ff6600);  // ← Cores
border: 3px solid #ffaa00;                               // ← Borda
// ...
```

---

## 💳 Integrar Pagamentos Reais

Por enquanto o código simula compras localmente. **Para pagamentos reais:**

### Option A: Stripe Checkout (recomendado, sem backend)
1. Gerar links de checkout no Stripe dashboard
2. Substitua os `alert()` em `buyItem()` por redirecionamento:

```javascript
buyItem(itemId, price) {
  const links = {
    'knight_dark': 'https://checkout.stripe.com/pay/cs_live_xxxxx',
    'battle_pass': 'https://checkout.stripe.com/pay/cs_live_yyyyy'
  };
  
  if (links[itemId]) {
    window.location.href = links[itemId];  // Redireciona pra Stripe
  }
}
```

### Option B: Backend Node.js (mais seguro)
Veja em `IMPLEMENTATION_PLAN.md` → Fase 4.

---

## 📊 Rastrear Receita

Abra o console (F12) e rode:

```javascript
MONETIZATION.getStats()
```

Retorna:
```javascript
{
  total_spent: "R$29.90",
  purchases_count: 3,
  owned_cosmetics: 5,
  battle_pass_active: true,
  arpu: "9.97"  // Média por compra
}
```

---

## ⚠️ Cuidados Legais

### GDPR / LGPD
- [ ] Adicionar Política de Privacidade no footer
- [ ] Deixar claro que são dados ficticios em teste
- [ ] Direito de arrependimento (refund em 14 dias)

### Gacha Transparency
- [ ] Odds declaradas no jogo (já tá em `monetization.js`)
- [ ] Botão "View Odds" (já tá implementado)

### PCI Compliance
- Nunca salvar números de cartão
- Sempre usar Stripe / Mercado Pago (eles tratam)

---

## 🎯 Próximos Passos

```
✅ Hoje:     Ler MONETIZATION.md + criar contas Stripe/AdSense
✅ Semana 1: Implementar Fase 1 (Ads)
✅ Semana 2: Implementar Fase 2 (Shop)
📅 Semana 3: Implementar Fase 3 (Battle Pass)
📅 Semana 4: Teste completo + correções
📅 Semana 5: Publicar com tudo junto
```

---

## 🆘 Help / Troubleshooting

### "AdSense não está mostrando anúncios"
- Google leva 24-72h pra aprovar
- Anúncios levam outro 1-2 dias pra aparecer
- Verifique se o site tem tráfego real

### "Stripe não funciona"
- Sua chave `pk_live_xxxxx` é pública, ok expor
- A chave `sk_live_xxxxx` é **privada**, nunca coloque no código front
- Testei em modo simulado, não precisa de backend ainda

### "Shop não abre"
- Verificar console (F12) pra mensagens de erro
- Garantir que `monetization.js` está sendo carregado em `index.html`

---

## 📞 Referências

| Recurso | Link |
|---------|------|
| Stripe Docs | https://stripe.com/docs/payments/checkout |
| Google AdSense | https://www.google.com/adsense |
| Mercado Pago | https://developer.mercadopago.com |
| Game Monetization | https://www.gamedesigning.org/monetization |

---

## 🎯 Meta: R$1-5k/mês em 90 dias

Com:
- 1-5k jogadores ativos
- 3-5% conversion rate (cosmetics)
- ARPU de R$2-5

```
1000 players × 5% conversion × R$3 ARPU = R$150/mês (ads)
1000 players × 3% conversion × R$10 (battle pass) = R$300/mês
1000 players × 2% conversion × R$5 (cosmetics) = R$100/mês
= R$550/mês realista em regime estável
```

Escalar por aquisição + comunidade.

---

**Pronto? Comece por Passo 1 hoje! 🚀**
