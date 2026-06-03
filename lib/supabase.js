import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://smtawqjwejkyptebrvur.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtdGF3cWp3ZWpreXB0ZWJydnVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQ1NDk2NywiZXhwIjoyMDk2MDMwOTY3fQ.2LZ9Pm8hsWvnvf9KpAv5z3xAJgwF-KYgCEpKCwTMW4k'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth functions
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const onAuthChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null)
  })
}

export const getCurrentUser = () => supabase.auth.getUser()

// Chat functions
export const saveChat = async (userId, chatData) => {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      user_id: userId,
      title: chatData.title,
      messages: chatData.messages,
      model: chatData.model,
      mode: chatData.mode,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const updateChat = async (chatId, chatData) => {
  const { data, error } = await supabase
    .from('chats')
    .update({
      messages: chatData.messages,
      title: chatData.title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chatId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export const deleteChat = async (chatId) => {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
  
  if (error) throw error
}

export const loadChats = async (userId) => {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return data.map(chat => ({
    id: chat.id,
    userId: chat.user_id,
    title: chat.title,
    messages: chat.messages || [],
    model: chat.model,
    mode: chat.mode,
    createdAt: chat.created_at,
    updatedAt: chat.updated_at,
  }))
}

// R2 Image upload function
export const uploadImageToR2 = async (imageBlob, chatId, filename) => {
  const formData = new FormData()
  formData.append('file', imageBlob, filename)
  formData.append('chatId', chatId)
  
  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }
  
  const data = await response.json()
  return data.url
}
