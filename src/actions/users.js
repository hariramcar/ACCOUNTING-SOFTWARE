'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function createUser(formData) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const name = formData.get('name');
  const username = formData.get('username');
  const password = formData.get('password');
  const role = formData.get('role');

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error('Username already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    let accountId = null;

    if (role === 'STAFF') {
      const account = await tx.account.create({
        data: {
          name,
          type: 'STAFF',
          openingBalance: 0
        }
      });
      accountId = account.id;
    }

    await tx.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role,
        accountId
      }
    });
  });

  revalidatePath('/users');
  revalidatePath('/accounts');
}

export async function deleteUser(formData) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const id = formData.get('id');

  if (id === session.userId) {
    throw new Error('Cannot delete yourself');
  }

  await prisma.user.delete({
    where: { id }
  });

  revalidatePath('/users');
}

export async function updateUser(formData) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const id = formData.get('id');
  const name = formData.get('name');
  const username = formData.get('username');
  const password = formData.get('password');
  const role = formData.get('role');

  const updateData = {
    name,
    username,
    role
  };

  if (password && password.trim() !== '') {
    updateData.password = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({
    where: { id },
    data: updateData
  });

  revalidatePath('/users');
}
