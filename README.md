<p align="center">
  <img src="https://github.com/user-attachments/assets/7803607a-e4e7-4824-81a3-8e2df132fc03" alt="fanbIQ" width="300" />
</p>

<h1 align="center">fanbIQ 🍿</h1>

<p align="center">
  <strong>Swipe on what to watch next, by yourself or together.</strong>
</p>

<p align="center">
  fanbIQ is a mobile-first media discovery app for browsing content from Jellyfin, Emby, Plex, or TMDB, then swiping through a Tinder-style deck, saving favorites, and creating shared sessions.
</p>

<p align="center">
  <img src="https://img.shields.io/github/license/fanbiq/fanbiq" alt="License" />
  <img src="https://img.shields.io/badge/next.js-16-blue" alt="Next.js" />
  <img src="https://img.shields.io/badge/react-19-blue" alt="React" />
</p>

---

## The problem fanbIQ solves

Choosing what to watch can become a slow, repetitive decision-making process. People often spend too much time browsing, get stuck reusing the same titles, or struggle to agree in a group.

fanbIQ addresses that by making discovery feel faster and more intriguing:

- It turns media discovery into a swipe-based experience instead of a long list of options.
- It helps people make decisions quickly, whether they are browsing solo or with others.
- It keeps the experience grounded in the media libraries and services users already use.
- It supports both standalone browsing and shared session-based discovery.

---

## Features

### Discovery and browsing
- Swipe-based video feed for quickly browsing movies and shows
- Detailed media views with metadata and provider-aware information
- Filtering by genre, year, rating, library, and watch provider
- Support for TMDB-backed browsing without requiring a local media server

### Personal and shared watching
- Save liked titles to a dedicated likes experience
- Create or join collaborative sessions for group decision-making
- Use matching rules and session controls to guide group choices
- Enable guest participation for temporary joining without a full account

### Authentication and provider support
- Native email/password sign-in
- Provider-specific behavior for libraries, watchlist/favorites, and server settings

### Product and platform experience
- Mobile-friendly interface with touch-friendly interactions
- Profile, follow, and flick upload/sharing features
- Admin-style provider settings and configuration workflows
- Self-hostable deployment for running the app on your own infrastructure

---

## Overview

fanbIQ is a self-hostable media discovery experience that makes choosing something to watch feel faster and more playful. The app combines a swipe-based card deck with provider integrations, session-based matching, and optional account features so you can browse your own library or use TMDB as a standalone source.

The experience is designed around three main flows:

1. Browse and swipe through titles from a connected provider.
2. Save likes and revisit them from the likes view.
3. Create or join a session to decide together with other people.

---

## What fanbIQ does

### Core experience
- Swipe right to like, left to pass, and undo recent actions.
- Open details for synopsis, metadata, and provider-specific info.
- Filter by genre, year, rating, library, and streaming availability.
- Save liked titles into a dedicated likes view.
- Create or join a shareable session code for group decisions.
- Use the app with Jellyfin, Emby, Plex, or TMDB as the media source.

### Product areas in the current codebase
- Home swipe feed and likes experience
- Search and media detail views
- Session-based discovery for group use
- Guest joining for temporary participation
- Native email/password authentication and provider-backed sign-in
- Profile, follow, and flick upload/sharing features
- Admin-style provider and settings workflows

---

## Supported providers

fanbIQ supports multiple backends through a provider abstraction layer in the app.

| Provider | Best for | Notes |
| --- | --- | --- |
| Jellyfin | Self-hosted media libraries | Full local integration, watchlist/favorites support, quick connect, admin features |
| Emby | Self-hosted media libraries | Supported, with admin-style settings and watchlist/favorites support |
| Plex | Self-hosted media libraries | Supported with server URL setup, quick connect, and watchlist/favorites support |
| TMDB | Standalone discovery | No local media server required; useful for browsing and discovery without provider auth |
| Native | TMDB-backed standalone mode | Uses native auth and a TMDB-backed flow for discovery |

### Provider capabilities
- Jellyfin, Emby, and Plex support authentication, libraries, watchlist/favorites, and server-based settings.
- TMDB supports streaming-related settings and discovery without a media server.
- Native mode is built around TMDB-backed media discovery and native account auth.

---

## How the app works

### 1. Connect a provider
Users can sign in with a provider-backed account or use the native flow. If provider lock is enabled, the app uses the configured backend for everyone; if not, users can supply their own connection settings during login.

### 2. Browse and filter
The main deck surfaces titles from the active provider. Users can refine results by category, rating, year, library, watch provider, and region.

### 3. Swipe and save
Likes are collected in the app and surfaced in the likes experience. The media detail view can also expose extra provider data and watchlist/favorites actions when supported.

### 4. Create or join a session
A session lets multiple users make decisions together. The host can create a session using a session code, and other participants can join with that code. The app supports configurable matching rules and session limits.

### 5. Guest participation
Guest access can be enabled for a session so people without accounts can join temporarily and participate in the swipe flow without accessing the host account or full account settings.

---

## Sessions and group discovery

fanbIQ includes a session system for collaborative decision-making.

### Session features
- Create a session and share the generated code
- Join a session with a code
- Use different matching logic for group decisions
- Apply session limits for likes, matches, or other constraints
- Enable guest lending so non-account users can join temporarily
- Use the matches view to select a final recommendation from current matches

### Matching modes
- Unanimous: every participant must swipe right for a title to count as a match
- Majority: two or more participants can agree for a match

### Session controls
The current app supports host-side controls for session behavior, including guest lending and session settings that influence how the group experience works.

---

## Authentication and access

fanbIQ supports several access patterns:

- Native auth: email/password sign-in with local account support
- Provider auth: sign in directly against Jellyfin, Emby, Plex, or TMDB-backed flows
- Quick Connect: supported for Jellyfin and Plex where available
- Guest access: join a session without a full account

### Quick Connect and PIN flows
The login UI includes support for:
- Jellyfin Quick Connect
- Plex PIN-based sign-in

These flows are useful when the provider requires a second-step approval or device-based authentication.

---

## Features at a glance

### Discovery
- Swipe-based media deck
- Media detail view
- Search and filter tools
- Stream availability-aware browsing where supported
- Watchlist/favorites integration for compatible providers

### Social and personal experience
- Likes list
- Profile and follow support
- Flick upload and sharing
- Session-based collaborative discovery

### Admin and configuration
- Provider configuration and admin-facing settings
- Session settings and guest lending controls
- Provider-specific behavior depending on the active backend

---

## Tech stack

This repository is a Next.js 16 application built with React 19, Tailwind CSS, Framer Motion, Drizzle ORM, and Zustand/TanStack Query.

- Frontend: Next.js App Router, React 19, Tailwind CSS, Framer Motion
- State/data: Zustand, TanStack Query, Drizzle ORM
- Auth: iron-session with native and provider-based sign-in flows
- Media providers: Jellyfin, Emby, Plex, TMDB
- Database: PostgreSQL-compatible URLs and SQLite-compatible local storage patterns

The code is organized around the app router in the src/app tree, reusable UI in src/components, provider integrations in src/lib/providers, and server-side services in src/lib/services.

---

## Quick start

### Prerequisites
- Node.js 24+
- npm

### Local development

```bash
git clone https://github.com/fanbiq/fanbiq.git
cd fanbiq
npm install
npm run dev
```

Then open http://localhost:3000.

### Production build

```bash
npm run build
npm run start
```

The production server defaults to port 4321 in the Docker image, while local development uses the Next.js default port.

---

## Configuration

fanbIQ reads most behavior from environment variables. The most important ones are:

```env
PROVIDER=jellyfin
JELLYFIN_URL=http://your-jellyfin:8096
TMDB_ACCESS_TOKEN=your-tmdb-token
AUTH_SECRET=replace-with-a-long-random-string
DATABASE_URL=file:/app/data/fanbiq.db
USE_SECURE_COOKIES=false
RESEND_API_KEY=your-resend-key
FROM_EMAIL=hello@example.com
```

### Common configuration options
- `PROVIDER`: `jellyfin`, `emby`, `plex`, or `tmdb`
- `PROVIDER_LOCK`: set to `false` to allow runtime provider selection
- `WATCHMODE_API_KEY`: optional streaming-source lookup support
- `USE_STATIC_FILTERS`: use built-in filter lists for large libraries
- `USE_ANALYTICS`: enable anonymous analytics when desired
- `ENABLE_DEBUG`: enable verbose logging for troubleshooting

### Environment reference
The runtime configuration is defined in [src/lib/config.ts](src/lib/config.ts), and the Docker image behavior is defined in [Dockerfile](Dockerfile).

---

## Docker deployment

A Docker Compose example is included in [docker-compose.example.yml](docker-compose.example.yml).

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

### Example compose file

```yaml
services:
  fanbiq:
    image: your-registry/fanbiq:latest
    container_name: fanbiq
    restart: unless-stopped
    environment:
      - PROVIDER=jellyfin
      - JELLYFIN_URL=http://jellyfin:8096
      - AUTH_SECRET=replace-with-a-long-random-string
      - DATABASE_URL=file:/app/data/fanbiq.db
      - USE_SECURE_COOKIES=false
    volumes:
      - ./fanbiq-data:/app/data
    ports:
      - 4321:4321
```

The container expects a persistent data directory, and the example uses a mounted volume for both the database and app state.

---

## Development workflow

### Useful commands

```bash
npm run dev
npm run build
npm run lint
npm run db:migrate
npm run db:generate
```

### Project structure
- [src/app](src/app): routes, layouts, pages, and API handlers
- [src/components](src/components): UI, feature components, and shared views
- [src/lib](src/lib): providers, services, settings, utilities, runtime config, and auth helpers
- [src/db](src/db): schema, migrations, and persistence logic

There is no dedicated test suite configured at the moment, so validation is primarily done through builds and linting.

---

## Security and privacy notes

A few important defaults and safeguards are included in the app:

- `AUTH_SECRET` is used for session encryption and other sensitive flows
- `USE_SECURE_COOKIES` should be enabled behind HTTPS deployments
- Provider URLs can be restricted for safety depending on your deployment setup
- Guest access is intentionally scoped to the session and does not grant broader account access
- Self-hosted deployments keep your data on your own infrastructure when you choose to run the app yourself

---

## Contributing

Contributions are welcome. If you are planning a change, start by opening an issue or discussion so the direction is clear before implementation begins.

The project is currently organized around the app router, provider abstraction, and shared UI components, so changes are easiest to review when they stay focused on one of those areas.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
