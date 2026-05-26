import { db } from '@/lib/db/client';
import { users, type User } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { Role } from '@/lib/auth';

export async function listUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.isActive), users.email);
}

export async function createUser(email: string, role: Role): Promise<User> {
  const [row] = await db.insert(users).values({ email: email.toLowerCase(), role }).returning();
  return row;
}

export async function updateUserRole(id: number, role: Role): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function setUserActive(id: number, isActive: boolean): Promise<void> {
  await db.update(users).set({ isActive }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
