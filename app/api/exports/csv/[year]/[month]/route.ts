import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { payrollToCsv } from '@/lib/exports/csv';
import { handleApiError, notFound } from '@/lib/api-errors';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  try {
    await requireRole(['admin', 'user', 'viewer']);
    const { year, month } = await params;
    const data = await loadPayrollForExport(Number(year), Number(month));
    if (!data) return notFound();
    const csv = payrollToCsv(data);
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-${year}-${month}.csv"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
