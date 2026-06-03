import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore'

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
    console.log('Saving chat to Firestore:', { userId, chatId: chatData.id, title: chatData.title, messages: chatData.messages?.length })
    const chatRef = await addDoc(collection(db, 'chats'), {
      userId,
      title: chatData.title,
      messages: chatData.messages || [],
      model: chatData.model,
      mode: chatData.mode,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('Chat saved with ID:', chatRef.id)
    return chatRef.id
  } catch (error) {
    console.error('Save chat error:', error.message, error.code)
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

export const loadChats = async (userId) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('userId', '==', userId)
    )
    const snapshot = await getDocs(q)
    const chats = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id, // Use Firestore doc ID as the chat ID
        title: data.title || 'Chat',
        messages: data.messages || [],
        model: data.model || 'deepseek-v3.2',
        mode: data.mode || 'chat',
        userId: data.userId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        savedToFirestore: true, // Mark as already saved
      }
    })
    // Sort by updatedAt
    chats.sort((a, b) => {
      const aTime = a.updatedAt?.seconds || 0
      const bTime = b.updatedAt?.seconds || 0
      return bTime - aTime
    })
    console.log('Loaded chats from Firestore:', chats.length)
    return chats
  } catch (error) {
    console.error('Load chats error:', error)
    return []
  }
}

export const subscribeToChats = (userId, callback) => {
  // Deprecated - use loadChats instead for simplicity
  return loadChats(userId).then(callback)
}

export { auth, db }
