import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ybcjkdcdruquqrdahtga.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3OTM4MzUsImV4cCI6MjA3MjM2OTgzNX0.L3JFxQNewOY-WWOyF_JJpyL-r8LW5rKAg52fiLcku8w'

// Cross-platform storage adapter
const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    // 웹 환경에서는 AsyncStorage 사용
    return {
      getItem: async (key: string) => {
        return await AsyncStorage.getItem(key)
      },
      setItem: async (key: string, value: string) => {
        await AsyncStorage.setItem(key, value)
      },
      removeItem: async (key: string) => {
        await AsyncStorage.removeItem(key)
      },
    }
  } else {
    // 네이티브 환경에서는 SecureStore 사용
    const SecureStore = require('expo-secure-store')
    return {
      getItem: async (key: string) => {
        return await SecureStore.getItemAsync(key)
      },
      setItem: async (key: string, value: string) => {
        await SecureStore.setItemAsync(key, value)
      },
      removeItem: async (key: string) => {
        await SecureStore.deleteItemAsync(key)
      },
    }
  }
}

const storageAdapter = createStorageAdapter()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})