import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

// Create a type declaration for heic-convert
declare module 'heic-convert' {
  function heicConvert(options: {
    buffer: Buffer;
    format: 'JPEG' | 'PNG' | 'WEBP';
    quality?: number;
  }): Promise<Buffer>;
  export default heicConvert;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;
    const quality = parseInt(formData.get('quality') as string);
    const width = parseInt(formData.get('width') as string);
    const height = parseInt(formData.get('height') as string);

    if (!file || !format) {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Convert HEIC to JPEG first with high quality for intermediate conversion
    const rawBuffer = await heicConvert({
      buffer: buffer,
      format: 'JPEG',
      quality: 1
    });

    // Then optimize with sharp
    let sharpInstance = sharp(rawBuffer);

    // Apply resize if dimensions are provided
    if (width && height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
        kernel: sharp.kernel.lanczos3, // Better quality downscaling
      });
    }

    // Calculate optimized quality based on user input
    // Map quality 0-100 to more aggressive compression
    const optimizedQuality = Math.max(Math.min(Math.round(quality * 0.7), 100), 1);

    let outputBuffer;
    switch (format) {
      case 'jpg':
        outputBuffer = await sharpInstance
          .jpeg({
            quality: optimizedQuality,
            mozjpeg: true, // Use mozjpeg for better compression
            chromaSubsampling: quality < 80 ? '4:2:0' : '4:4:4', // More aggressive subsampling for lower qualities
            trellisQuantisation: true, // Enable trellis quantisation for better compression
            overshootDeringing: true, // Reduce ringing artifacts
            optimizeScans: true, // Optimize progressive scans
            optimizeCoding: true, // Optimize Huffman coding tables
          })
          .toBuffer();
        break;
      case 'png':
        outputBuffer = await sharpInstance
          .png({
            quality: optimizedQuality,
            compressionLevel: 9, // Maximum compression
            palette: quality < 90, // Use palette for lower qualities
            colors: quality < 90 ? Math.min(256, Math.round(Math.pow(2, quality / 10))) : 256, // Reduce colors based on quality
            dither: quality < 90 ? 0.5 : 0, // Apply dithering for lower qualities
          })
          .toBuffer();
        break;
      case 'webp':
        outputBuffer = await sharpInstance
          .webp({
            quality: optimizedQuality,
            effort: 6, // Maximum compression effort
            alphaQuality: optimizedQuality, // Match alpha quality with main quality
            nearLossless: quality > 90, // Use near-lossless mode only for very high quality
            smartSubsample: true, // Enable smart subsampling
            reductionEffort: 6, // Maximum reduction effort
          })
          .toBuffer();
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported format' },
          { status: 400 }
        );
    }

    // Return the converted image as a response
    return new NextResponse(outputBuffer, {
      headers: {
        'Content-Type': `image/${format === 'jpg' ? 'jpeg' : format}`,
        'Content-Disposition': `attachment; filename="converted.${format}"`,
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert image' },
      { status: 500 }
    );
  }
} 