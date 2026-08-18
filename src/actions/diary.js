'use server';

import { getSession } from '@/lib/session';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDiaryNote() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { diaryNote: true }
    });

    return { success: true, diaryNote: user?.diaryNote || '' };
  } catch (error) {
    console.error('Failed to fetch diary note:', error);
    return { success: false, error: 'Failed to fetch diary note.' };
  }
}

export async function saveDiaryNote(content) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { diaryNote: content }
    });

    revalidatePath('/expenses');
    return { success: true };
  } catch (error) {
    console.error('Failed to save diary note:', error);
    return { success: false, error: 'Failed to save diary note.' };
  }
}
