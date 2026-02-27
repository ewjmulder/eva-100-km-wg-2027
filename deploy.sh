#!/usr/bin/env bash
set -euo pipefail

GROEN='\033[0;32m'
GEEL='\033[1;33m'
ROOD='\033[0;31m'
RESET='\033[0m'

ok()   { echo -e "${GROEN}✔ $1${RESET}"; }
info() { echo -e "${GEEL}→ $1${RESET}"; }
fout() { echo -e "${ROOD}✘ $1${RESET}"; exit 1; }

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Eva 100 km — Deploy naar Firebase  ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Preconditions ────────────────────────────────────────────────────────────

info "Controleer vereisten..."

command -v node    >/dev/null 2>&1 || fout "Node.js niet gevonden"
command -v npm     >/dev/null 2>&1 || fout "npm niet gevonden"
command -v firebase >/dev/null 2>&1 || fout "Firebase CLI niet gevonden. Installeer met: npm install -g firebase-tools"

ok "Node $(node -v), npm $(npm -v), firebase $(firebase --version)"

# .env bestand
[[ -f ".env" ]] || fout ".env bestand niet gevonden. Kopieer .env.example en vul de waarden in."

# Controleer dat .env geen placeholder waarden bevat
if grep -q "jouw-" .env 2>/dev/null; then
  fout ".env bevat nog placeholder waarden (jouw-...). Vul de echte Firebase config in."
fi

ok ".env aanwezig en ingevuld"

# Firebase login check
FIREBASE_USER=$(firebase login:list 2>/dev/null | grep -E "@" | head -1 | xargs || true)
if [[ -z "$FIREBASE_USER" ]]; then
  info "Nog niet ingelogd bij Firebase. Login wordt gestart..."
  firebase login
else
  ok "Ingelogd als: $FIREBASE_USER"
fi

# Firebase project check
FIREBASE_PROJECT=$(firebase use 2>/dev/null | grep -oE '[a-z0-9-]+' | head -1 || true)
if [[ -z "$FIREBASE_PROJECT" ]]; then
  fout "Geen Firebase project geselecteerd. Voer uit: firebase use eva-100km-wg-2027"
fi

ok "Firebase project: $FIREBASE_PROJECT"

# ── Build ────────────────────────────────────────────────────────────────────

echo ""
info "Build starten..."

# Laad .env variabelen voor de build
set -a
# shellcheck source=.env
source .env
set +a

npm run build

[[ -d "dist" && -f "dist/index.html" ]] || fout "Build mislukt: dist/index.html niet gevonden"

AANTAL_FILES=$(find dist -type f | wc -l | xargs)
ok "Build geslaagd — $AANTAL_FILES bestanden in dist/"

# ── Deploy ───────────────────────────────────────────────────────────────────

echo ""
info "Deployen naar Firebase Hosting..."

firebase deploy --only hosting

echo ""
ok "Deploy geslaagd!"
echo -e "   ${GROEN}🌐 https://eva-100km-wg-2027.web.app${RESET}"
echo ""
