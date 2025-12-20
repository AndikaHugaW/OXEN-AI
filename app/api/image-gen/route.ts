import { NextRequest, NextResponse } from 'next/server';
import { generateBusinessImage, ImageStyle, AspectRatio, getAvailableStyles, getAvailableAspectRatios } from '@/lib/tools/image-gen';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style, aspectRatio, seed, improveMode, customNegative } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt diperlukan untuk membuat gambar' },
        { status: 400 }
      );
    }

    if (prompt.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Prompt terlalu pendek. Berikan deskripsi yang lebih detail.' },
        { status: 400 }
      );
    }

    console.log('🎨 [Image Gen API] Request received:');
    console.log('   Prompt:', prompt.substring(0, 100));
    console.log('   Style:', style || 'auto-detect');
    console.log('   Seed:', seed || 'random');
    console.log('   Improve Mode:', improveMode || false);

    const imageUrl = await generateBusinessImage(prompt, {
      style: style as ImageStyle,
      aspectRatio: (aspectRatio as AspectRatio) || '16:9',
      seed: seed ? Number(seed) : undefined,
      improveMode: improveMode || false,
      customNegative: customNegative
    });

    if (imageUrl) {
      console.log('✅ [Image Gen API] Image generated successfully');
      return NextResponse.json({
        success: true,
        imageUrl,
        metadata: {
          prompt: prompt,
          style: style || 'auto',
          aspectRatio: aspectRatio || '16:9',
          improveMode: improveMode || false
        }
      });
    } else {
      console.warn('⚠️ [Image Gen API] No image generated');
      return NextResponse.json({
        success: false,
        error: 'Gagal membuat gambar. Silakan coba lagi dengan deskripsi yang berbeda.',
      });
    }
  } catch (error: any) {
    console.error('❌ [Image Gen API] Error:', error.message);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat membuat gambar'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to retrieve available styles and aspect ratios
 */
export async function GET() {
  return NextResponse.json({
    styles: getAvailableStyles(),
    aspectRatios: getAvailableAspectRatios()
  });
}
