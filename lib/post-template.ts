import type { PostModel, PostStructureStep } from "@/lib/api";

export const purposes = [
  "awareness",
  "engagement",
  "education",
  "authority",
  "conversion",
  "lead_generation",
  "product_promotion",
  "community",
  "thought_leadership",
] as const;

export const toneOptions = [
  "friendly",
  "professional",
  "casual",
  "confident",
  "analytical",
  "direct",
  "inspirational",
  "humorous",
  "technical",
  "provocative",
  "empathetic",
] as const;

export const visualStyleOptions = [
  "minimal",
  "editorial",
  "corporate",
  "modern",
  "premium",
  "bold",
  "playful",
  "technical",
  "photographic",
  "illustration_focused",
] as const;

export const ctaTypes = [
  "none",
  "ask_question",
  "encourage_discussion",
  "learn_more",
  "visit_website",
  "contact_us",
  "buy_now",
  "sign_up",
  "custom",
] as const;

export const compositions = [
  "image_dominant",
  "text_dominant",
  "balanced",
  "quote_focused",
  "product_focused",
] as const;

export const imageTextModes = ["none", "short_headline", "quote"] as const;

export const logoVariants = ["auto", "logo", "logo_inverted"] as const;

export const logoPlacements = [
  "top_left",
  "top_right",
  "center",
  "bottom_left",
  "bottom_right",
] as const;

export const logoBackdropShapes = ["rounded_square", "square", "circle", "pill"] as const;

export const peopleModes = ["none", "brand", "scene"] as const;

export const formats = ["single", "carousel", "story"] as const;

export type TemplateDraft = {
  name: string;
  description: string;
  status: "active" | "inactive";
  purpose: string;
  format: (typeof formats)[number];
  tones: string[];
  intensity: "low" | "medium" | "high";
  guidance_do: string;
  guidance_dont: string;
  structure: PostStructureStep[];
  cta_type: string;
  cta_instruction: string;
  visual_styles: string[];
  visual_density: "low" | "medium" | "high";
  image_usage: "none" | "optional" | "recommended" | "required";
  composition: string;
  image_text_mode: (typeof imageTextModes)[number];
  image_locale: string;
  include_logo: boolean;
  logo_variant: (typeof logoVariants)[number];
  logo_placement: (typeof logoPlacements)[number];
  logo_backdrop: boolean;
  logo_backdrop_color: string;
  logo_backdrop_shape: (typeof logoBackdropShapes)[number];
  logo_backdrop_padding: number;
  logo_backdrop_offset_x: number;
  logo_backdrop_offset_y: number;
  logo_backdrop_opacity: number;
  logo_backdrop_shadow: boolean;
  logo_backdrop_shadow_opacity: number;
  logo_backdrop_shadow_blur: number;
  people_mode: (typeof peopleModes)[number];
  image_notes: string;
};

export function emptyDraft(): TemplateDraft {
  return {
    name: "",
    description: "",
    status: "active",
    purpose: "engagement",
    format: "single",
    tones: ["friendly"],
    intensity: "medium",
    guidance_do: "",
    guidance_dont: "",
    structure: [
      { name: "Hook", instruction: "Start with a strong statement that captures attention.", required: true, order: 1 },
      { name: "Body", instruction: "Develop the idea with clear reasoning.", required: true, order: 2 },
      { name: "CTA", instruction: "End with a soft call to action.", required: false, order: 3 },
    ],
    cta_type: "ask_question",
    cta_instruction: "",
    visual_styles: ["modern"],
    visual_density: "medium",
    image_usage: "optional",
    composition: "balanced",
    image_text_mode: "none",
    image_locale: "",
    include_logo: false,
    logo_variant: "auto",
    logo_placement: "bottom_right",
    logo_backdrop: false,
    logo_backdrop_color: "#FFFFFF",
    logo_backdrop_shape: "rounded_square",
    logo_backdrop_padding: 22,
    logo_backdrop_offset_x: 0,
    logo_backdrop_offset_y: 0,
    logo_backdrop_opacity: 92,
    logo_backdrop_shadow: false,
    logo_backdrop_shadow_opacity: 35,
    logo_backdrop_shadow_blur: 12,
    people_mode: "none",
    image_notes: "",
  };
}

export function draftFromModel(model: PostModel): TemplateDraft {
  return {
    name: model.name ?? "",
    description: model.description ?? "",
    status: model.status === "inactive" ? "inactive" : "active",
    purpose: model.purpose || "engagement",
    format: (formats.includes(model.format as (typeof formats)[number])
      ? model.format
      : "single") as TemplateDraft["format"],
    tones: model.tones ?? [],
    intensity: (["low", "medium", "high"].includes(model.intensity)
      ? model.intensity
      : "medium") as TemplateDraft["intensity"],
    guidance_do: model.guidance_do ?? "",
    guidance_dont: model.guidance_dont ?? "",
    structure: (model.structure ?? []).map((step, index) => ({
      name: step.name,
      instruction: step.instruction,
      required: Boolean(step.required),
      order: step.order || index + 1,
    })),
    cta_type: model.cta_type || "none",
    cta_instruction: model.cta_instruction ?? "",
    visual_styles: model.visual_styles ?? [],
    visual_density: (["low", "medium", "high"].includes(model.visual_density)
      ? model.visual_density
      : "medium") as TemplateDraft["visual_density"],
    image_usage: (["none", "optional", "recommended", "required"].includes(model.image_usage)
      ? model.image_usage
      : "optional") as TemplateDraft["image_usage"],
    composition: model.composition || "balanced",
    image_text_mode: (imageTextModes.includes(model.image_text_mode as (typeof imageTextModes)[number])
      ? model.image_text_mode
      : "none") as TemplateDraft["image_text_mode"],
    image_locale: model.image_locale ?? "",
    include_logo: Boolean(model.include_logo),
    logo_variant: (logoVariants.includes(model.logo_variant as (typeof logoVariants)[number])
      ? model.logo_variant
      : "auto") as TemplateDraft["logo_variant"],
    logo_placement: (logoPlacements.includes(model.logo_placement as (typeof logoPlacements)[number])
      ? model.logo_placement
      : "bottom_right") as TemplateDraft["logo_placement"],
    logo_backdrop: Boolean(model.logo_backdrop),
    logo_backdrop_color: /^#[0-9A-Fa-f]{6}$/.test(model.logo_backdrop_color ?? "")
      ? model.logo_backdrop_color.toUpperCase()
      : "#FFFFFF",
    logo_backdrop_shape: (logoBackdropShapes.includes(
      model.logo_backdrop_shape as (typeof logoBackdropShapes)[number],
    )
      ? model.logo_backdrop_shape
      : "rounded_square") as TemplateDraft["logo_backdrop_shape"],
    logo_backdrop_padding: clampPadding(model.logo_backdrop_padding),
    logo_backdrop_offset_x: clampOffset(model.logo_backdrop_offset_x),
    logo_backdrop_offset_y: clampOffset(model.logo_backdrop_offset_y),
    logo_backdrop_opacity: clampOpacity(model.logo_backdrop_opacity),
    logo_backdrop_shadow: Boolean(model.logo_backdrop_shadow),
    logo_backdrop_shadow_opacity: clampShadowOpacity(model.logo_backdrop_shadow_opacity),
    logo_backdrop_shadow_blur: clampShadowBlur(model.logo_backdrop_shadow_blur),
    people_mode: (peopleModes.includes(model.people_mode as (typeof peopleModes)[number])
      ? model.people_mode
      : "none") as TemplateDraft["people_mode"],
    image_notes: model.image_notes ?? "",
  };
}

function clampPadding(value: number | undefined) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 22;
  return Math.min(40, Math.max(8, n || 22));
}

function clampOffset(value: number | undefined) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
  return Math.min(100, Math.max(-100, n));
}

function clampOpacity(value: number | undefined) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 92;
  return Math.min(100, Math.max(10, n || 92));
}

function clampShadowOpacity(value: number | undefined) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 35;
  return Math.min(100, Math.max(0, n));
}

function clampShadowBlur(value: number | undefined) {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 12;
  return Math.min(40, Math.max(0, n));
}

export function draftPayload(draft: TemplateDraft) {
  return {
    name: draft.name,
    description: draft.description,
    status: draft.status,
    purpose: draft.purpose,
    format: draft.format,
    tones: draft.tones,
    intensity: draft.intensity,
    guidance_do: draft.guidance_do,
    guidance_dont: draft.guidance_dont,
    structure: draft.structure.map((step, index) => ({
      name: step.name,
      instruction: step.instruction,
      required: step.required,
      order: index + 1,
    })),
    cta_type: draft.cta_type,
    cta_instruction: draft.cta_instruction,
    visual_styles: draft.visual_styles,
    visual_density: draft.visual_density,
    image_usage: draft.image_usage,
    composition: draft.composition,
    image_text_mode: "none",
    image_locale: "",
    include_logo: draft.include_logo,
    logo_variant: draft.logo_variant,
    logo_placement: draft.logo_placement,
    logo_backdrop: draft.logo_backdrop,
    logo_backdrop_color: draft.logo_backdrop_color,
    logo_backdrop_shape: draft.logo_backdrop_shape,
    logo_backdrop_padding: clampPadding(draft.logo_backdrop_padding),
    logo_backdrop_offset_x: clampOffset(draft.logo_backdrop_offset_x),
    logo_backdrop_offset_y: clampOffset(draft.logo_backdrop_offset_y),
    logo_backdrop_opacity: clampOpacity(draft.logo_backdrop_opacity),
    logo_backdrop_shadow: draft.logo_backdrop_shadow,
    logo_backdrop_shadow_opacity: clampShadowOpacity(draft.logo_backdrop_shadow_opacity),
    logo_backdrop_shadow_blur: clampShadowBlur(draft.logo_backdrop_shadow_blur),
    people_mode: draft.people_mode,
    image_notes: draft.image_notes,
  };
}

export const presetIds = [
  "conversation",
  "teach",
  "expert",
  "product",
  "product_humor",
  "contact",
  "question",
  "clean",
] as const;

export type PresetId = (typeof presetIds)[number];

function recipe(partial: Partial<TemplateDraft>): TemplateDraft {
  return {
    ...emptyDraft(),
    format: "single",
    include_logo: true,
    logo_variant: "auto",
    logo_placement: "bottom_right",
    logo_backdrop: true,
    logo_backdrop_color: "#FFFFFF",
    logo_backdrop_shape: "rounded_square",
    logo_backdrop_padding: 22,
    logo_backdrop_offset_x: 0,
    logo_backdrop_offset_y: 0,
    logo_backdrop_opacity: 92,
    logo_backdrop_shadow: false,
    ...partial,
  };
}

export function applyPreset(id: PresetId): TemplateDraft {
  switch (id) {
    case "conversation":
      return recipe({
        name: "Conversation",
        description: "A warm post that talks with the audience and invites a reply.",
        purpose: "engagement",
        tones: ["friendly", "casual", "empathetic"],
        intensity: "medium",
        guidance_do: "Write like a person talking to the audience, in the brand voice.",
        guidance_dont: "Do not sound corporate or salesy. Do not invent facts.",
        cta_type: "encourage_discussion",
        cta_instruction: "Invite a short reply. Do not push a sale.",
        visual_styles: ["playful", "modern"],
        visual_density: "medium",
        image_usage: "recommended",
        composition: "balanced",
        people_mode: "none",
        structure: [
          { name: "Hook", instruction: "Open with something the audience already feels.", required: true, order: 1 },
          { name: "Story", instruction: "Share one concrete moment from the brand, without inventing it.", required: true, order: 2 },
          { name: "Question", instruction: "Ask something easy to answer.", required: true, order: 3 },
        ],
      });
    case "teach":
      return recipe({
        name: "Teach",
        description: "A short lesson that explains one useful idea in steps.",
        purpose: "education",
        tones: ["professional", "direct"],
        intensity: "medium",
        guidance_do: "Explain one useful idea in simple steps.",
        guidance_dont: "Do not lecture. Do not use jargon without explaining it.",
        cta_type: "learn_more",
        cta_instruction: "Offer the next step only if the brand already has one.",
        visual_styles: ["minimal", "technical"],
        visual_density: "medium",
        image_usage: "required",
        composition: "balanced",
        people_mode: "none",
        structure: [
          { name: "Hook", instruction: "Open with the problem the reader feels.", required: true, order: 1 },
          { name: "Explanation", instruction: "Teach the idea in short steps.", required: true, order: 2 },
          { name: "Takeaway", instruction: "Leave one clear lesson.", required: true, order: 3 },
          { name: "CTA", instruction: "Invite a question or a next step.", required: false, order: 4 },
        ],
      });
    case "expert":
      return recipe({
        name: "Expert",
        description: "A clear opinion that shows the brand knows the subject.",
        purpose: "thought_leadership",
        tones: ["analytical", "confident", "direct"],
        intensity: "high",
        guidance_do: "Use clear, direct language and a specific point of view.",
        guidance_dont: "Avoid generic corporate language and exaggerated claims.",
        cta_type: "ask_question",
        cta_instruction: "Close with a discussion question.",
        visual_styles: ["editorial", "premium"],
        visual_density: "medium",
        image_usage: "optional",
        composition: "text_dominant",
        people_mode: "none",
        structure: [
          { name: "Hook", instruction: "Start with a strong statement.", required: true, order: 1 },
          { name: "Problem", instruction: "Name the tension in the market.", required: true, order: 2 },
          { name: "Analysis", instruction: "Explain with practical reasoning.", required: true, order: 3 },
          { name: "Insight", instruction: "Offer a distinctive take.", required: true, order: 4 },
          { name: "CTA", instruction: "Ask a discussion question.", required: false, order: 5 },
        ],
      });
    case "product":
      return recipe({
        name: "Product",
        description: "Shows the product with a calm call to learn more.",
        purpose: "product_promotion",
        tones: ["confident", "professional"],
        intensity: "medium",
        guidance_do: "Describe what the product does using only known brand facts.",
        guidance_dont: "Do not use aggressive sales language or invent results.",
        cta_type: "learn_more",
        cta_instruction: "Prefer a soft learn-more call to action.",
        visual_styles: ["modern", "bold"],
        visual_density: "medium",
        image_usage: "required",
        composition: "product_focused",
        people_mode: "none",
        image_notes: "Show the product clearly, with room for the logo.",
        structure: [
          { name: "Hook", instruction: "Name the situation the product helps with.", required: true, order: 1 },
          { name: "Benefit", instruction: "State one real benefit from brand knowledge.", required: true, order: 2 },
          { name: "Detail", instruction: "Add one concrete detail, not a slogan.", required: true, order: 3 },
          { name: "CTA", instruction: "Invite the reader to learn more.", required: false, order: 4 },
        ],
      });
    case "product_humor":
      return recipe({
        name: "Playful product",
        description: "A light, funny take on the product without mocking the customer.",
        purpose: "product_promotion",
        tones: ["humorous", "friendly", "casual"],
        intensity: "high",
        guidance_do: "Use light humor about the situation the product is for.",
        guidance_dont: "Do not mock the customer. Do not invent results or testimonials.",
        cta_type: "learn_more",
        cta_instruction: "Keep the ending playful and soft.",
        visual_styles: ["playful", "photographic"],
        visual_density: "medium",
        image_usage: "recommended",
        composition: "product_focused",
        people_mode: "scene",
        image_notes: "A lively scene around the product. People may appear if they fit the brand.",
        structure: [
          { name: "Hook", instruction: "Open with a funny observation the audience recognizes.", required: true, order: 1 },
          { name: "Joke", instruction: "Land one light joke. Do not pile on punchlines.", required: true, order: 2 },
          { name: "Product", instruction: "Connect the joke to one real product fact.", required: true, order: 3 },
          { name: "CTA", instruction: "Invite the reader to look closer.", required: false, order: 4 },
        ],
      });
    case "contact":
      return recipe({
        name: "Contact",
        description: "Invites the right person to get in touch, without pressure.",
        purpose: "lead_generation",
        tones: ["direct", "confident", "professional"],
        intensity: "medium",
        guidance_do: "Say who this is for and what happens after they get in touch.",
        guidance_dont: "Do not pressure. Do not promise results the brand has not stated.",
        cta_type: "contact_us",
        cta_instruction: "Ask for contact in one clear sentence.",
        visual_styles: ["photographic", "modern"],
        visual_density: "medium",
        image_usage: "required",
        composition: "balanced",
        people_mode: "none",
        structure: [
          { name: "Hook", instruction: "Name the person this post is for.", required: true, order: 1 },
          { name: "Fit", instruction: "Describe the situation they are in.", required: true, order: 2 },
          { name: "Offer", instruction: "Say what the brand can help with, from known facts only.", required: true, order: 3 },
          { name: "CTA", instruction: "Invite them to get in touch.", required: true, order: 4 },
        ],
      });
    case "question":
      return recipe({
        name: "Question",
        description: "Asks the audience one specific question, with little selling.",
        purpose: "community",
        tones: ["friendly", "empathetic"],
        intensity: "low",
        guidance_do: "Ask one specific question the audience can answer.",
        guidance_dont: "Do not turn the post into a sales pitch.",
        cta_type: "ask_question",
        cta_instruction: "The question is the ending. Do not add a second call to action.",
        visual_styles: ["modern"],
        visual_density: "low",
        image_usage: "optional",
        composition: "balanced",
        people_mode: "none",
        structure: [
          { name: "Hook", instruction: "Set a familiar scene in one or two lines.", required: true, order: 1 },
          { name: "Context", instruction: "Add just enough context for the question to make sense.", required: true, order: 2 },
          { name: "Question", instruction: "Ask one clear question.", required: true, order: 3 },
        ],
      });
    case "clean":
      return recipe({
        name: "Clean visual",
        description: "A quiet image-led post with a very short caption.",
        purpose: "awareness",
        tones: ["professional"],
        intensity: "low",
        guidance_do: "Keep the caption short. Let the image carry the message.",
        guidance_dont: "Do not add slogans, statistics, or clutter.",
        cta_type: "none",
        cta_instruction: "",
        visual_styles: ["minimal", "photographic"],
        visual_density: "low",
        image_usage: "required",
        composition: "image_dominant",
        people_mode: "none",
        image_notes: "Quiet composition, lots of empty space, brand colors only.",
        structure: [
          { name: "Image", instruction: "Describe a simple scene that matches the brand.", required: true, order: 1 },
          { name: "Line", instruction: "Write one short sentence. No hashtag pile.", required: true, order: 2 },
        ],
      });
  }
}
