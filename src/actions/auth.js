'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function login(formData) {
  const username = formData.get('username');
  const password = formData.get('password');

  if (!username || !password) {
    return { success: false, error: 'Username and password are required' };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }

    await createSession(user);
    
    // Redirect based on role
    if (user.role === 'ADMIN') {
      redirect('/profit');
    } else {
      redirect('/inventory');
    }
    
  } catch (error) {
    if (error.message === 'NEXT_REDIRECT') {
      throw error;
    }
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

