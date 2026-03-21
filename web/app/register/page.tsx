import GoogleSignInButton from "./google-sign-in-button";

const valueProps = [
  {
    title: "Respuestas rápidas",
    description: "Responde a reseñas de Google en segundos, no en horas.",
  },
  {
    title: "IA personalizada",
    description: "Respuestas que suenan como tú, adaptadas al tono de tu negocio.",
  },
  {
    title: "Mejora tu reputación",
    description:
      "Los negocios que responden reseñas reciben hasta un 35% más de confianza.",
  },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-brand-600 to-brand-900 px-16 text-white">
        <h1 className="text-4xl font-bold tracking-tight">autoreplai</h1>
        <p className="mt-3 text-lg text-brand-100">
          Responde automáticamente a las reseñas de tu negocio con inteligencia
          artificial.
        </p>

        <ul className="mt-12 space-y-8">
          {valueProps.map((prop) => (
            <li key={prop.title} className="flex gap-4">
              <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                ✓
              </span>
              <div>
                <p className="font-semibold">{prop.title}</p>
                <p className="mt-1 text-sm text-brand-100">
                  {prop.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Panel derecho — Sign in */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile brand header */}
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-bold text-brand-600">autoreplai</h1>
            <p className="mt-1 text-sm text-gray-500">
              Respuestas automáticas con IA para tu negocio.
            </p>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Regístrate para empezar a responder reseñas automáticamente.
          </p>

          <div className="mt-8">
            <GoogleSignInButton />
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            Al registrarte aceptas nuestros{" "}
            <span className="underline">Términos de servicio</span> y{" "}
            <span className="underline">Política de privacidad</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
