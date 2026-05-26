import { db } from '@/lib/db/client';
import { employees, type Employee, type NewEmployee } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function listEmployees(opts: { includeInactive?: boolean } = {}): Promise<Employee[]> {
  const rows = opts.includeInactive
    ? await db.select().from(employees).orderBy(desc(employees.isActive), employees.lastName)
    : await db
        .select()
        .from(employees)
        .where(eq(employees.isActive, true))
        .orderBy(employees.lastName);
  return rows;
}

export async function getEmployee(id: number): Promise<Employee | undefined> {
  const [row] = await db.select().from(employees).where(eq(employees.id, id));
  return row;
}

export async function createEmployee(data: NewEmployee): Promise<Employee> {
  const [row] = await db.insert(employees).values(data).returning();
  return row;
}

export async function updateEmployee(
  id: number,
  data: Partial<NewEmployee>,
): Promise<Employee | undefined> {
  const [row] = await db.update(employees).set(data).where(eq(employees.id, id)).returning();
  return row;
}

export async function softDeleteEmployee(id: number): Promise<void> {
  await db.update(employees).set({ isActive: false }).where(eq(employees.id, id));
}

export async function reactivateEmployee(id: number): Promise<void> {
  await db.update(employees).set({ isActive: true }).where(eq(employees.id, id));
}

export async function listActiveEmployeesForPayroll(): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(and(eq(employees.isActive, true)))
    .orderBy(employees.lastName);
}
