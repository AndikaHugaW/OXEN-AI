/**
 * Image Generation Service - PRODUCTION READY 🚀
 * 
 * Features:
 * - LLM Prompt Enhancer by Category
 * - Global Quality Block
 * - Rating System Support (Good/Improve/Regenerate)
 * - Smart Style Detection
 * - Nano-optimized templates
 * 
 * Provider: Pollinations.ai FLUX (FREE)
 */

// ============================================
// TYPES
// ============================================

export type ImageStyle = 
  | 'portrait'      // Foto orang/fashion
  | 'product'       // Product photography
  | 'cinematic'     // Cinematic/cyberpunk scenes
  | 'anime'         // Anime/illustration
  | 'business'      // Corporate/professional
  | 'minimalist'    // Clean & simple
  | 'infographic';  // Data visualization

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3';

export type RatingAction = 'good' | 'improve' | 'regenerate';

export interface ImageGenOptions {
  style?: ImageStyle;
  aspectRatio?: AspectRatio;
  seed?: number;           // For reproducibility
  improveMode?: boolean;   // Add improvement prompts
  customNegative?: string;
}

export interface ImageGenResult {
  imageUrl: string;
  seed: number;
  style: ImageStyle;
  originalPrompt: string;
  enhancedPrompt: string;
}

// ============================================
// RESOLUTION SETTINGS
// ============================================

const DIMENSIONS: Record<AspectRatio, { w: number; h: number }> = {
  '1:1':  { w: 1024, h: 1024 },
  '16:9': { w: 1280, h: 720 },
  '9:16': { w: 720, h: 1280 },
  '4:3':  { w: 1024, h: 768 },
};

// ============================================
// 🎯 LLM PROMPT ENHANCER SYSTEM PROMPTS
// ============================================

/**
 * Category-specific system prompts for LLM enhancement
 * Use these to call your LLM before image generation
 */
export const CATEGORY_ENHANCER_PROMPTS: Record<ImageStyle, string> = {
  
  // 🧍 Portrait / Fashion
  portrait: `You are an expert fashion photography prompt engineer.
Enhance the user's prompt into a photorealistic fashion portrait.
Include: camera lens (35mm, 85mm), lighting style (studio, natural, rim light),
pose description, clothing texture, skin realism, background.
Avoid abstract or poetic words. Be specific and technical.
Output ONLY the final prompt, no explanation.`,

  // 🛍️ Product
  product: `You are a professional commercial product photographer.
Create a clean, sharp, studio-quality image prompt.
Include: background (white studio, gradient), lighting setup (softbox, rim),
material details (matte, glossy, metallic), reflections, shadows.
Focus on realism and commercial appeal.
Output ONLY the final prompt, no explanation.`,

  // 🌆 Cinematic / Cyberpunk
  cinematic: `You are a cinematic scene designer for film production.
Enhance the prompt with dramatic lighting, atmospheric effects,
camera angle (low angle, dutch tilt), depth of field,
color contrast (teal-orange, neon), environment details.
Think movie poster or film still.
Output ONLY the final prompt, no explanation.`,

  // 🎨 Anime / Illustration
  anime: `You are an anime illustration prompt expert.
Enhance the prompt with art style (cel shading, watercolor),
line quality (clean, sketchy), shading technique,
color palette (vibrant, pastel), character expression.
Avoid realism terms. Focus on anime/manga aesthetics.
Output ONLY the final prompt, no explanation.`,

  // 💼 Business / Corporate
  business: `You are a corporate visual designer.
Create a professional business-appropriate image prompt.
Include: clean composition, professional lighting,
modern corporate aesthetic, dark mode friendly colors,
suitable for presentations and reports.
Output ONLY the final prompt, no explanation.`,

  // ✨ Minimalist
  minimalist: `You are a minimalist design expert.
Create an ultra-clean, simple image prompt.
Focus on: negative space, geometric shapes, limited color palette,
clean lines, modern aesthetic, elegant simplicity.
Less is more. Avoid clutter.
Output ONLY the final prompt, no explanation.`,

  // 📊 Infographic
  infographic: `You are a data visualization designer.
Create a clear, informative infographic-style image prompt.
Include: isometric perspective, clean geometric shapes,
icon style, gradient colors, organized layout,
professional data visualization aesthetic.
Output ONLY the final prompt, no explanation.`,
};

// ============================================
// 🔥 GLOBAL QUALITY BLOCKS (WAJIB)
// ============================================

/**
 * Global quality boosters - ALWAYS add to all prompts
 */
const GLOBAL_QUALITY_BLOCK = `
high quality, sharp focus, clean details,
professional composition, well balanced,
no distortion, realistic proportions,
masterpiece, best quality`.trim();

/**
 * Global negative prompt - ALWAYS include
 */
const GLOBAL_NEGATIVE_PROMPT = `
blurry, low quality, bad anatomy, distorted,
extra limbs, wrong proportions, deformed,
noise, watermark, text, logo, signature,
jpeg artifacts, pixelated, amateur,
out of frame, cropped, duplicate`.trim();

/**
 * Category-specific negative prompts
 */
const CATEGORY_NEGATIVES: Record<ImageStyle, string> = {
  portrait: `cartoon, anime, illustration, plastic skin, uncanny valley, 
             crooked eyes, deformed face, extra fingers, bad hands`,
  
  product: `person, human, messy background, cluttered, bad lighting,
            shadows on product, reflection error, distorted shape`,
  
  cinematic: `cartoon, anime, flat lighting, boring composition,
              centered subject, snapshot quality, amateur`,
  
  anime: `realistic, photo, 3d render, uncanny valley,
          bad proportions, inconsistent style, western cartoon`,
  
  business: `playful, childish, unprofessional, messy, cluttered,
             cartoon when not requested, low quality graphics`,
  
  minimalist: `cluttered, busy, many colors, complex patterns,
               detailed textures, ornate, busy background`,
  
  infographic: `realistic photo, messy, disorganized, confusing layout,
                bad typography, inconsistent style, pixelated icons`,
};

// ============================================
// ✨ IMPROVEMENT PROMPTS (for Rating System)
// ============================================

/**
 * Added when user clicks "Improve"
 */
const IMPROVEMENT_BLOCK = `
increase realism, improve facial details,
better lighting balance, sharper textures,
more natural proportions, enhanced depth,
higher detail, refined composition`.trim();

// ============================================
// STYLE TEMPLATES (Fallback if no LLM)
// ============================================

const STYLE_TEMPLATES: Record<ImageStyle, string> = {
  portrait: `FULL BODY PHOTO, ultra realistic, professional photography,
             sharp focus, high detail skin texture, perfect anatomy,
             cinematic lighting, 35mm lens, shallow depth of field`,
  
  product: `professional product photography, studio lighting,
            clean background, sharp focus, material detail,
            commercial quality, centered composition`,
  
  cinematic: `cinematic scene, dramatic lighting, film still quality,
              moody atmosphere, movie poster style, depth of field,
              color graded, anamorphic lens flare`,
  
  anime: `anime illustration, clean line art, vibrant colors,
          manga style, cel shading, expressive character,
          dynamic pose, detailed background`,
  
  business: `professional business visualization, corporate style,
             dark mode aesthetic, cyan blue accents, clean design,
             presentation quality, modern corporate`,
  
  minimalist: `minimalist design, ultra clean, white space,
               simple geometric shapes, limited palette,
               modern elegant, sharp edges`,
  
  infographic: `isometric infographic, clean data visualization,
                geometric shapes, gradient colors, organized layout,
                professional icons, modern tech style`,
};

// ============================================
// STYLE DETECTION
// ============================================

function detectStyle(prompt: string): ImageStyle {
  const p = prompt.toLowerCase();
  
  // Portrait (people, faces, fashion)
  if (/\b(orang|person|wanita|pria|cewek|cowok|portrait|potret|wajah|face|model|korean|programmer|worker|employee|fashion|outfit)\b/.test(p)) {
    return 'portrait';
  }
  
  // Product
  if (/\b(produk|product|barang|sepatu|baju|gadget|phone|laptop|bottle|packaging|merchandise)\b/.test(p)) {
    return 'product';
  }
  
  // Cinematic
  if (/\b(cinematic|cyberpunk|neon|dramatic|movie|film|scene|night city|futuristic|dystopian)\b/.test(p)) {
    return 'cinematic';
  }
  
  // Anime
  if (/\b(anime|manga|cartoon|kartun|animasi|illustration|ilustrasi|chibi|kawaii)\b/.test(p)) {
    return 'anime';
  }
  
  // Minimalist
  if (/\b(minimal|minimalis|simple|clean|sederhana|bersih)\b/.test(p)) {
    return 'minimalist';
  }
  
  // Infographic
  if (/\b(infographic|infografis|data|chart|diagram|flow|process)\b/.test(p)) {
    return 'infographic';
  }
  
  return 'business';
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildFinalPrompt(
  userPrompt: string, 
  style: ImageStyle, 
  options: ImageGenOptions = {}
): { prompt: string; negative: string } {
  
  const template = STYLE_TEMPLATES[style];
  const categoryNegative = CATEGORY_NEGATIVES[style];
  
  // Build enhanced prompt
  let finalPrompt = `${userPrompt},\n${template},\n${GLOBAL_QUALITY_BLOCK}`;
  
  // Add improvement block if requested
  if (options.improveMode) {
    finalPrompt += `,\n${IMPROVEMENT_BLOCK}`;
  }
  
  // Build negative prompt
  const finalNegative = `${GLOBAL_NEGATIVE_PROMPT}, ${categoryNegative}${options.customNegative ? ', ' + options.customNegative : ''}`;
  
  return { prompt: finalPrompt, negative: finalNegative };
}

// ============================================
// MAIN IMAGE GENERATION
// ============================================

export async function generateBusinessImage(
  prompt: string, 
  options: ImageGenOptions = {}
): Promise<string | null> {
  
  const style = options.style || detectStyle(prompt);
  const aspectRatio = options.aspectRatio || '16:9';
  const seed = options.seed || Math.floor(Math.random() * 999999999);
  const dims = DIMENSIONS[aspectRatio];
  
  console.log('');
  console.log('🎨 ═══════════════════════════════════════════');
  console.log('🎨 IMAGE GENERATION - PRODUCTION READY 🚀');
  console.log('🎨 ═══════════════════════════════════════════');
  console.log('📝 User:', prompt);
  console.log('🎯 Style:', style);
  console.log('📐 Ratio:', aspectRatio, `(${dims.w}x${dims.h})`);
  console.log('🎲 Seed:', seed);
  if (options.improveMode) console.log('✨ Mode: IMPROVE');
  
  // Build final prompt
  const { prompt: finalPrompt, negative } = buildFinalPrompt(prompt, style, options);
  
  console.log('');
  console.log('📜 Final prompt (preview):');
  console.log('   ' + finalPrompt.substring(0, 120) + '...');
  console.log('');
  
  // Try Gemini first if available
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (apiKey) {
    console.log('🔷 Trying Gemini 2.0 Flash...');
    const result = await tryGemini(apiKey, finalPrompt);
    if (result) {
      console.log('✅ Gemini success!');
      return result;
    }
    console.log('⚠️ Gemini unavailable, using fallback...');
  }
  
  // Pollinations FLUX
  console.log('🌻 Using Pollinations.ai FLUX...');
  const url = buildPollinationsUrl(finalPrompt, negative, dims, seed);
  console.log('✅ Image URL ready!');
  
  return url;
}

// ============================================
// RATING SYSTEM HANDLERS
// ============================================

/**
 * Handle rating action from user
 */
export function handleRating(
  action: RatingAction,
  originalPrompt: string,
  currentSeed: number,
  style: ImageStyle
): ImageGenOptions {
  switch (action) {
    case 'good':
      // Just return current settings for saving
      return { style, seed: currentSeed };
      
    case 'improve':
      // Same seed + improvement prompts
      return { style, seed: currentSeed, improveMode: true };
      
    case 'regenerate':
      // New seed, same prompt
      return { style, seed: Math.floor(Math.random() * 999999999) };
      
    default:
      return { style };
  }
}

// ============================================
// GEMINI PROVIDER
// ============================================

async function tryGemini(apiKey: string, prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
        }),
      }
    );

    if (!response.ok) return null;
    const result = await response.json();
    
    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// POLLINATIONS URL BUILDER
// ============================================

function buildPollinationsUrl(
  prompt: string, 
  negative: string,
  size: { w: number; h: number },
  seed: number
): string {
  const encodedPrompt = encodeURIComponent(prompt);
  const encodedNegative = encodeURIComponent(negative);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}` +
    `?width=${size.w}` +
    `&height=${size.h}` +
    `&model=flux` +
    `&seed=${seed}` +
    `&nologo=true` +
    `&negative=${encodedNegative}`;
}

// ============================================
// UI HELPERS
// ============================================

export function getAvailableStyles(): { value: ImageStyle; label: string; icon: string; desc: string }[] {
  return [
    { value: 'portrait', label: 'Portrait', icon: '👤', desc: 'Foto orang/fashion' },
    { value: 'product', label: 'Produk', icon: '📦', desc: 'Product photography' },
    { value: 'cinematic', label: 'Cinematic', icon: '🎬', desc: 'Movie/cyberpunk style' },
    { value: 'anime', label: 'Anime', icon: '🎨', desc: 'Anime/illustration' },
    { value: 'business', label: 'Bisnis', icon: '💼', desc: 'Corporate & pro' },
    { value: 'minimalist', label: 'Minimalis', icon: '✨', desc: 'Clean & simple' },
    { value: 'infographic', label: 'Infografis', icon: '📊', desc: 'Data & charts' },
  ];
}

export function getAvailableAspectRatios(): { value: AspectRatio; label: string }[] {
  return [
    { value: '16:9', label: '16:9 Landscape' },
    { value: '1:1', label: '1:1 Square' },
    { value: '9:16', label: '9:16 Portrait' },
    { value: '4:3', label: '4:3 Standard' },
  ];
}

/**
 * Get the LLM enhancer prompt for a category
 * Use this to call your LLM before image generation
 */
export function getEnhancerPrompt(style: ImageStyle): string {
  return CATEGORY_ENHANCER_PROMPTS[style];
}
