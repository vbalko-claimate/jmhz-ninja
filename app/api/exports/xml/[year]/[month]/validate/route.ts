import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { buildJmhzXml, validateEmployeeForJmhz } from '@/lib/exports/xml-jmhz';
import { validateJmhzXml } from '@/lib/exports/jmhz-validator';
import { handleApiError, notFound } from '@/lib/api-errors';
import { recordValidation } from '@/lib/repos/payroll';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
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
        { error: 'NO_RECORDS', detail: 'Pro období neexistují payroll záznamy.' },
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
      await recordValidation(data.period.id, false, { missing });
      revalidatePath('/exports');
      return NextResponse.json({ ok: false, missing }, { status: 422 });
    }

    const xml = buildJmhzXml(data);
    const validation = await validateJmhzXml(xml, { env: 'test' });

    await recordValidation(
      data.period.id,
      validation.ok,
      validation.ok ? [] : validation.errors,
    );
    revalidatePath('/exports');
    revalidatePath(`/payroll/${year}/${String(month).padStart(2, '0')}/submit`);

    return NextResponse.json({
      ok: validation.ok,
      durationMs: validation.durationMs,
      errors: validation.ok ? [] : validation.errors,
      xmlSize: xml.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
