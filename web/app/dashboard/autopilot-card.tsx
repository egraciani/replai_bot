"use client";

import { useState } from "react";

interface Props {
  businessName: string;
  initialDeepLink: string;
}

export default function AutopilotCard({ businessName, initialDeepLink }: Props) {
  const [deepLink, setDeepLink] = useState(initialDeepLink);
  const [loading, setLoading] = useState(false);

  async function refreshLink() {
    setLoading(true);
    try {
      const res = await fetch("/api/telegram/autopilot-link", { method: "POST" });
      if (!res.ok) throw new Error("Failed to refresh link");
      const data = await res.json();
      setDeepLink(data.deepLink);
    } catch {
      // keep existing link
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Piloto automático</h2>
          <p className="mt-1 text-sm text-gray-500">{businessName}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-yellow-200">
          Pendiente configuración
        </span>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Configura cómo quieres responder tus reseñas de Google en solo 2 minutos a través de Telegram.
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          Abrir en Telegram →
        </a>
        <button
          onClick={refreshLink}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Nuevo enlace"}
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        El enlace caduca en 24 horas. Usa &quot;Nuevo enlace&quot; si necesitas uno nuevo.
      </p>
    </div>
  );
}
