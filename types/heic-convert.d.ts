declare module 'heic-convert' {
  interface HeicConvertOptions {
    buffer: Buffer;
    format: 'JPEG' | 'PNG' | 'WEBP';
    quality?: number;
  }

  function convert(options: HeicConvertOptions): Promise<Buffer>;
  export = convert;
} 