import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// Initialize email transporter
let transporter: any = null

// Generate random 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email, isSignup } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabase = await createClient()

    // If this is a signup, create a temporary user
    let userId: string | null = null
    if (isSignup) {
      try {
        // Create temporary user with a random password
        const tempPassword = Math.random().toString(36).slice(-12)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
          },
        })

        if (authError) {
          // Email might already exist
          if (authError.message.includes('already')) {
            return NextResponse.json(
              { error: 'This email is already registered. Please log in instead.' },
              { status: 400 }
            )
          }
          throw authError
        }

        userId = authData.user?.id
      } catch (signupError: any) {
        console.error('Signup error:', signupError)
        return NextResponse.json(
          { error: signupError.message || 'Failed to create account' },
          { status: 400 }
        )
      }
    }

    // Generate OTP
    const otp = generateOTP()

    // Store OTP temporarily (in a real app, use Redis or database with expiry)
    const otpData = {
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
    }

    // Send OTP via email
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Your Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; border-radius: 10px;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-bottom: 20px; text-align: center;">Email Verification</h2>
                
                <p style="color: #666; font-size: 16px; margin-bottom: 20px;">
                  Welcome! To complete your account setup, please enter the following verification code:
                </p>
                
                <div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; border: 2px solid #007bff;">
                  <p style="font-size: 32px; font-weight: bold; color: #007bff; margin: 0; letter-spacing: 5px;">
                    ${otp}
                  </p>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-bottom: 10px;">
                  This code will expire in 10 minutes.
                </p>
                
                <p style="color: #999; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  If you didn't request this code, please ignore this email or contact support.
                </p>
                
                <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                  <p>© 2024 Chat App. All rights reserved.</p>
                </div>
              </div>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        // Don't fail completely if email sending fails in development
        console.log(`[DEV] OTP for ${email}: ${otp}`)
      }
    } else {
      // Log OTP to console for development/testing
      console.log(`[DEV] OTP for ${email}: ${otp}`)
    }

    // Store OTP in database for verification
    try {
      const { error: dbError } = await supabase
        .from('verification_otp')
        .insert({
          email,
          otp,
          expires_at: otpData.expiresAt.toISOString(),
        })

      if (dbError) {
        console.error('Database error:', dbError)
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      email: email,
    })
  } catch (error) {
    console.error('Error in send-otp:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
