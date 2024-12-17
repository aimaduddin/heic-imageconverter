import ImageConverter from '../components/ImageConverter'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          HEIC Image Converter
        </h1>
        <ImageConverter />
      </div>
    </main>
  )
}

