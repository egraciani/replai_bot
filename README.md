# autoreplai — Telegram demo bot

Sales demo bot for **autoreplai**. Given a business name, it fetches real Google reviews and generates AI-powered response examples via Telegram.

Built with Grammy + Google Places API + Anthropic Claude.

## What's here

- **Bot logic** (`src/bot.ts`) — Telegram conversation flow with in-memory state
- Searches a business by name via Google Places API
- Fetches recent reviews and generates responses using Claude

## Local setup

```bash
npm install
# Add to .env:
# TELEGRAM_BOT_TOKEN=
# GOOGLE_PLACES_API_KEY=
# ANTHROPIC_API_KEY=
# DEMO_URL=
npm run dev
```

## Related

- [autoreplai landing page](https://github.com/egraciani/replai)
