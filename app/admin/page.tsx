import Link from "next/link";
import { isAuthed, login, logout, getAdminData } from "./actions";
import { hasServiceRole } from "@/lib/supabase";
import AdminPanel from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const passwordSet = Boolean(process.env.ADMIN_PASSWORD);
  const authed = passwordSet && (await isAuthed());

  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Админка</h1>
          <p className="mt-0.5 text-xs text-muted">Ввод данных дашборда</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted">
          <Link href="/" className="hover:text-accent">
            ← Дашборд
          </Link>
          {authed && (
            <form action={logout}>
              <button type="submit" className="hover:text-accent">
                Выйти
              </button>
            </form>
          )}
        </div>
      </header>

      {!passwordSet && (
        <div className="rounded-lg border border-border bg-panel p-5 text-sm text-muted">
          Админка не настроена. Задайте переменную окружения{" "}
          <code className="text-foreground">ADMIN_PASSWORD</code> (локально в{" "}
          <code className="text-foreground">.env.local</code> и в настройках проекта на
          Vercel), затем перезапустите.
        </div>
      )}

      {passwordSet && !authed && (
        <form
          action={login}
          className="flex max-w-sm flex-col gap-3 rounded-lg border border-border bg-panel p-5"
        >
          <label className="text-xs text-muted">Пароль администратора</label>
          <input
            type="password"
            name="password"
            autoFocus
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          />
          {error === "bad" && <p className="text-xs text-neg">Неверный пароль</p>}
          {error === "unconfigured" && (
            <p className="text-xs text-neg">ADMIN_PASSWORD не задан</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Войти
          </button>
        </form>
      )}

      {authed && !hasServiceRole() && (
        <div className="rounded-lg border border-border bg-panel p-5 text-sm text-muted">
          БД не подключена. Задайте{" "}
          <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> и{" "}
          <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code> — тогда формы
          заработают. Сейчас данные дашборда берутся из статического файла{" "}
          <code className="text-foreground">data/competition.ts</code>.
        </div>
      )}

      {authed && hasServiceRole() && <AdminPanel data={await getAdminData()} />}
    </main>
  );
}
