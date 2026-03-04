import type { Donatie } from './donations';

/** Maak een element met CSS klassen en optionele tekst */
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
  return '\u20AC\u00A0' + bedrag.toLocaleString('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Maak een donateur-kaartje als DOM node (geen innerHTML met gebruikersdata) */
export function maakDonateurKaartje(donatie: Donatie): HTMLElement {
  const kaart = maakEl('div',
    'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4'
  );

  // Avatar met eerste letter van naam
  const avatar = maakEl(
    'div',
    'w-10 h-10 rounded-full bg-gradient-to-br from-turkoois to-oranje flex items-center justify-center text-white font-black text-lg flex-shrink-0',
    donatie.publiek ? donatie.naam[0].toUpperCase() : '?'
  );

  // Tekst kolom
  const kolom = maakEl('div', 'flex-1 min-w-0');

  const rij = maakEl('div', 'flex items-center justify-between gap-2 mb-1');
  rij.appendChild(
    maakEl('span', 'font-bold text-donker truncate', donatie.publiek ? donatie.naam : 'Anoniem')
  );
  rij.appendChild(
    maakEl('span', 'font-black text-turkoois whitespace-nowrap', formatEuro(donatie.bedragPerKm * 100))
  );
  kolom.appendChild(rij);

  kolom.appendChild(
    maakEl('div', 'text-xs text-gray-400 mb-1', formatEuro(donatie.bedragPerKm) + ' per km')
  );

  if (donatie.publiek && donatie.bericht) {
    kolom.appendChild(
      maakEl('p', 'text-gray-500 text-sm italic break-words', '\u201C' + donatie.bericht + '\u201D')
    );
  }

  if (donatie.vraag) {
    const qa = maakEl('div', 'mt-3 pt-3 border-t border-gray-100 space-y-1');
    qa.appendChild(maakEl('p', 'text-xs text-gray-400 break-words', '❓ ' + donatie.vraag));
    if (donatie.antwoord) {
      qa.appendChild(maakEl('p', 'text-xs text-turkoois font-semibold break-words', '💬 Eva: ' + donatie.antwoord));
    } else {
      qa.appendChild(maakEl('p', 'text-xs text-gray-400 italic', 'Eva beantwoordt deze vraag zo snel mogelijk'));
    }
    kolom.appendChild(qa);
  }

  kaart.appendChild(avatar);
  kaart.appendChild(kolom);
  return kaart;
}
