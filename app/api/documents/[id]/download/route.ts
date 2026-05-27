import { requireRole } from '@/lib/auth';
import { handleApiError, notFound } from '@/lib/api-errors';
import { getDocument } from '@/lib/repos/documents';
import { readStored, storedExists } from '@/lib/documents/storage';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(['admin', 'user', 'viewer']);
    const { id } = await params;
    const doc = await getDocument(Number(id));
    if (!doc || !storedExists(doc.storedName)) return notFound();

    const buf = await readStored(doc.storedName);
    const inline = new URL(req.url).searchParams.get('inline') === '1';
    const disposition = inline ? 'inline' : 'attachment';

    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': doc.mimeType,
        'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
        'Content-Length': String(doc.sizeBytes),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
