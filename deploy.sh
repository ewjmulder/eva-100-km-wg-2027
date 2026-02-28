#!/usr/bin/env bash
set -e

echo "🔍 Firebase authenticatie controleren..."
if ! firebase projects:list --json > /dev/null 2>&1; then
  echo "⚠️  Sessie verlopen — opnieuw inloggen..."
  firebase login --reauth
fi

echo "🔨 Bouwen..."
npm run build

echo "🚀 Deployen naar Firebase Hosting..."
firebase deploy

echo "✅ Live op https://eva-100km-wg-2027.web.app"
