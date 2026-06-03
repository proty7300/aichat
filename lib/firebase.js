import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDSagp1dx0zxDVtN06V255TyuqT-v_CDq0",
  authDomain: "ai-chat-web-a1a93.firebaseapp.com",
  projectId: "ai-chat-web-a1a93",
  storageBucket: "ai-chat-web-a1a93.firebasestorage.app",
  messagingSenderId: "482517470802",
  appId: "1:482517470802:web:38cd313eb51de1bfd3198b"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error('Google sign in error:', error)
    throw error
  }
}

export const logout = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    console.error('Logout error:', error)
    throw error
  }
}

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback)
}

export const getCurrentUser = () => auth.currentUser

// Firestore functions
export const saveChat = async (userId, chatData) => {
  try {
    const chatRef = await addDoc(collection(db, 'chats'), {
      userId,
      title: chatData.title,
      messages: chatData.messages,
      model: chatData.model,
      mode: chatData.mode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return chatRef.id
  } catch (error) {
    console.error('Save chat error:', error)
    throw error
  }
}

export const updateChat = async (chatId, chatData) => {
  try {
    const chatRef = doc(db, 'chats', chatId)
    await updateDoc(chatRef, {
      messages: chatData.messages,
      title: chatData.title,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Update chat error:', error)
    throw error
  }
}

export const deleteChat = async (chatId) => {
  try {
    await deleteDoc(doc(db, 'chats', chatId))
  } catch (error) {
    console.error('Delete chat error:', error)
    throw error
  }
}

export const subscribeToChats = (userId, callback) => {
  const q = query(
    collection(db, 'chats'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(chats)
  }, (error) => {
    console.error('Subscribe to chats error:', error)
    callback([])
  })
}

export { auth, db }
