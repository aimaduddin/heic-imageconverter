import { Download } from 'lucide-react'

interface DownloadOptionsProps {
  files: string[]
}

export default function DownloadOptions({ files }: DownloadOptionsProps) {
  const getFileExtension = (url: string): string => {
    // Extract the content type from the data URL or blob URL
    if (url.includes('image/jpeg')) return 'jpg';
    if (url.includes('image/png')) return 'png';
    if (url.includes('image/webp')) return 'webp';
    // Default to jpg if type cannot be determined
    return 'jpg';
  };

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const extension = getFileExtension(blob.type);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      // Ensure filename has the correct extension
      link.download = `converted_image_${index + 1}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < files.length; i++) {
      await handleDownload(files[i], i);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Converted Files ({files.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {files.map((file, index) => (
          <div key={index} className="relative group">
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={file}
                alt={`Converted image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleDownload(file, index)}
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Download className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {files.length > 1 && (
        <button
          onClick={handleDownloadAll}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition duration-300"
        >
          Download All Files
        </button>
      )}
    </div>
  )
}

