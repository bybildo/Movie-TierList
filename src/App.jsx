import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import AuthorizationPage from './AuthorizationPage'
import TierListPage from './TierListPage'

const STORAGE_KEY = 'authSession'

const PUBLIC_TIERS = [
  { id: 's', label: 'S', colorClass: 'bg-amber-400' },
  { id: 'a', label: 'A', colorClass: 'bg-amber-500' },
  { id: 'b', label: 'B', colorClass: 'bg-orange-500' },
  { id: 'c', label: 'C', colorClass: 'bg-red-500' },
  { id: 'd', label: 'D', colorClass: 'bg-red-600' },
]

function getSavedSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(() => Boolean(getSavedSession()))

  const [publicLists, setPublicLists] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [movies, setMovies] = useState([])
  const [loadingPublic, setLoadingPublic] = useState(true)
  const [expandedKey, setExpandedKey] = useState(null)

  useEffect(() => {
    const saved = getSavedSession()
    if (!saved?.id || !saved?.pattern) {
      setCheckingSession(false)
      return
    }

    const q = query(
      collection(db, 'users'),
      where(documentId(), '==', saved.id),
      where('pattern', '==', saved.pattern),
    )

    getDocs(q)
      .then((snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0]
          setCurrentUser({
            id: docSnap.id,
            name: docSnap.data().name,
            photoUrl: docSnap.data().photoUrl || '',
          })
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      })
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
      })
      .finally(() => {
        setCheckingSession(false)
      })
  }, [])

  useEffect(() => {
    if (checkingSession || currentUser) return
    let active = true
    setLoadingPublic(true)

    Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'tierlists')),
      getDocs(collection(db, 'Movies')),
    ])
      .then(([usersSnap, tierlistsSnap, moviesSnap]) => {
        if (!active) return

        const usersMap = new Map()
        usersSnap.docs.forEach((d) => {
          const data = d.data()
          usersMap.set(d.id, {
            id: d.id,
            name: data.name || 'Користувач',
            photoUrl: data.photoUrl || '',
          })
        })

        const allMovies = moviesSnap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            title: data.Name ?? data.name ?? data.title ?? '',
            imageUrl: data.ImageUrl ?? data.imageUrl ?? '',
          }
        })
        setMovies(allMovies)

        const toIds = (arr) =>
          (arr ?? [])
            .map((item) => (typeof item === 'string' ? item : item?.id))
            .filter(Boolean)

        const lists = tierlistsSnap.docs
          .map((d) => {
            const data = d.data()
            const owner = usersMap.get(d.id) || {
              id: d.id,
              name: 'Користувач',
              photoUrl: '',
            }
            const tiersData = {
              s: toIds(data.s),
              a: toIds(data.a),
              b: toIds(data.b),
              c: toIds(data.c),
              d: toIds(data.d),
            }
            const totalItems = Object.values(tiersData).reduce(
              (sum, list) => sum + list.length,
              0,
            )

            return {
              userId: d.id,
              owner,
              tiers: tiersData,
              totalItems,
            }
          })
          .filter((entry) => entry.totalItems > 0)

        setPublicLists(lists)
        if (lists.length > 0) {
          setSelectedUserId((prev) =>
            lists.some((item) => item.userId === prev) ? prev : lists[0].userId,
          )
        }
      })
      .finally(() => {
        if (active) setLoadingPublic(false)
      })

    return () => {
      active = false
    }
  }, [checkingSession, currentUser])

  const moviesById = useMemo(
    () => new Map(movies.map((m) => [m.id, m])),
    [movies],
  )

  const selectedList = useMemo(
    () => publicLists.find((l) => l.userId === selectedUserId) ?? publicLists[0] ?? null,
    [publicLists, selectedUserId],
  )

  const handleAuthorized = (user) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: user.id, pattern: user.pattern }),
    )
    setCurrentUser({ id: user.id, name: user.name, photoUrl: user.photoUrl })
    setShowAuthModal(false)
  }

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setCurrentUser(null)
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-400 flex items-center justify-center">
        Перевірка сесії...
      </div>
    )
  }

  if (currentUser) {
    return <TierListPage user={currentUser} onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-3 py-2.5 sm:px-6 sm:py-3 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowAuthModal((prev) => !prev)}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold shrink-0 cursor-pointer"
          >
            {showAuthModal ? 'Закрити' : 'Увійти'}
          </button>
        </div>
      </header>

      {showAuthModal ? (
        <div className="border-b border-neutral-800 bg-neutral-900/60">
          <AuthorizationPage onAuthorized={handleAuthorized} />
        </div>
      ) :
        (
          <main className="max-w-5xl mx-auto p-3 sm:p-6 flex flex-col gap-3">
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {loadingPublic ? (
                <span className="text-xs text-neutral-500">Завантаження...</span>
              ) : (
                publicLists.map((list) => {
                  const isSelected = selectedList?.userId === list.userId
                  return (
                    <button
                      key={list.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(list.userId)
                        setShowAuthModal(false)
                      }}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-medium shrink-0 transition cursor-pointer border ${isSelected
                          ? 'bg-neutral-800 text-white border-neutral-600'
                          : 'bg-neutral-900/70 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800/50'
                        }`}
                    >
                      {list.owner.photoUrl ? (
                        <img
                          src={list.owner.photoUrl}
                          alt={list.owner.name}
                          className="w-5 h-5 rounded-full object-cover bg-neutral-700 shrink-0"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-neutral-700 shrink-0" />
                      )}
                      <span className="max-w-[110px] sm:max-w-[150px] truncate">
                        {list.owner.name}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            {loadingPublic ? (
              <p className="text-neutral-400 text-center py-12 text-sm">
                Завантаження тір-листів...
              </p>
            ) : !selectedList ? (
              <p className="text-neutral-500 text-center py-12 text-sm">
                Поки що немає заповнених тір-листів.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800 text-neutral-950">
                  {PUBLIC_TIERS.map((tier) => {
                    const items = selectedList.tiers[tier.id]
                      .map((id) => moviesById.get(id))
                      .filter(Boolean)

                    return (
                      <div
                        key={tier.id}
                        className="flex min-h-[76px] sm:min-h-[96px] bg-neutral-900/70"
                      >
                        <div
                          className={`w-14 sm:w-24 shrink-0 flex items-center justify-center text-lg sm:text-2xl font-semibold select-none ${tier.colorClass}`}
                        >
                          {tier.label}
                        </div>

                        <div className="flex-1 p-2 sm:p-3 flex flex-wrap gap-2 items-start">
                          {items.map((movie) => {
                            const itemKey = `${selectedList.userId}-${tier.id}-${movie.id}`
                            const isExpanded = expandedKey === itemKey

                            return (
                              <div
                                key={movie.id}
                                title={movie.title}
                                className="w-16 sm:w-20 shrink-0 flex flex-col items-center select-none"
                              >
                                <div className="w-16 h-16 sm:w-20 sm:h-20 aspect-square rounded-lg overflow-hidden bg-neutral-800 shadow">
                                  {movie.imageUrl && (
                                    <img
                                      src={movie.imageUrl}
                                      alt={movie.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  )}
                                </div>
                                <span
                                  onClick={() =>
                                    setExpandedKey((prev) =>
                                      prev === itemKey ? null : itemKey,
                                    )
                                  }
                                  className={`mt-1 text-[11px] sm:text-xs leading-tight text-neutral-300 text-center w-full cursor-pointer break-words ${isExpanded ? 'line-clamp-none' : 'line-clamp-2'
                                    }`}
                                >
                                  {movie.title}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </main>)}
    </div>
  )
}

export default App