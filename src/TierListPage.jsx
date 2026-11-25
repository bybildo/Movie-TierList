import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const TIERS = [
  { id: 's', label: 'S', colorClass: 'bg-amber-400' },
  { id: 'a', label: 'A', colorClass: 'bg-amber-500' },
  { id: 'b', label: 'B', colorClass: 'bg-orange-500' },
  { id: 'c', label: 'C', colorClass: 'bg-red-500' },
  { id: 'd', label: 'D', colorClass: 'bg-red-600' },
  { id: '-', label: '-', colorClass: 'bg-neutral-700 text-neutral-200' },
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
        className={`mt-1 text-[11px] sm:text-xs text-neutral-300 text-center w-full cursor-pointer ${
          expandedId === item.id ? 'whitespace-normal break-words' : 'truncate'
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
                    className={`w-16 sm:w-24 shrink-0 flex items-center justify-center text-2xl font-semibold ${tier.colorClass}`}
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
          </>
        )}
      </div>
    </div>
  )
}

export default TierListPage
