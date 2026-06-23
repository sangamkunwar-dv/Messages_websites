import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Calls API: Processing request')
    
    const supabase = await createClient()
    const body = await request.json()
    console.log('[v0] Calls API: Body received', { conversationId: body.conversationId, callType: body.callType })
    
    const { conversationId, callType } = body

    if (!conversationId || !callType) {
      console.error('[v0] Calls API: Missing parameters')
      return NextResponse.json({ error: 'Missing conversationId or callType' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('[v0] Calls API: User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[v0] Calls API: Creating call message for user', user.id)

    // Create call message
    const { data: callMessage, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_type: 'call',
        content: `Started a ${callType} call`,
      })
      .select()
      .single()

    if (error) {
      console.error('[v0] Calls API: Database error', error)
      throw error
    }

    if (!callMessage) {
      console.error('[v0] Calls API: No message returned')
      return NextResponse.json({ error: 'Failed to create call message' }, { status: 500 })
    }

    // Generate a unique call room ID
    const callRoomId = `${conversationId}-${Date.now()}`

    console.log('[v0] Calls API: Call started successfully', { roomId: callRoomId })

    return NextResponse.json({
      callId: callMessage.id,
      roomId: callRoomId,
      callType,
      success: true,
    })
  } catch (error) {
    console.error('[v0] Call API error:', error)
    return NextResponse.json(
      { error: 'Failed to start call', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
