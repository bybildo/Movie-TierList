import { initializeApp } from 'firebase/app'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyA5GDu5T9ZCeeN-P0b0ZpOtLq1Y9YZdTWY',
  authDomain: 'movie-tierlist.firebaseapp.com',
  projectId: 'movie-tierlist',
  storageBucket: 'movie-tierlist.firebasestorage.app',
  messagingSenderId: '80023158582',
  appId: '1:80023158582:web:31621dacca8f1b15d4fd97',
  measurementId: 'G-BDSDNNLCCV',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

/**
 * Save data to a Firestore document.
 * @param {string} collectionName
 * @param {string} docId
 * @param {object} data
 */
export async function saveData(collectionName, docId, data) {
  await setDoc(doc(db, collectionName, docId), data)
}

/**
 * Read data from a Firestore document.
 * @param {string} collectionName
 * @param {string} docId
 * @returns {Promise<object | null>}
 */
export async function loadData(collectionName, docId) {
  const snapshot = await getDoc(doc(db, collectionName, docId))
  return snapshot.exists() ? snapshot.data() : null
}
