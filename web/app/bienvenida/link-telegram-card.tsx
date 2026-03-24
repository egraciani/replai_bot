"use client";

import { useState } from "react";

export function LinkTelegramCard() {
  const [code, setCode] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generateCode() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/link-code", { method: "POST" });
      if (!res.ok) throw new Error("Error al generar código");
      const data = await res.json();
      setCode(data.code);
      setDeepLink(data.deepLink);
    } catch {
      setCode(null);
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm text-gray-600">
        Vincula tu cuenta de Telegram para gestionar tus reseñas desde el bot.
      </p>

      {!code ? (
        <button
          onClick={generateCode}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
          )}
          Vincular Telegram
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-gray-900">
              {code}
            </div>
            <button
              onClick={copyCode}
              className="rounded-lg border border-gray-300 p-3 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          <a
            href={deepLink!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#229ED9]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            Abrir en Telegram
          </a>

          <p className="text-xs text-gray-400">
            El código expira en 10 minutos.
          </p>
        </div>
      )}
    </div>
  );
}
