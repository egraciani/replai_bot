"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Location {
  accountId: string;
  accountName: string;
  locationId: string;
  locationName: string;
  address: string;
}

export default function SelectBusinessPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/google-business/locations")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error al cargar negocios");
        }
        return res.json();
      })
      .then((data) => setLocations(data.locations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(loc: Location) {
    setSelecting(loc.locationId);
    try {
      const res = await fetch("/api/google-business/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: loc.accountId,
          locationId: loc.locationId,
          locationName: loc.locationName,
          address: loc.address,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar negocio");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSelecting(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Selecciona tu negocio
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Elige el negocio de Google Business que quieres conectar con
          autoreplai.
        </p>

        <div className="mt-8 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-600" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && locations.length === 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
              No se encontraron negocios en tu cuenta de Google Business.
              Asegúrate de tener al menos una ficha creada.
            </div>
          )}

          {locations.map((loc) => (
            <button
              key={loc.locationId}
              onClick={() => handleSelect(loc)}
              disabled={selecting !== null}
              className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-500 hover:shadow-md disabled:opacity-50"
            >
              <p className="font-semibold text-gray-900">{loc.locationName}</p>
              {loc.address && (
                <p className="mt-1 text-sm text-gray-500">{loc.address}</p>
              )}
              {selecting === loc.locationId && (
                <p className="mt-2 text-xs text-brand-600">Conectando...</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
