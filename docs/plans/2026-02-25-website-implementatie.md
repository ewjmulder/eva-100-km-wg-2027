# Eva 100 km Website Implementatie Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bouw een kleurrijke, dynamische Nederlandstalige inzamelingswebsite voor Eva's fietstocht van 100 km naar de World Gymnaestrada 2027.

**Architecture:** Astro static site generator met Tailwind CSS voor styling, GSAP voor animaties, en Firebase Firestore voor client-side donatie-opslag. De build output (`dist/`) is puur statisch en wordt gehost op een GCP bucket via een Cloudflare CNAME subdomain.

**Tech Stack:** Astro 5, Tailwind CSS 4, Firebase JS SDK 11, GitHub Actions, GCP Storage, Cloudflare DNS

---

## Projectstructuur (einddoel)

```
/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Basis layout met nav/footer
│   ├── pages/
│   │   ├── index.astro           # Homepagina
│   │   ├── doneer.astro          # Donatie formulier
│   │   ├── donateurs.astro       # Overzicht alle donateurs
│   │   ├── vorige-tocht.astro    # 70 km verhaal
│   │   ├── gymnaestrada.astro    # WG 2027 info
│   │   ├── training.astro        # Trainingsschema
│   │   └── 404.astro             # Not found pagina
│   ├── components/
│   │   ├── Nav.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── DonatiesMeter.astro
│   │   ├── RecenteDonateurs.astro
│   │   └── DonatieFormulier.astro
│   ├── lib/
│   │   ├── firebase.ts           # Firebase initialisatie
│   │   ├── donations.ts          # Donatie lezen/schrijven
│   │   └── dom.ts                # Veilige DOM helper functies (XSS-vrij)
│   └── styles/
│       └── global.css
├── public/
│   └── images/                   # Foto's vorige tocht, etc.
├── firestore.rules
├── .env.example
├── .env                          # NIET in git
├── .github/
│   └── workflows/
│       └── deploy.yml
├── astro.config.mjs
└── tailwind.config.mjs
```

---

## Task 1: Astro project initialiseren

**Files:**
- Create: `astro.config.mjs`
- Create: `tailwind.config.mjs`
- Create: `src/styles/global.css`
- Create: `.env.example`

**Stap 1: Maak het Astro project aan**

Voer uit in de project root:
```bash
npm create astro@latest . -- --template minimal --typescript strict --no-install
```

Kies bij vragen: TypeScript: Strict, geen Git init (bestaat al).

**Stap 2: Installeer dependencies**

```bash
npm install
npm install @astrojs/tailwind tailwindcss
npm install firebase
npx astro add tailwind
```

Bij `astro add tailwind`: kies "Yes" op alle vragen.

**Stap 3: Stel `astro.config.mjs` in**

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
});
```

**Stap 4: Maak `tailwind.config.mjs`**

```javascript
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        turkoois: '#00C4B4',
        oranje: '#FF6B35',
        geel: '#FFD700',
        donker: '#1A1A2E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**Stap 5: Maak `src/styles/global.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-white text-donker font-sans;
  }
  h1, h2, h3 {
    @apply font-bold;
  }
}

@layer utilities {
  .gradient-tekst {
    @apply bg-gradient-to-r from-turkoois via-oranje to-geel bg-clip-text text-transparent;
  }
}
```

**Stap 6: Maak `.env.example`**

```
PUBLIC_FIREBASE_API_KEY=jouw-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=jouw-project.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=jouw-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=jouw-project.appspot.com
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
PUBLIC_FIREBASE_APP_ID=1:123:web:abc123
```

**Stap 7: Update `.gitignore`**

Zorg dat `.env`, `dist/` en `node_modules/` erin staan.

**Stap 8: Test de build**

```bash
npm run build
```

Verwacht: `dist/` aangemaakt zonder fouten.

**Stap 9: Commit**

```bash
git add -A
git commit -m "feat: initialiseer Astro project met Tailwind"
```

---

## Task 2: Firebase setup + veilige DOM helpers

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/lib/donations.ts`
- Create: `src/lib/dom.ts`
- Create: `firestore.rules`

**Vereiste voorbereiding (handmatig in Firebase Console):**
1. Ga naar [console.firebase.google.com](https://console.firebase.google.com)
2. Maak nieuw project aan (bijv. `eva100km`)
3. Voeg Web App toe, kopieer config naar `.env`
4. Activeer Firestore Database (productie-modus)

**Stap 1: Maak `src/lib/firebase.ts`**

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
```

**Stap 2: Maak `src/lib/donations.ts`**

```typescript
import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface Donatie {
  id?: string;
  naam: string;
  bedragPerKm: number;
  bericht?: string;
  publiek: boolean;
  email?: string;
  timestamp?: Timestamp;
}

export const TOTALE_KM = 100;

export async function voegDonatieToe(
  donatie: Omit<Donatie, 'id' | 'timestamp'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'donations'), {
    ...donatie,
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

export async function haalDonaties(): Promise<Donatie[]> {
  const q = query(collection(db, 'donations'), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donatie));
}

export function berekenTotaal(donaties: Donatie[]): number {
  return donaties.reduce((som, d) => som + d.bedragPerKm * TOTALE_KM, 0);
}
```

**Stap 3: Maak `src/lib/dom.ts` (XSS-veilige DOM helpers)**

Alle gebruikerscontent wordt via `textContent` ingevoegd — nooit via innerHTML.

```typescript
/** Maak een element met CSS klassen */
export function maakEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  classes: string = '',
  tekst?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (classes) el.className = classes;
  if (tekst !== undefined) el.textContent = tekst;
  return el;
}

/** Formatteer euro bedrag naar Nederlands formaat */
export function formatEuro(bedrag: number): string {
  return '€\u00A0' + bedrag.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Maak een donateur-kaartje als DOM node (geen innerHTML) */
export function maakDonateurKaartje(donatie: {
  naam: string;
  bedragPerKm: number;
  bericht?: string;
  publiek: boolean;
}): HTMLElement {
  const kaart = maakEl('div', 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4');

  // Avatar
  const avatar = maakEl('div',
    'w-10 h-10 rounded-full bg-gradient-to-br from-turkoois to-oranje flex items-center justify-center text-white font-black text-lg flex-shrink-0',
    donatie.publiek ? donatie.naam[0].toUpperCase() : '?'
  );

  // Tekst kolom
  const kolom = maakEl('div', 'flex-1 min-w-0');

  const rij = maakEl('div', 'flex items-center justify-between gap-2 mb-1');
  rij.appendChild(maakEl('span', 'font-bold text-donker truncate', donatie.publiek ? donatie.naam : 'Anoniem'));
  rij.appendChild(maakEl('span', 'font-black text-turkoois whitespace-nowrap', formatEuro(donatie.bedragPerKm * 100)));
  kolom.appendChild(rij);

  kolom.appendChild(maakEl('div', 'text-xs text-gray-400 mb-1', formatEuro(donatie.bedragPerKm) + ' per km'));

  if (donatie.publiek && donatie.bericht) {
    kolom.appendChild(maakEl('p', 'text-gray-500 text-sm italic', '"' + donatie.bericht + '"'));
  }

  kaart.appendChild(avatar);
  kaart.appendChild(kolom);
  return kaart;
}
```

**Stap 4: Maak `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /donations/{docId} {
      allow read: if true;
      allow create: if request.resource.data.naam is string
                    && request.resource.data.naam.size() > 0
                    && request.resource.data.naam.size() < 100
                    && request.resource.data.bedragPerKm is number
                    && request.resource.data.bedragPerKm > 0
                    && request.resource.data.bedragPerKm <= 10
                    && request.resource.data.publiek is bool;
      allow update, delete: if false;
    }
  }
}
```

**Stap 5: Deploy Firestore rules**

```bash
npm install -g firebase-tools
firebase login
firebase init firestore  # kies bestaand project
firebase deploy --only firestore:rules
```

**Stap 6: Commit**

```bash
git add src/lib/ firestore.rules .env.example
git commit -m "feat: voeg Firebase/Firestore configuratie en DOM helpers toe"
```

---

## Task 3: Layout component (Nav + Footer)

**Files:**
- Create: `src/layouts/Layout.astro`
- Create: `src/components/Nav.astro`
- Create: `src/components/Footer.astro`

**Stap 1: Maak `src/components/Nav.astro`**

```astro
---
const navItems = [
  { href: '/', label: 'Home' },
  { href: '/doneer', label: 'Doneer' },
  { href: '/donateurs', label: 'Donateurs' },
  { href: '/vorige-tocht', label: 'Vorige Tocht' },
  { href: '/gymnaestrada', label: 'World Gymnaestrada' },
  { href: '/training', label: 'Training' },
];
const huidigPad = Astro.url.pathname;
---

<nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm shadow-sm">
  <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
    <a href="/" class="text-xl font-black gradient-tekst">Eva 🚴 100 km</a>

    <ul class="hidden md:flex gap-6 text-sm font-semibold">
      {navItems.map(item => (
        <li>
          <a href={item.href}
             class={`hover:text-turkoois transition-colors ${huidigPad === item.href ? 'text-turkoois' : 'text-donker'}`}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>

    <button id="menu-knop" class="md:hidden p-2" aria-label="Menu openen">
      <div class="w-6 h-0.5 bg-donker mb-1"></div>
      <div class="w-6 h-0.5 bg-donker mb-1"></div>
      <div class="w-6 h-0.5 bg-donker"></div>
    </button>
  </div>

  <div id="mobiel-menu" class="hidden md:hidden bg-white border-t border-gray-100">
    <ul class="flex flex-col px-4 py-2">
      {navItems.map(item => (
        <li>
          <a href={item.href} class="block py-3 font-semibold hover:text-turkoois transition-colors">
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
</nav>

<script>
  document.getElementById('menu-knop')?.addEventListener('click', () => {
    document.getElementById('mobiel-menu')?.classList.toggle('hidden');
  });
</script>
```

**Stap 2: Maak `src/components/Footer.astro`**

```astro
---
const jaar = new Date().getFullYear();
---

<footer class="bg-donker text-white mt-20">
  <div class="max-w-6xl mx-auto px-4 py-10 text-center">
    <p class="text-2xl font-black gradient-tekst mb-2">Eva 🚴 100 km</p>
    <p class="text-gray-400 text-sm mb-4">
      Inzameling voor de World Gymnaestrada 2027 · Lissabon, Portugal
    </p>
    <p class="text-gray-500 text-xs">
      Alle donaties zijn vrijwillige beloftes. Betaling gaat buiten de website om.
    </p>
    <p class="text-gray-600 text-xs mt-4">© {jaar} Eva & Erik</p>
  </div>
</footer>
```

**Stap 3: Maak `src/layouts/Layout.astro`**

```astro
---
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  beschrijving?: string;
}

const {
  title,
  beschrijving = 'Eva fietst 100 km voor de World Gymnaestrada 2027 in Lissabon!'
} = Astro.props;
---

<!DOCTYPE html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={beschrijving} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title} · Eva 100 km</title>
  </head>
  <body>
    <Nav />
    <main class="pt-16">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

**Stap 4: Test**

```bash
npm run dev
```

Verwacht: navigatie zichtbaar op `http://localhost:4321`.

**Stap 5: Commit**

```bash
git add src/layouts/ src/components/
git commit -m "feat: voeg basis layout toe met navigatie en footer"
```

---

## Task 4: Homepagina — Hero sectie met countdown

**Files:**
- Create: `src/components/Hero.astro`
- Create: `src/pages/index.astro`

**Stap 1: Maak `src/components/Hero.astro`**

```astro
---
// Pas aan als datum bekend is
const FIETSTOCHT_DATUM = '2026-05-03T08:00:00';
---

<section class="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-donker via-blue-900 to-donker">

  <div class="absolute inset-0 overflow-hidden pointer-events-none">
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>

  <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
    <div class="text-6xl mb-4 animate-bounce">🚴‍♀️</div>

    <h1 class="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
      Eva fietst<br>
      <span class="gradient-tekst">100 kilometer!</span>
    </h1>

    <p class="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
      Voor de reis van Unitas Doorn naar de
      <strong class="text-geel">World Gymnaestrada 2027</strong> in Lissabon, Portugal.
      Eva (11) en haar vader Erik fietsen samen 100 km om dit te sponsoren.
    </p>

    <div class="mb-10">
      <p class="text-gray-400 text-sm uppercase tracking-widest mb-3">Aftellen tot de tocht</p>
      <div class="flex justify-center gap-4">
        {['dagen', 'uur', 'minuten', 'seconden'].map(eenheid => (
          <div class="bg-white/10 backdrop-blur rounded-xl p-3 min-w-[70px]">
            <div class={`text-3xl font-black text-geel countdown-${eenheid}`}>--</div>
            <div class="text-xs text-gray-400 mt-1">{eenheid}</div>
          </div>
        ))}
      </div>
    </div>

    <a
      href="/doneer"
      class="inline-block bg-oranje hover:bg-orange-400 text-white font-black text-lg px-10 py-4 rounded-full shadow-lg shadow-oranje/30 hover:scale-105 active:scale-95 transition-all"
    >
      💸 Doneer nu!
    </a>
  </div>
</section>

<style>
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
    animation: drijf 8s ease-in-out infinite alternate;
  }
  .blob-1 { width: 400px; height: 400px; background: #00C4B4; top: -100px; left: -100px; animation-delay: 0s; }
  .blob-2 { width: 300px; height: 300px; background: #FF6B35; top: 50%; right: -50px; animation-delay: 3s; }
  .blob-3 { width: 250px; height: 250px; background: #FFD700; bottom: -50px; left: 40%; animation-delay: 6s; }

  @keyframes drijf {
    from { transform: translate(0, 0) scale(1); }
    to   { transform: translate(30px, 20px) scale(1.1); }
  }
</style>

<script define:vars={{ FIETSTOCHT_DATUM }}>
  function updateCountdown() {
    const verschil = new Date(FIETSTOCHT_DATUM).getTime() - Date.now();

    if (verschil <= 0) {
      document.querySelector('.countdown-dagen').textContent = '🎉';
      ['uur', 'minuten', 'seconden'].forEach(e =>
        document.querySelector(`.countdown-${e}`).textContent = '0'
      );
      return;
    }

    const dag = 1000 * 60 * 60 * 24;
    const uur = 1000 * 60 * 60;
    const min = 1000 * 60;

    document.querySelector('.countdown-dagen').textContent    = String(Math.floor(verschil / dag));
    document.querySelector('.countdown-uur').textContent      = String(Math.floor((verschil % dag) / uur));
    document.querySelector('.countdown-minuten').textContent  = String(Math.floor((verschil % uur) / min));
    document.querySelector('.countdown-seconden').textContent = String(Math.floor((verschil % min) / 1000));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
</script>
```

**Stap 2: Maak `src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
---

<Layout title="Home">
  <Hero />
</Layout>
```

**Stap 3: Test**

```bash
npm run dev
```

Verwacht: hero met countdown, drijvende blobs en grote CTA knop.

**Stap 4: Commit**

```bash
git add src/components/Hero.astro src/pages/index.astro
git commit -m "feat: voeg hero sectie toe met countdown timer"
```

---

## Task 5: Homepagina — Donatiemeter (live Firestore)

**Files:**
- Create: `src/components/DonatiesMeter.astro`
- Modify: `src/pages/index.astro`

**Stap 1: Maak `src/components/DonatiesMeter.astro`**

```astro
---
const DOEL_BEDRAG = 1500;
---

<section class="py-16 px-4 bg-gradient-to-b from-white to-gray-50">
  <div class="max-w-3xl mx-auto text-center">
    <h2 class="text-3xl font-black mb-2">
      💰 <span class="gradient-tekst">Donatiemeter</span>
    </h2>
    <p class="text-gray-500 mb-8">Live bijgewerkt — elke belofte telt!</p>

    <div class="mb-4">
      <span class="text-5xl font-black text-turkoois" id="huidig-bedrag">€ …</span>
      <span class="text-2xl text-gray-400 font-semibold"> / € {DOEL_BEDRAG.toLocaleString('nl-NL')}</span>
    </div>

    <p class="text-gray-500 text-sm mb-6">
      <span id="aantal-donateurs">…</span> donateurs ·
      gemiddeld <span id="gemiddeld-bedrag">…</span> per km
    </p>

    <div class="bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner mb-6">
      <div
        id="voortgang-balk"
        class="h-full rounded-full bg-gradient-to-r from-turkoois via-oranje to-geel transition-all duration-1000"
        style="width: 0%"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={DOEL_BEDRAG}
      ></div>
    </div>

    <a
      href="/doneer"
      class="inline-block bg-turkoois hover:bg-teal-400 text-white font-bold px-8 py-3 rounded-full transition-all hover:scale-105"
    >
      + Voeg jouw belofte toe
    </a>
  </div>
</section>

<script define:vars={{ DOEL_BEDRAG }}>
  import { haalDonaties, berekenTotaal } from '../lib/donations';
  import { formatEuro } from '../lib/dom';

  async function laadMeter() {
    try {
      const donaties = await haalDonaties();
      const totaal = berekenTotaal(donaties);
      const percentage = Math.min((totaal / DOEL_BEDRAG) * 100, 100);
      const gemiddeld = donaties.length > 0
        ? (donaties.reduce((s, d) => s + d.bedragPerKm, 0) / donaties.length).toFixed(2)
        : '0';

      document.getElementById('huidig-bedrag').textContent = formatEuro(totaal);
      document.getElementById('aantal-donateurs').textContent = String(donaties.length);
      document.getElementById('gemiddeld-bedrag').textContent = '€ ' + gemiddeld;

      const balk = document.getElementById('voortgang-balk');
      balk.style.width = percentage + '%';
      balk.setAttribute('aria-valuenow', String(totaal));
    } catch (e) {
      console.error('Fout bij laden donaties:', e);
      document.getElementById('huidig-bedrag').textContent = '€ ?';
    }
  }

  laadMeter();
</script>
```

**Stap 2: Update `src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import DonatiesMeter from '../components/DonatiesMeter.astro';
---

<Layout title="Home">
  <Hero />
  <DonatiesMeter />
</Layout>
```

**Stap 3: Commit**

```bash
git add src/components/DonatiesMeter.astro src/pages/index.astro
git commit -m "feat: voeg live donatiemeter toe op homepagina"
```

---

## Task 6: Homepagina — Verhaal + Recente donateurs

**Files:**
- Create: `src/components/RecenteDonateurs.astro`
- Modify: `src/pages/index.astro`

**Stap 1: Maak `src/components/RecenteDonateurs.astro`**

Let op: donateurs-kaartjes worden gebouwd met `maakDonateurKaartje()` uit `dom.ts` — geen innerHTML met gebruikersdata.

```astro
<section class="py-16 px-4 bg-donker text-white">
  <div class="max-w-4xl mx-auto">
    <h2 class="text-3xl font-black text-center mb-2">
      ❤️ <span class="gradient-tekst">Recente donateurs</span>
    </h2>
    <p class="text-center text-gray-400 mb-10">Dank jullie wel!</p>

    <div id="donateurs-lijst" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div class="col-span-full text-center text-gray-500 py-4">Laden…</div>
    </div>

    <div class="text-center mt-8">
      <a href="/donateurs" class="text-turkoois hover:text-teal-300 font-semibold transition-colors">
        Bekijk alle donateurs →
      </a>
    </div>
  </div>
</section>

<script>
  import { haalDonaties } from '../lib/donations';
  import { maakDonateurKaartje, maakEl } from '../lib/dom';

  async function laadRecenteDonateurs() {
    const lijst = document.getElementById('donateurs-lijst');
    if (!lijst) return;

    try {
      const donaties = await haalDonaties();
      const recente = donaties.slice(0, 6);

      lijst.replaceChildren();

      if (recente.length === 0) {
        const leeg = maakEl('p', 'col-span-full text-center text-gray-400', 'Wees de eerste donateur!');
        lijst.appendChild(leeg);
        return;
      }

      recente.forEach(d => lijst.appendChild(maakDonateurKaartje(d)));
    } catch (e) {
      console.error('Fout bij laden donateurs:', e);
    }
  }

  laadRecenteDonateurs();
</script>
```

**Stap 2: Update `src/pages/index.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/Hero.astro';
import DonatiesMeter from '../components/DonatiesMeter.astro';
import RecenteDonateurs from '../components/RecenteDonateurs.astro';
---

<Layout title="Home">
  <Hero />
  <DonatiesMeter />

  <section class="py-16 px-4">
    <div class="max-w-3xl mx-auto text-center">
      <h2 class="text-3xl font-black mb-6">🚴 <span class="gradient-tekst">Het verhaal</span></h2>
      <p class="text-gray-600 text-lg leading-relaxed mb-4">
        Eva (11) is turnster bij <strong>Unitas in Doorn</strong> en droomt ervan om mee te doen
        aan de <strong>World Gymnaestrada 2027</strong> in Lissabon, Portugal. Om geld in te zamelen
        voor de reis, fietst ze 100 kilometer met haar vader Erik.
      </p>
      <p class="text-gray-600 text-lg leading-relaxed mb-8">
        Vier jaar geleden reed Eva al een <strong>tocht van 70 km</strong> — en nu pakt ze nog groter uit.
        Elke eurocent per kilometer helpt haar en haar clubgenoten om dit avontuur te beleven!
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <a href="/gymnaestrada"
           class="bg-turkoois text-white font-bold px-6 py-3 rounded-full hover:bg-teal-400 transition-all">
          Over de World Gymnaestrada
        </a>
        <a href="/training"
           class="border-2 border-oranje text-oranje font-bold px-6 py-3 rounded-full hover:bg-oranje hover:text-white transition-all">
          Bekijk het trainingsschema
        </a>
      </div>
    </div>
  </section>

  <RecenteDonateurs />
</Layout>
```

**Stap 3: Commit**

```bash
git add src/components/RecenteDonateurs.astro src/pages/index.astro
git commit -m "feat: voeg verhaal en recente donateurs toe aan homepagina"
```

---

## Task 7: Donatiepagina (/doneer) met confetti

**Files:**
- Create: `src/pages/doneer.astro`

**Stap 1: Maak `src/pages/doneer.astro`**

Honeypot voor spam-bescherming; geen innerHTML met gebruikersdata — foutteksten via `textContent`.

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Doneer" beschrijving="Steun Eva's fietstocht van 100 km met een donatie-belofte per kilometer.">
  <section class="min-h-screen py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
    <div class="max-w-lg mx-auto">
      <div class="text-center mb-10">
        <div class="text-5xl mb-3">💸</div>
        <h1 class="text-4xl font-black mb-3"><span class="gradient-tekst">Doneer</span></h1>
        <p class="text-gray-500">
          Kies een bedrag per kilometer. Bij 100 km wordt dat het totale donatiebedrag.
          Betaling gaat buiten de website om — we nemen contact op na de tocht!
        </p>
      </div>

      <div id="succes-bericht" class="hidden bg-turkoois/10 border border-turkoois rounded-2xl p-6 text-center mb-6">
        <div class="text-4xl mb-2">🎉</div>
        <h2 class="text-xl font-black text-turkoois mb-1">Bedankt!</h2>
        <p class="text-gray-600 text-sm">Jouw belofte is geregistreerd. We nemen na de tocht contact op!</p>
      </div>

      <form id="donatie-formulier" class="bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <!-- Honeypot: verborgen voor mensen, zichtbaar voor bots -->
        <input type="text" name="website" class="hidden" tabindex="-1" autocomplete="off" />

        <div>
          <label for="naam" class="block text-sm font-bold text-gray-700 mb-1">Jouw naam *</label>
          <input type="text" id="naam" required maxlength="100" placeholder="Bijv. Oma Lies"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-turkoois focus:outline-none transition-colors" />
        </div>

        <div>
          <label for="email" class="block text-sm font-bold text-gray-700 mb-1">
            E-mailadres <span class="text-gray-400 font-normal">(optioneel, niet publiek)</span>
          </label>
          <input type="email" id="email" placeholder="jouw@email.nl"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-turkoois focus:outline-none transition-colors" />
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-3">Bedrag per kilometer *</label>
          <div class="grid grid-cols-4 gap-2 mb-3" id="preset-knoppen">
            {[0.10, 0.25, 0.50, 1.00].map(bedrag => (
              <button type="button"
                class="preset-knop border-2 border-gray-200 rounded-xl py-3 font-bold text-sm hover:border-turkoois hover:text-turkoois transition-all"
                data-bedrag={String(bedrag)}>
                € {bedrag.toFixed(2)}
              </button>
            ))}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500 font-medium">€</span>
            <input type="number" id="bedrag-per-km" required min="0.01" max="10" step="0.01"
              placeholder="Zelf invoeren"
              class="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-turkoois focus:outline-none transition-colors" />
            <span class="text-gray-500 font-medium whitespace-nowrap">/ km</span>
          </div>
          <p class="text-sm text-gray-400 mt-2">
            = <span id="totaal-preview" class="font-bold text-turkoois">€ 0,00</span> totaal bij 100 km
          </p>
        </div>

        <div>
          <label for="bericht" class="block text-sm font-bold text-gray-700 mb-1">
            Bericht <span class="text-gray-400 font-normal">(optioneel, max 200 tekens)</span>
          </label>
          <textarea id="bericht" maxlength="200" rows="3"
            placeholder="Bijv. Succes meid! Je kan het!"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-turkoois focus:outline-none transition-colors resize-none"></textarea>
        </div>

        <div class="flex items-start gap-3">
          <input type="checkbox" id="publiek" checked class="mt-1 w-4 h-4 accent-turkoois" />
          <label for="publiek" class="text-sm text-gray-600">
            Mijn naam en bericht mogen publiek zichtbaar zijn op de website
          </label>
        </div>

        <button type="submit" id="submit-knop"
          class="w-full bg-oranje hover:bg-orange-400 text-white font-black text-lg py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-oranje/30">
          🚴 Beloof mijn donatie!
        </button>

        <div id="fout-bericht" class="hidden bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm text-center"></div>
      </form>
    </div>
  </section>
</Layout>

<script>
  import { voegDonatieToe } from '../lib/donations';
  import { formatEuro } from '../lib/dom';

  // Preset knoppen
  document.querySelectorAll('.preset-knop').forEach(knop => {
    knop.addEventListener('click', () => {
      const bedrag = (knop as HTMLElement).dataset.bedrag ?? '';
      (document.getElementById('bedrag-per-km') as HTMLInputElement).value = bedrag;
      document.querySelectorAll('.preset-knop').forEach(k =>
        k.classList.remove('border-turkoois', 'text-turkoois', 'bg-turkoois/5')
      );
      knop.classList.add('border-turkoois', 'text-turkoois', 'bg-turkoois/5');
      updateVooruitkijk();
    });
  });

  function updateVooruitkijk() {
    const bedrag = parseFloat((document.getElementById('bedrag-per-km') as HTMLInputElement).value) || 0;
    document.getElementById('totaal-preview')!.textContent = formatEuro(bedrag * 100);
  }

  document.getElementById('bedrag-per-km')?.addEventListener('input', updateVooruitkijk);

  function gooidConfetti() {
    const kleuren = ['#00C4B4', '#FF6B35', '#FFD700', '#ffffff'];
    for (let i = 0; i < 80; i++) {
      const stuk = document.createElement('div');
      const kleur = kleuren[Math.floor(Math.random() * kleuren.length)];
      const isRond = Math.random() > 0.5;
      const duur = 0.8 + Math.random() * 1.5;
      const rotation = Math.random() * 720;

      stuk.style.cssText = [
        'position:fixed',
        'width:10px', 'height:10px',
        `background:${kleur}`,
        `border-radius:${isRond ? '50%' : '2px'}`,
        `left:${Math.random() * 100}vw`,
        'top:-10px',
        'z-index:9999',
        'pointer-events:none',
      ].join(';');

      const animNaam = `confetti-${i}-${Date.now()}`;
      const style = document.createElement('style');
      style.textContent = `@keyframes ${animNaam} { to { transform: translateY(110vh) rotate(${rotation}deg); opacity: 0; } }`;
      stuk.style.animation = `${animNaam} ${duur}s ease-in forwards`;

      document.head.appendChild(style);
      document.body.appendChild(stuk);
      setTimeout(() => { stuk.remove(); style.remove(); }, duur * 1000 + 100);
    }
  }

  document.getElementById('donatie-formulier')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const honeypot = (document.querySelector('input[name="website"]') as HTMLInputElement).value;
    if (honeypot) return; // Stille spam-blokkering

    const knop = document.getElementById('submit-knop') as HTMLButtonElement;
    const fout = document.getElementById('fout-bericht')!;
    fout.classList.add('hidden');
    fout.textContent = '';
    knop.disabled = true;
    knop.textContent = '⏳ Versturen…';

    try {
      const bedragPerKm = parseFloat((document.getElementById('bedrag-per-km') as HTMLInputElement).value);
      if (isNaN(bedragPerKm) || bedragPerKm <= 0 || bedragPerKm > 10) {
        throw new Error('Voer een geldig bedrag in (€ 0,01 – € 10,00 per km)');
      }

      const naam = (document.getElementById('naam') as HTMLInputElement).value.trim();
      if (!naam) throw new Error('Vul je naam in');

      await voegDonatieToe({
        naam,
        email: (document.getElementById('email') as HTMLInputElement).value.trim() || undefined,
        bedragPerKm,
        bericht: (document.getElementById('bericht') as HTMLTextAreaElement).value.trim() || undefined,
        publiek: (document.getElementById('publiek') as HTMLInputElement).checked,
      });

      document.getElementById('donatie-formulier')!.classList.add('hidden');
      document.getElementById('succes-bericht')!.classList.remove('hidden');
      gooidConfetti();

    } catch (err) {
      const bericht = err instanceof Error ? err.message : 'Er ging iets mis. Probeer het opnieuw.';
      fout.textContent = bericht; // textContent — geen XSS risico
      fout.classList.remove('hidden');
      knop.disabled = false;
      knop.textContent = '🚴 Beloof mijn donatie!';
    }
  });
</script>
```

**Stap 2: Test**

```bash
npm run dev
```

Verwacht: formulier op `/doneer`, preset knoppen highlighten, live totaal preview, submit → confetti + succes.

**Stap 3: Commit**

```bash
git add src/pages/doneer.astro
git commit -m "feat: voeg donatiepagina toe met Firestore en confetti"
```

---

## Task 8: Donateurs overzicht (/donateurs)

**Files:**
- Create: `src/pages/donateurs.astro`

**Stap 1: Maak `src/pages/donateurs.astro`**

Alle gebruikersdata via `maakDonateurKaartje()` — geen innerHTML.

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Donateurs" beschrijving="Bekijk alle donateurs die Eva's fietstocht sponsoren.">
  <section class="min-h-screen py-20 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <div class="text-5xl mb-3">🏅</div>
        <h1 class="text-4xl font-black mb-3"><span class="gradient-tekst">Alle donateurs</span></h1>
        <p class="text-gray-500">Iedereen die Eva steunt op weg naar Lissabon. Dankjewel!</p>
      </div>

      <div class="bg-gradient-to-r from-turkoois to-oranje rounded-2xl p-6 text-white text-center mb-10">
        <div class="text-4xl font-black" id="totaal-display">€ …</div>
        <div class="text-white/80 mt-1" id="donateurs-teller">…</div>
      </div>

      <div id="donateurs-grid" class="grid gap-4 md:grid-cols-2">
        <div class="col-span-full text-center text-gray-400 py-8">Laden…</div>
      </div>
    </div>
  </section>
</Layout>

<script>
  import { haalDonaties, berekenTotaal } from '../lib/donations';
  import { maakDonateurKaartje, maakEl, formatEuro } from '../lib/dom';

  async function laadDonateurs() {
    const grid = document.getElementById('donateurs-grid');
    if (!grid) return;

    try {
      const donaties = await haalDonaties();
      const totaal = berekenTotaal(donaties);
      const aantalTekst = donaties.length + ' donateur' + (donaties.length !== 1 ? 's' : '');

      document.getElementById('totaal-display')!.textContent = formatEuro(totaal);
      document.getElementById('donateurs-teller')!.textContent = aantalTekst;

      grid.replaceChildren();

      if (donaties.length === 0) {
        grid.appendChild(maakEl('p', 'col-span-full text-center text-gray-400 py-8',
          'Nog geen donateurs. Wees de eerste!'));
        return;
      }

      donaties.forEach(d => grid.appendChild(maakDonateurKaartje(d)));

    } catch (e) {
      console.error('Fout bij laden donateurs:', e);
      grid.replaceChildren(maakEl('p', 'col-span-full text-center text-red-400 py-8',
        'Kon donateurs niet laden.'));
    }
  }

  laadDonateurs();
</script>
```

**Stap 2: Commit**

```bash
git add src/pages/donateurs.astro
git commit -m "feat: voeg donateurs overzichtspagina toe"
```

---

## Task 9: Vorige tocht pagina (/vorige-tocht)

**Files:**
- Create: `src/pages/vorige-tocht.astro`
- Create: `public/images/vorige-tocht/` (map)

**Stap 1: Maak de images map**

```bash
mkdir -p public/images/vorige-tocht
```

Foto's kunnen later worden toegevoegd als `public/images/vorige-tocht/foto-1.jpg` etc.

**Stap 2: Maak `src/pages/vorige-tocht.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';

// Vul aan met echte bestandsnamen als foto's beschikbaar zijn
const fotos: string[] = [
  // 'foto-1.jpg',
];
---

<Layout title="Vorige Tocht" beschrijving="In 2021 fietste Eva al 70 km toen ze 7 jaar oud was. Lees het verhaal.">
  <section class="py-20 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-12">
        <div class="text-5xl mb-3">🚵‍♀️</div>
        <h1 class="text-4xl font-black mb-3"><span class="gradient-tekst">De vorige tocht</span></h1>
        <p class="text-gray-500">70 kilometer · Eva was 7 jaar oud</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mb-12">
        <div class="bg-turkoois/10 border-2 border-turkoois rounded-2xl p-5 text-center">
          <div class="text-3xl font-black text-turkoois">70 km</div>
          <div class="text-sm text-gray-500 mt-1">Toen (Eva 7 jaar)</div>
        </div>
        <div class="bg-oranje/10 border-2 border-oranje rounded-2xl p-5 text-center">
          <div class="text-3xl font-black text-oranje">100 km</div>
          <div class="text-sm text-gray-500 mt-1">Nu (Eva 11 jaar)</div>
        </div>
      </div>

      <div class="text-gray-600 space-y-4 mb-12 text-lg leading-relaxed">
        <p>
          In <strong>[JAAR INVULLEN]</strong> deed Eva iets bijzonders. Samen met haar vader Erik fietste ze
          maar liefst <strong>70 kilometer</strong> op één dag — terwijl ze pas 7 jaar oud was.
          Het was een onvergetelijke dag vol avontuur, doorzettingsvermogen en plezier.
        </p>
        <p>
          <em>[Vul hier het echte verhaal in: de route, bijzondere momenten, hoe het was...]</em>
        </p>
        <p>
          Nu, vier jaar later, pakt Eva nog groter uit: van 70 naar <strong>100 kilometer</strong>.
          Omdat ze weet dat ze het kan, en omdat ze haar club de kans wil geven om naar Lissabon te gaan.
        </p>
      </div>

      {fotos.length > 0 ? (
        <div>
          <h2 class="text-2xl font-black mb-6 text-center">📸 Foto's</h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fotos.map((foto, i) => (
              <a href={`/images/vorige-tocht/${foto}`} target="_blank" rel="noopener"
                 class="block overflow-hidden rounded-xl aspect-square hover:opacity-90 transition-opacity">
                <img
                  src={`/images/vorige-tocht/${foto}`}
                  alt={`Foto ${i + 1} van de 70 km tocht`}
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div class="bg-gray-50 rounded-2xl p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
          <p class="text-4xl mb-2">📸</p>
          <p>Foto's komen binnenkort!</p>
        </div>
      )}
    </div>
  </section>
</Layout>
```

**Stap 3: Commit**

```bash
git add src/pages/vorige-tocht.astro public/images/
git commit -m "feat: voeg vorige tocht pagina toe (70 km verhaal)"
```

---

## Task 10: Gymnaestrada pagina (/gymnaestrada)

**Files:**
- Create: `src/pages/gymnaestrada.astro`

**Stap 1: Maak `src/pages/gymnaestrada.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';

const feiten = [
  { icon: '🌍', titel: 'Wereldevenement', tekst: 'De World Gymnaestrada is het grootste niet-competitieve gymnaestiek festival ter wereld.' },
  { icon: '📍', titel: 'Lissabon 2027', tekst: 'In 2027 vindt het evenement plaats in Lissabon, Portugal. Duizenden deelnemers uit de hele wereld.' },
  { icon: '🏅', titel: 'Elke 4 jaar', tekst: 'Het event wordt elke 4 jaar georganiseerd door de FIG (Fédération Internationale de Gymnastique).' },
];
---

<Layout title="World Gymnaestrada" beschrijving="Alles over de World Gymnaestrada 2027 in Lissabon en Unitas Doorn.">
  <section class="py-20 px-4">
    <div class="max-w-3xl mx-auto">
      <div class="text-center mb-12">
        <div class="text-5xl mb-3">🤸‍♀️</div>
        <h1 class="text-4xl font-black mb-3"><span class="gradient-tekst">World Gymnaestrada</span></h1>
        <p class="text-gray-500">Lissabon, Portugal · 2027</p>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-12">
        {feiten.map(item => (
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div class="text-3xl mb-2">{item.icon}</div>
            <h3 class="font-black text-donker mb-2">{item.titel}</h3>
            <p class="text-gray-500 text-sm">{item.tekst}</p>
          </div>
        ))}
      </div>

      <div class="space-y-8 text-gray-600">
        <div>
          <h2 class="text-2xl font-black text-donker mb-3">Wat is de World Gymnaestrada?</h2>
          <p class="leading-relaxed">
            De World Gymnaestrada is een vierjaarlijks gymnaestiek festival dat niet om winst of verlies draait,
            maar om samen bewegen, cultuur en internationale vriendschappen. Duizenden gymnasts van over de hele
            wereld komen samen om shows te geven en te genieten van elkaars kunst.
          </p>
        </div>

        <div>
          <h2 class="text-2xl font-black text-donker mb-3">Unitas in Doorn</h2>
          <p class="leading-relaxed">
            Eva turnt bij <strong>Unitas</strong> in Doorn. Het is een actieve gymvereniging die al jaren
            meedoet aan evenementen zoals de Gymnaestrada. In 2027 willen ze er met een groep heen — maar
            zo'n reis kost geld. Dat is waar Eva bij wil helpen!
          </p>
          <p class="leading-relaxed mt-3 italic text-gray-400">
            [Vul hier meer details in over Unitas Doorn en hun plannen voor Lissabon...]
          </p>
        </div>

        <div class="bg-geel/20 rounded-2xl p-6 border-l-4 border-geel">
          <h3 class="font-black text-donker mb-2">🎯 Het doel</h3>
          <p class="text-gray-600">
            Met de opbrengst van Eva's fietstocht helpen we de turnsters van Unitas Doorn om hun droom
            waar te maken: deelnemen aan de World Gymnaestrada 2027 in Lissabon!
          </p>
        </div>
      </div>
    </div>
  </section>
</Layout>
```

**Stap 2: Commit**

```bash
git add src/pages/gymnaestrada.astro
git commit -m "feat: voeg World Gymnaestrada informatiepagina toe"
```

---

## Task 11: Trainingsschema pagina (/training)

**Files:**
- Create: `src/pages/training.astro`

**Stap 1: Maak `src/pages/training.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';

const weken = [
  { week: 1,  focus: 'Opbouwweek',       hometrainer: '2× 20 min', buiten: '1× 15 km', notitie: 'Rustig opbouwen, gevoel voor het zadel' },
  { week: 2,  focus: 'Uitbreiding',       hometrainer: '2× 25 min', buiten: '1× 20 km', notitie: '' },
  { week: 3,  focus: 'Drukke week',       hometrainer: '3× 20 min', buiten: '1× 25 km', notitie: '' },
  { week: 4,  focus: 'Herstelweek',       hometrainer: '2× 20 min', buiten: '1× 15 km', notitie: 'Rustiger houden, goed slapen' },
  { week: 5,  focus: 'Opbouw intensief',  hometrainer: '3× 25 min', buiten: '1× 30 km', notitie: '' },
  { week: 6,  focus: 'Lange rit week',    hometrainer: '2× 30 min', buiten: '1× 40 km', notitie: 'Eerste lange rit! Goed eten vooraf.' },
  { week: 7,  focus: 'Rustweek',          hometrainer: '2× 20 min', buiten: '1× 20 km', notitie: '' },
  { week: 8,  focus: 'Topweek',           hometrainer: '2× 30 min', buiten: '1× 60 km', notitie: 'Simuleert de echte tocht qua gevoel' },
  { week: 9,  focus: 'Aftrapweek',        hometrainer: '2× 20 min', buiten: '1× 30 km', notitie: 'Niet te veel, bewaar kracht!' },
  { week: 10, focus: '🚴 DE TOCHT!',      hometrainer: '—',         buiten: '100 km 🎉', notitie: 'Eet goed, slaap goed, veel plezier!' },
];

const tips = [
  { icon: '🏠', titel: 'Hometrainer', tekst: 'Weer of geen weer, op de hometrainer kan Eva altijd trainen. Ideaal voor drukke schoolweken.' },
  { icon: '🌤️', titel: 'Buiten fietsen', tekst: 'In het weekend maakt Eva echte buitenritten. Langere afstanden en echte hoogtemeters.' },
  { icon: '🥗', titel: 'Voeding & rust', tekst: 'Goed eten en genoeg slapen is minstens zo belangrijk als de trainingen zelf.' },
];
---

<Layout title="Training" beschrijving="Hoe traint Eva voor haar 100 km fietstocht? Bekijk het trainingsschema.">
  <section class="py-20 px-4">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        <div class="text-5xl mb-3">💪</div>
        <h1 class="text-4xl font-black mb-3"><span class="gradient-tekst">Training</span></h1>
        <p class="text-gray-500">Van 0 naar 100 km in 10 weken — zo doet Eva dat!</p>
      </div>

      <div class="grid md:grid-cols-3 gap-4 mb-12">
        {tips.map(tip => (
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <div class="text-3xl mb-2">{tip.icon}</div>
            <h3 class="font-black text-donker mb-2">{tip.titel}</h3>
            <p class="text-gray-500 text-sm">{tip.tekst}</p>
          </div>
        ))}
      </div>

      <h2 class="text-2xl font-black text-donker mb-6 text-center">📅 10-weken schema</h2>
      <div class="overflow-x-auto rounded-2xl shadow-sm border border-gray-100">
        <table class="w-full">
          <thead class="bg-gradient-to-r from-turkoois to-oranje text-white">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-bold">Week</th>
              <th class="px-4 py-3 text-left text-sm font-bold">Focus</th>
              <th class="px-4 py-3 text-left text-sm font-bold">Hometrainer</th>
              <th class="px-4 py-3 text-left text-sm font-bold">Buiten</th>
              <th class="px-4 py-3 text-left text-sm font-bold hidden md:table-cell">Notitie</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            {weken.map((w, i) => (
              <tr class={`${i === weken.length - 1 ? 'bg-geel/20 font-bold' : 'hover:bg-gray-50'} transition-colors`}>
                <td class="px-4 py-3 text-sm font-bold text-turkoois">{w.week}</td>
                <td class="px-4 py-3 text-sm">{w.focus}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{w.hometrainer}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{w.buiten}</td>
                <td class="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{w.notitie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
</Layout>
```

**Stap 2: Commit**

```bash
git add src/pages/training.astro
git commit -m "feat: voeg trainingsschema pagina toe"
```

---

## Task 12: 404 pagina

**Files:**
- Create: `src/pages/404.astro`

**Stap 1: Maak `src/pages/404.astro`**

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Pagina niet gevonden">
  <section class="min-h-screen flex items-center justify-center py-20 px-4">
    <div class="text-center">
      <div class="text-8xl mb-4">🚴‍♀️</div>
      <h1 class="text-6xl font-black gradient-tekst mb-4">404</h1>
      <p class="text-gray-500 text-xl mb-8">
        Oeps! Deze pagina bestaat niet.<br>
        Eva is hem ook niet tegengekomen op haar route.
      </p>
      <a href="/" class="bg-turkoois text-white font-bold px-8 py-3 rounded-full hover:bg-teal-400 transition-all">
        Terug naar de start
      </a>
    </div>
  </section>
</Layout>
```

**Stap 2: Commit**

```bash
git add src/pages/404.astro
git commit -m "feat: voeg 404 pagina toe"
```

---

## Task 13: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Vereiste voorbereiding (handmatig — eenmalig):**

1. GCP Service Account aanmaken in Google Cloud Console:
   - Rol: `Storage Object Admin`
   - Download JSON key

2. GitHub Secrets instellen in repository (Settings → Secrets → Actions):
   - `GCP_SA_KEY` → volledige inhoud van het JSON key bestand
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

3. GCP bucket aanmaken met de exacte subdomain-naam:
   ```bash
   gsutil mb -l europe-west4 gs://eva100km.JOUWDOMEIN.NL
   gsutil web set -m index.html -e 404/index.html gs://eva100km.JOUWDOMEIN.NL
   gsutil iam ch allUsers:objectViewer gs://eva100km.JOUWDOMEIN.NL
   ```

**Stap 1: Maak `.github/workflows/deploy.yml`**

Vervang `eva100km.JOUWDOMEIN.NL` met de echte bucket naam.

```yaml
name: Deploy naar GCP

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Installeer Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Installeer dependencies
        run: npm ci

      - name: Build Astro site
        run: npm run build
        env:
          PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          PUBLIC_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}

      - name: Authenticeer met Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Installeer Google Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Upload naar GCS bucket
        run: |
          gsutil -m -h "Cache-Control:public, max-age=300" rsync -r -d dist/ gs://eva100km.JOUWDOMEIN.NL
          gsutil -m setmeta -h "Cache-Control:no-cache" gs://eva100km.JOUWDOMEIN.NL/index.html
```

**Stap 2: Cloudflare DNS (eenmalig na eerste deploy)**

In Cloudflare dashboard → jouw domein → DNS → Records:
```
Type:   CNAME
Name:   eva100km
Target: c.storage.googleapis.com
Proxy:  Aan (oranje wolk — voor SSL en caching)
```

**Stap 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: voeg GitHub Actions deploy workflow toe naar GCP bucket"
```

---

## Task 14: Finale build & verificatie

**Stap 1: Volledige productie-build**

```bash
npm run build
```

Verwacht: geen TypeScript fouten, `dist/` aangemaakt.

**Stap 2: Preview van de build**

```bash
npm run preview
```

Bezoek handmatig en controleer alle pagina's:
- `http://localhost:4321/` — hero, countdown, meter, verhaal, donateurs
- `http://localhost:4321/doneer` — formulier, presets, live totaal, submit werkt
- `http://localhost:4321/donateurs` — overzicht donateurs
- `http://localhost:4321/vorige-tocht` — verhaal + foto placeholder
- `http://localhost:4321/gymnaestrada` — WG info
- `http://localhost:4321/training` — schema tabel
- `http://localhost:4321/niet-bestaand` — 404 pagina

**Stap 3: Finale commit**

```bash
git add -A
git commit -m "feat: volledige Eva 100 km website klaar voor eerste deploy"
```

---

## Post-deploy checklist (handmatig)

- [ ] Firebase project aangemaakt, `.env` gevuld
- [ ] Firestore rules gedeployd
- [ ] GCP bucket aangemaakt met correcte naam (subdomain-vorm)
- [ ] Bucket ingesteld als statische website met `index.html` en `404/index.html`
- [ ] Bucket publiek toegankelijk
- [ ] GitHub Secrets ingesteld (Firebase config + GCP SA Key)
- [ ] Bucket naam in `deploy.yml` correct ingesteld
- [ ] Cloudflare CNAME record aangemaakt
- [ ] Fietsdatum in `Hero.astro` aangepast zodra datum bekend is
- [ ] Streefbedrag in `DonatiesMeter.astro` aangepast (nu € 1.500)
- [ ] Foto's vorige tocht toegevoegd aan `public/images/vorige-tocht/`
- [ ] Filenames ingevuld in `fotos` array in `vorige-tocht.astro`
- [ ] Verhaal vorige tocht ingevuld (jaar, route, bijzondere momenten)
- [ ] Unitas Doorn details aangevuld in `gymnaestrada.astro`
