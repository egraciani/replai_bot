"use client";

import { useState } from "react";

type ServiceTier = "manual" | "manager" | "automated";

interface ValidatedBusiness {
  placeId: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

type Step = "select_tier" | "enter_url" | "confirm_business" | "done";

const TIERS: Array<{
  id: ServiceTier;
  label: string;
  price: string;
  description: string;
  disabled: boolean;
}> = [
  {
    id: "manual",
    label: "Manual",
    price: "Gratis",
    description:
      "Detectamos nuevas reseñas y te enviamos una respuesta sugerida por Telegram. Tú la copias y pegas en Google Maps.",
    disabled: false,
  },
  {
    id: "manager",
    label: "Manager",
    price: "$29/mes",
    description:
      "Nuestro equipo publica las respuestas por ti en Google Maps. Solo tienes que añadirnos como administrador.",
    disabled: false,
  },
  {
    id: "automated",
    label: "Automático",
    price: "Próximamente",
    description:
      "Respuestas publicadas automáticamente sin intervención. Requiere conexión directa con Google Business Profile API.",
    disabled: true,
  },
];

export default function TierSelector({ userName }: { userName: string }) {
  const [step, setStep] = useState<Step>("select_tier");
  const [selectedTier, setSelectedTier] = useState<ServiceTier | null>(null);
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<ValidatedBusiness | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);

  async function handleValidate() {
    if (!url.trim()) return;
    setValidating(true);
    setError(null);

    try {
      const res = await fetch("/api/business/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo validar el negocio");
        return;
      }

      const data = await res.json();
      setBusiness(data);
      setStep("confirm_business");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setValidating(false);
    }
  }

  async function handleCreate() {
    if (!business || !selectedTier) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/business/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: business.placeId,
          name: business.name,
          address: business.address,
          rating: business.rating,
          reviewCount: business.reviewCount,
          serviceTier: selectedTier,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo crear el negocio");
        return;
      }

      const data = await res.json();
      setDeepLink(data.deepLink);
      setStep("done");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
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
          Te damos la bienvenida, {userName}
        </h1>
        <p className="mt-3 text-gray-500">
          Configura tu negocio en 3 pasos simples.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["Servicio", "Negocio", "Telegram"].map((label, i) => {
          const stepIndex = ["select_tier", "enter_url", "done"].indexOf(step);
          const active = i <= (step === "confirm_business" ? 1 : stepIndex);
          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  active ? "text-gray-900 font-medium" : "text-gray-400"
                }`}
              >
                {label}
              </span>
              {i < 2 && (
                <div
                  className={`h-px w-8 ${
                    active ? "bg-brand-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Tier selector */}
      {step === "select_tier" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 text-center">
            Elige tu tipo de servicio
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {TIERS.map((tier) => (
              <button
                key={tier.id}
                disabled={tier.disabled}
                onClick={() => {
                  setSelectedTier(tier.id);
                  setStep("enter_url");
                }}
                className={`rounded-xl border-2 p-5 text-left transition ${
                  tier.disabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                    : "border-gray-200 bg-white hover:border-brand-500 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-gray-900">
                    {tier.label}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      tier.disabled ? "text-gray-400" : "text-brand-600"
                    }`}
                  >
                    {tier.price}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{tier.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Business URL input */}
      {step === "enter_url" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <button
            onClick={() => setStep("select_tier")}
            className="text-sm text-brand-600 hover:text-brand-700 mb-4"
          >
            &larr; Cambiar servicio
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            Busca tu negocio
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Pega el enlace de Google Maps de tu negocio, o escribe su nombre.
          </p>
          <div className="mt-4 flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              placeholder="https://maps.google.com/... o nombre del negocio"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={handleValidate}
              disabled={validating || !url.trim()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
            >
              {validating ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      )}

      {/* Step 2b: Confirm business */}
      {step === "confirm_business" && business && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <button
            onClick={() => {
              setStep("enter_url");
              setBusiness(null);
            }}
            className="text-sm text-brand-600 hover:text-brand-700 mb-4"
          >
            &larr; Buscar otro negocio
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            Confirma tu negocio
          </h2>
          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="font-medium text-gray-900">{business.name}</p>
            <p className="mt-1 text-sm text-gray-500">{business.address}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <span>{"⭐".repeat(Math.round(business.rating))}</span>
              <span>{business.rating.toFixed(1)}</span>
              <span className="text-gray-400">
                ({business.reviewCount} reseñas)
              </span>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? "Creando..." : "Confirmar y continuar"}
          </button>
        </div>
      )}

      {/* Step 3: Done — tier-specific instructions + deep link */}
      {step === "done" && deepLink && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
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
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            Negocio creado
          </h2>

          {selectedTier === "manual" && (
            <p className="mt-2 text-sm text-gray-500">
              Te enviaremos respuestas sugeridas por Telegram cada vez que
              detectemos una nueva reseña. Solo tendrás que copiarlas y pegarlas
              en Google Maps.
            </p>
          )}
          {selectedTier === "manager" && (
            <div className="mt-2 space-y-2 text-sm text-gray-500 text-left">
              <p>
                Nuestro equipo publicará las respuestas por ti. Para que podamos
                hacerlo, añade este correo como administrador de tu perfil de
                Google Business:
              </p>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center font-mono text-sm text-blue-700">
                info@autoreplai.com
              </div>
              <p className="text-xs text-gray-400">
                Ve a business.google.com → Usuarios → Añadir usuario →
                Administrador
              </p>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Ahora configura cómo quieres que suenen tus respuestas en Telegram:
          </p>

          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#229ED9]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
            </svg>
            Abrir en Telegram
          </a>

          <p className="mt-3 text-xs text-gray-400">
            El enlace caduca en 24 horas.
          </p>
        </div>
      )}
    </div>
  );
}
