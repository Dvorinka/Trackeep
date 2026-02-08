import { createSignal, createEffect, onMount } from 'solid-js'
import { isServer } from 'solid-js/web'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serializer?: {
      read: (value: string) => T
      write: (value: T) => string
    }
  }
) {
  const serializer = options?.serializer || {
    read: (v: string) => {
      try {
        return JSON.parse(v)
      } catch {
        return v as T
      }
    },
    write: (v: T) => JSON.stringify(v),
  }

  const [storedValue, setStoredValue] = createSignal<T>(initialValue)

  // Initialize on mount
  onMount(() => {
    if (isServer) return
    
    try {
      const item = localStorage.getItem(key)
      if (item !== null) {
        setStoredValue(() => serializer.read(item))
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
  })

  createEffect(() => {
    if (isServer) return
    
    try {
      const value = storedValue()
      if (value === undefined || value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, serializer.write(value))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  })

  return [storedValue, setStoredValue] as const
}

export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options?: {
    serializer?: {
      read: (value: string) => T
      write: (value: T) => string
    }
  }
) {
  const serializer = options?.serializer || {
    read: (v: string) => {
      try {
        return JSON.parse(v)
      } catch {
        return v as T
      }
    },
    write: (v: T) => JSON.stringify(v),
  }

  const [storedValue, setStoredValue] = createSignal<T>(initialValue)

  // Initialize on mount
  onMount(() => {
    if (isServer) return
    
    try {
      const item = sessionStorage.getItem(key)
      if (item !== null) {
        setStoredValue(() => serializer.read(item))
      }
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
    }
  })

  createEffect(() => {
    if (isServer) return
    
    try {
      const value = storedValue()
      if (value === undefined || value === null) {
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, serializer.write(value))
      }
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error)
    }
  })

  return [storedValue, setStoredValue] as const
}
