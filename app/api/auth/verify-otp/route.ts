import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check OTP in database
    const { data: otpRecord, error: queryError } = await supabase
      .from('verification_otp')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (queryError || !otpRecord) {
      return NextResponse.json(
        { error: 'No verification code found' },
        { status: 400 }
      )
    }

    // Check if OTP is expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      )
    }

    // Check if OTP matches (allow test OTP in development)
    const isTestOTP = otp === '123456' && process.env.NODE_ENV === 'development'
    
    if (otpRecord.otp !== otp && !isTestOTP) {
      // Increment attempts
      await supabase
        .from('verification_otp')
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq('id', otpRecord.id)

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // OTP is valid, verify the user email
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User session not found' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await supabase
      .from('verification_otp')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', otpRecord.id)

    // Create user profile if doesn't exist
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        const username = user.user_metadata?.username || user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`
        
        await supabase.from('users').insert({
          id: user.id,
          email: user.email || '',
          username: username,
          avatar_url: user.user_metadata?.avatar_url,
        })
      }
    } catch (profileError) {
      console.error('Error creating user profile:', profileError)
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Error in verify-otp:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
