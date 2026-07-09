import { requireRole } from '@/lib/auth';
import { loadPayrollForExport } from '@/lib/exports/data';
import { validateEmployeeForJmhz, parseJmhzGuids } from '@/lib/exports/xml-jmhz';
import { buildJmhzZip } from '@/lib/exports/zip';
import { handleApiError, notFound } from '@/lib/api-errors';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Opravné podání: uživatel nahraje původní řádné JMHZ XML, my z něj převezmeme
 * idPodani + idFormulare a s aktuálními (opravenými) daty sestavíme opravné ZIP.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  try {
    await requireRole(['admin', 'user']);
    const { year, month } = await params;

    const form = await req.formData();
    const file = form.get('original');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'NO_FILE', detail: 'Nahrajte původní řádné XML podání.' },
        { status: 400 },
      );
    }

    let correction;
    try {
      correction = parseJmhzGuids(await file.text());
    } catch (e) {
      return NextResponse.json(
        { error: 'BAD_XML', detail: e instanceof Error ? e.message : 'Neplatné XML.' },
        { status: 400 },
      );
    }

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

    const zip = buildJmhzZip(data, correction);

    return new Response(new Uint8Array(zip), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="JMHZ-${year}-${month}-opravne.zip"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
