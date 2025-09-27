import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { orderId } = params
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001'
    
    const response = await fetch(`${backendUrl}/api/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}