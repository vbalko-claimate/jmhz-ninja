import { requireRole } from '@/lib/auth';
import { handleApiError, notFound } from '@/lib/api-errors';
import { getEmployee } from '@/lib/repos/employees';
import { db } from '@/lib/db/client';
import { payrollRecords, payrollPeriods } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const employee = await getEmployee(Number(id));
    if (!employee) return notFound();

    const records = await db
      .select({
        record: payrollRecords,
        period: { year: payrollPeriods.year, month: payrollPeriods.month, status: payrollPeriods.status },
      })
      .from(payrollRecords)
      .leftJoin(payrollPeriods, eq(payrollPeriods.id, payrollRecords.periodId))
      .where(eq(payrollRecords.employeeId, employee.id));

    const payload = {
      exportedAt: new Date().toISOString(),
      basis: 'GDPR čl. 15 — právo na přístup k osobním údajům',
      employee,
      payrollHistory: records.map((r) => ({ ...r.record, period: r.period })),
      retentionNote:
        'Účetní záznamy jsou uchovávány dle zákona o účetnictví (§ 31) až 10 let. Hard delete payroll záznamů není možný; deaktivace zaměstnance (isActive=false) skryje záznam v UI.',
    };

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gdpr-employee-${employee.id}.json"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
