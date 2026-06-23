import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Upload API: Processing file upload')
    
    const contentType = request.headers.get('content-type') || 'application/octet-stream'
    console.log('[v0] Upload API: Content type:', contentType)
    
    const file = await request.arrayBuffer()
    console.log('[v0] Upload API: File size:', file.byteLength)
    
    if (file.byteLength === 0) {
      console.error('[v0] Upload API: Empty file')
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      )
    }
    
    // Generate unique filename
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    console.log('[v0] Upload API: Generated filename:', filename)
    
    const blob = await put(filename, file, {
      contentType,
      access: 'public',
    })

    console.log('[v0] Upload API: File uploaded successfully:', blob.url)
    
    return NextResponse.json({ url: blob.url, success: true })
  } catch (error) {
    console.error('[v0] Upload API error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
