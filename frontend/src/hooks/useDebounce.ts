import { createSignal, createEffect, onCleanup } from 'solid-js'

export function useDebounce<T>(value: () => T, delay: number): () => T {
  const [debouncedValue, setDebouncedValue] = createSignal<T>(value())
  let timeoutId: number | undefined

  createEffect(() => {
    const currentValue = value()
    
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      setDebouncedValue(() => currentValue)
    }, delay) as unknown as number
  })

  onCleanup(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  })

  return debouncedValue
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  let timeoutId: number | undefined

  return ((...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    
    timeoutId = setTimeout(() => {
      callback(...args)
    }, delay) as unknown as number
  }) as T
}
