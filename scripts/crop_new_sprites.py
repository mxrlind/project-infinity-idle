import os
from PIL import Image

SRC_DIR = r"D:\Users\User\Downloads"
OUT_BASE = os.path.join(os.path.dirname(__file__), "..", "img", "_staging")

SHEETS = {
    "materials": ("ChatGPT Image 12 de jul. de 2026, 23_11_38.png",
        ["madeira", "pedra", "ferro", "corrente", "sangue", "carne", "trigo", "ovo", "vaso"]),
    "economy": ("ChatGPT Image 11 de jul. de 2026, 07_39_30.png",
        ["moeda", "saco_ouro", "notas", "cambio", "diamante", "cristal", "anel", "trofeu", "ganancia"]),
    "forge": ("ChatGPT Image 12 de jul. de 2026, 23_15_15.png",
        ["martelo", "machado", "chave", "martelo_chave", "picareta_martelo", "engrenagem", "plug", "tijolos", "guindaste"]),
    "weapons": ("ChatGPT Image 12 de jul. de 2026, 23_17_21.png",
        ["espadas", "adaga", "arco", "escudo", "luva", "manopla", "punho", "bomba", "alvo"]),
    "dark": ("ChatGPT Image 12 de jul. de 2026, 23_18_43.png",
        ["caveira", "caveira_ossos", "caixao", "fantasma", "oni", "moai", "portal", "teia", "vela"]),
    "pets": ("ChatGPT Image 12 de jul. de 2026, 23_21_13.png",
        ["dragao", "lobo", "polvo", "tubarao", "coruja", "borboleta", "camelo", "cao", "cavalo"]),
    "npcs": ("ChatGPT Image 12 de jul. de 2026, 23_22_36.png",
        ["mago", "elfa", "ferreiro", "cavaleiro", "jovem", "rogue", "monge", "robo", "garra"]),
}

for folder, (fname, names) in SHEETS.items():
    path = os.path.join(SRC_DIR, fname)
    img = Image.open(path).convert("RGB")
    w, h = img.size
    cw, ch = w // 3, h // 3
    outdir = os.path.join(OUT_BASE, folder)
    os.makedirs(outdir, exist_ok=True)
    for i, name in enumerate(names):
        r, c = divmod(i, 3)
        box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
        cell = img.crop(box)
        cell.save(os.path.join(outdir, f"{name}.jpg"), quality=88)
    print(f"{folder}: {w}x{h} -> {len(names)} tiles saved to {outdir}")
