import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'awake', 
    timestamp: new Date().toISOString() 
  });
}
