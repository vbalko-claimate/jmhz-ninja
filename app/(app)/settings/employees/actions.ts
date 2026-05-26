'use server';

import { requireRole } from '@/lib/auth';
import {
  createEmployee,
  reactivateEmployee,
  softDeleteEmployee,
  updateEmployee,
} from '@/lib/repos/employees';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function parseEmployeeForm(formData: FormData) {
  return {
    firstName: str(formData, 'firstName'),
    lastName: str(formData, 'lastName'),
    personalId: str(formData, 'personalId'),
    defaultGrossReward: str(formData, 'defaultGrossReward') || '0',
    bankAccount: str(formData, 'bankAccount'),
    isTaxDeclarationSigned: bool(formData, 'isTaxDeclarationSigned'),
    csszOic: str(formData, 'csszOic') || null,
    csszIdPpv: str(formData, 'csszIdPpv') || null,
  };
}

export async function createEmployeeAction(formData: FormData) {
  await requireRole(['admin']);
  const data = parseEmployeeForm(formData);
  if (!data.firstName || !data.lastName) {
    throw new Error('Křestní jméno a příjmení jsou povinné.');
  }
  await createEmployee(data);
  revalidatePath('/settings/employees');
}

export async function updateEmployeeAction(id: number, formData: FormData) {
  await requireRole(['admin']);
  const data = parseEmployeeForm(formData);
  await updateEmployee(id, data);
  revalidatePath('/settings/employees');
  redirect('/settings/employees');
}

export async function deleteEmployeeAction(id: number) {
  await requireRole(['admin']);
  await softDeleteEmployee(id);
  revalidatePath('/settings/employees');
}

export async function reactivateEmployeeAction(id: number) {
  await requireRole(['admin']);
  await reactivateEmployee(id);
  revalidatePath('/settings/employees');
}
