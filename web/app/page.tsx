import Link from "next/link";

const DEMO_LINK = "https://t.me/autoreplai_bot";

const features = [
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    title: "Respuestas con IA",
    description:
      "Genera respuestas personalizadas, profesionales y en el tono de tu negocio para cada reseña de Google.",
  },
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
    title: "Directamente en Telegram",
    description:
      "Sin apps extra, sin dashboards complicados. Gestiona todas tus reseñas desde el bot de Telegram que ya conoces.",
  },
  {
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Aprueba con un clic",
    description:
      "Revisa cada respuesta antes de publicarla. Aprueba, edita o rechaza directamente desde el chat.",
  },
];

const testimonials = [
  {
    name: "Carlos Mendoza",
    role: "Dueño de Restaurante La Terraza",
    text: "Antes tardaba horas en responder reseñas. Ahora me llegan al Telegram, apruebo con un toque y listo. Mis clientes notan que les respondo rápido.",
  },
  {
    name: "Laura Sánchez",
    role: "Directora de Clínica Dental Sonríe",
    text: "Las respuestas son increíblemente naturales. Mis pacientes piensan que las escribo yo. Y lo mejor: no necesito otra app más en el móvil.",
  },
  {
    name: "Miguel Torres",
    role: "Gerente de Hotel Boutique Azul",
    text: "Desde que uso autoreplai, nuestra valoración en Google ha subido. Respondemos el 100% de las reseñas en menos de una hora.",
  },
];

const faqs = [
  {
    question: "¿Qué es autoreplai?",
    answer:
      "autoreplai es un servicio que responde automáticamente a las reseñas de Google de tu negocio usando inteligencia artificial. Tú solo apruebas las respuestas desde Telegram.",
  },
  {
    question: "¿Necesito instalar alguna app?",
    answer:
      "No. Todo funciona desde Telegram, una app que probablemente ya tienes instalada. Sin descargas, sin aprender herramientas nuevas.",
  },
  {
    question: "¿Cómo funciona?",
    answer:
      "Conectas tu ficha de Google Business, y cuando llega una reseña nueva, nuestro bot te la envía por Telegram con una respuesta sugerida. Tú decides si aprobarla, editarla o rechazarla.",
  },
  {
    question: "¿Es gratis?",
    answer:
      "Sí, puedes empezar gratis con 1 negocio y 50 respuestas al mes. Sin tarjeta de crédito.",
  },
  {
    question: "¿Puedo editar las respuestas antes de publicarlas?",
    answer:
      "Por supuesto. Cada respuesta pasa por tu aprobación. Puedes aprobarla tal cual, editarla a tu gusto, o rechazarla y pedir una nueva.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-brand-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-white">autoreplai</Link>
          <div className="flex items-center gap-4">
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/70 transition hover:text-white"
            >
              Demo
            </a>
            <Link
              href="/register"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-white/90"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 pt-32 pb-20 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.385-3.042a.562.562 0 010-.978L11.42 8.83a.562.562 0 01.536 0l5.386 3.042a.562.562 0 010 .978l-5.386 3.042a.562.562 0 01-.536 0z" />
            </svg>
            Under construction
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Responde las reseñas de Google de tu negocio con IA
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            Recibe cada reseña nueva en Telegram, genera una respuesta
            profesional con inteligencia artificial y apruébala con un clic. Sin
            apps extra.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-white/90"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              Probar demo gratis
            </a>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Así de simple funciona
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            Conecta tu negocio, recibe reseñas en Telegram y responde con IA.
            Todo en menos de un minuto.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  {f.icon}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Lo que dicen nuestros usuarios
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-xl border border-gray-200 bg-white p-8"
              >
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-600">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-gray-900">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Preguntas frecuentes
          </h2>
          <dl className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border border-gray-200 p-6"
              >
                <dt className="text-base font-semibold text-gray-900">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-gray-500">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 py-20 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Empieza a responder reseñas hoy
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Plan gratuito con 50 respuestas al mes. Sin tarjeta de crédito.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={DEMO_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-white/90"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
              </svg>
              Probar demo gratis
            </a>
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Link href="/" className="text-sm font-semibold text-gray-900">
            autoreplai
          </Link>
          <div className="flex gap-6 text-sm text-gray-400">
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
