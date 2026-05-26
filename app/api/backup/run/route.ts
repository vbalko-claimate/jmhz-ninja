import { requireRole } from '@/lib/auth';
import { handleApiError } from '@/lib/api-errors';
import { runBackupNow } from '@/lib/backup/gdrive';

export const runtime = 'nodejs';

export async function POST() {
  try {
    await requireRole(['admin']);
    const result = await runBackupNow();
    return Response.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
