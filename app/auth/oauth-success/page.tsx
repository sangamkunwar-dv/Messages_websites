'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// 1. Move the search params logic into its own inner component
function OAuthSuccessContent() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = searchParams.get('redirect') || '/chat'
    // Small delay to ensure session is properly set
    const timer = setTimeout(() => {
      window.location.href = redirect
    }, 500)

    return () => clearTimeout(timer) // Cleanup timer on unmount
  }, [searchParams])

  return (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-muted-foreground">Completing sign in...</p>
    </div>
  )
}

// 2. Wrap the inner component with Suspense in the main page export
export default function OAuthSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Suspense
        fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading authentication...</p>
          </div>
        }
      >
        <OAuthSuccessContent />
      </Suspense>
    </div>
  )
}