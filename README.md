# Montel · Webflow embeds

Animations for the Montel website (montel.webflow.io), built by CXO Studio.
Served to Webflow through jsDelivr, pinned to a git tag so every release is immutable.

## Data page (`/data`)

| File | What it does |
|---|---|
| `dist/montel-data.min.css` | Hero map, coverage map, Data page layout glue |
| `dist/montel-data.min.js` | On /data only: swaps the hero image for the live hero map and the "Where you work" image for the catalogue animation, and runs the "Explore by country" coverage map |

Loaded on the Data page only (page settings, set through the Webflow API):

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/cxostudio/montel-webflow-embeds@vX.Y.Z/dist/montel-data.min.css" integrity="sha384-…" crossorigin="anonymous">
<!-- before </body> -->
<script src="https://cdn.jsdelivr.net/gh/cxostudio/montel-webflow-embeds@vX.Y.Z/dist/montel-data.min.js" integrity="sha384-…" crossorigin="anonymous"></script>
```

### What the coverage map reads from Webflow

- CMS collection **Countries**: `Code` (ISO 2), `Power/Gas/Carbon/Fundamentals products` (comma lists) and `… sources`.
- A Collection List whose items carry `data-mtl-cov-item`, `data-code`, `data-name`, `data-power`, `data-gas`, `data-carbon`, `data-fund`.
- A Code Embed containing `<div class="mtl-covmap" data-mtl-covmap data-default="NL"></div>`.

Content changes happen in the CMS only. Code changes: edit `src/`, run `build/build.sh`, commit, tag, update the URLs + SRI in Webflow.

## Layout

```
src/shared/     montel-map-data.js (Europe dot grid, Natural Earth), montel-map-borders.js (outlines, same projection)
src/data-page/  mount.js, montel-map.{js,css} (hero), montel-coverage-map.{js,css}, montel-catalogue.{js,css}, page.css
build/          build.sh (esbuild), build-map.js / build-borders.js (regenerate the geo data)
dist/           minified bundles served by jsDelivr
```

Map data: Natural Earth, public domain.

## Hero pages: Analytics, Risk, News

One bundle per page: `dist/montel-{analytics,risk,news}.min.{css,js}`. Each swaps the page hero image (`.page_hero__img_container`) for its animation and keeps the image's proportions. Under 760px each animation switches to its own stacked layout.

- Markup lives in `src/<page>-page/embed.html`. `build/gen-mounts.py` turns it into `mount.js` (run by `build/build.sh`).
- Photos and video live in `assets/risk/` and `assets/news/`. They load from the same commit as the bundle, so pinning the commit pins the assets too.

## Home hero: five tab slides

`dist/montel-home.min.{css,js}`. The five images in `.hero__tab_content` stay in the page, hidden, and the existing tab script keeps toggling them. Each live slide follows its image's `active` class, so the tab buttons, arrows and progress bars work unchanged.

- The frame around the tab body (border and drop shadow) is removed, so the cards sit directly on the hero background.
- Below 640px each slide crops to its main card, and cards that fall mostly outside the crop are hidden.
- Markup: `src/home-page/embed-*.html`, turned into `mount.js` by `build/gen-mounts.py`. Photos: `assets/home/`. Needs GSAP, which the site already loads.

## Home: design feedback R3 fixes (`fixes.js/.css`) and ecosystem card visuals (`eco-visuals.js/.css`)

Part of the home bundle. The site-wide scripts in Webflow stay untouched; where one misbehaves on the homepage, `fixes.js` switches it off and replaces it.

- Hero tabs: mint gradient hover on inactive tabs (desktop). Phone switcher: arrows disabled at the first/last tab, swipe on the panel, Figma styling.
- Ecosystem (992px and up): the site's ScrollTrigger pins/fades are killed and replaced by a sticky stack. All three cards share one height (520 to 640px, from the viewport), earlier cards shrink and fade (to 30%) as the next one covers them, "Market insights" is active on entry, the nav progress follows the scroll, and the stack holds on the last card while its bar fills (160px end spacer, on top of the section bottom padding) before releasing.
- Ecosystem (phone): same height for the three cards, swipe between them.
- Card 1: the slick flag column is replaced by a rail of 10 European markets (crisp SVG flags from flag-icons, MIT). It glides one flag every 3.6s while in view, pauses on hover, a click jumps to that flag; vertical on desktop, horizontal on tablet, hidden on phones like the original. The background image is replaced by a crisp Europe dot map (canvas, Natural Earth grid) that lights up the active country. On each change the Carbon, Gas and Power cards fly into the chart and back out with the new values. The chart, chips and sparklines morph to the active market.
- Electric border: loops 90deg to 450deg so it never jumps.
- Analysts: Figma layout on desktop on the page grid (text flush left, card grid flush right, staggered 180px cards, lilac glow), 120px top padding like the other sections.
- Testimonials: on the page grid (container cap removed, same for Analysts); arrow hover matches the gradient primary CTA (lighter gradient, white edge, arrow slides through); 700ms crossfade; company tabs no longer slide.
- Card visuals: market (card 1, follows the active flag via `MontelEco.setMarket(code|index)` and the `mtl:market` event), live imbalance (card 2), price scenarios (card 3, vertical: chips, scenario chart, portfolio value that follows the highlighted scenario; border removed, text centred). Run only on screen; reduced motion shows the final frame.
- Data section: the four stats count up from 0 when they enter the viewport (staggered, tabular figures, no layout shift; skipped for reduced motion).
- Data section visual (`data-visual.js`): "Signal from noise" replaces the radial-lines canvas. Scattered dots sweep left to right into one flowing forward curve when a third of the visual is on screen; dots flow along it, pulses travel it, the cursor scatters nearby dots. Four nodes sit under the four stats (evenly spread on phones) and light up as each count finishes (event `mtl:stat`). The old loop is stopped at its next frame, not just hidden. Stats already scrolled past (anchor link, fast jump) show their final number.
- Newsletter: the two flat art images are replaced by live CSS shapes in the same composition (edge arches, two circles). Each drifts and breathes on its own 18 to 26s cycle, the gradient light slowly shifts, light cursor parallax on desktop; static for reduced motion.
