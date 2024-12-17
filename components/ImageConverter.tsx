'use client'

import { useState, useEffect } from 'react'
import UploadSection from './UploadSection'
import ConversionOptions from './ConversionOptions'
import ProgressFeedback from './ProgressFeedback'
import DownloadOptions from './DownloadOptions'
import ErrorMessage from './ErrorMessage'

export default function ImageConverter() {
  const [files, setFiles] = useState<File[]>([])
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'png' | 'webp'>('jpg')
  const [quality, setQuality] = useState(80)
  const [resize, setResize] = useState({ width: 0, height: 0 })
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [convertedFiles, setConvertedFiles] = useState<string[]>([])
  const [targetFileSize, setTargetFileSize] = useState(1000)

  const isValidImageType = (file: File) => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/tiff',
      'image/gif',
      'image/bmp'
    ];
    return validTypes.includes(file.type.toLowerCase()) || 
           file.name.toLowerCase().endsWith('.heic') || 
           file.name.toLowerCase().endsWith('.heif');
  };

  const handleFileUpload = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => isValidImageType(file));
    if (validFiles.length !== newFiles.length) {
      setError('Some files were not in a supported image format and were ignored.');
    }
    setFiles(prevFiles => [...prevFiles, ...validFiles]);
  };

  const convertFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('format', outputFormat);
    formData.append('quality', quality.toString());
    formData.append('width', resize.width.toString());
    formData.append('height', resize.height.toString());
    formData.append('targetFileSize', targetFileSize.toString());

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Failed to parse error response',
          details: 'Unknown error'
        }));
        
        throw new Error(
          errorData.details || 
          errorData.error || 
          `Failed to convert image: ${response.statusText}`
        );
      }

      // Check if the response is JSON (error) or blob (success)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to convert image');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Converted image is empty');
      }

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`Error converting ${file.name}:`, error);
      throw error;
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Please upload at least one image file');
      return;
    }

    setProgress(0);
    setError(null);
    setConvertedFiles([]);

    try {
      const totalFiles = files.length;
      const converted: string[] = [];
      let hasErrors = false;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        try {
          const url = await convertFile(file);
          converted.push(url);
          setProgress(((i + 1) / totalFiles) * 100);
        } catch (error) {
          hasErrors = true;
          console.error(`Error converting ${file.name}:`, error);
          setError(`Failed to convert ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue with next file instead of breaking
        }
      }

      if (converted.length > 0) {
        setConvertedFiles(converted);
        if (hasErrors) {
          setError('Some files failed to convert. Successfully converted files are shown below.');
        }
      } else {
        setError('All files failed to convert. Please try again with different files or settings.');
      }
    } catch (error) {
      setError('An error occurred during conversion. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  // Cleanup function to revoke object URLs
  useEffect(() => {
    return () => {
      convertedFiles.forEach(url => URL.revokeObjectURL(url));
    };
  }, [convertedFiles]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
      <UploadSection onFileUpload={handleFileUpload} files={files} />
      <ConversionOptions
        outputFormat={outputFormat}
        setOutputFormat={setOutputFormat}
        quality={quality}
        setQuality={setQuality}
        resize={resize}
        setResize={setResize}
        targetFileSize={targetFileSize}
        setTargetFileSize={setTargetFileSize}
      />
      <button
        onClick={handleConvert}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300"
      >
        Convert Images
      </button>
      {progress > 0 && <ProgressFeedback progress={progress} />}
      {error && <ErrorMessage message={error} />}
      {convertedFiles.length > 0 && <DownloadOptions files={convertedFiles} />}
    </div>
  )
}

