import { useState } from 'react'

interface ConversionOptionsProps {
  outputFormat: 'jpg' | 'png' | 'webp'
  setOutputFormat: (format: 'jpg' | 'png' | 'webp') => void
  quality: number
  setQuality: (quality: number) => void
  resize: { width: number; height: number }
  setResize: (resize: { width: number; height: number }) => void
  targetFileSize: number
  setTargetFileSize: (size: number) => void
}

export default function ConversionOptions({
  outputFormat,
  setOutputFormat,
  quality,
  setQuality,
  resize,
  setResize,
  targetFileSize,
  setTargetFileSize,
}: ConversionOptionsProps) {
  const [useTargetSize, setUseTargetSize] = useState(false)

  const handleResizeChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = value === '' ? 0 : parseInt(value)
    setResize({ ...resize, [dimension]: numValue })
  }

  const handleTargetSizeChange = (value: string) => {
    const numValue = value === '' ? 0 : parseInt(value)
    setTargetFileSize(numValue)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Output Format
        </label>
        <select
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as 'jpg' | 'png' | 'webp')}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="jpg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={useTargetSize}
            onChange={(e) => setUseTargetSize(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Use Target File Size
          </span>
        </label>

        {useTargetSize ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target File Size (KB)
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={targetFileSize}
              onChange={(e) => handleTargetSizeChange(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Target size in kilobytes (1000KB = 1MB)
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quality ({quality}%)
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={quality}
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className="mt-1 block w-full"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Width (optional)
          </label>
          <input
            type="number"
            min="0"
            value={resize.width}
            onChange={(e) => handleResizeChange('width', e.target.value)}
            placeholder="Auto"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Height (optional)
          </label>
          <input
            type="number"
            min="0"
            value={resize.height}
            onChange={(e) => handleResizeChange('height', e.target.value)}
            placeholder="Auto"
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  )
}

