import { useState } from 'react'
import { searchImages } from './serpapi'
import AuthorizationPage from './AuthorizationPage'

function App() {
  const [query, setQuery] = useState('')
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError('')
    try {
      const results = await searchImages(query.trim())
      setImages(results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (<AuthorizationPage onAuthorized={(user) => {console.log(user)}} />)

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Пошук зображень..."
          className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium cursor-pointer"
        >
          {loading ? 'Пошук...' : 'Пошук'}
        </button>
      </form>

      {error && (
        <p className="text-center text-red-400 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {images.map((img, index) => (
          <div key={index} className="bg-neutral-900 rounded-lg overflow-hidden">
            <img
              src={img.thumbnail || img.original}
              alt={img.title}
              className="w-full h-40 object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
