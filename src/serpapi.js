const SERPAPI_BASE_URL = import.meta.env.DEV
  ? '/api/serpapi/search.json'
  : 'https://serpapi.com/search.json'

/**
 * Search for images via SerpApi (Google Images engine).
 * @param {string} query
 * @returns {Promise<Array<{ title: string, thumbnail: string, original: string }>>}
 */
export async function searchImages(query) {
  const apiKey = import.meta.env.VITE_IMAGE_API
  if (!apiKey) {
    throw new Error('VITE_IMAGE_API is not set in .env')
  }

  const params = new URLSearchParams({
    engine: 'google_images',
    q: query,
    api_key: apiKey,
  })

  const response = await fetch(`${SERPAPI_BASE_URL}?${params}`)
  if (!response.ok) {
    throw new Error(`SerpApi request failed: ${response.status}`)
  }

  const data = await response.json()
  return (data.images_results ?? []).map((item) => ({
    title: item.title ?? '',
    thumbnail: item.thumbnail ?? '',
    original: item.original ?? '',
  }))
}
