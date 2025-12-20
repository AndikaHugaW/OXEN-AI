import { NextRequest, NextResponse } from 'next/server';
import { generateBusinessImage } from '@/lib/tools/image-gen';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎨 [Image Gen API] Generating image for:', prompt.substring(0, 100));

    const imageUrl = await generateBusinessImage(prompt);

    if (imageUrl) {
      console.log('✅ [Image Gen API] Image generated successfully');
      return NextResponse.json({
        success: true,
        imageUrl,
      });
    } else {
      console.warn('⚠️ [Image Gen API] No image generated');
      return NextResponse.json({
        success: false,
        error: 'Failed to generate image. All providers returned null.',
      });
    }
  } catch (error: any) {
    console.error('❌ [Image Gen API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Image generation failed' },
      { status: 500 }
    );
  }
}
