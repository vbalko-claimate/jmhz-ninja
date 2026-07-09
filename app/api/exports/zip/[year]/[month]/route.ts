import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { validateEmployeeForJmhz } from '@/lib/exports/xml-jmhz';
import { buildJmhzZip } from '@/lib/exports/zip';
import { handleApiError, notFound } from '@/lib/api-errors';
import { markGenerated } from '@/lib/repos/payroll';
import { NextResponse } from 'next/server';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  try {
    await requireRole(['admin', 'user']);
    const { year, month } = await params;
    const data = await loadPayrollForExport(Number(year), Number(month));
    if (!data) return notFound();

    if (data.rows.length === 0) {
      return NextResponse.json(
        { error: 'NO_RECORDS', detail: 'Payroll pro tento měsíc neexistuje.' },
        { status: 400 },
      );
    }

    const missing: Array<{ name: string; errors: string[] }> = [];
    for (const r of data.rows) {
      const errs = validateEmployeeForJmhz({
        csszOic: r.csszOic,
        csszIdPpv: r.csszIdPpv,
        personalId: r.personalId,
      });
      if (errs.length) missing.push({ name: `${r.lastName} ${r.firstName}`, errors: errs });
    }
    if (missing.length > 0) {
      return NextResponse.json({ error: 'MISSING_FIELDS', missing }, { status: 422 });
    }

    const zip = buildJmhzZip(data);
    await markGenerated(data.period.id);

    return new Response(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="JMHZ-${year}-${month}.zip"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
