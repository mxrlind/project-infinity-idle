# Changelog

## Não lançado

### Corrigido
- **Botão "Máx" (e "×10") na aba Heróis não funcionava corretamente.** O preço e o estado habilitado/desabilitado do botão de nivelar herói eram sempre calculados com base no custo de **apenas 1 nível**, independente da quantidade selecionada no seletor (×1/×10/Máx).
  - Em modo **Máx**, o preço exibido (ex. "43 ouro") não correspondia ao valor real cobrado — o clique de fato comprava dezenas/centenas de níveis por um custo muito maior, dando a impressão de que o botão "não fazia o que prometia".
  - Em modo **×10**, o botão aparecia habilitado mesmo sem ouro suficiente para os 10 níveis completos; o clique não fazia literalmente nada (sem log, sem som, sem erro) — indistinguível de um botão quebrado.
  - Correção: adicionada `Game.heroMaxLevels(heroId)` (mesmo padrão de `Game.genMaxBuy` já usado na aba Produção) e a UI agora calcula preço/afordabilidade com base na quantidade real que será comprada. `Game.levelHero()` foi refatorado para reutilizar `heroMaxLevels` em vez de duplicar o loop.
  - Arquivos: `js/game.js`, `js/ui.js`.

## v0.1.0 — Versão inicial

Implementação completa a partir da documentação de game design "Idle Game Definitivo", cobrindo as Fases 1–6 (clique/geradores → heróis/combate → base → talentos → prestígio → eventos mundiais), com teasers de Fase 7–8. Ver [FEATURES.md](FEATURES.md) para o detalhamento completo de cada sistema entregue nesta versão:

- Clique + 11 geradores + 31 upgrades, com marcos de quantidade (×2 a cada 25 unidades)
- 7 heróis com combate automático, ondas, chefes, equipamentos (5 raridades)
- Base com 8 salas
- Talentos em 3 árvores (12 talentos)
- Prestígio com Essência permanente
- 5 tipos de eventos mundiais + moedas douradas
- 43 conquistas (4 secretas)
- NPCs com personalidade (conselheiro + falas de heróis)
- Save automático, progresso offline, exportar/importar
- Áudio sintetizado via Web Audio API
- Tema visual "grimório obsidiana"
