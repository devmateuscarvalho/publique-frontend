"""Generate segment i18n stubs and SVG previews. Run from frontend/: py -3 scripts/gen_segment_assets.py"""

from __future__ import annotations

import json
from pathlib import Path

SEGMENTS = [
    "food", "beauty", "health", "retail", "professional_services",
    "real_estate", "automotive", "education", "travel", "home_construction",
    "pets", "events", "finance", "technology",
]

KINDS = {
    "product": ["hero", "detail", "lifestyle"],
    "avatar": ["talking", "advice", "story"],
    "market_topic": ["trend", "insight", "scene"],
}

LABELS_EN = {
    "food": "Food & beverage",
    "beauty": "Beauty",
    "health": "Health",
    "retail": "Retail",
    "professional_services": "Professional services",
    "real_estate": "Real estate",
    "automotive": "Automotive",
    "education": "Education",
    "travel": "Travel",
    "home_construction": "Home & construction",
    "pets": "Pets",
    "events": "Events",
    "finance": "Finance",
    "technology": "Technology",
}

LABELS_PT = {
    "food": "Alimentos e bebidas",
    "beauty": "Beleza",
    "health": "Saúde",
    "retail": "Varejo",
    "professional_services": "Serviços profissionais",
    "real_estate": "Imóveis",
    "automotive": "Automotivo",
    "education": "Educação",
    "travel": "Viagens",
    "home_construction": "Casa e construção",
    "pets": "Pets",
    "events": "Eventos",
    "finance": "Finanças",
    "technology": "Tecnologia",
}

STYLE_EN = {
    "hero": ("Hero product", "Product front and center."),
    "detail": ("Product detail", "Close look at a concrete offer."),
    "lifestyle": ("Lifestyle", "Product in a natural scene."),
    "talking": ("Talking head", "A brand person speaking."),
    "advice": ("Advice", "Practical tip from the brand."),
    "story": ("Story", "A short story from the brand."),
    "trend": ("Market trend", "A trend the brand already talks about."),
    "insight": ("Insight", "A useful market takeaway."),
    "scene": ("Scene", "Editorial scene for the topic."),
}

STYLE_PT = {
    "hero": ("Produto em destaque", "O produto no centro."),
    "detail": ("Detalhe do produto", "Olhar próximo a uma oferta concreta."),
    "lifestyle": ("Estilo de vida", "Produto em uma cena natural."),
    "talking": ("Pessoa falando", "Alguém da marca falando."),
    "advice": ("Conselho", "Dica prática da marca."),
    "story": ("História", "Uma história curta da marca."),
    "trend": ("Tendência", "Uma tendência que a marca já comenta."),
    "insight": ("Insight", "Um aprendizado útil do mercado."),
    "scene": ("Cena", "Cena editorial para o tema."),
}

SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#4b5563"/>
    </linearGradient>
  </defs>
  <rect width="640" height="640" fill="url(#g)"/>
  <rect x="48" y="48" width="544" height="544" rx="28" fill="none" stroke="#f8fafc" stroke-opacity="0.25" stroke-width="2"/>
  <text x="320" y="300" text-anchor="middle" fill="#f8fafc" font-family="Georgia, serif" font-size="36">{kind}</text>
  <text x="320" y="350" text-anchor="middle" fill="#cbd5e1" font-family="Georgia, serif" font-size="22">{style}</text>
</svg>
"""


def recipes_tree(labels: dict[str, tuple[str, str]]) -> dict:
    tree: dict = {}
    for seg in SEGMENTS:
        tree[seg] = {}
        for kind, styles in KINDS.items():
            tree[seg][kind] = {}
            for style in styles:
                name, blurb = labels[style]
                tree[seg][kind][style] = name
                tree[seg][kind][f"{style}Blurb"] = blurb
    return tree


def merge_i18n(path: Path, segments: dict[str, str], recipes: dict) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    data["segments"] = segments
    data["creativeRecipes"] = recipes
    english = path.parent.name == "en"
    data.setdefault("brand", {})["segment"] = "Segment" if english else "Segmento"
    data.setdefault("brandEditor", {})
    if english:
        data["brandEditor"]["segment"] = "Segment"
        data["brandEditor"]["segmentHint"] = "The crawl can refine this while it stays on automatic. Changing it locks the choice."
        data["creation"]["outputKindTitle"] = "What kind of post?"
        data["creation"]["outputKinds"] = {
            "product": "Product",
            "avatar": "Person / avatar",
            "market_topic": "Market topic",
        }
        data["creation"]["outputKindLead"] = {
            "product": "Show a product or service from brand facts.",
            "avatar": "Speak as a person from the brand.",
            "market_topic": "Teach a market topic the brand already covers.",
        }
        data["creation"]["galleryLead"] = "Pick a look for this segment. Then name the model."
        data["creation"]["needSegment"] = "This brand needs a segment before the gallery opens."
        data["creation"]["createFromRecipe"] = "Create model"
    else:
        data["brandEditor"]["segment"] = "Segmento"
        data["brandEditor"]["segmentHint"] = "O rastreio pode ajustar enquanto estiver automático. Mudar trava a escolha."
        data["creation"]["outputKindTitle"] = "Que tipo de post?"
        data["creation"]["outputKinds"] = {
            "product": "Produto",
            "avatar": "Pessoa / avatar",
            "market_topic": "Tema de mercado",
        }
        data["creation"]["outputKindLead"] = {
            "product": "Mostre um produto ou serviço com fatos da marca.",
            "avatar": "Fale como uma pessoa da marca.",
            "market_topic": "Ensine um tema de mercado que a marca já cobre.",
        }
        data["creation"]["galleryLead"] = "Escolha um visual deste segmento. Depois dê um nome ao modelo."
        data["creation"]["needSegment"] = "Esta marca precisa de um segmento antes da galeria."
        data["creation"]["createFromRecipe"] = "Criar modelo"
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("updated", path)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    public = root / "public" / "segment-styles"
    for seg in SEGMENTS:
        for kind, styles in KINDS.items():
            folder = public / seg / kind
            folder.mkdir(parents=True, exist_ok=True)
            for style in styles:
                (folder / f"{style}.svg").write_text(
                    SVG.replace("{kind}", kind).replace("{style}", style),
                    encoding="utf-8",
                )
    print("wrote previews under", public)

    merge_i18n(root / "i18n" / "en" / "common.json", LABELS_EN, recipes_tree(STYLE_EN))
    merge_i18n(root / "i18n" / "pt-BR" / "common.json", LABELS_PT, recipes_tree(STYLE_PT))


if __name__ == "__main__":
    main()
