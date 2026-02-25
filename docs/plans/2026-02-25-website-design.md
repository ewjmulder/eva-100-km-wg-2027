# Ontwerp: Eva 100 km Website

**Datum:** 2026-02-25
**Project:** Inzamelingswebsite Eva's fietstocht 100 km voor World Gymnaestrada 2027

## Context

Eva (dochter van Erik) fietst 100 km om geld in te zamelen voor de reis van turnsters van Unitas in Doorn naar de World Gymnaestrada 2027 in Lissabon, Portugal. De tocht is gepland voor eind april / begin mei 2026, voor Eva's 11e verjaardag op 17 mei 2026.

Eerder deed Eva een 70 km tocht toen ze 7 was.

## Doel

Een kleurrijke, dynamische Nederlandstalige website die:
1. Het verhaal vertelt over de fietstocht en het WG-doel
2. Bezoekers aanspoort om een donatie te beloven (bedrag per km)
3. De voortgang van beloftes live bijhoudt

## Technische Stack

| Component | Keuze | Reden |
|-----------|-------|-------|
| Framework | Astro | Static site generator, ideaal voor content-sites, output is puur HTML/CSS/JS |
| Styling | Tailwind CSS | Snelle utility-first styling, consistent design |
| Animaties | GSAP + ScrollTrigger | Professionele scroll-animaties, countdown, meter |
| Database | Firebase Firestore | Direct browser-naar-Firestore, geen backend nodig |
| Hosting | GCP Bucket (statisch) | Statische files, goedkoop en snel |
| DNS | Cloudflare CNAME (subdomain) | SSL automatisch, makkelijk te beheren |
| CI/CD | GitHub Actions | Automatisch deployen bij push naar `main` |

## Paginastructuur

```
/                   → Homepagina
/doneer             → Donatie-formulier
/donateurs          → Overzicht alle donateurs
/vorige-tocht       → 70 km verhaal (Eva 7 jaar oud)
/gymnaestrada       → World Gymnaestrada 2027 + Unitas Doorn
/training           → Trainingsschema
```

## Homepagina Ontwerp

Secties van boven naar onder:

### 1. Hero
- Grote kleurrijke banner
- Titel: *"Eva fietst 100 km voor Lissabon 2027!"*
- Subtitel: Eva + vader Erik, doel WG
- Countdown timer (dagen tot de tocht)
- CTA-knop: "Doneer nu!" → /doneer
- Achtergrond: CSS animatie met geometrische vormen in themakleuren

### 2. Donatiemeter
- Live voortgangsbalk vanuit Firestore
- Toont totaal toegezegd bedrag in €
- Doelindicator (bijv. "€ 850 / € 1.500 belofd")
- GSAP-animatie: balk vult op bij paginalading

### 3. Het verhaal
- 3-4 zinnen over Eva, de tocht, het doel
- Links naar /gymnaestrada en /training

### 4. Recente donateurs
- Top 5 meest recente beloftes (naam + bedrag/km + bericht)

## Kleurenpalet

| Naam | Hex | Gebruik |
|------|-----|---------|
| Turkoois | `#00C4B4` | Primaire accentkleur, CTA-knoppen |
| Oranje | `#FF6B35` | Secundaire accentkleur, highlights |
| Zonnegeel | `#FFD700` | Decoratieve elementen, iconen |
| Wit | `#FFFFFF` | Achtergrond, tekst op donker |
| Donkergrijs | `#1A1A2E` | Body tekst |

## Donatie-systeem

### Formulier (/doneer)
- Naam (verplicht)
- E-mailadres (optioneel, niet publiek zichtbaar)
- Bedrag per km in € (preset buttons: €0,10 / €0,25 / €0,50 / €1,00 + vrij invulveld)
- Bericht (optioneel, max 200 tekens)
- Vinkje: "Ik stem in dat mijn naam en bericht publiek zichtbaar zijn"
- Honeypot veld (spam-bescherming)
- Confetti-animatie na succesvolle donatie

### Firestore Datamodel
```
collectie: donations
  document: {auto-id}
    naam: string           // verplicht, publiek
    bedragPerKm: number    // verplicht
    bericht: string        // optioneel, publiek (als publiek=true)
    publiek: boolean       // opt-in voor zichtbaarheid naam+bericht
    email: string          // optioneel, NIET publiek
    timestamp: Timestamp   // server-side timestamp
```

### Totaalberekening
Client-side: `sum(donations.bedragPerKm) * 100` (100 km) = totaal beloofde bedrag in €

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /donations/{docId} {
      allow read: if true;
      allow create: if request.resource.data.naam is string
                    && request.resource.data.naam.size() > 0
                    && request.resource.data.bedragPerKm is number
                    && request.resource.data.bedragPerKm > 0
                    && request.resource.data.bedragPerKm <= 10;
      allow update, delete: if false;
    }
  }
}
```

## Overige Pagina's (content)

### /vorige-tocht
- Verhaal van de 70 km tocht toen Eva 7 was
- Foto galerij (lightbox)
- Vergelijking: 70 km vs 100 km

### /gymnaestrada
- Wat is de World Gymnaestrada?
- Unitas in Doorn: wie zijn ze, wat doen ze
- Lissabon 2027: feiten, datum, deelname

### /training
- Trainingsschema (hometrainer + buitenritten)
- Voortgangsupdate (handmatig bij te werken)
- Tips voor lange afstanden

## Deployment

### GCP Bucket instelling
1. Bucket aanmaken met naam `eva100km.jouwdomein.nl`
2. Public access inschakelen
3. Website configuratie: index.html als index, 404.html als error page
4. Astro build output (`dist/`) uploaden

### Cloudflare DNS
```
Type: CNAME
Name: eva100km
Target: c.storage.googleapis.com
Proxy: Aan (oranje wolk - voor SSL en caching)
```

### GitHub Actions Workflow
Trigger: push naar `main`
Stappen:
1. Checkout code
2. Node setup + npm install
3. `npm run build`
4. Authenticate met GCP (Service Account in GitHub Secrets)
5. `gsutil -m rsync -r dist/ gs://eva100km.jouwdomein.nl`

### Environment Variables (.env, niet in Git)
```
PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_STORAGE_BUCKET=...
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

## Aannames

- Doelbedrag: €1.500 (nader te bepalen door Erik)
- Fietsdatum: eind april / begin mei 2026 (nader te bevestigen)
- Route: nog te bepalen (placeholder kaart of illustratie)
- Foto's vorige tocht: beschikbaar bij Erik, handmatig toe te voegen
- Firebase project: nog aan te maken door Erik
- GCP bucket naam en domein: nog te bepalen
