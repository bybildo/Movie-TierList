import { useEffect, useState } from 'react'
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

  const handleAuthorized = (user) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: user.id, pattern: user.pattern }),
    )
    setCurrentUser({ id: user.id, name: user.name, photoUrl: user.photoUrl })
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

  if (!currentUser) {
    return <AuthorizationPage onAuthorized={handleAuthorized} />
  }

  return <TierListPage user={currentUser} onLogout={handleLogout} />
}

export default App
