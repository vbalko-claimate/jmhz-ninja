import { requireRole, type Role } from '@/lib/auth';
import {
  createUser,
  deleteUser,
  listUsers,
  setUserActive,
  updateUserRole,
} from '@/lib/repos/users';
import { revalidatePath } from 'next/cache';
import SubmitButton from '@/components/SubmitButton';
import ConfirmSubmitButton from '@/components/ConfirmSubmitButton';

export default async function UsersPage() {
  const me = await requireRole(['admin']);
  const rows = await listUsers();

  async function addAction(formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const role = String(formData.get('role') ?? 'viewer') as Role;
    if (!email) throw new Error('E-mail je povinný.');
    await createUser(email, role);
    revalidatePath('/settings/users');
  }

  async function roleAction(id: number, formData: FormData) {
    'use server';
    await requireRole(['admin']);
    const role = String(formData.get('role') ?? 'viewer') as Role;
    await updateUserRole(id, role);
    revalidatePath('/settings/users');
  }

  async function toggleActiveAction(id: number, active: boolean) {
    'use server';
    await requireRole(['admin']);
    await setUserActive(id, active);
    revalidatePath('/settings/users');
  }

  async function deleteAction(id: number) {
    'use server';
    await requireRole(['admin']);
    await deleteUser(id);
    revalidatePath('/settings/users');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Uživatelé</h1>
        <p className="text-sm text-slate-500">
          Just-in-time provisioning: stačí e-mail + role. Při prvním Google loginu se účet aktivuje.
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">E-mail</th>
              <th className="px-3 py-2">Jméno</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Aktivní</th>
              <th className="px-3 py-2">Poslední login</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const isMe = u.id === me.id;
              return (
                <tr key={u.id} className={`border-t border-slate-100 ${u.isActive ? '' : 'opacity-50'}`}>
                  <td className="px-3 py-2 font-mono text-xs">{u.email}{isMe && ' (vy)'}</td>
                  <td className="px-3 py-2">{u.name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <form
                      action={async (fd: FormData) => {
                        'use server';
                        await roleAction(u.id, fd);
                      }}
                    >
                      <select
                        name="role"
                        defaultValue={u.role}
                        disabled={isMe}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="admin">admin</option>
                        <option value="user">user</option>
                        <option value="viewer">viewer</option>
                      </select>
                      {!isMe && (
                        <SubmitButton variant="secondary" size="sm" className="ml-1" pendingLabel="…">
                          Uložit
                        </SubmitButton>
                      )}
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    {u.isActive ? (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                        ano
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        ne
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('cs-CZ') : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!isMe && (
                      <div className="flex justify-end gap-2">
                        <form
                          action={async () => {
                            'use server';
                            await toggleActiveAction(u.id, !u.isActive);
                          }}
                        >
                          <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                            {u.isActive ? 'Deaktivovat' : 'Aktivovat'}
                          </SubmitButton>
                        </form>
                        <form
                          action={async () => {
                            'use server';
                            await deleteAction(u.id);
                          }}
                        >
                          <ConfirmSubmitButton
                            confirm={`Smazat uživatele ${u.email}? Nelze zpět vrátit.`}
                          >
                            Smazat
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Přidat uživatele</h2>
        <form action={addAction} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
          <input
            type="email"
            name="email"
            required
            placeholder="jane@example.com"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            name="role"
            defaultValue="viewer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="admin">admin</option>
            <option value="user">user</option>
            <option value="viewer">viewer</option>
          </select>
          <SubmitButton pendingLabel="Přidávám…">Přidat</SubmitButton>
        </form>
      </section>
    </div>
  );
}
