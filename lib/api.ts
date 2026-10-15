export class ApiError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function apiBase(): string {
  if (typeof window === "undefined") return configuredApiUrl;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return configuredApiUrl;
  // Phone (or any remote browser) talks to this same host; Next proxies /v1 to the local API.
  return "";
}

function adaptPayload(text: string): string {
  if (!text || typeof window === "undefined") return text;
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return text;
  return text
    .replaceAll(configuredApiUrl, "")
    .replaceAll("http://localhost:8080", "")
    .replaceAll("http://127.0.0.1:8080", "");
}

async function readJson(response: Response): Promise<{ error?: { code?: string } }> {
  const text = adaptPayload(await response.text());
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: { code?: string } };
  } catch {
    return {};
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new ApiError(body.error?.code ?? "internal_error");
  }

  return body as T;
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    body: form,
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new ApiError(body.error?.code ?? "internal_error");
  }

  return body as T;
}

export type User = { id: string; email: string; locale: string; platform_role?: string };

export type Organization = {
  id: string;
  name: string;
  country: string;
  default_locale: string;
  supported_locales: string[];
  currency: string;
  timezone: string;
  role: string;
};

export type Member = {
  id: string;
  email: string;
  locale: string;
  role: string;
  created_at: string;
};

export type Brand = {
  id: string;
  organization_id: string;
  name: string;
  website_url: string;
  default_locale: string;
  timezone: string;
  segment_id?: string;
  segment_code?: string;
  segment_source?: "ai" | "manual" | string;
  created_at?: string;
};

export type Segment = {
  id: string;
  code: string;
  name_key: string;
  enabled?: boolean;
  sort_order?: number;
};

export type OutputKind = {
  code: string;
  pipeline: "avatar" | "product" | "market_topic" | "none" | string;
  name_key: string;
  blurb_key: string;
  sort_order?: number;
  enabled?: boolean;
  published_count?: number;
};

export type CreativeRecipe = {
  id: string;
  segment_id: string;
  output_kind: "product" | "avatar" | "market_topic" | string;
  content_format?: "image" | "carousel" | "video" | string;
  style_key: string;
  name?: string;
  blurb?: string;
  name_key: string;
  blurb_key: string;
  example_prompt?: string;
  preview_path: string;
  preview_slides?: string[];
  result_text?: string;
  preview_caption?: string;
  include_logo: boolean;
  logo_placement?: string;
  lab_visual_format?: "single" | "carousel" | string;
  guidance_do?: string;
  guidance_dont?: string;
  image_notes?: string;
};

export type PromptPreset = {
  id: string;
  segment_id?: string;
  output_kind: "product" | "avatar" | "market_topic" | string;
  content_format?: "image" | "carousel" | "video" | string;
  style_key: string;
  name: string;
  blurb: string;
  example_prompt: string;
  prompt_image: string;
  prompt_text: string;
  result_text: string;
  lab_brand_id?: string;
  lab_product_name?: string;
  lab_product_price?: string;
  lab_product_description?: string;
  lab_topic_title?: string;
  lab_topic_angle?: string;
  lab_topic_mood?: string;
  lab_slide_count?: number;
  lab_visual_format?: "single" | "carousel" | string;
  preview_path: string;
  preview_media_id?: string;
  include_logo: boolean;
  logo_placement?: string;
  enabled: boolean;
  sort_order: number;
  guidance_do?: string;
  guidance_dont?: string;
  example_caption?: string;
  preview_caption?: string;
  image_notes?: string;
  assets?: { id: string; media_id: string; role: string; sort_order?: number; url: string }[];
};

export type BackofficeBrand = {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  segment_id: string;
  locale: string;
  country: string;
  timezone: string;
};

export type ListMeta = {
  page: number;
  page_size: number;
  total: number;
};

export type BrandProfile = {
  id: string;
  brand_id: string;
  status: string;
  company_name: string;
  description: string;
  audience: string[];
  services: string[];
  products: string[];
  tone: string[];
  topics: string[];
  terminology: string[];
  people_guidance: string;
  attire?: string;
  environment?: string;
  source: string;
  prompt_version: string;
  confirmed_at: string;
};

export type WebsiteAnalysis = {
  id: string;
  brand_id: string;
  website_url: string;
  status: string;
  error_code: string;
  source: string;
  created_at: string;
};

export type WebsitePage = {
  url: string;
  page_type: string;
  title: string;
};

export type BrandProfileResponse = {
  profile: BrandProfile | null;
  analysis: WebsiteAnalysis | null;
  pages: WebsitePage[];
};

export type ContentStrategy = {
  posts_per_week: number;
  educational_pct: number;
  authority_pct: number;
  industry_pct: number;
  commercial_pct: number;
  opinion_pct: number;
  pillars: string[];
  saved: boolean;
};

export type ContentPlan = {
  id: string;
  status: string;
  error_code: string;
  source: string;
  prompt_version: string;
  period_start: string;
  period_end: string;
  timezone: string;
  locale: string;
};

export type ContentIdea = {
  id: string;
  planned_on: string;
  pillar: string;
  objective: string;
  subject: string;
  title: string;
  angle: string;
  status: string;
};

export type ContrastScheme = {
  background: string;
  surface: string;
  heading: string;
  body: string;
  muted: string;
  accent: string;
  on_accent: string;
  border: string;
  heading_contrast: number;
  body_contrast: number;
};

export type VisualSchemes = {
  light: ContrastScheme;
  inverse: ContrastScheme;
  type: {
    heading_weight: string;
    body_weight: string;
    label_style: string;
    heading_size: string;
    body_size: string;
  };
  forbidden: { foreground: string; background: string; reason: string }[];
};

export type VisualShape = {
  radius: string;
  border: string;
  shadow: string;
};

export type BrandVisual = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  heading_font: string;
  body_font: string;
  logo_url: string;
  logo_inverted_url: string;
  icon_url: string;
  primary_color_origin: string;
  secondary_color_origin: string;
  accent_color_origin: string;
  background_color_origin: string;
  text_color_origin: string;
  heading_font_origin: string;
  body_font_origin: string;
  logo_url_origin: string;
  logo_inverted_url_origin: string;
  icon_url_origin: string;
  schemes?: VisualSchemes;
  shape?: VisualShape;
};

export type BrandAsset = {
  id: string;
  source_url: string;
  kind: string;
  alt_text: string;
  created_at?: string;
};

export type VisualResponse = {
  identity: BrandVisual;
  images: BrandAsset[];
};

export type PostStructureStep = {
  name: string;
  instruction: string;
  required: boolean;
  order: number;
};

export type PostModel = {
  id: string;
  brand_id?: string;
  name: string;
  description: string;
  status: string;
  purpose: string;
  format: string;
  tones: string[];
  intensity: string;
  guidance_do: string;
  guidance_dont: string;
  structure: PostStructureStep[];
  cta_type: string;
  cta_instruction: string;
  visual_styles: string[];
  visual_density: string;
  image_usage: string;
  composition: string;
  image_text_mode: string;
  image_locale: string;
  include_logo: boolean;
  logo_variant: string;
  logo_placement: string;
  logo_backdrop: boolean;
  logo_backdrop_color: string;
  logo_backdrop_shape: string;
  logo_backdrop_padding: number;
  logo_backdrop_offset_x: number;
  logo_backdrop_offset_y: number;
  logo_backdrop_opacity: number;
  logo_backdrop_shadow: boolean;
  logo_backdrop_shadow_opacity: number;
  logo_backdrop_shadow_blur: number;
  people_mode: string;
  image_notes: string;
  creative_recipe_id?: string;
  prompt_preset_id?: string;
  output_kind?: string;
  weekdays: number[];
  created_at?: string;
  updated_at?: string;
};

export type ListedPage = {
  id: string;
  url: string;
  page_type: string;
  title: string;
  created_at: string;
};

export type PostAsset = {
  id: string;
  kind: string;
  mime: string;
  width: number;
  height: number;
  byte_size: number;
  url: string;
  origin: string;
  sort_order: number;
};

export type PostPublication = {
  network: string;
  status: string;
  external_id: string;
  error_code: string;
  updated_at?: string;
};

export type Post = {
  id: string;
  brand_id?: string;
  post_model_id: string | null;
  status: string;
  caption: string;
  short_title: string;
  alt_text: string;
  locale: string;
  format: string;
  /** Customer framing from prepare: 1:1 | 4:5 | 9:16. 9:16 publishes as Stories on IG/FB. */
  aspect?: string;
  error_code: string;
  prompt_version: string;
  model: string;
  is_ai_generated: boolean;
  origin?: "manual" | "automation" | string;
  prompt_preset_id?: string;
  preset?: {
    id: string;
    name: string;
    style_key: string;
    output_kind: string;
  };
  caption_prompt?: string;
  image_prompt?: string;
  created_at?: string;
  updated_at?: string;
  assets: PostAsset[];
  publications?: PostPublication[];
};

export type ContentPlanResponse = {
  profile_confirmed: boolean;
  strategy: ContentStrategy;
  plan: ContentPlan | null;
  ideas: ContentIdea[];
};
