'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function VerifyOTPContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Verification failed')
        setAttempts(prev => prev + 1)
        return
      }

      setSuccess(true)
      setOtp('')

      // Redirect to chat after short delay
      setTimeout(() => {
        router.push('/chat')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setResendLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sendAgain: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend OTP')
      }

      setResendTimer(60)
      setAttempts(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md text-center border border-border">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-2">Email Verified!</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been verified successfully. Redirecting to chat...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-border">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="text-2xl font-bold">Together</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Verify Email</h1>
          <p className="text-muted-foreground text-sm">
            Enter the 6-digit code sent to <br />
            <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="otp" className="block text-sm font-semibold text-foreground">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-foreground placeholder:text-muted-foreground outline-none text-center text-2xl tracking-widest font-mono"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Check your email for the 6-digit code
            </p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {attempts >= 3 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {attempts >= 5 
                  ? 'Too many attempts. Please request a new code.' 
                  : `${5 - attempts} attempt${5 - attempts === 1 ? '' : 's'} remaining`}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || otp.length !== 6 || attempts >= 5}
            className="w-full py-3 font-semibold rounded-xl text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={resendLoading || resendTimer > 0}
            onClick={handleResendOTP}
            className="w-full py-3 rounded-xl transition-all duration-200"
          >
            {resendTimer > 0 
              ? `Resend code in ${resendTimer}s` 
              : resendLoading 
              ? 'Sending...' 
              : 'Resend Code'}
          </Button>
        </div>

        <p className="text-sm text-muted-foreground text-center mt-6">
          Wrong email? <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 w-full max-w-md border border-border text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  )
}
