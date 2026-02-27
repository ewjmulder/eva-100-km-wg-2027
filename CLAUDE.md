# Eva 100 km — CLAUDE.md

Fundraising website voor Eva's fietstocht van 100 km voor de World Gymnaestrada 2027 in Lissabon.

## Stack

- **Framework:** Astro 5 (static output, `npm run build` → `dist/`)
- **Styling:** Tailwind v4 — configuratie via `@theme` in `src/styles/global.css` (geen `tailwind.config.mjs`)
- **Database:** Firebase Firestore (client-side only, geen backend)
- **Hosting:** Firebase Hosting (`eva-100km-wg-2027.web.app`)
- **Deploy:** handmatig via `firebase deploy`

## Projectstructuur

```
src/
  layouts/Layout.astro          # Basis layout (Nav + Footer + slot)
  components/
    Nav.astro                   # Vaste navigatiebalk + hamburger menu
    Footer.astro
    Hero.astro                  # Homepage hero met countdown
    DonatiesMeter.astro         # Live donatiemeter via Firestore
    RecenteDonateurs.astro      # Laatste 6 donateurs
  pages/
    index.astro                 # Homepage
    doneer.astro                # Donatie formulier
    donateurs.astro             # Alle donateurs
    vorige-tocht.astro          # 70 km verhaal
    gymnaestrada.astro          # World Gymnaestrada info
    training.astro              # Trainingsschema
    404.astro
  lib/
    firebase.ts                 # Firebase initialisatie (exporteert db)
    donations.ts                # Donatie CRUD + Donatie interface
    dom.ts                      # XSS-veilige DOM helpers (maakEl, formatEuro, maakDonateurKaartje)
  styles/global.css             # Tailwind v4 @theme, @layer base/utilities
public/images/vorige-tocht/     # Foto's vorige tocht (handmatig toevoegen)
firestore.rules                 # Firestore security rules
firebase.json                   # Firebase Hosting + Firestore configuratie
.firebaserc                     # Firebase project koppeling
.env.example                    # Template voor Firebase config
```

## Tailwind v4

Kleuren zijn gedefinieerd via `@theme` in `src/styles/global.css`:

```css
@theme {
  --color-turkoois: #00C4B4;
  --color-oranje:   #FF6B35;
  --color-geel:     #FFD700;
  --color-donker:   #1A1A2E;
}
```

Gebruik als `text-turkoois`, `bg-oranje`, `from-geel`, etc. Geen `tailwind.config.mjs` — dat wordt niet gelezen door v4.

## Astro scripts + Firebase

Firebase draait **client-side**. Gebruik altijd een gewoon `<script>` blok met ES module imports:

```astro
<script>
  import { haalDonaties } from '../lib/donations';
  // ...
</script>
```

`define:vars` en ES module imports zijn **incompatibel** in Astro 5. Gebruik één van de twee per script blok.

## XSS-veiligheid

**Nooit `innerHTML` met gebruikersdata.** Gebruik altijd:
- `element.textContent = userInput` voor tekst
- `maakEl()` en `maakDonateurKaartje()` uit `src/lib/dom.ts` voor donateur-kaartjes

## Omgevingsvariabelen

Firebase config staat in `.env` (niet in git). Template: `.env.example`.
Astro leest variabelen met `PUBLIC_` prefix client-side via `import.meta.env.PUBLIC_*`.

Bij deploy: zorg dat `.env` lokaal aanwezig is met de correcte waarden.

## Veelgebruikte commando's

```bash
npm run dev      # Dev server op localhost:4321
npm run build    # Productie build → dist/
npm run preview  # Preview van de build
```

## Deploy

```bash
npm run build
firebase deploy
```

Live op: https://eva-100km-wg-2027.web.app

## Content placeholders (nog in te vullen)

- `src/components/Hero.astro` regel 4: fietstocht datum (`FIETSTOCHT_DATUM`)
- `src/pages/vorige-tocht.astro`: jaar, route, verhaal tekst
- `src/pages/vorige-tocht.astro`: `fotos` array met bestandsnamen
- `src/pages/gymnaestrada.astro`: details Unitas Doorn
- `src/components/DonatiesMeter.astro`: `DOEL_BEDRAG` (nu €1500)
- `public/images/vorige-tocht/`: foto bestanden toevoegen

## Taal

Website content en code-comments in het **Nederlands**.
