import { IconLoader2 } from '@tabler/icons-solidjs'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  center?: boolean
}

export const LoadingState = (props: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const containerClasses = props.center 
    ? 'flex items-center justify-center py-12'
    : 'flex items-center space-x-2'

  return (
    <div class={containerClasses}>
      <IconLoader2 class={`animate-spin text-blue-400 ${sizeClasses[props.size || 'md']}`} />
      {props.message && (
        <span class={`ml-2 text-gray-400 ${textSizeClasses[props.size || 'md']}`}>
          {props.message}
        </span>
      )}
    </div>
  )
}

export const SkeletonCard = () => (
  <div class="bg-[#141415] border border-[#262626] rounded-lg p-6 animate-pulse">
    <div class="flex items-start space-x-4">
      <div class="w-8 h-8 bg-gray-700 rounded-full"></div>
      <div class="flex-1 space-y-3">
        <div class="h-4 bg-gray-700 rounded w-3/4"></div>
        <div class="h-3 bg-gray-700 rounded w-1/2"></div>
        <div class="h-3 bg-gray-700 rounded w-full"></div>
        <div class="flex space-x-2">
          <div class="h-6 bg-gray-700 rounded w-16"></div>
          <div class="h-6 bg-gray-700 rounded w-16"></div>
        </div>
      </div>
    </div>
  </div>
)

export const SkeletonGrid = ({ count = 6 }: { count?: number }) => (
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <div class="space-y-4">
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)
