# Protótipos não integrados

Código explorado mas nunca ligado ao jogo (não referenciado em `index.html`, não roda). Mantido como referência, não como dívida técnica pendente.

## monetization.js + MONETIZATION.md / IMPLEMENTATION_PLAN.md / QUICKSTART_MONETIZATION.md

Movidos para cá em 2026-09-21 (AUDIT.md 🔴 O1). Não deve ir a produção como está — problemas de fundo, não bugs pontuais:

- `simulatePurchase()` não cobra nada de verdade (libera o item e mostra "✅ Compra registrada!" sem processar pagamento).
- Pagamento client-side é impossível de proteger: `owned_cosmetics`/`total_spent` vivem no `localStorage`, editáveis pelo console. Cobrar de verdade exige webhook de servidor (Stripe) + entitlements verificados no backend — é ausência de capability (o jogo é 100% client-side, ver `ARCHITECTURE.md`), não algo que se conserta neste arquivo.
- `STRIPE_PUBLIC_KEY: 'pk_live_xxxxx'` é placeholder de chave **live**.
- Battle Pass vende "+25% XP" e "sem anúncios", contradizendo a premissa "cosmetics apenas" do próprio `MONETIZATION.md`.
- Gacha promete "10 itens aleatórios" e sorteia 1 — com dinheiro real isso é propaganda enganosa.

Caminho recomendado (registrado em memória do projeto, sessão de 2026-08-31): lançar grátis → medir retenção D1/D7 → AdSense (única via sem backend) → só então backend (Supabase) para cosméticos verificados no servidor. Se algum dia isto for retomado, reescrever do zero no padrão do projeto (sem handlers inline, sem CSS solto, com merge de save whitelistado) em vez de consertar este arquivo incrementalmente.
