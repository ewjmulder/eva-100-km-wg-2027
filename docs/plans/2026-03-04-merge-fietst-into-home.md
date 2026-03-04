# Design: Merge fietst pagina in homepage

## Doel

De "Eva Fietst!" pagina (`/fietst`) samenvoegen met de homepage, zodat de animatie en voortgang direct zichtbaar zijn bij het binnenkomen. De aparte pagina verdwijnt.

## Nieuwe homepage structuur

1. **Eva Fietst! sectie** (bovenaan) — lichte achtergrond (`from-sky-50 via-blue-50 to-green-50`), heading + fiets-animatie SVG + stats/voortgangsbalk + CTA knop
2. **Verhaal sectie** (ongewijzigd uit bestaande index.astro)
3. **DonatiesMeter component** (ongewijzigd)
4. **RecenteDonateurs component** (ongewijzigd)

De donkere Hero component (`Hero.astro`) verdwijnt van de homepage.

## Geraakte bestanden

- `src/components/Nav.astro` — `/fietst` verwijderen uit navItems
- `src/pages/index.astro` — Hero weg, fietst-inhoud inline bovenaan, rest blijft
- `src/pages/fietst.astro` — verwijderen

## Achtergrond

De homepage krijgt een lichte achtergrond die aansluit bij de rest van de site. De donkere hero-sectie met countdown verdwijnt; de fiets-animatie met voortgangsdata wordt het nieuwe visuele anker van de homepage.
