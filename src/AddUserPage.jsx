import { useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import PatternLock from './PatternLock'

function AddUserPage({ onCancel, onCreated }) {
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [pattern, setPattern] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError("Введіть ім'я")
      return
    }
    if (pattern.length < 4) {
      setError('Намалюйте графічний ключ (мінімум 4 точки)')
      return
    }

    setLoading(true)
    try {
      const trimmedName = name.trim()
      const userRef = doc(db, 'users', trimmedName.toLowerCase())
      const existing = await getDoc(userRef)

      if (existing.exists()) {
        setError("Користувач з таким ім'ям вже існує")
        return
      }

      await setDoc(userRef, {
        name: trimmedName,
        photoUrl: photoUrl.trim(),
        pattern: pattern.join('-'),
        createdAt: serverTimestamp(),
      })
      onCreated?.({
        id: userRef.id,
        name: trimmedName,
        photoUrl: photoUrl.trim(),
        pattern: pattern.join('-'),
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-3 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5"
      >
        <h1 className="text-lg sm:text-xl font-bold text-center">Створення профілю</h1>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Ім'я</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введіть ім'я"
            className="w-full px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">Фото URL</label>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-blue-500"
            />
            <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center text-xs text-neutral-500">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                'Фото'
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-neutral-400">Графічний ключ</label>
            {pattern.length > 0 && (
              <button
                type="button"
                onClick={() => setPattern([])}
                className="text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Очистити
              </button>
            )}
          </div>

          <PatternLock value={pattern} onChange={setPattern} />
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:flex-1 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 font-medium cursor-pointer"
          >
            Відмінити
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || pattern.length < 1}
            className="w-full sm:flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium cursor-pointer"
          >
            {loading ? 'Створення...' : 'Створити'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddUserPage
