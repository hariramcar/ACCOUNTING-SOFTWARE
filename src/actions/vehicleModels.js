'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireAuth, requireAdmin } from '@/lib/authGuard';

export async function getVehicleModels() {
  try {
    await requireAuth();
    const models = await prisma.vehicleModel.findMany({
      orderBy: [
        { make: 'asc' },
        { model: 'asc' }
      ]
    });
    return { success: true, data: models };
  } catch (error) {
    console.error('Failed to load vehicle models:', error);
    return { success: false, error: error.message || 'Failed to load vehicle models' };
  }
}

export async function addBrandModels(formData) {
  try {
    await requireAdmin();
    const make = formData.get('make')?.toString().trim();
    const modelsString = formData.get('models')?.toString().trim();

    if (!make || !modelsString) {
      return { success: false, error: 'Brand Name and Models are required' };
    }

    const models = modelsString.split(',').map(m => m.trim()).filter(m => m !== '');

    if (models.length === 0) {
      return { success: false, error: 'At least one valid model is required' };
    }

    await prisma.$transaction(async (tx) => {
      for (const model of models) {
        await tx.vehicleModel.upsert({
          where: { make_model: { make, model } },
          update: {},
          create: { make, model }
        });
      }
    });

    revalidatePath('/users');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to add brand models:', error);
    return { success: false, error: error.message || 'Failed to save brand' };
  }
}

export async function updateBrandModels(formData) {
  try {
    await requireAdmin();
    const oldMake = formData.get('oldMake')?.toString().trim();
    const make = formData.get('make')?.toString().trim();
    const modelsString = formData.get('models')?.toString().trim();

    if (!oldMake || !make || !modelsString) {
      return { success: false, error: 'All fields are required' };
    }

    const models = modelsString.split(',').map(m => m.trim()).filter(m => m !== '');

    if (models.length === 0) {
      return { success: false, error: 'At least one valid model is required' };
    }

    await prisma.$transaction(async (tx) => {
      // Delete all models for this brand
      await tx.vehicleModel.deleteMany({
        where: { make: oldMake }
      });
      // Insert new ones
      for (const model of models) {
        await tx.vehicleModel.create({
          data: { make, model }
        });
      }
    });

    revalidatePath('/users');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to update brand models:', error);
    return { success: false, error: error.message || 'Failed to update brand' };
  }
}

export async function deleteBrand(formData) {
  try {
    await requireAdmin();
    const make = formData.get('make');
    if (!make) return { success: false, error: 'Brand name is required' };

    await prisma.vehicleModel.deleteMany({
      where: { make }
    });

    revalidatePath('/users');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete brand:', error);
    return { success: false, error: error.message || 'Failed to delete brand' };
  }
}
