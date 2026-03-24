# autoreplai

Responde las reseñas de Google de tu negocio con IA, directamente desde Telegram.

## Arquitectura

```
┌──────────────────────────┐     ┌──────────────────────────┐
│    Telegram Bot (Grammy)  │     │   Web App (Next.js 15)   │
│    Cloud Run (webhook)    │     │   localhost:3000 (dev)    │
│                           │     │                           │
│  /demo   → demo gratis   │     │  /register → Google OAuth │
│  /vincular → link cuenta  │     │  /bienvenida → onboarding │
│  /resenas → ver reviews   │     │  /api/google-business/*   │
│  /plan   → ver uso        │     │  /api/telegram/link-code  │
└────────────┬─────────────┘     └────────────┬─────────────┘
             │                                 │
             └──────────┬──────────────────────┘
                        │
              ┌─────────▼─────────┐
              │     Supabase      │
              │  PostgreSQL + RLS │
              │  Auth (Google)    │
              │  Realtime         │
              └───────────────────┘
```

## Estructura del proyecto

```
src/                              # Bot de Telegram
├── bot.ts                        # Entry point: comandos, webhook/polling
├── supabase.ts                   # Cliente Supabase (service_role)
├── claude.ts                     # Generación de respuestas con Claude
├── google.ts                     # Google Places API (búsqueda + reviews)
├── conversation.ts               # Estado in-memory por chat
├── types.ts                      # Interfaces TypeScript
├── commands/
│   ├── demo.ts                   # /demo — demo interactivo para prospects
│   ├── link.ts                   # /vincular — vincula Telegram ↔ Supabase
│   ├── reviews.ts                # /resenas — reviews pendientes con paginación
│   ├── generate.ts               # Genera respuesta AI + aprobar/editar/rechazar
│   ├── plan.ts                   # /plan — info de suscripción y uso
│   └── help.ts                   # /ayuda — ayuda contextual
└── middleware/
    └── auth.ts                   # Resuelve telegram_id → supabase user_id

web/                              # Web App (Next.js 15 + React 19)
├── app/
│   ├── register/                 # Registro con Google OAuth
│   ├── auth/callback/            # Callback OAuth → sesión
│   ├── bienvenida/               # Onboarding + vincular Telegram
│   ├── dashboard/select-business/ # Selector de negocios Google Business
│   └── api/
│       ├── google-business/      # OAuth: connect, callback, locations, select
│       └── telegram/link-code/   # Genera código de vinculación (6 chars, 10 min)
├── lib/
│   ├── supabase/                 # Clientes Supabase (browser, server, middleware)
│   ├── google-business.ts        # Helpers OAuth de Google Business
│   └── encryption.ts             # AES-256-GCM para tokens
└── middleware.ts                 # Refresca sesión en cada request

supabase/migrations/              # Esquema de base de datos
├── 001_initial_schema.sql        # Tablas core, enums, triggers, RLS, seed
├── 20260321_google_business.sql  # google_tokens + columnas en businesses
└── 20260322_telegram_links.sql   # telegram_links + link_codes

scripts/
└── set-webhook.sh                # Restaura webhook tras dev local
```

## Base de datos

| Tabla | Qué almacena |
|-------|-------------|
| `profiles` | Extensión 1:1 de `auth.users` |
| `plans` | Free (1 biz, 50 resp/mo) / Pro (5, 500, $29) / Enterprise (50, ilimitado, $99) |
| `subscriptions` | Plan activo + `responses_used` mensual |
| `businesses` | Negocios conectados (Google Place ID, location) |
| `reviews` | Reviews importadas de Google (con deduplicación) |
| `responses` | Respuestas AI (status: pending/approved/edited/rejected) |
| `google_tokens` | Tokens OAuth cifrados con AES-256-GCM |
| `telegram_links` | Mapeo telegram_user_id ↔ supabase user_id |
| `link_codes` | Códigos temporales de vinculación (TTL 10 min) |

### Funciones SQL

- `handle_new_user()` — trigger: crea profile + subscription free al registrarse
- `can_generate_response(user_id)` — verifica quota antes de generar
- `can_add_business(user_id)` — verifica límite de negocios del plan
- `increment_responses_used()` — trigger: incrementa contador al crear response

## Setup local

### Bot

```bash
npm install
cp .env.example .env
# Configurar en .env:
#   TELEGRAM_BOT_TOKEN
#   GOOGLE_PLACES_API_KEY
#   ANTHROPIC_API_KEY
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

### Web

```bash
cd web
npm install
cp .env.local.example .env.local
# Configurar en .env.local:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   GOOGLE_CLIENT_ID
#   GOOGLE_CLIENT_SECRET
#   GOOGLE_REDIRECT_URI
#   ENCRYPTION_KEY
npm run dev
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Arranca bot en polling mode (dev local) |
| `npm run build` | Compila TypeScript a `dist/` |
| `npm run start` | Ejecuta bot compilado |
| `npm run webhook` | Restaura webhook de Telegram tras dev local |

## Despliegue

- **Bot**: Cloud Run (webhook mode, Dockerfile multi-stage, Node 22 Alpine)
- **Web**: Pendiente (Vercel o Cloud Run)
- **DB**: Supabase hosted

## Stack

- **Bot**: [Grammy](https://grammy.dev) + TypeScript + [Anthropic Claude](https://docs.anthropic.com) + Google Places API
- **Web**: Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + Supabase Auth
- **DB**: Supabase (PostgreSQL + RLS + Realtime)
- **Infra**: Docker + Google Cloud Run
