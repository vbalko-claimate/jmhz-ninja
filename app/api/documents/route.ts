import { requireRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-errors';
import { createDocument } from '@/lib/repos/documents';
import { saveBuffer, MAX_SIZE_BYTES, ALLOWED_MIME } from '@/lib/documents/storage';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CATEGORIES = [
  'podklady',
  'oic',
  'vs',
  'mzdove-listy',
  'jmhz-podani',
  'protokol',
  'smlouva',
  'jine',
] as const;

export async function POST(req: Request) {
  try {
    const me = await requireRole(['admin', 'user']);
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'NO_FILE', detail: 'Soubor nebyl odeslán.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'EMPTY', detail: 'Prázdný soubor.' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'TOO_LARGE', detail: `Max ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB.` },
        { status: 413 },
      );
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: 'BAD_TYPE', detail: `Nepodporovaný typ: ${mime}` },
        { status: 415 },
      );
    }

    const categoryRaw = String(form.get('category') ?? 'jine');
    const category = (CATEGORIES as readonly string[]).includes(categoryRaw)
      ? (categoryRaw as (typeof CATEGORIES)[number])
      : 'jine';
    const description = String(form.get('description') ?? '').trim() || null;
    const yearRaw = String(form.get('periodYear') ?? '').trim();
    const monthRaw = String(form.get('periodMonth') ?? '').trim();
    const periodYear = yearRaw ? Number(yearRaw) : null;
    const periodMonth = monthRaw ? Number(monthRaw) : null;

    const buf = Buffer.from(await file.arrayBuffer());
    const storedName = await saveBuffer(file.name, buf);

    const doc = await createDocument({
      filename: file.name,
      storedName,
      mimeType: mime,
      sizeBytes: file.size,
      category,
      description,
      periodYear,
      periodMonth,
      uploadedByUserId: me.id,
      uploadedByEmail: me.email,
    });

    return NextResponse.json({ ok: true, id: doc.id, filename: doc.filename });
  } catch (e) {
    return handleApiError(e);
  }
}
