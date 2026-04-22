import Link from "next/link";
import Image from "next/image";
import TypedTagline from "./components/TypedTagline";


const steps = [
  {
    number: "01",
    title: "Conecta tu ficha de Google",
    description: "Dos minutos y listo. Sin tecnicismos, sin llamadas de soporte, sin líos.",
  },
  {
    number: "02",
    title: "Llega una reseña. La IA responde.",
    description: "Generamos una respuesta en tu tono antes de que tú hayas podido leerla.",
  },
  {
    number: "03",
    title: "Tú revisas desde Telegram",
    description: "Un vistazo, un toque y publicado. O activa el autopiloto y olvídate del todo.",
  },
];


const faqs = [
  {
    question: "¿Qué es autoreplai?",
    answer:
      "Un servicio que genera respuestas a tus reseñas de Google usando IA y las publica por ti. Tú te ocupas de tu negocio, nosotros de tu reputación online.",
  },
  {
    question: "¿Cuál es la diferencia entre Manual y Manager?",
    answer:
      "En el plan Manual te enviamos la respuesta por Telegram y tú la copias y pegas en Google. En el plan Manager la publicamos nosotros directamente — solo tienes que añadirnos como administrador de tu ficha de Google Business.",
  },
  {
    question: "¿Necesito instalar alguna app?",
    answer:
      "No. Todo funciona desde Telegram, que probablemente ya tienes en el móvil. Sin descargas, sin dashboards, sin aprender nada nuevo.",
  },
  {
    question: "¿Las respuestas suenan naturales?",
    answer:
      "Sí. Durante el registro configuras el tono de tu negocio y la IA lo aplica en cada respuesta. Tus clientes no notarán la diferencia.",
  },
  {
    question: "¿Qué pasa si una respuesta no me convence?",
    answer:
      "En el plan Manual decides tú qué publicar. En el plan Manager puedes avisarnos antes de que publiquemos y la ajustamos.",
  },
  {
    question: "¿Es gratis empezar?",
    answer:
      "El plan Manual es gratis, sin tarjeta de crédito. El plan Manager tiene 7 días de prueba gratuita.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F9F5EB", fontFamily: "var(--font-sans)" }}>

      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-black/5 bg-cream/90 backdrop-blur-md" style={{ backgroundColor: "rgba(249,245,235,0.92)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Image src="/logo.png" alt="autoreplai" height={56} width={280} className="h-10 w-auto sm:h-14" priority />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              style={{ backgroundColor: "#2D5A27" }}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-0 px-6" style={{ backgroundColor: "#F9F5EB" }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* Left: copy */}
            <div className="flex-1 text-center lg:text-left">
              <h1
                className="text-5xl font-extrabold tracking-tight leading-tight sm:text-6xl"
                style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}
              >
                Tú <TypedTagline />.<br />
                Nosotros respondemos.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed" style={{ color: "#1A2B3Ccc" }}>
                Respondemos las reseñas de Google de tu negocio con IA, directamente desde Telegram.
                Sin apps extra. Sin complicaciones.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:items-start lg:justify-start">
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg px-7 py-3.5 text-base font-semibold text-white shadow-md transition hover:opacity-90"
                  style={{ backgroundColor: "#2D5A27" }}
                >
                  Empezar gratis — sin tarjeta
                </Link>
              </div>
            </div>

            {/* Right: illustration */}
            <div className="flex-1 flex items-end justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/hero.png"
                alt="Empresario gestionando reseñas con autoreplai"
                className="w-full h-auto max-w-lg"
                style={{ display: "block" }}
              />
            </div>

          </div>
        </div>
      </section>


      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}
          >
            Así de simple
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-center" style={{ color: "#1A2B3Ccc" }}>
            Tres pasos y tu negocio responde reseñas en automático.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col gap-4">
                <span
                  className="text-5xl font-extrabold"
                  style={{ color: "#2D5A2720", fontFamily: "var(--font-heading)" }}
                >
                  {step.number}
                </span>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}
                >
                  {step.title}
                </h3>
                <p className="text-base leading-relaxed" style={{ color: "#1A2B3Ccc" }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24" style={{ backgroundColor: "#F9F5EB" }}>
        <div className="mx-auto max-w-6xl px-6">
          <h2
            className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}
          >
            Elige cómo quieres trabajar
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-center" style={{ color: "#1A2B3Ccc" }}>
            Empieza gratis. Sin tarjeta de crédito.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-3">

            {/* Manual */}
            <div className="rounded-2xl border bg-white p-8" style={{ borderColor: "#1A2B3C10" }}>
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#2D5A27" }}>Manual</p>
              <p className="mt-2 text-3xl font-extrabold" style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}>Gratis</p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "#1A2B3Ccc" }}>
                Te enviamos una respuesta sugerida por Telegram. Tú la copias y la publicas cuando quieras.
              </p>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#2D5A27", color: "white" }}
              >
                Empezar gratis
              </Link>
            </div>

            {/* Manager */}
            <div className="rounded-2xl p-8 relative" style={{ backgroundColor: "#1A2B3C" }}>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: "#2D5A27", color: "white" }}>
                Más popular
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#F9F5EB80" }}>Manager</p>
              <p className="mt-2 text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-heading)" }}>9,99€<span className="text-lg font-normal" style={{ color: "rgba(249,245,235,0.6)" }}>/mes</span></p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(249,245,235,0.8)" }}>
                Nuestro equipo publica hasta 20 respuestas por ti al mes. Solo tienes que añadirnos como administrador.
              </p>
              <Link
                href="/register"
                className="mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold transition hover:opacity-90"
                style={{ backgroundColor: "#2D5A27", color: "white" }}
              >
                Probar 7 días gratis
              </Link>
            </div>

            {/* Copiloto */}
            <div className="rounded-2xl border bg-white p-8 opacity-70" style={{ borderColor: "#1A2B3C10" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "#1A2B3C60" }}>Copiloto</p>
                <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: "#1A2B3C12", color: "#1A2B3C60" }}>
                  Coming Soon
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold" style={{ color: "#1A2B3C60", fontFamily: "var(--font-heading)" }}>—</p>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "#1A2B3C80" }}>
                Respuestas publicadas automáticamente, sin que tengas que hacer nada.
              </p>
              <div
                className="mt-8 block w-full rounded-xl py-3 text-center text-sm font-semibold cursor-not-allowed"
                style={{ backgroundColor: "#1A2B3C10", color: "#1A2B3C40" }}
              >
                Próximamente
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-white">
        <div className="mx-auto max-w-3xl px-6">
          <h2
            className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: "#1A2B3C", fontFamily: "var(--font-heading)" }}
          >
            Preguntas frecuentes
          </h2>
          <dl className="mt-12 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-xl border p-6"
                style={{ borderColor: "#1A2B3C12" }}
              >
                <dt className="text-base font-semibold" style={{ color: "#1A2B3C" }}>
                  {faq.question}
                </dt>
                <dd className="mt-2 text-base leading-relaxed" style={{ color: "#1A2B3Ccc" }}>
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-24 text-white" style={{ backgroundColor: "#1A2B3C" }}>
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Empieza hoy. Es gratis.
          </h2>
          <p className="mt-4 text-lg" style={{ color: "rgba(249,245,235,0.7)" }}>
            50 respuestas al mes sin coste. Sin tarjeta de crédito. Sin líos.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center rounded-lg px-7 py-3.5 text-base font-semibold transition hover:opacity-90"
              style={{ backgroundColor: "#2D5A27", color: "#fff" }}
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10" style={{ borderColor: "#1A2B3C15", backgroundColor: "#F9F5EB" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <Link href="/">
            <Image src="/logo.png" alt="autoreplai" height={36} width={180} className="h-9 w-auto" />
          </Link>
          <div className="flex gap-6 text-sm" style={{ color: "#1A2B3C60" }}>
            <Link href="/register" className="transition hover:text-gray-700">Crear cuenta</Link>
            <a href="mailto:hola@autoreplai.com" className="transition hover:text-gray-700">Contacto</a>
          </div>
          <p className="text-xs" style={{ color: "#1A2B3C40" }}>
            &copy; {new Date().getFullYear()} autoreplai
          </p>
        </div>
      </footer>
    </div>
  );
}
