import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'

interface UploadSectionProps {
  onFileUpload: (files: File[]) => void
  files: File[]
}

const ACCEPTED_IMAGE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic', '.HEIC'],
  'image/heif': ['.heif', '.HEIF'],
  'image/tiff': ['.tiff', '.tif'],
  'image/gif': ['.gif'],
  'image/bmp': ['.bmp'],
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function UploadSection({ onFileUpload, files }: UploadSectionProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB max file size
  });

  const getFileTypeIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return '📸';
      case 'png':
        return '🖼️';
      case 'webp':
        return '🌐';
      case 'heic':
      case 'heif':
        return '📱';
      case 'gif':
        return '🎥';
      default:
        return '🖼️';
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition duration-300 ${
          isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Drag & drop images here, or click to select files
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Supports JPG, PNG, WebP, HEIC, HEIF, GIF, TIFF, BMP (Max 50MB)
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Selected Files ({files.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span className="text-2xl mr-3">{getFileTypeIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

