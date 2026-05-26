import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { payrollToPdfBuffer } from '@/lib/exports/pdf';
import { handleApiError, notFound } from '@/lib/api-errors';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  try {
    await requireRole(['admin', 'user', 'viewer']);
    const { year, month } = await params;
    const data = await loadPayrollForExport(Number(year), Number(month));
    if (!data) return notFound();
    const pdf = await payrollToPdfBuffer(data);
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payroll-${year}-${month}.pdf"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
