import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

// Define proper types for heic-convert
interface HeicConvertOptions {
  buffer: Buffer;
  format: 'JPEG' | 'PNG' | 'WEBP';
  quality?: number;
}

// Define the callback-style function type
type HeicConvertCallback = (
  error: Error | null,
  convertedBuffer: Buffer
) => void;

// Define the function type that takes options and callback
type HeicConvertFunction = (
  options: HeicConvertOptions,
  callback: HeicConvertCallback
) => void;

// Create a properly typed promisified version
const heicConvertAsync = (options: HeicConvertOptions): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    (heicConvert as HeicConvertFunction)(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

// Helper function to get image dimensions
async function getImageDimensions(instance: sharp.Sharp): Promise<{ width?: number; height?: number }> {
  try {
    const metadata = await instance.metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return {};
  }
}

// Helper function to convert HEIC to JPEG
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    // First try with heic-convert
    try {
      const convertedBuffer = await heicConvertAsync({
        buffer: buffer,
        format: 'JPEG',
        quality: 1
      });
      return convertedBuffer;
    } catch (heicError) {
      console.error('heic-convert error:', heicError);
      
      // If heic-convert fails, try with sharp
      const sharpBuffer = await sharp(buffer)
        .jpeg({
          quality: 100,
          mozjpeg: true,
        })
        .toBuffer();
      
      return sharpBuffer;
    }
  } catch (error) {
    console.error('All HEIC conversion methods failed:', error);
    throw new Error('Failed to convert HEIC image. Please try a different image or format.');
  }
}

async function compressToTargetSize(
  sharpInstance: sharp.Sharp,
  format: string,
  targetSizeKB: number,
  minQuality: number = 1,
  maxQuality: number = 100,
  maxAttempts: number = 15
): Promise<Buffer> {
  let attempts = 0;
  let low = minQuality;
  let high = maxQuality;
  let lastValidBuffer: Buffer | null = null;
  let lastValidQuality = maxQuality;
  let lastSize = Infinity;

  // For very small target sizes, start with lower quality
  if (targetSizeKB < 500) {
    high = Math.min(60, maxQuality);
  } else if (targetSizeKB < 1000) {
    high = Math.min(80, maxQuality);
  }

  // Try to get initial size with maximum quality
  try {
    const initialBuffer = await getOutputBuffer(sharpInstance, format, high);
    const initialSize = initialBuffer.length / 1024;
    
    // If initial size is already good, return it
    if (initialSize <= targetSizeKB) {
      return initialBuffer;
    }
    lastSize = initialSize;
  } catch (error) {
    console.error('Error getting initial size:', error);
  }

  while (low <= high && attempts < maxAttempts) {
    const quality = Math.floor((low + high) / 2);
    
    try {
      const outputBuffer = await getOutputBuffer(sharpInstance, format, quality);
      const currentSizeKB = outputBuffer.length / 1024;
      console.log(`Attempt ${attempts + 1}: Quality ${quality}, Size: ${currentSizeKB.toFixed(2)}KB`);

      if (currentSizeKB <= targetSizeKB * 1.05) {
        lastValidBuffer = outputBuffer;
        lastValidQuality = quality;
        lastSize = currentSizeKB;
        
        if (currentSizeKB >= targetSizeKB * 0.95) {
          console.log(`Target achieved with quality: ${quality}`);
          return outputBuffer;
        }
        
        low = quality + 1;
      } else {
        high = quality - 1;
      }
    } catch (error) {
      console.error(`Error at quality ${quality}:`, error);
      high = quality - 1;
    }

    attempts++;
  }

  // If we couldn't meet the target size but have a valid buffer
  if (lastValidBuffer) {
    console.log(`Best achieved: Quality ${lastValidQuality}, Size: ${lastSize.toFixed(2)}KB`);
    return lastValidBuffer;
  }

  // If we still couldn't achieve the target size, try one last time with minimum quality
  try {
    const lastResortBuffer = await getOutputBuffer(sharpInstance, format, minQuality, true);
    const finalSize = lastResortBuffer.length / 1024;
    
    if (finalSize <= targetSizeKB * 1.2) { // Allow 20% margin for last resort
      console.log(`Last resort compression achieved: Size ${finalSize.toFixed(2)}KB`);
      return lastResortBuffer;
    }
  } catch (error) {
    console.error('Last resort compression failed:', error);
  }

  throw new Error(`Could not achieve target file size of ${targetSizeKB}KB. Smallest possible size: ${lastSize.toFixed(2)}KB`);
}

async function optimizeWebP(
  sharpInstance: sharp.Sharp,
  quality: number,
  targetSizeKB: number | null = null
): Promise<Buffer> {
  const instance = sharpInstance.clone();
  
  // If no target size, do direct WebP conversion
  if (!targetSizeKB) {
    return instance
      .webp({
        quality,
        effort: 6,
        preset: 'photo',
        smartSubsample: true,
      })
      .toBuffer();
  }

  console.log('Converting to target size JPEG first...');

  // Step 1: Convert to JPEG with target size
  const jpegBuffer = await compressToTargetSize(
    instance,
    'jpg',
    targetSizeKB,
    1,
    95, // Cap JPEG quality at 95 for better compression
    10
  );

  console.log('Converting optimized JPEG to WebP...');

  // Step 2: Convert the optimized JPEG to WebP
  // Start with slightly higher quality for WebP since it usually compresses better
  const initialQuality = Math.min(quality, 90);
  let webpBuffer = await sharp(jpegBuffer)
    .webp({
      quality: initialQuality,
      effort: 6,
      preset: 'photo',
      smartSubsample: true,
    })
    .toBuffer();

  // If WebP is larger than target, compress it further
  if (webpBuffer.length > targetSizeKB * 1024) {
    console.log('Initial WebP larger than target, adjusting quality...');
    
    // Calculate new quality based on size ratio
    const currentSize = webpBuffer.length / 1024;
    const sizeRatio = targetSizeKB / currentSize;
    const newQuality = Math.max(Math.floor(initialQuality * sizeRatio * 0.95), 1);
    
    webpBuffer = await sharp(jpegBuffer)
      .webp({
        quality: newQuality,
        effort: 6,
        preset: 'photo',
        smartSubsample: true,
      })
      .toBuffer();
  }

  const finalSize = webpBuffer.length / 1024;
  console.log(`Final WebP size: ${finalSize.toFixed(2)}KB`);
  
  return webpBuffer;
}

async function getOutputBuffer(
  sharpInstance: sharp.Sharp,
  format: string,
  quality: number,
  lastResort: boolean = false,
  targetSizeKB: number | null = null
): Promise<Buffer> {
  const instance = sharpInstance.clone();

  // Apply additional compression for very small target sizes or last resort
  if ((targetSizeKB && targetSizeKB < 500) || quality < 30 || lastResort) {
    const dimensions = await getImageDimensions(instance);
    if (dimensions.width && dimensions.height) {
      instance.resize({
        width: Math.round(dimensions.width * 0.9),
        height: Math.round(dimensions.height * 0.9),
        fit: 'inside',
      });
    }
  }

  switch (format) {
    case 'jpg':
      return instance
        .jpeg({
          quality,
          mozjpeg: true,
          chromaSubsampling: quality < 50 ? '4:2:0' : '4:4:4',
          trellisQuantisation: true,
          overshootDeringing: true,
          optimizeScans: true,
          optimizeCoding: true,
          quantisationTable: quality < 50 ? 8 : 4,
        })
        .toBuffer();

    case 'png':
      return instance
        .png({
          quality,
          compressionLevel: 9,
          palette: true,
          colors: quality < 50 ? 128 : 256,
          dither: quality < 50 ? 0.5 : 0,
        })
        .toBuffer();

    case 'webp':
      return optimizeWebP(instance, quality, targetSizeKB);

    default:
      throw new Error('Unsupported format');
  }
}

export const maxDuration = 30; // Set max duration for Netlify function
export const config = {
  api: {
    bodyParser: false, // Disable body parser as we're handling FormData
    responseLimit: false, // Remove response size limit
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log('Starting image conversion process...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;
    const quality = parseInt(formData.get('quality') as string);
    const width = parseInt(formData.get('width') as string);
    const height = parseInt(formData.get('height') as string);
    const targetFileSize = parseInt(formData.get('targetFileSize') as string);

    // Log input parameters
    console.log('Input parameters:', {
      fileName: file?.name,
      fileSize: file?.size,
      format,
      quality,
      width,
      height,
      targetFileSize,
    });

    if (!file || !format) {
      return NextResponse.json(
        { error: 'File and format are required' },
        { status: 400 }
      );
    }

    // Add file size limit check
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: 'File too large',
          details: `Maximum file size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          fileName: file.name
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('File buffer created, size:', buffer.length);
    let inputBuffer: Buffer;

    // Handle different input formats
    if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      console.log('Converting HEIC/HEIF file...');
      try {
        inputBuffer = await convertHeicToJpeg(buffer);
        console.log('HEIC conversion successful, buffer size:', inputBuffer.length);
        
        // Verify the converted buffer is valid
        try {
          const metadata = await sharp(inputBuffer).metadata();
          console.log('Converted image metadata:', metadata);
        } catch (verifyError) {
          console.error('Invalid converted buffer:', verifyError);
          throw new Error('Converted image is invalid');
        }
      } catch (heicError) {
        console.error('HEIC conversion error:', heicError);
        return NextResponse.json(
          { 
            error: 'Failed to convert HEIC image',
            details: heicError instanceof Error ? heicError.message : 'Unknown error',
            fileName: file.name
          },
          { status: 500 }
        );
      }
    } else {
      console.log('Using direct buffer for non-HEIC file');
      inputBuffer = buffer;
    }

    // Create sharp instance with the input buffer
    let sharpInstance: sharp.Sharp;
    try {
      sharpInstance = sharp(inputBuffer, {
        failOnError: false, // Try to handle corrupted images
        limitInputPixels: 268402689, // 16384 x 16384 pixels
        sequentialRead: true, // Add sequential read for better memory usage
      });
      
      // Verify the sharp instance is valid
      const metadata = await sharpInstance.metadata();
      console.log('Input image metadata:', metadata);
    } catch (sharpError) {
      console.error('Sharp initialization error:', sharpError);
      return NextResponse.json(
        { 
          error: 'Failed to process image',
          details: sharpError instanceof Error ? sharpError.message : 'Unknown error',
          fileName: file.name
        },
        { status: 500 }
      );
    }

    // Apply resize if dimensions are provided
    if (width && height) {
      try {
        sharpInstance = sharpInstance.resize({
          width,
          height,
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3,
        });
      } catch (resizeError) {
        console.error('Resize error:', resizeError);
        return NextResponse.json(
          { 
            error: 'Failed to resize image',
            details: resizeError instanceof Error ? resizeError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    let outputBuffer;
    try {
      if (targetFileSize > 0) {
        // Use target file size compression
        outputBuffer = await compressToTargetSize(
          sharpInstance,
          format,
          targetFileSize
        );
      } else {
        // Use quality-based compression
        const optimizedQuality = Math.max(Math.min(Math.round(quality * 0.7), 100), 1);
        
        switch (format) {
          case 'jpg':
            outputBuffer = await sharpInstance
              .jpeg({
                quality: optimizedQuality,
                mozjpeg: true,
                chromaSubsampling: quality < 80 ? '4:2:0' : '4:4:4',
                trellisQuantisation: true,
                overshootDeringing: true,
                optimizeScans: true,
                optimizeCoding: true,
              })
              .toBuffer();
            break;
          case 'png':
            outputBuffer = await sharpInstance
              .png({
                quality: optimizedQuality,
                compressionLevel: 9,
                palette: quality < 90,
                colors: quality < 90 ? Math.min(256, Math.round(Math.pow(2, quality / 10))) : 256,
                dither: quality < 90 ? 0.5 : 0,
              })
              .toBuffer();
            break;
          case 'webp':
            outputBuffer = await sharpInstance
              .webp({
                quality: optimizedQuality,
                effort: 6,
                preset: 'photo',
                smartSubsample: true,
              })
              .toBuffer();
            break;
          default:
            return NextResponse.json(
              { error: 'Unsupported format' },
              { status: 400 }
            );
        }
      }

      // Return the converted image as a response
      return new NextResponse(outputBuffer, {
        headers: {
          'Content-Type': `image/${format === 'jpg' ? 'jpeg' : format}`,
          'Content-Disposition': `attachment; filename="converted.${format}"`,
        },
      });
    } catch (conversionError) {
      console.error('Conversion error:', conversionError);
      return NextResponse.json(
        { 
          error: 'Failed to convert image',
          details: conversionError instanceof Error ? conversionError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('General error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 