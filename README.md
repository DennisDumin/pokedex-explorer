# Pokédex Explorer

A modern Pokédex built with Vanilla JavaScript, ES modules, Vite, and
two public Pokémon APIs. It combines fast catalog discovery with accessible
details, collection tools, shareable URLs, and installable PWA support without a
frontend framework.

> **Live demo:** [dennis-dumin.net/pokedex](https://www.dennis-dumin.net/pokedex/)

## Highlights

- Searches the complete Pokédex by name or real Pokédex number
- Filters by type and generation, with name/number sorting in both directions
- Keeps discovery state in the URL and loads selectable batches of 20–200 Pokémon
- Shows responsive cards with official artwork and animated hover sprites
- Opens a native, keyboard-accessible `<dialog>` on 320 px through desktop layouts
- Preloads species and evolution data before displaying the detail view
- Provides About, Base stats, Matchups, Evolution, and TCG cards tabs
- Parses complete branching evolutions and explains known evolution requirements
- Switches between normal and Shiny media without another loading screen
- Supports alternative varieties/forms when PokéAPI provides them
- Plays available cries at reduced volume on open and provides a replay button
- Stores favorites and recently viewed Pokémon locally
- Directly compares any two Pokémon across their base stats
- Switches the complete interface between English and German and remembers the choice
- Opens a random Pokémon or a deterministic Pokémon of the day
- Creates shareable detail links such as `?pokemon=25&tab=cards&shiny=1`
- Can be installed as a PWA and caches the app shell, API responses, and viewed media
- Shows an accessible connection status when the app goes offline or comes back online
- Handles failed requests with useful messages and retry actions

## Accessibility and Interaction

- Semantic buttons, forms, labels, status messages, tabs, and native dialogs
- Complete keyboard operation, arrow-key tab navigation, and Escape-to-close
- Focus restoration after dialogs close and visible `:focus-visible` styles
- Meaningful alternative text and ARIA labels
- Localized status and ARIA text with an automatically updated HTML `lang` attribute
- Reduced animations when `prefers-reduced-motion` is enabled
- Responsive layouts checked for 320 px, 375 px, 412 px, and desktop widths

## Technologies

- HTML5 and CSS3
- Vanilla JavaScript with ES modules
- [Vite](https://vite.dev/) for development and production builds
- [PokéAPI](https://pokeapi.co/) for Pokémon, species, types, and evolutions
- [Pokémon TCG API](https://pokemontcg.io/) for optional trading-card results
- Native Web APIs: Dialog, History, Local Storage, Service Worker, and Web App Manifest
- Dependency-free EN/DE localization with persisted language preferences
- Vitest, ESLint, and Prettier

## Project Structure

```text
public/
├── icons/                    PWA icon
├── manifest*.webmanifest    Localized install metadata
└── sw.js                     Offline and runtime caching
src/
├── api/                      API clients, validation, and request caches
├── data/                     Pinned localized Pokémon names
├── i18n/                     English/German messages and translation helpers
├── pwa/                      Service-worker registration
├── state/                    Pagination, collections, language, and view preferences
├── styles/                   Application, dialog, collection, and responsive styles
├── ui/                       Catalog, dialogs, templates, feedback, and interactions
├── utils/                    Formatters, parsers, media, routing, and comparison logic
└── main.js                   Application entry point
scripts/                      Maintenance scripts
tests/                        Vitest unit tests
img/                          Pre-existing local visual assets
fonts/                        Local Lato font files
```

All runtime JavaScript and CSS lives under `src/`. The project root is reserved
for HTML, package and tooling configuration, documentation, and the pre-existing
asset directories.

## Getting Started

### Requirements

- Node.js 20.19+ or 22.12+
- npm

### Installation

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Do not use VS Code Live Server for this
version because Vite resolves the ES modules and bundled assets.

## Available Scripts

| Command                        | Purpose                                 |
| ------------------------------ | --------------------------------------- |
| `npm run dev`                  | Start the Vite development server       |
| `npm run build`                | Create a production build in `dist/`    |
| `npm run preview`              | Preview the production build locally    |
| `npm test`                     | Run all Vitest tests once               |
| `npm run test:watch`           | Run tests in watch mode                 |
| `npm run lint`                 | Check JavaScript with ESLint            |
| `npm run format`               | Format supported files with Prettier    |
| `npm run format:check`         | Check formatting without changing files |
| `npm run check`                | Run tests, lint, formatting, and build  |
| `npm run update:pokemon-names` | Refresh the pinned German name data     |

## Quality Checks

The unit tests cover formatting and conversions, base-stat normalization,
branching evolution parsing and conditions, search/filter/sort behavior, URL
state, media fallbacks, Shiny preferences, collections, comparison, random/daily
selection, localization fallbacks and persistence, and Pokémon TCG API validation
and caching.

Run the complete local check with:

```bash
npm run check
```

## API and Loading Strategy

The central clients validate identifiers, check `response.ok`, normalize external
data, cache completed responses, and deduplicate requests that are already in
flight. Controlled concurrency prevents a large batch from firing every request
at once. Static artwork needed for a Pokémon list is decoded before the
full-screen loader ends; animated hover sprites continue warming the browser
cache in the background. Focusing or briefly hovering a card prefetches its
species, abilities, type data, evolution chain, and detail media so the dialog
usually opens without another visible loading step.

The language switch translates the interface, Pokémon names and types,
measurements, status values, evolution conditions, and available PokéAPI species
and ability descriptions. English is the default and safe fallback. German
species names are generated from a pinned revision of PokéAPI's BSD-3-Clause
licensed data, so switching, searching, and sorting do not require extra runtime
requests. API identifiers, URLs, form suffixes, item names, and third-party TCG
data remain canonical.

The optional trading-card tab is loaded on demand so a slow or rate-limited
secondary API never blocks the core Pokédex. Its result and images are cached
after the first successful request.

## PWA and Offline Behavior

The production build registers a dependency-free service worker. It caches the
application shell and uses stale-while-revalidate for API responses and viewed
media. Repeat visits can therefore use cached content immediately while a fresh
response is requested in the background. Installation remains available through
supported browsers' own menus; the page does not show an install button. A live
status message explains when the app is offline and confirms when the connection
returns. The linked install manifest follows the selected interface language.

The first visit and uncached Pokémon still require an internet connection. Offline
mode can reuse only application files and data/media that have already been cached.
Service workers require HTTPS in production; `localhost` is allowed for local
testing.

## Static Deployment

Create and preview the production output:

```bash
npm run build
npm run preview
```

The live version is hosted as a static application at
`https://www.dennis-dumin.net/pokedex/`. The Vite configuration uses relative
asset paths so the build works inside this subdirectory.

For an ALL-INKL deployment with FileZilla:

1. Run `npm run build`.
2. Open the domain's web root on the server.
3. Create or open the `pokedex` directory.
4. Upload the **contents** of the local `dist/` directory into `pokedex/`.

Do not upload the source project or add another `dist` directory level. The
deployed `index.html` must therefore be available directly at
`/pokedex/index.html`.

## Data, Assets, and Disclaimer

Core data and remote sprites are retrieved from
[PokéAPI](https://pokeapi.co/docs/v2). Its fair-use guidance asks applications to
cache requested resources; this project uses in-memory request caches and a
service-worker runtime cache.

Trading-card data and images are retrieved from the
[Pokémon TCG API](https://docs.pokemontcg.io/). The project intentionally works
without an API key and therefore keeps requests limited, lazy, cached, and
retryable.

This is an unofficial fan project.
It is not affiliated with or endorsed by Nintendo, Game Freak, Creatures Inc., or
The Pokémon Company. Pokémon names, characters, trading cards, and related assets
belong to their respective rights holders.

The background was generated specifically for this project. Remaining local
interface graphics came from the original project version and are used only as
part of this unofficial fan project. The bundled Lato font is licensed under the
SIL Open Font License 1.1; its copyright notice and license are included in
[`fonts/OFL.txt`](fonts/OFL.txt).

## License

No source-code license has been selected for this repository yet.
