import { db } from '@/lib/db/client';
import { documents, type Document, type NewDocument } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function listDocuments(): Promise<Document[]> {
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function getDocument(id: number): Promise<Document | undefined> {
  const [row] = await db.select().from(documents).where(eq(documents.id, id));
  return row;
}

export async function createDocument(data: NewDocument): Promise<Document> {
  const [row] = await db.insert(documents).values(data).returning();
  return row;
}

export async function deleteDocument(id: number): Promise<Document | undefined> {
  const [row] = await db.delete(documents).where(eq(documents.id, id)).returning();
  return row;
}
