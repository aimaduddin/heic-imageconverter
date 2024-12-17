import { Dispatch, SetStateAction } from 'react'

interface ConversionOptionsProps {
  outputFormat: 'jpg' | 'png' | 'webp'
  setOutputFormat: Dispatch<SetStateAction<'jpg' | 'png' | 'webp'>>
  quality: number
  setQuality: Dispatch<SetStateAction<number>>
  resize: { width: number; height: number }
  setResize: Dispatch<SetStateAction<{ width: number; height: number }>>
}

export default function ConversionOptions({
  outputFormat,
  setOutputFormat,
  quality,
  setQuality,
  resize,
  setResize,
}: ConversionOptionsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="format" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Output Format
        </label>
        <select
          id="format"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value as 'jpg' | 'png' | 'webp')}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
      <div>
        <label htmlFor="quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Quality: {quality}%
        </label>
        <input
          type="range"
          id="quality"
          min="1"
          max="100"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="width" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Width (px)
          </label>
          <input
            type="number"
            id="width"
            value={resize.width}
            onChange={(e) => setResize({ ...resize, width: Number(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="height" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Height (px)
          </label>
          <input
            type="number"
            id="height"
            value={resize.height}
            onChange={(e) => setResize({ ...resize, height: Number(e.target.value) })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    </div>
  )
}

