// ===== Manifesto de arte — GERADO por tools/gen-art-manifest.py, não edite à mão =====
// Mapeia pasta de img/ -> nomes de arquivo (sem extensão) que realmente existem.
// UI.iconImgHtml consulta isto antes de emitir um <img>: sem o manifesto, cada ícone ainda
// sem arte disparava um 404 (eram ~90 por carregamento da página).
const ART = {
  "enemies": ["boss", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"],
  "gens": ["aprendiz", "banco", "forja", "mercado", "mina", "motor", "portal", "santuario", "singular", "templo", "torre"],
  "hero-icons": ["bran", "io", "kael", "lyra", "magnus", "nyx", "orin", "sera", "thora", "vex"],
  "heroes": ["bran", "io", "kael", "lyra", "magnus", "nyx", "orin", "sera", "thora", "vex"],
  "materials": ["cristal", "ferro", "madeira", "pedra"],
  "npcs": ["alquimista", "colecionador", "ferreiro", "mago", "mercador"],
  "pets": ["coruja", "dragao", "fenix", "lobo"],
  "rooms": ["arena", "biblioteca", "castelo", "cofre", "gerador", "lab", "mercado", "mina_r", "oficina", "quartel", "serraria", "templo", "torre"],
  "tabs": ["ach", "base", "config", "forge", "heroes", "locked", "prestige", "prod", "talents"],
  "upgrades": ["glob3", "luva1", "luva2", "luva3", "mina1", "mina2"],
  "weapons": ["adaga", "arco", "espada", "martelo"],
};
