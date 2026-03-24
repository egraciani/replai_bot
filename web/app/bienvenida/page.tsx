import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LinkTelegramCard } from "./link-telegram-card";

export default async function BienvenidoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/register");
  }

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "usuario";

  // Check if already linked
  const { data: link } = await supabase
    .from("telegram_links")
    .select("telegram_username")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
          Te damos la bienvenida, {name}
        </h1>
        <p className="mt-3 text-gray-500">
          Tu cuenta ha sido creada exitosamente. Ya puedes empezar a usar
          autoreplai.
        </p>

        <div className="mt-10 rounded-lg border border-gray-200 bg-white p-6 text-left shadow-sm">
          <h2 className="font-semibold text-gray-900">Próximos pasos</h2>

          {link ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              Telegram vinculado
              {link.telegram_username && (
                <span className="font-medium">
                  {" "}
                  (@{link.telegram_username})
                </span>
              )}
            </div>
          ) : (
            <LinkTelegramCard />
          )}

          <div className="mt-6">
            <a
              href="/api/google-business/connect"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Conectar Google Business
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
