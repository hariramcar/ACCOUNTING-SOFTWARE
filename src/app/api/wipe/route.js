import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Delete in reverse relational order to avoid foreign key constraints
    await prisma.transaction.deleteMany({});
    await prisma.partnership.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.account.deleteMany({});
    
    // Delete all users EXCEPT the admin
    await prisma.user.deleteMany({
      where: {
        username: {
          not: 'admin@hariramcars.com'
        }
      }
    });
    
    return NextResponse.json({ success: true, message: 'All transactional data and other users wiped.' });
  } catch (error) {
    console.error('Wipe failed:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
