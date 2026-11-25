import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { searchImages } from './serpapi'

const TIERS = [
  { id: 's', label: 'S', colorClass: 'bg-amber-400' },
  { id: 'a', label: 'A', colorClass: 'bg-amber-500' },
  { id: 'b', label: 'B', colorClass: 'bg-orange-500' },
  { id: 'c', label: 'C', colorClass: 'bg-red-500' },
  { id: 'd', label: 'D', colorClass: 'bg-red-600' },
  { id: '-', label: '-', colorClass: 'bg-neutral-700' },
]

const EMPTY_TIERS = {
  s: [],
  a: [],
  b: [],
  c: [],
  d: [],
  '-': [],
}

function TierListPage({ user, onLogout }) {
  const [movies, setMovies] = useState([])
  const [tiers, setTiers] = useState(EMPTY_TIERS)
  const [loading, setLoading] = useState(true)
  const [showMinus, setShowMinus] = useState(true)
  const [dragged, setDragged] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const [movieName, setMovieName] = useState('')
  const [movieImageUrl, setMovieImageUrl] = useState('')
  const [addingMovie, setAddingMovie] = useState(false)
  const [addError, setAddError] = useState('')

  const [showSerpModal, setShowSerpModal] = useState(false)
  const [serpQuery, setSerpQuery] = useState('')
  const [serpImages, setSerpImages] = useState([])
  const [serpLoading, setSerpLoading] = useState(false)
  const [serpError, setSerpError] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let active = true

    Promise.all([
      getDocs(collection(db, 'Movies')),
      getDoc(doc(db, 'tierlists', user.id)),
    ])
      .then(([moviesSnap, tierSnap]) => {
        if (!active) return

        const allMovies = moviesSnap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            title: data.Name ?? data.name ?? data.title ?? '',
            imageUrl: data.ImageUrl ?? data.imageUrl ?? '',
          }
        })
        setMovies(allMovies)

        if (tierSnap.exists()) {
          const data = tierSnap.data()
          const toIds = (arr) =>
            (arr ?? [])
              .map((item) => (typeof item === 'string' ? item : item?.id))
              .filter(Boolean)

          setTiers({
            s: toIds(data.s),
            a: toIds(data.a),
            b: toIds(data.b),
            c: toIds(data.c),
            d: toIds(data.d),
            '-': toIds(data['-']),
          })
        } else {
          setTiers(EMPTY_TIERS)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.id])

  const moviesById = useMemo(
    () => new Map(movies.map((m) => [m.id, m])),
    [movies],
  )

  const remained = useMemo(() => {
    const usedIds = new Set(Object.values(tiers).flat())
    return movies.filter((movie) => !usedIds.has(movie.id))
  }, [movies, tiers])

  const handleDragStart = (item, fromZone) => {
    setDragged({ item, fromZone })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const moveItem = (itemId, fromZone, toZone) => {
    if (fromZone === toZone) return

    const nextTiers = { ...tiers }
    if (fromZone !== 'remained') {
      nextTiers[fromZone] = nextTiers[fromZone].filter((id) => id !== itemId)
    }
    if (toZone !== 'remained') {
      nextTiers[toZone] = [...nextTiers[toZone], itemId]
    }

    setTiers(nextTiers)

    if (user?.id) {
      setDoc(doc(db, 'tierlists', user.id), nextTiers)
    }
  }

  const handleDrop = (toZone) => {
    if (!dragged) return
    moveItem(dragged.item.id, dragged.fromZone, toZone)
    setDragged(null)
  }

  const handleAddMovie = async (e) => {
    e.preventDefault()
    if (!movieName.trim() || !movieImageUrl.trim()) return

    setAddingMovie(true)
    setAddError('')
    try {
      const name = movieName.trim()
      const imageUrl = movieImageUrl.trim()
      const docRef = await addDoc(collection(db, 'Movies'), {
        Name: name,
        ImageUrl: imageUrl,
        addedBy: user?.name ?? user?.id ?? '',
        createdAt: serverTimestamp(),
      })
      setMovies((prev) => [...prev, { id: docRef.id, title: name, imageUrl }])
      setMovieName('')
      setMovieImageUrl('')
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddingMovie(false)
    }
  }

  const handleSerpSearch = async (e) => {
    e.preventDefault()
    if (!serpQuery.trim()) return

    setSerpLoading(true)
    setSerpError('')
    try {
      const results = await searchImages(serpQuery.trim())
      setSerpImages(results)
    } catch (err) {
      setSerpError(err.message)
    } finally {
      setSerpLoading(false)
    }
  }

  const renderItem = (item, zone) => (
    <div
      key={item.id}
      draggable
      onDragStart={() => handleDragStart(item, zone)}
      onContextMenu={(e) => {
        e.preventDefault()
        moveItem(item.id, zone, '-')
      }}
      title={item.title}
      className="w-16 sm:w-20 shrink-0 flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
    >
      <div className="w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-lg overflow-hidden bg-neutral-800 shadow">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover pointer-events-none"
          />
        )}
      </div>
      <span
        onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
        className={`mt-1 text-[11px] sm:text-xs leading-tight text-neutral-300 text-center w-full cursor-pointer break-words ${
          expandedId === item.id ? 'line-clamp-none' : 'line-clamp-2'
        }`}
      >
        {item.title}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-3 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {user?.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover bg-neutral-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-neutral-800" />
            )}
            <span className="font-semibold">{user?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMinus((prev) => !prev)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium cursor-pointer"
            >
              {showMinus ? 'Приховати "-"' : 'Показати "-"'}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium cursor-pointer"
            >
              Вийти
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-neutral-400 text-center py-12">Завантаження...</p>
        ) : (
          <>
            <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800 text-neutral-950">
              {TIERS.filter((tier) => tier.id !== '-' || showMinus).map((tier) => (
                <div
                  key={tier.id}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(tier.id)}
                  className="flex min-h-[84px] sm:min-h-[100px] bg-neutral-900/70"
                >
                  <div
                    className={`w-16 sm:w-24 sm:text-2xl shrink-0 flex items-center justify-center text-1xl font-semibold ${tier.colorClass}`}
                  >
                    {tier.label}
                  </div>
                  <div className="flex-1 p-2 sm:p-3 flex flex-wrap gap-2 items-center">
                    {tiers[tier.id]
                      .map((id) => moviesById.get(id))
                      .filter(Boolean)
                      .map((item) => renderItem(item, tier.id))}
                  </div>
                </div>
              ))}
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop('remained')}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 min-h-[104px]"
            >
              <p className="text-xs text-neutral-400 mb-3">Нерозподілені</p>
              <div className="flex flex-wrap gap-2">
                {remained.map((item) => renderItem(item, 'remained'))}
              </div>
            </div>

            <form
              onSubmit={handleAddMovie}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 space-y-3"
            >
              <p className="text-sm font-semibold">Додати фільм</p>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="text"
                  value={movieName}
                  onChange={(e) => setMovieName(e.target.value)}
                  placeholder="Назва фільму *"
                  className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500 text-sm"
                />
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="url"
                    value={movieImageUrl}
                    onChange={(e) => setMovieImageUrl(e.target.value)}
                    placeholder="URL фото *"
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-neutral-500">
                    {movieImageUrl ? (
                      <img
                        src={movieImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      'Фото'
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSerpQuery(movieName.trim())
                    setShowSerpModal(true)
                  }}
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium cursor-pointer shrink-0"
                >
                  Пошук фото
                </button>
                <button
                  type="submit"
                  disabled={addingMovie || !movieName.trim() || !movieImageUrl.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium cursor-pointer shrink-0"
                >
                  {addingMovie ? 'Додавання...' : 'Додати'}
                </button>
              </div>
              {addError && <p className="text-xs text-red-400">{addError}</p>}
            </form>
          </>
        )}
      </div>

      {showSerpModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Вибір фото (SerpApi)</h2>
              <button
                type="button"
                onClick={() => setShowSerpModal(false)}
                className="text-neutral-400 hover:text-white text-sm cursor-pointer"
              >
                Закрити
              </button>
            </div>

            <form onSubmit={handleSerpSearch} className="flex gap-2">
              <input
                type="text"
                value={serpQuery}
                onChange={(e) => setSerpQuery(e.target.value)}
                placeholder="Пошук постера..."
                className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={serpLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium cursor-pointer"
              >
                {serpLoading ? 'Пошук...' : 'Пошук'}
              </button>
            </form>

            {serpError && <p className="text-xs text-red-400">{serpError}</p>}

            <div className="overflow-y-auto no-scrollbar flex flex-wrap gap-2.5">
              {serpImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMovieImageUrl(img.thumbnail || img.original)
                    setShowSerpModal(false)
                  }}
                  className="w-16 h-16 sm:w-20 sm:h-20 aspect-square shrink-0 rounded-lg overflow-hidden bg-neutral-800 border-2 border-transparent hover:border-blue-500 cursor-pointer"
                >
                  <img
                    src={img.thumbnail || img.original}
                    alt={img.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TierListPage
