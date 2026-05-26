import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { payrollToTxt } from '@/lib/exports/txt';
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
    return new Response(payrollToTxt(data), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="payroll-${year}-${month}.txt"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
