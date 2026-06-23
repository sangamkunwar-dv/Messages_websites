import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a dummy client for build time - real client needed at runtime
    return createBrowserClient(
      url || 'https://placeholder.supabase.co',
      key || 'placeholder_key'
    )
  }

  return createBrowserClient(url, key)
}
