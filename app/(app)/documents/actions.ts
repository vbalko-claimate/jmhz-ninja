'use server';

import { requireRole } from '@/lib/auth';
import { deleteDocument } from '@/lib/repos/documents';
import { deleteStored } from '@/lib/documents/storage';
import { revalidatePath } from 'next/cache';

export async function deleteDocumentAction(id: number) {
  await requireRole(['admin']);
  const doc = await deleteDocument(id);
  if (doc) await deleteStored(doc.storedName);
  revalidatePath('/documents');
}
