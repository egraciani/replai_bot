import { redirect } from "next/navigation";
import Link from "next/link";

const DEMO_LINK = "https://t.me/autoreplai_bot";

// Pricing page temporarily hidden — redirect to home
export default function PreciosPage() {
  redirect("/");
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const plans = [
  {
    name: "Free",
    price: "0",
    description: "Para probar autoreplai con tu negocio.",
    features: [
      "1 negocio conectado",
      "50 respuestas / mes",
      "Respuestas con IA",
      "Gestión desde Telegram",
      "Aprobación manual",
    ],
    cta: "Empezar gratis",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29",
    description: "Para negocios que quieren responder a todo.",
    features: [
      "5 negocios conectados",
      "500 respuestas / mes",
      "Respuestas con IA",
      "Gestión desde Telegram",
      "Aprobación manual",
      "Soporte prioritario",
    ],
    cta: "Empezar con Pro",
    href: "/register",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "99",
    description: "Para agencias y franquicias.",
    features: [
      "50 negocios conectados",
      "Respuestas ilimitadas",
      "Respuestas con IA",
      "Gestión desde Telegram",
      "Aprobación manual",
      "Soporte dedicado",
      "Acceso API",
    ],
    cta: "Contactar ventas",
    href: "mailto:hola@autoreplai.com",
    highlighted: false,
  },
];

function _PreciosPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-gray-900">
            autoreplai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/precios"
              className="text-sm font-medium text-gray-900"
            >
              Precios
            </Link>
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 transition hover:text-gray-900"
            >
              Demo
            </a>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-32 pb-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Precios simples, sin sorpresas
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Empieza gratis. Escala cuando lo necesites.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-brand-600 bg-white shadow-xl ring-1 ring-brand-600"
                  : "border-gray-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 text-xs font-semibold text-white">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-gray-900">
                  {plan.price}&euro;
                </span>
                <span className="text-sm text-gray-500"> / mes</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={plan.href}
                className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700"
                    : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ link */}
      <section className="border-t border-gray-200 bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-gray-500">
            ¿Tienes dudas?{" "}
            <Link href="/#faq" className="font-medium text-brand-600 hover:text-brand-700">
              Consulta las preguntas frecuentes
            </Link>{" "}
            o escríbenos a{" "}
            <a
              href="mailto:hola@autoreplai.com"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              hola@autoreplai.com
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            autoreplai
          </Link>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/precios" className="transition hover:text-gray-600">
              Precios
            </Link>
            <Link href="/register" className="transition hover:text-gray-600">
              Crear cuenta
            </Link>
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-gray-600"
            >
              Demo
            </a>
            <a
              href="mailto:hola@autoreplai.com"
              className="transition hover:text-gray-600"
            >
              Contacto
            </a>
          </div>
          <p className="text-xs text-gray-300">
            &copy; {new Date().getFullYear()} autoreplai
          </p>
        </div>
      </footer>
    </div>
  );
}
