/**
 * Image Generation Service
 * Provides visuals for reports and presentations
 * 
 * Supported Providers (in order of priority):
 * 1. Pollinations.ai - FREE, no API key needed
 * 2. Gemini Imagen 4 - FREE tier available (1,500 req/day)
 * 3. OpenAI DALL-E 3 - Paid fallback
 */

/**
 * Generate business image using available providers
 * Priority: Pollinations (FREE) -> Gemini (FREE tier) -> OpenAI (Paid)
 */
export async function generateBusinessImage(prompt: string): Promise<string | null> {
  // Try Pollinations.ai first (FREE, no API key)
  const pollinationsUrl = await generateWithPollinations(prompt);
  if (pollinationsUrl) {
    return pollinationsUrl;
  }

  // Try Gemini Image API if configured (FREE tier: 1,500 req/day)
  const geminiUrl = await generateWithGemini(prompt);
  if (geminiUrl) {
    return geminiUrl;
  }

  // Fallback to OpenAI DALL-E if configured (Paid)
  const openaiUrl = await generateWithOpenAI(prompt);
  if (openaiUrl) {
    return openaiUrl;
  }

  console.warn('⚠️ All image generation providers failed or are not configured.');
  return null;
}

/**
 * Pollinations.ai - FREE Image Generation (Primary)
 * No API key required. Uses Stable Diffusion / FLUX models.
 * Note: Images are generated on-demand when the URL is accessed.
 */
async function generateWithPollinations(prompt: string): Promise<string | null> {
  try {
    console.log('🎨 [ImageGen] Using Pollinations.ai (FREE)...');
    
    const enhancedPrompt = `Modern professional SaaS business illustration: ${prompt}. Style: Minimalist, clean corporate design. Color Palette: Dark mode theme, cyan and blue accents, professional slate. Elements: Data charts, abstract growth concepts, futuristic business environment. Quality: High resolution, digital art, suitable for C-level presentations.`;
    
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
    
    // Pollinations.ai generates images on-demand when the URL is accessed
    // No validation needed - just return the URL
    console.log('✅ [ImageGen] Pollinations.ai URL generated');
    return imageUrl;
    
  } catch (error) {
    console.error('❌ [ImageGen] Pollinations.ai error:', error);
    return null;
  }
}

/**
 * Gemini Image API (Imagen 4) - FREE Tier Available
 * Requires GOOGLE_AI_API_KEY or GEMINI_API_KEY in .env.local
 * Free tier: ~1,500 requests/day via AI Studio
 * 
 * Get your free API key at: https://aistudio.google.com/apikey
 * 
 * Imagen 4 Model: imagen-4.0-generate-001
 * Reference: https://ai.google.dev/gemini-api/docs/imagen
 */
async function generateWithGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log('ℹ️ [ImageGen] Gemini API Key not configured, skipping.');
    return null;
  }

  try {
    console.log('🎨 [ImageGen] Using Gemini Imagen 4 API...');
    
    const enhancedPrompt = `Professional business illustration: ${prompt}. 
Style: Modern, minimalist, corporate design suitable for business presentations. 
Color scheme: Dark mode with cyan and blue accents. 
Quality: High resolution, clean digital art, 4K.`;

    // Use Imagen 4 model for image generation (latest as of 2025)
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{
            prompt: enhancedPrompt
          }],
          parameters: {
            sampleCount: 1
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ImageGen] Gemini Imagen 4 API error:', response.status, errorText);
      
      // If Imagen 4 fails, try Imagen 3 as fallback
      console.log('🔄 [ImageGen] Trying fallback: Imagen 3...');
      return await generateWithImagen3(apiKey, enhancedPrompt);
    }

    const data = await response.json();
    
    // Extract image from Imagen response
    const predictions = data.predictions || [];
    if (predictions.length > 0) {
      // Imagen API returns imageBytes or bytesBase64Encoded
      const imageData = predictions[0].bytesBase64Encoded || predictions[0].image?.imageBytes;
      if (imageData) {
        const mimeType = predictions[0].mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${imageData}`;
        
        console.log('✅ [ImageGen] Gemini Imagen 4 generated successfully');
        return dataUrl;
      }
    }

    console.warn('⚠️ [ImageGen] Imagen 4 response did not contain an image, trying fallback...');
    return await generateWithImagen3(apiKey, enhancedPrompt);

  } catch (error) {
    console.error('❌ [ImageGen] Gemini Imagen 4 error:', error);
    return null;
  }
}

/**
 * Fallback: Imagen 3 model
 */
async function generateWithImagen3(apiKey: string, prompt: string): Promise<string | null> {
  try {
    console.log('🎨 [ImageGen] Using Imagen 3 fallback...');
    
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ImageGen] Imagen 3 fallback error:', response.status, errorText);
      
      // Try Gemini 2.0 Flash as last resort
      console.log('🔄 [ImageGen] Trying last resort: Gemini 2.0 Flash...');
      return await generateWithGeminiFlash(apiKey, prompt);
    }

    const data = await response.json();
    
    const predictions = data.predictions || [];
    if (predictions.length > 0) {
      const imageData = predictions[0].bytesBase64Encoded || predictions[0].image?.imageBytes;
      if (imageData) {
        const mimeType = predictions[0].mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${imageData}`;
        
        console.log('✅ [ImageGen] Imagen 3 fallback generated successfully');
        return dataUrl;
      }
    }

    console.warn('⚠️ [ImageGen] Imagen 3 fallback did not contain an image');
    return await generateWithGeminiFlash(apiKey, prompt);

  } catch (error) {
    console.error('❌ [ImageGen] Imagen 3 fallback error:', error);
    return null;
  }
}

/**
 * Fallback: Gemini 2.0 Flash with native image generation
 * Uses the multimodal response capabilities of Gemini 2.0
 */
async function generateWithGeminiFlash(apiKey: string, prompt: string): Promise<string | null> {
  try {
    console.log('🎨 [ImageGen] Using Gemini 2.0 Flash fallback...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate an image based on this description: ${prompt}`
            }]
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ImageGen] Gemini Flash fallback error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    
    // Extract image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        const base64Image = part.inlineData.data;
        const mimeType = part.inlineData.mimeType;
        const dataUrl = `data:${mimeType};base64,${base64Image}`;
        
        console.log('✅ [ImageGen] Gemini Flash fallback generated successfully');
        return dataUrl;
      }
    }

    console.warn('⚠️ [ImageGen] Gemini Flash fallback response did not contain an image');
    return null;

  } catch (error) {
    console.error('❌ [ImageGen] Gemini Flash fallback error:', error);
    return null;
  }
}

/**
 * OpenAI DALL-E 3 - Paid Image Generation (Fallback)
 * Requires OPENAI_API_KEY in .env.local
 */
async function generateWithOpenAI(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('ℹ️ [ImageGen] OpenAI API Key not configured, skipping.');
    return null;
  }

  try {
    console.log('🎨 [ImageGen] Using OpenAI DALL-E 3 (Paid)...');
    
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });
    
    const enhancedPrompt = `Modern professional SaaS business illustration: ${prompt}. 
    Style: Minimalist, clean corporate design. 
    Color Palette: Dark mode theme, cyan and blue accents, professional slate. 
    Quality: High resolution, 4k, digital art, suitable for C-level presentations.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    if (response.data && response.data.length > 0) {
      console.log('✅ [ImageGen] OpenAI DALL-E 3 generated');
      return response.data[0].url || null;
    }
    return null;
  } catch (error) {
    console.error('❌ [ImageGen] OpenAI DALL-E error:', error);
    return null;
  }
}

/**
 * Check which image generation providers are available
 */
export function getAvailableImageProviders(): { name: string; status: 'available' | 'not_configured'; free: boolean }[] {
  const providers: { name: string; status: 'available' | 'not_configured'; free: boolean }[] = [
    { 
      name: 'Pollinations.ai', 
      status: 'available', 
      free: true 
    }
  ];
  
  if (process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY) {
    providers.push({ 
      name: 'Gemini Imagen 4', 
      status: 'available', 
      free: true
    });
  } else {
    providers.push({ 
      name: 'Gemini Imagen 4', 
      status: 'not_configured', 
      free: true 
    });
  }
  
  if (process.env.OPENAI_API_KEY) {
    providers.push({ 
      name: 'OpenAI DALL-E 3', 
      status: 'available', 
      free: false 
    });
  } else {
    providers.push({ 
      name: 'OpenAI DALL-E 3', 
      status: 'not_configured', 
      free: false 
    });
  }
  
  return providers;
}
