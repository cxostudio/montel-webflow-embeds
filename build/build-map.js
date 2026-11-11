/* Builds the Europe dot-grid data from Natural Earth (public domain, via world-atlas). */
const fs = require('fs');
const tc = require('topojson-client');
const d3 = require('d3-geo');
const topo = require('world-atlas/countries-50m.json');
const feats = tc.feature(topo, topo.objects.countries).features;

const W = 1000, H = 900, S = 8;
const CORE = ['Albania','Austria','Belgium','Bosnia and Herz.','Bulgaria','Croatia','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Montenegro','Netherlands','Macedonia','Norway','Poland','Portugal','Romania','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','United Kingdom','Kosovo'];
const FADED = ['Ukraine','Belarus','Russia','Turkey','Moldova'];
const CODES = {'Albania':'AL','Austria':'AT','Belgium':'BE','Bosnia and Herz.':'BA','Bulgaria':'BG','Croatia':'HR','Czechia':'CZ','Denmark':'DK','Estonia':'EE','Finland':'FI','France':'FR','Germany':'DE','Greece':'GR','Hungary':'HU','Ireland':'IE','Italy':'IT','Latvia':'LV','Lithuania':'LT','Luxembourg':'LU','Montenegro':'ME','Netherlands':'NL','Macedonia':'MK','Norway':'NO','Poland':'PL','Portugal':'PT','Romania':'RO','Serbia':'RS','Slovakia':'SK','Slovenia':'SI','Spain':'ES','Sweden':'SE','Switzerland':'CH','United Kingdom':'GB','Kosovo':'XK','Ukraine':'UA','Belarus':'BY','Russia':'RU','Turkey':'TR','Moldova':'MD'};
/* anchor points (lon, lat) for markets the hero focuses on, and a few neighbours */
const ANCHOR = { DE:[10.2,51.0], FR:[2.4,46.7], ES:[-3.6,40.0], NO:[8.6,60.6], IT:[12.2,43.0], GB:[-1.8,52.8], NL:[5.6,52.2], BE:[4.6,50.6], CH:[8.2,46.8], AT:[14.4,47.6], PL:[19.2,52.0], DK:[9.2,56.0], SE:[15.0,62.5], CZ:[15.4,49.8], PT:[-8.1,39.6], SI:[14.8,46.1], GR:[22.0,39.4], FI:[26,62.5] };

const proj = d3.geoAzimuthalEqualArea().rotate([-11, -52]);
proj.fitExtent([[20, 20], [W - 20, H - 20]], { type: 'MultiPoint', coordinates: [[-10.5, 36], [30, 36], [-10, 70.5], [31, 70.5], [10, 35], [10, 71.2]] });

const pick = feats.filter(f => CORE.includes(f.properties.name) || FADED.includes(f.properties.name));
const countries = pick.map(f => {
  const code = CODES[f.properties.name];
  let c = ANCHOR[code];
  if (!c) {   // centroid of the largest polygon
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    let best = null, ba = -1;
    polys.forEach(p => { const g = { type: 'Polygon', coordinates: p }; const a = d3.geoArea(g); if (a > ba) { ba = a; best = g; } });
    c = d3.geoCentroid(best);
  }
  const [x, y] = proj(c);
  return { name: f.properties.name === 'United Kingdom' ? 'Great Britain' : f.properties.name, code, faded: FADED.includes(f.properties.name), x: Math.round(x), y: Math.round(y), f, b: d3.geoBounds(f) };
});

const rows = [];
let total = 0;
for (let r = 0; r * S * .866 < H; r++) {
  const y = r * S * .866, off = r % 2 ? S / 2 : 0, runs = [];
  let cur = null;
  for (let c = 0; c * S + off < W; c++) {
    const x = c * S + off, ll = proj.invert([x, y]);
    let ci = -1, w = 9;
    if (ll) for (let i = 0; i < countries.length; i++) {
      const k = countries[i], b = k.b;
      if (ll[1] < b[0][1] || ll[1] > b[1][1]) continue;
      if (b[0][0] <= b[1][0] && (ll[0] < b[0][0] || ll[0] > b[1][0])) continue;
      if (d3.geoContains(k.f, ll)) { ci = i; break; }
    }
    if (ci >= 0 && countries[ci].faded) w = Math.max(0, Math.min(9, Math.round(9 * (1 - (ll[0] - 22) / 14) * (ll[1] < 42 ? (1 - (42 - ll[1]) / 6) : 1))));
    if (ci >= 0 && w === 0) ci = -1;
    if (ci >= 0) total++;
    if (cur && ci === cur[2] && w === cur[3] && c === cur[0] + cur[1]) cur[1]++;
    else { if (cur && cur[2] >= 0) runs.push(cur); cur = [c, 1, ci, w]; }
  }
  if (cur && cur[2] >= 0) runs.push(cur);
  rows.push(runs.map(x => x.join(',')).join(';'));
}
const out = {
  w: W, h: H, s: S,
  countries: countries.map(k => ({ name: k.name, code: k.code, faded: k.faded ? 1 : 0, x: k.x, y: k.y })),
  rows: rows.join('|')
};
const js = '/* Montel map data · Europe dot grid built from Natural Earth (public domain). Generated, do not edit. */\nwindow.MontelMapData=' + JSON.stringify(out) + ';\n';
fs.writeFileSync('/home/claude/map/src/montel-map-data.js', js);
console.log('dots', total, 'chars', js.length, 'countries', countries.length);
