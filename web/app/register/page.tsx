import Image from "next/image";
import Link from "next/link";
import GoogleSignInButton from "./google-sign-in-button";

const valueProps = [
  {
    title: "Sin apps extra",
    description: "Todo llega a Telegram, que ya tienes en el móvil.",
  },
  {
    title: "Suena como tú",
    description: "Configuras el tono una vez y la IA lo aplica en cada respuesta.",
  },
  {
    title: "Más confianza, más clientes",
    description: "Los negocios que responden reseñas reciben hasta un 35% más de visitas.",
  },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between py-16 px-16 text-white" style={{ backgroundColor: "#1A2B3C" }}>
        <Link href="/">
          <Image src="/logo.png" alt="autoreplai" height={40} width={200} className="h-10 w-auto brightness-0 invert" />
        </Link>

        <div>
          <p className="text-2xl font-semibold leading-snug" style={{ color: "rgba(249,245,235,0.9)" }}>
            Tú cocinas, vendes, atiendes.<br />
            <span style={{ color: "rgba(249,245,235,0.6)" }}>Nosotros respondemos.</span>
          </p>
          <ul className="mt-10 space-y-7">
            {valueProps.map((prop) => (
              <li key={prop.title} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: "#2D5A27" }}>
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-white">{prop.title}</p>
                  <p className="mt-1 text-sm" style={{ color: "rgba(249,245,235,0.6)" }}>
                    {prop.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs" style={{ color: "rgba(249,245,235,0.3)" }}>
          &copy; {new Date().getFullYear()} autoreplai
        </p>
      </div>

      {/* Panel derecho — Sign in */}
      <div className="flex w-full flex-col lg:w-1/2" style={{ backgroundColor: "#F9F5EB" }}>
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:hidden">
          <Link href="/">
            <Image src="/logo.png" alt="autoreplai" height={32} width={160} className="h-8 w-auto" />
          </Link>
        </div>

        {/* Form — centered vertically on desktop, top-aligned on mobile */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "#1A2B3C" }}>
              Crea tu cuenta gratis
            </h2>
            <p className="mt-2 text-sm" style={{ color: "#1A2B3C80" }}>
              Sin tarjeta de crédito. En dos minutos estás dentro.
            </p>

            <div className="mt-8">
              <GoogleSignInButton />
            </div>

            <p className="mt-8 text-center text-xs" style={{ color: "#1A2B3C50" }}>
              Al registrarte aceptas nuestros{" "}
              <span className="underline cursor-pointer">Términos de servicio</span> y{" "}
              <span className="underline cursor-pointer">Política de privacidad</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
