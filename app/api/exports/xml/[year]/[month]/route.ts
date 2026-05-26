import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { buildJmhzXml, validateEmployeeForJmhz } from '@/lib/exports/xml-jmhz';
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

    const xml = buildJmhzXml(data);
    await markGenerated(data.period.id);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="JMHZ-${year}-${month}.xml"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
