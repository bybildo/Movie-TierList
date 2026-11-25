import { useEffect, useState } from 'react'
import {
  collection,
  documentId,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import PatternLock from './PatternLock'
import AddUserPage from './AddUserPage'

function AuthorizationPage({ onAuthorized }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [showAddUser, setShowAddUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [pattern, setPattern] = useState([])
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        photoUrl: doc.data().photoUrl || '',
      }))
      setUsers(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleVerifyPattern = async (e) => {
    e.preventDefault()
    if (!selectedUser || pattern.length < 1) return

    setChecking(true)
    setError('')
    try {
      const q = query(
        collection(db, 'users'),
        where(documentId(), '==', selectedUser.id),
        where('pattern', '==', pattern.join('-')),
      )
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        console.log('Вхід не виконано (невірний графічний ключ):', selectedUser.name)
        setError('Невірний графічний ключ')
        setPattern([])
        return
      }

      console.log('Вхід виконано успішно:', selectedUser)
      onAuthorized?.({ ...selectedUser, pattern: pattern.join('-') })
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  if (showAddUser) {
    return (
      <AddUserPage
        onCancel={() => setShowAddUser(false)}
        onCreated={(newUser) => {
          setShowAddUser(false)
          setUsers((prev) => [...prev, newUser])
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold mb-8 text-center">
        Оберіть профіль
      </h1>

      {loadingUsers ? (
        <p className="text-neutral-400">Завантаження...</p>
      ) : (
        <div className="flex flex-wrap items-start justify-center gap-6 sm:gap-8 max-w-2xl">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setSelectedUser(user)
                setPattern([])
                setError('')
              }}
              className="group flex flex-col items-center gap-2.5 w-24 cursor-pointer"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-900 border-2 border-neutral-800 group-hover:border-blue-500 transition-colors overflow-hidden flex items-center justify-center">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
              </div>
              <span className="text-sm font-medium text-neutral-300 group-hover:text-white text-center break-words w-full">
                {user.name}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className="group flex flex-col items-center gap-2.5 w-24 cursor-pointer"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-neutral-900 border-2 border-dashed border-neutral-700 group-hover:border-blue-500 transition-colors flex items-center justify-center text-3xl text-neutral-400 group-hover:text-white">
              +
            </div>
            <span className="text-sm font-medium text-neutral-400 group-hover:text-white text-center">
              Створити користувача
            </span>
          </button>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleVerifyPattern}
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4"
          >
            <div className="text-center">
              <h2 className="text-lg font-bold">{selectedUser.name}</h2>
              <p className="text-sm text-neutral-400">Намалюйте графічний ключ</p>
            </div>

            <PatternLock value={pattern} onChange={setPattern} />

            {error && (
              <p className="text-sm text-red-400 text-center">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null)
                  setPattern([])
                  setError('')
                }}
                className="flex-1 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 font-medium cursor-pointer"
              >
                Відмінити
              </button>
              <button
                type="submit"
                disabled={checking || pattern.length < 1}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
              >
                {checking ? 'Перевірка...' : 'Увійти'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default AuthorizationPage
