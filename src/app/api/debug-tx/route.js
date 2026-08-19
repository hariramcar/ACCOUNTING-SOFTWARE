import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const t = await prisma.transaction.findMany({
    where: { account: { type: 'STAFF' } }
  });
  return NextResponse.json(t);
}
