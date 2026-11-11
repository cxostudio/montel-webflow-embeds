/* Country outlines in the exact projection of the hero dot map, simplified, as compact path strings. */
const fs = require('fs'), tc = require('topojson-client'), d3 = require('d3-geo');
const topo = require('world-atlas/countries-50m.json');
const feats = tc.feature(topo, topo.objects.countries).features;
const W = 1000, H = 900;
const NAMES = {'Albania':'AL','Austria':'AT','Belgium':'BE','Bosnia and Herz.':'BA','Bulgaria':'BG','Croatia':'HR','Czechia':'CZ','Denmark':'DK','Estonia':'EE','Finland':'FI','France':'FR','Germany':'DE','Greece':'GR','Hungary':'HU','Ireland':'IE','Italy':'IT','Latvia':'LV','Lithuania':'LT','Luxembourg':'LU','Montenegro':'ME','Netherlands':'NL','Macedonia':'MK','Norway':'NO','Poland':'PL','Portugal':'PT','Romania':'RO','Serbia':'RS','Slovakia':'SK','Slovenia':'SI','Spain':'ES','Sweden':'SE','Switzerland':'CH','United Kingdom':'GB','Kosovo':'XK','Ukraine':'UA','Belarus':'BY','Turkey':'TR','Moldova':'MD'};
const proj = d3.geoAzimuthalEqualArea().rotate([-11, -52]);
proj.fitExtent([[20, 20], [W - 20, H - 20]], { type: 'MultiPoint', coordinates: [[-10.5, 36], [30, 36], [-10, 70.5], [31, 70.5], [10, 35], [10, 71.2]] });
const clip = d3.geoClipRectangle(-40, -40, W + 40, H + 40);
const tol = +(process.argv[2] || 1.6);
/* Douglas-Peucker on projected rings */
function dp(pts, eps) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const out = {};
for (const f of feats) {
  const code = NAMES[f.properties.name]; if (!code) continue;
  const stream = proj.stream; let rings = [], cur = null;
  const sink = { point(x, y) { cur.push([x, y]); }, lineStart() { cur = []; }, lineEnd() { if (cur.length > 2) rings.push(cur); }, polygonStart() {}, polygonEnd() {}, sphere() {} };
  d3.geoStream(f, proj.stream(clip(sink)));
  let d = '';
  for (const r of rings) {
    const s = dp(r, tol); if (s.length < 3) continue;
    let area = 0; for (let i = 0; i < s.length; i++) { const p = s[i], q = s[(i + 1) % s.length]; area += p[0] * q[1] - q[0] * p[1]; }
    if (Math.abs(area) / 2 < 12) continue;               /* drop specks */
    let px = Math.round(s[0][0]), py = Math.round(s[0][1]);
    d += 'M' + px + ' ' + py;
    for (let i = 1; i < s.length; i++) { const x = Math.round(s[i][0]), y = Math.round(s[i][1]); if (x === px && y === py) continue; d += 'l' + (x - px) + ' ' + (y - py); px = x; py = y; }
    d += 'z';
  }
  if (d) out[code] = d.replace(/ -/g, '-').replace(/l(-?\d+) /g, 'l$1 ');
}
const js = 'window.MontelMapBorders=' + JSON.stringify(out) + ';\n';
fs.writeFileSync(__dirname + '/../src/montel-map-borders.js', js);
console.log('borders', js.length, Object.keys(out).length);
