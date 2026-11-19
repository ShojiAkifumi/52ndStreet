(() => {
'use strict';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stableVH = () => document.documentElement.clientHeight || window.innerHeight;
const onViewResize = (fn) => {
let w = window.innerWidth, h = stableVH();
window.addEventListener('resize', () => {
const nw = window.innerWidth, nh = stableVH();
if (nw === w && nh === h) return;
w = nw; h = nh;
fn();
});
};
const saStyle = document.createElement('style');
document.head.appendChild(saStyle);
const saRules = new Map();
let saVer = 0;
const setScrollAnim = (key, selector, prop, points, extra = null) => {
if (!points) { saRules.delete(key); saStyle.textContent = [...saRules.values()].join('\n'); return; }
const y0 = points[0][0], y1 = points[points.length - 1][0];
const span = y1 - y0 || 1;
const name = `sa-${key}-${++saVer}`;
const kf = points.map(([y, v]) => `${(((y - y0) / span) * 100).toFixed(4)}%{${prop}:${v}}`).join('');
const anim = extra ? `${extra.animation}, ${name} linear both` : `${name} linear both`;
const timeline = extra ? 'auto, scroll(root block)' : 'scroll(root block)';
const range = extra ? `normal, ${y0.toFixed(1)}px ${y1.toFixed(1)}px` : `${y0.toFixed(1)}px ${y1.toFixed(1)}px`;
saRules.set(key, `@keyframes ${name}{${kf}}${selector}{animation:${anim};animation-timeline:${timeline};animation-range:${range}}`);
saStyle.textContent = [...saRules.values()].join('\n');
};
const LOADER = { minFirst: 1800, minRepeat: 500, max: 4000, fade: 900 };
const rootEl = document.documentElement;
const loaderEl = document.querySelector('.loader');
const loaderActive = () => rootEl.classList.contains('is-loading');
const whenLoaderDone = new Promise((resolve) => {
if (!loaderEl || !loaderActive()) { resolve(); return; }
document.addEventListener('loader:done', () => resolve(), { once: true });
setTimeout(() => { if (!loaderActive()) resolve(); }, 6100);
});
if (loaderEl && loaderActive()) {
const heroLogo = document.querySelector('.hero__logo img');
const loaderInner = loaderEl.querySelector('.loader__inner');
const loaderLogo = loaderEl.querySelector('.loader__logo');
const alignToHero = () => {
if (!heroLogo || !loaderInner || !loaderLogo || !loaderActive()) return;
loaderInner.style.transform = '';
const h = heroLogo.getBoundingClientRect();
const l = loaderLogo.getBoundingClientRect();
const dx = h.left - l.left;
const dy = h.top - l.top;
if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) loaderInner.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
};
alignToHero();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignToHero).catch(() => {});
window.addEventListener('resize', alignToHero);
window.addEventListener('load', alignToHero, { once: true });
const minShow = rootEl.classList.contains('is-loading-quick') ? LOADER.minRepeat : LOADER.minFirst;
const pageLoaded = new Promise((r) => {
if (document.readyState === 'complete') r();
else window.addEventListener('load', r, { once: true });
});
const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
const cap = new Promise((r) => setTimeout(r, LOADER.max));
const fill = loaderEl.querySelector('.loader__fill');
const pct = loaderEl.querySelector('.loader__pct');
const imgs = [...document.images].filter((im) => im.loading !== 'lazy');
let done = 0;
let fontsDone = false;
let pageDone = false;
let forceFull = false;
const total = imgs.length + 2;
imgs.forEach((im) => {
if (im.complete) { done++; return; }
const fin = () => { done++; };
im.addEventListener('load', fin, { once: true });
im.addEventListener('error', fin, { once: true });
});
fontsReady.then(() => { fontsDone = true; });
pageLoaded.then(() => { pageDone = true; });
let shown = 0;
const target = () => {
if (forceFull) return 1;
const real = (done + (fontsDone ? 1 : 0) + (pageDone ? 1 : 0)) / total;
const time = Math.min(1, performance.now() / Math.max(1, minShow));
return Math.min(real, time, 0.98);
};
const paint = () => {
const t = target();
shown = reduceMotion.matches ? t : shown + (t - shown) * 0.18;
if (t - shown < 0.002) shown = t;
if (fill) fill.style.transform = `scaleX(${shown.toFixed(4)})`;
if (pct) pct.textContent = `${Math.round(shown * 100)}%`;
};
let progressRaf = 0;
const loop = () => { paint(); if (loaderActive()) progressRaf = requestAnimationFrame(loop); };
progressRaf = requestAnimationFrame(loop);
const fillToEnd = () => new Promise((resolve) => {
forceFull = true;
const t0 = performance.now();
const check = () => {
paint();
if (shown >= 0.999 || performance.now() - t0 > 400) { shown = 1; paint(); resolve(); return; }
setTimeout(check, 30);
};
check();
});
Promise.race([Promise.all([pageLoaded, fontsReady]), cap]).then(() => {
const wait = Math.max(0, minShow - performance.now());
setTimeout(async () => {
await fillToEnd();
cancelAnimationFrame(progressRaf);
rootEl.classList.add('loader-out');
rootEl.classList.remove('is-loading');
try { sessionStorage.setItem('loaderSeen', '1'); } catch (e) { /* noop */ }
document.dispatchEvent(new Event('loader:done'));
setTimeout(() => {
rootEl.classList.remove('loader-out');
loaderEl.remove();
}, LOADER.fade + 100);
}, wait);
});
}
const PHOTO_STEP = { early: 700, dur: 2700, stagger: 0.25 };
const REVEAL = {
titles: 'main .h1, main .h2, main .jz-intro__title',
parts: [
'.breadcrumb', '.tabs', '.eyebrow', '.lead', 'p.small', '.note', '.chip-list', '.rule',
'.btn-row', '.btn', '.signature',
'.media', '.welcome__photo', '.map',
'.vision', '.access-dl', '.dress-img',
'.live-card', '.jz-card', '.menu-card', '.goods__item', '.gallery', '.photo-grid',
'.box', '.plan', '.svc', '.steps > li', '.tbl', '.week', '.cmp-wrap', '.lines', '.row',
'.accordion', '.live-item', '.toolbar', '.news-item', '.pager', '.news-side',
'.sitemap__group', '.timeline > li', '.contact-links', '.form', '.cta-band',
'main .grid > article', 'main .grid > a',
'main #concept .link-arrow',
].map((s) => (s.startsWith('main') ? s : `main ${s}`)).join(','),
order: {
'#welcome': ['.h2, .eyebrow, .rule', '.lead', '.btn-row', { sel: '.welcome__photo', dur: 2000 }],
'#live': ['.h2, .eyebrow, .sec-head .btn', { sel: '.live-card', early: 0 }],
'#jazz': ['.jz-intro__title, .eyebrow, .rule, .jz-card'],
'#concept': ['.h2, .eyebrow, .rule', '.lead', { sel: '.concept-photos img', ...PHOTO_STEP, early: undefined, with: true }, '.link-arrow'],
},
orderSp: {
'#welcome': ['.h2, .eyebrow, .rule', { sel: '.welcome__photo', dur: 1200 }, '.lead', '.btn-row'],
'#concept': [{ sel: '.concept-photos img', dur: 1200 }, '.h2, .eyebrow, .rule', '.lead', '.link-arrow'],
},
overlap: 300,
waitMax: 3000,
charDur: 700,
partDur: 900,
charStep: 45,
charTotal: 1100,
eyebrowStep: 30, eyebrowDur: 450,
titleGap: 200,
titleGapTop: 0,
heroImgDur: 5400,
stagger: 0.08,
staggerMax: 0.48,
};
const animOn = document.documentElement.classList.contains('anim');
const h1Only = document.documentElement.classList.contains('anim--h1');
if (window.matchMedia('(max-width: 900px)').matches) Object.assign(REVEAL.order, REVEAL.orderSp);
if (h1Only) {
REVEAL.titles = 'main .page-hero .eyebrow, main .h1';
REVEAL.parts = 'main .page-hero__inner--split > :is(.media, .video)';
REVEAL.order = { '.page-hero': ['.eyebrow', { sel: '.h1, .page-hero__inner--split > :is(.media, .video)', early: REVEAL.eyebrowDur - REVEAL.titleGap, together: true, dur: REVEAL.heroImgDur }] };
}
document.querySelectorAll('.tabs a').forEach((a) => {
a.addEventListener('click', () => { try { sessionStorage.setItem('skipTitleAnim', '1'); } catch (e) { /* 保存できなければ通常どおり */ } });
});
window.__revealReady = true;
if (animOn) {
const splitChars = (node, chars) => {
[...node.childNodes].forEach((n) => {
if (n.nodeType === 3) {
const frag = document.createDocumentFragment();
for (const ch of n.textContent) {
if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
const s = document.createElement('span');
s.className = 'char';
s.textContent = ch;
chars.push(s);
frag.appendChild(s);
}
n.replaceWith(frag);
} else if (n.nodeType === 1 && n.tagName !== 'BR') {
splitChars(n, chars);
}
});
};
const titles = [...document.querySelectorAll(REVEAL.titles)];
titles.forEach((t) => {
const chars = [];
splitChars(t, chars);
const fast = t.classList.contains('eyebrow');
const step = fast ? REVEAL.eyebrowStep : Math.min(REVEAL.charStep, REVEAL.charTotal / Math.max(1, chars.length));
chars.forEach((c, i) => c.style.setProperty('--ci', `${Math.round(i * step)}ms`));
if (fast) t.style.setProperty('--cdur', `${REVEAL.eyebrowDur}ms`);
t.classList.add('split-title');
});
const parts = [];
document.querySelectorAll(REVEAL.parts).forEach((el) => {
if (el.closest('.split-title, .hero__inner') || (el.parentElement && el.parentElement.closest('[data-reveal]'))) return;
el.setAttribute('data-reveal', '');
parts.push(el);
});
document.documentElement.classList.add('reveal-marked');
const groups = new Map();
parts.forEach((el) => {
const key = el.parentElement;
const n = groups.get(key) || 0;
groups.set(key, n + 1);
el.style.setProperty('--rd', `${Math.min(n * REVEAL.stagger, REVEAL.staggerMax).toFixed(2)}s`);
});
const targets = [...titles, ...parts];
const stepOf = new Map();
Object.entries(REVEAL.order).forEach(([secSel, steps]) => {
const sec = document.querySelector(secSel);
if (!sec) return;
let step = -1;
steps.forEach((entry) => {
const { sel, together, early, dur, stagger, with: same } = typeof entry === 'string' ? { sel: entry } : entry;
if (!same || step < 0) step++;
[...sec.querySelectorAll(sel)].filter((el) => targets.includes(el)).forEach((el, k) => {
stepOf.set(el, { sec, step, overlap: early ?? REVEAL.overlap, noWait: !!same });
if ((step > 0 || together || stagger != null) && el.hasAttribute('data-reveal')) {
const gap = together ? 0 : Math.min(k * (stagger ?? REVEAL.stagger), REVEAL.staggerMax);
el.style.setProperty('--rd', `${gap.toFixed(2)}s`);
}
if (dur && el.hasAttribute('data-reveal')) el.style.setProperty('--rdur', `${dur}ms`);
});
});
});
if (!h1Only) {
const ordered = Object.keys(REVEAL.order).map((q) => document.querySelector(q)).filter(Boolean);
document.querySelectorAll('main section').forEach((sec) => {
if (ordered.includes(sec) || ordered.some((o) => o.contains(sec) || sec.contains(o))) return;
const inSec = targets.filter((el) => sec.contains(el) && !stepOf.has(el));
const heads = inSec.filter((el) => el.classList.contains('split-title'));
if (!heads.length) return;
const headBox = (t) => t.closest('.sec-head') || t.parentElement;
const isHeadPart = (t, el) => (t.closest('.sec-head') ? true : el.matches('.eyebrow, .rule') && el.parentElement === t.parentElement);
heads.forEach((t) => {
stepOf.set(t, { sec: t, step: 0, overlap: REVEAL.overlap });
inSec.filter((el) => el !== t && headBox(t).contains(el) && isHeadPart(t, el) && !heads.some((h) => h !== t && headBox(h).contains(el)))
.forEach((el) => stepOf.set(el, { sec: t, step: 0, overlap: REVEAL.overlap }));
});
inSec.filter((el) => !stepOf.has(el)).forEach((el) => {
const prev = heads.filter((t) => t.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop() || heads[0];
stepOf.set(el, { sec: prev, step: 1, overlap: -REVEAL.titleGapTop });
});
});
}
whenLoaderDone.then(() => {
if ('IntersectionObserver' in window) {
const endsAt = new WeakMap();
const finishTime = (el, now) => {
if (el.classList.contains('split-title')) {
const chars = el.querySelectorAll('.char');
const ci = chars.length ? parseFloat(chars[chars.length - 1].style.getPropertyValue('--ci')) || 0 : 0;
return now + ci + (parseFloat(el.style.getPropertyValue('--cdur')) || REVEAL.charDur);
}
const dur = parseFloat(el.style.getPropertyValue('--rdur')) || REVEAL.partDur;
return now + (parseFloat(el.style.getPropertyValue('--rd')) || 0) * 1000 + dur;
};
const reveal = (el) => {
el.classList.add('is-inview');
if (!endsAt.has(el)) endsAt.set(el, finishTime(el, performance.now()));
if (el.hasAttribute('data-reveal')) {
const done = (e) => {
if (e.target !== el || e.propertyName !== 'opacity') return;
el.removeEventListener('transitionend', done);
el.removeAttribute('data-reveal');
el.classList.remove('is-inview');
el.style.removeProperty('--rd');
el.style.removeProperty('--rdur');
};
el.addEventListener('transitionend', done);
}
};
const revealInOrder = (el) => {
const { sec, step, overlap } = stepOf.get(el);
const now = performance.now();
let until = now;
stepOf.forEach((s, t) => {
if (s.sec !== sec || s.step >= step || s.noWait) return;
const end = endsAt.get(t);
if (end && end - overlap > until) until = end - overlap;
});
endsAt.set(el, finishTime(el, until));
if (until <= now) reveal(el);
else setTimeout(() => reveal(el), until - now);
};
const waiting = new Map();
let waitTimer = 0;
const prevStarted = (el) => {
const { sec, step } = stepOf.get(el);
for (const [t, s] of stepOf) {
if (s.sec !== sec || s.step >= step || s.noWait || endsAt.has(t)) continue;
if (!t.getClientRects().length || t.getBoundingClientRect().bottom <= 0) continue;
return false;
}
return true;
};
const tryWaiting = () => {
waiting.forEach((since, el) => {
if (prevStarted(el) || performance.now() - since > REVEAL.waitMax) { waiting.delete(el); revealInOrder(el); }
});
if (waiting.size && !waitTimer) waitTimer = setTimeout(() => { waitTimer = 0; tryWaiting(); }, 200);
};
window.addEventListener('scroll', () => {
if (!waiting.size) return;
const now = performance.now();
waiting.forEach((_, el) => waiting.set(el, now));
}, { passive: true });
const io = new IntersectionObserver((entries) => {
const seen = [];
entries.forEach((en) => {
if (!en.isIntersecting) return;
const row = en.target.parentElement && en.target.parentElement.matches('.live-cards, .goods, .jz-track')
? [...en.target.parentElement.children].filter((c) => c.hasAttribute('data-reveal') && !c.classList.contains('is-inview'))
: [en.target];
row.forEach((el) => { io.unobserve(el); seen.push(el); });
});
const stepNum = (el) => (stepOf.has(el) ? stepOf.get(el).step : 0);
seen.sort((a, b) => stepNum(a) - stepNum(b)).forEach((el) => {
if (stepNum(el) === 0) reveal(el);
else waiting.set(el, performance.now());
});
tryWaiting();
}, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
targets.forEach((el) => io.observe(el));
let pending = targets.slice();
let raf = 0;
const sweep = () => {
raf = 0;
pending = pending.filter((el) => {
if (el.classList.contains('is-inview')) return false;
if (el.getBoundingClientRect().bottom > 0) return true;
el.classList.add('is-inview');
io.unobserve(el);
if (el.hasAttribute('data-reveal')) {
el.removeAttribute('data-reveal');
el.style.removeProperty('--rd');
el.style.removeProperty('--rdur');
el.classList.remove('is-inview');
}
return false;
});
if (!pending.length) window.removeEventListener('scroll', onSweep);
};
const onSweep = () => { if (!raf) raf = requestAnimationFrame(sweep); };
window.addEventListener('scroll', onSweep, { passive: true });
} else {
targets.forEach((el) => el.classList.add('is-inview'));
}
});
}
const SKY = {
density: 1 / 2200,
maxStars: 650,
dprMax: 1,
keepMargin: '600px 0px',
dropMargin: '1600px 0px',
periodMin: 5,
periodMax: 13,
fps: 24,
scrollRest: 250,
glintShare: 0.5,
glintMin: 4,
glintMax: 9,
parallaxNear: 260,
parallaxFar: 620,
nebulaShift: 800,
refRange: 1100,
layers: 3,
colors: [[255, 252, 244, 0.62], [232, 214, 168, 0.24], [190, 205, 255, 0.14]],
};
const seeded = (seed) => () => {
seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sprite = (r, g, b) => {
const c = document.createElement('canvas');
c.width = c.height = 64;
const x = c.getContext('2d');
const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
gr.addColorStop(0.1, `rgba(${r},${g},${b},.9)`);
gr.addColorStop(0.22, `rgba(${r},${g},${b},.28)`);
gr.addColorStop(0.5, `rgba(${r},${g},${b},.06)`);
gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
x.fillStyle = gr;
x.fillRect(0, 0, 64, 64);
return c;
};
const skies = [...document.querySelectorAll('.night-sky')];
if (skies.length && document.createElement('canvas').getContext) {
const sprites = SKY.colors.map(([r, g, b]) => sprite(r, g, b));
const pickColor = (v) => {
let acc = 0;
for (let i = 0; i < SKY.colors.length; i++) { acc += SKY.colors[i][3]; if (v < acc) return i; }
return 0;
};
const tl = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
const layerAmp = (li) => SKY.parallaxFar + (SKY.parallaxNear - SKY.parallaxFar) * ((li + 0.5) / SKY.layers);
const state = skies.map((el, i) => {
const rnd = seeded(1000 + i * 7919);
el.style.setProperty('--n1x', `${10 + rnd() * 35}%`);
el.style.setProperty('--n1y', `${10 + rnd() * 50}%`);
el.style.setProperty('--n2x', `${55 + rnd() * 35}%`);
el.style.setProperty('--n2y', `${40 + rnd() * 50}%`);
el.style.setProperty('--n3x', `${30 + rnd() * 50}%`);
el.style.setProperty('--n3y', `${5 + rnd() * 30}%`);
const old = el.querySelector('canvas');
const wrap = document.createElement('div');
wrap.className = 'night-sky__stars';
const layers = Array.from({ length: SKY.layers }, (_, li) => {
const canvas = document.createElement('canvas');
canvas.className = 'night-sky__layer';
canvas.width = canvas.height = 0;
const base = layerAmp(li);
wrap.appendChild(canvas);
return { canvas, ctx: canvas.getContext('2d'), base, amp: base, stars: [] };
});
if (old) old.replaceWith(wrap); else el.appendChild(wrap);
const pinSec = el.closest('.jz-pin') && el.closest('[data-hscroll]');
return { el, layers, pinSec, anims: [], tl: tl && !reduceMotion.matches, range: '', alloc: false, seed: 5000 + i * 104729, visible: false, w: 0, h: 0, dpr: 1 };
});
const measure = (s) => {
if (!s.tl) return;
if (s.pinSec && measurePinned(s)) return;
const r = s.el.getBoundingClientRect();
const top = r.top + window.scrollY;
const from = Math.round(top - stableVH()), to = Math.round(top + r.height);
const range = `${from} ${to}`;
if (range === s.range) return;
s.range = range;
s.el.classList.remove('is-tl');
s.el.style.setProperty('--sky-s', `${from}px`);
s.el.style.setProperty('--sky-e', `${to}px`);
void s.el.offsetWidth;
s.el.classList.add('is-tl');
};
const measurePinned = (s) => {
const sec = s.pinSec;
const pin = s.el.closest('.jz-pin');
const travel = sec.classList.contains('is-hscroll') ? sec.offsetHeight - pin.offsetHeight : 0;
if (travel <= 0) {
if (s.anims.length) { s.anims.forEach((k) => setScrollAnim(k)); s.anims = []; }
return false;
}
const vh = stableVH();
const secTop = sec.getBoundingClientRect().top + window.scrollY;
const pinStart = secTop - (parseFloat(getComputedStyle(pin).top) || 0);
const pinEnd = pinStart + travel;
const from = secTop - vh, to = secTop + s.el.offsetHeight;
const key = `pin ${Math.round(from)} ${Math.round(to)} ${Math.round(travel)} ${s.layers.map((L) => L.amp.toFixed(1)).join(',')}`;
if (key === s.range && s.anims.length) return true;
s.range = key;
const prog = (y) => {
const yy = y < pinStart ? y : y < pinEnd ? pinStart : y - travel;
return Math.min(1, Math.max(0, (yy - from) / (to - from)));
};
const ys = [from, pinStart, pinEnd, to + travel].sort((a, b) => a - b).filter((y, i, a) => i === 0 || y > a[i - 1]);
const pts = (amp, fmt) => ys.map((y) => [y, fmt((-amp + 2 * amp * prog(y)).toFixed(1))]);
s.el.classList.remove('is-tl');
const id = s.el.dataset.sky || (s.el.dataset.sky = `p${state.indexOf(s)}`);
s.anims = [];
s.layers.forEach((L, li) => {
L.canvas.dataset.sky = `${id}-${li}`;
setScrollAnim(`${id}-${li}`, `[data-sky="${id}-${li}"]`, 'transform', pts(L.amp, (v) => `translate3d(0,${v}px,0)`));
s.anims.push(`${id}-${li}`);
});
setScrollAnim(`${id}-neb`, `.night-sky[data-sky="${id}"]::before`, 'translate', pts(s.neb || 0, (v) => `0 ${v}px`),
{ animation: 'nebulaBreath 24s ease-in-out infinite alternate' });
s.anims.push(`${id}-neb`);
return true;
};
const layout = (s) => {
const w = s.el.clientWidth, h = s.el.clientHeight;
if (!w || !h) return;
const dpr = Math.min(window.devicePixelRatio || 1, SKY.dprMax);
s.w = w; s.h = h; s.dpr = dpr;
const rnd = seeded(s.seed);
const scale = (stableVH() + h) / SKY.refRange;
s.layers.forEach((L) => {
L.stars = [];
L.amp = L.base * scale;
L.canvas.style.setProperty('--amp', `${L.amp.toFixed(1)}px`);
});
s.neb = SKY.nebulaShift * scale;
s.el.style.setProperty('--neb', `${s.neb.toFixed(1)}px`);
const pad = Math.max(...s.layers.map((L) => L.amp));
const n = Math.round(Math.min(SKY.maxStars, w * h * SKY.density) * (h + 2 * pad) / h);
for (let k = 0; k < n; k++) {
const big = rnd() < 0.06;
const r = big ? 1.1 + rnd() * 0.9 : 0.35 + Math.pow(rnd(), 2) * 0.75;
const st = {
x: rnd() * w,
y: rnd() * (h + 2 * pad) - pad,
r,
a: big ? 0.75 + rnd() * 0.25 : 0.3 + rnd() * 0.55,
low: 0.12 + rnd() * 0.3,
p: SKY.periodMin + rnd() * (SKY.periodMax - SKY.periodMin),
ph: rnd() * Math.PI * 2,
c: pickColor(rnd()),
gp: big && rnd() < SKY.glintShare ? SKY.glintMin + rnd() * (SKY.glintMax - SKY.glintMin) : 0,
go: rnd() * 10,
};
const z = Math.min(0.999, (r - 0.35) / 1.65 * 0.7 + rnd() * 0.3);
s.layers[Math.floor(z * SKY.layers)].stars.push(st);
}
measure(s);
if (s.alloc || s.near) alloc(s, true);
};
const alloc = (s, force = false) => {
if (!s.w || (s.alloc && !force)) return;
s.alloc = true;
s.layers.forEach((L) => {
L.canvas.width = Math.round(s.w * s.dpr);
L.canvas.height = Math.round((s.h + 2 * L.amp) * s.dpr);
});
draw(s, performance.now() / 1000, true);
};
const release = (s) => {
if (!s.alloc) return;
s.alloc = false;
s.layers.forEach((L) => { L.canvas.width = 0; L.canvas.height = 0; });
};
const scrollPos = (s) => {
const r = s.el.getBoundingClientRect();
const vh = stableVH();
const p = (vh - r.top) / (vh + r.height);
return 1 - 2 * Math.min(1, Math.max(0, p));
};
const draw = (s, t, full = false) => {
if (!s.alloc) return;
const { dpr } = s;
const vh = stableVH();
const sky = s.el.getBoundingClientRect();
s.layers.forEach((L) => {
const { ctx, amp } = L;
const H = s.h + 2 * amp;
let y0 = 0, y1 = H;
if (!full) {
const r = L.canvas.getBoundingClientRect();
y0 = Math.max(0, Math.max(0, sky.top) - r.top - 24);
y1 = Math.min(H, Math.min(vh, sky.bottom) - r.top + 24);
if (y1 <= y0) return;
}
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
ctx.save();
ctx.beginPath();
ctx.rect(0, y0, s.w, y1 - y0);
ctx.clip();
ctx.clearRect(0, y0, s.w, y1 - y0);
for (const st of L.stars) {
const sy = st.y + amp;
if (sy < y0 - 40 || sy > y1 + 40) continue;
const wave = reduceMotion.matches ? 0.75 : 0.5 + 0.5 * Math.sin((t / st.p) * Math.PI * 2 + st.ph);
const eased = wave * wave * (3 - 2 * wave);
const y = st.y + amp;
const d = st.r * 8;
ctx.globalAlpha = st.a * (st.low + (1 - st.low) * eased);
ctx.drawImage(sprites[st.c], st.x - d / 2, y - d / 2, d, d);
if (st.gp && !reduceMotion.matches) {
const ph = ((t + st.go) % st.gp) / st.gp;
if (ph > 0.88) {
const g = Math.sin(((ph - 0.88) / 0.12) * Math.PI);
const gd = d * (1 + 2.2 * g);
ctx.globalAlpha = Math.min(1, 0.95 * g);
ctx.drawImage(sprites[0], st.x - gd / 2, y - gd / 2, gd, gd);
}
}
}
ctx.globalAlpha = 1;
ctx.restore();
});
};
const follow = (s) => {
const k = scrollPos(s);
if (k === s.k) return;
s.k = k;
s.layers.forEach((L) => { L.canvas.style.transform = `translate3d(0, ${(-L.amp * k).toFixed(1)}px, 0)`; });
s.el.style.setProperty('--sky-shift', `${(-(s.neb || 0) * k).toFixed(2)}px`);
};
const io = new IntersectionObserver((entries) => {
entries.forEach((en) => {
const s = state.find((x) => x.el === en.target);
if (s) s.visible = en.isIntersecting;
});
}, { rootMargin: '100px 0px' });
const keep = new IntersectionObserver((entries) => {
entries.forEach((en) => {
const s = state.find((x) => x.el === en.target);
if (!s) return;
s.near = en.isIntersecting;
if (s.near) alloc(s);
});
}, { rootMargin: SKY.keepMargin });
const drop = new IntersectionObserver((entries) => {
entries.forEach((en) => {
const s = state.find((x) => x.el === en.target);
if (s && !en.isIntersecting) release(s);
});
}, { rootMargin: SKY.dropMargin });
const ro = new ResizeObserver((entries) => {
entries.forEach((en) => {
const s = state.find((x) => x.el === en.target);
if (s) layout(s);
});
});
state.forEach((s) => { io.observe(s.el); keep.observe(s.el); drop.observe(s.el); ro.observe(s.el); });
onViewResize(() => state.forEach(layout));
if (tl) {
const remeasure = () => state.forEach(measure);
new ResizeObserver(remeasure).observe(document.body);
onViewResize(remeasure);
window.addEventListener('load', remeasure);
}
if (!reduceMotion.matches) {
let last = 0;
let scrolledAt = -1e9;
window.addEventListener('scroll', () => { scrolledAt = performance.now(); }, { passive: true });
const frame = (now) => {
requestAnimationFrame(frame);
const tick = now - last >= 1000 / SKY.fps && now - scrolledAt > SKY.scrollRest;
if (tick) last = now;
state.forEach((s) => {
if (!s.visible || !s.w) return;
if (!tl) follow(s);
if (tick) draw(s, now / 1000);
});
};
requestAnimationFrame(frame);
}
}
const drawer = document.getElementById('drawer');
const openBtn = document.querySelector('.menu-toggle');
const closeBtn = drawer && drawer.querySelector('.menu-close');
if (drawer && openBtn && closeBtn) {
let hideTimer = 0;
const setOpen = (open) => {
clearTimeout(hideTimer);
openBtn.setAttribute('aria-expanded', String(open));
document.body.classList.toggle('is-drawer-open', open);
if (open) {
drawer.hidden = false;
void drawer.offsetWidth;
drawer.classList.add('is-open');
closeBtn.focus({ preventScroll: true });
} else {
drawer.classList.remove('is-open');
const ms = reduceMotion.matches ? 0 : parseFloat(getComputedStyle(drawer).transitionDuration) * 1000 || 0;
hideTimer = setTimeout(() => { drawer.hidden = true; }, ms);
openBtn.focus({ preventScroll: true });
}
};
openBtn.addEventListener('click', () => setOpen(true));
closeBtn.addEventListener('click', () => setOpen(false));
drawer.addEventListener('click', (e) => {
if (e.target.closest('a')) setOpen(false);
});
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && !drawer.hidden) setOpen(false);
});
window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
if (e.matches && !drawer.hidden) setOpen(false);
});
}
const heroImg = document.querySelector('.hero__media');
const supportsScrollTl = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
if (heroImg && !supportsScrollTl && !reduceMotion.matches) {
let raf = 0;
const update = () => {
raf = 0;
const start = 0;
const y = Math.min(Math.max(0, window.scrollY - start), 1000) * 0.4;
heroImg.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
};
window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
update();
}
const pxImgs = [...document.querySelectorAll('[data-parallax], .page-hero > .page-hero__bg')];
if (pxImgs.length && !reduceMotion.matches && supportsScrollTl) {
const measure = () => {
const vh = stableVH();
pxImgs.forEach((img) => {
const r = img.parentElement.getBoundingClientRect();
const top = r.top + window.scrollY;
const from = Math.max(0, top - vh).toFixed(0), to = (top + r.height).toFixed(0);
if (img.dataset.pxRange === `${from} ${to}`) return;
img.dataset.pxRange = `${from} ${to}`;
img.classList.remove('px-tl');
img.style.setProperty('--px-s', `${from}px`);
img.style.setProperty('--px-e', `${to}px`);
void img.offsetWidth;
img.classList.add('px-tl');
});
};
measure();
if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.body);
onViewResize(measure);
window.addEventListener('load', measure);
} else if (pxImgs.length && !reduceMotion.matches) {
let raf = 0;
const update = () => {
raf = 0;
const vh = stableVH();
pxImgs.forEach((img) => {
const frame = img.parentElement;
const r = frame.getBoundingClientRect();
if (r.bottom < -50 || r.top > vh + 50) return;
const range = parseFloat(getComputedStyle(frame).getPropertyValue('--px-range')) || 160;
const start = Math.min(vh, r.top + window.scrollY);
const p = Math.min(1, Math.max(0, (start - r.top) / (start + r.height)));
img.style.transform = `translate3d(0, ${((p - 1) * range).toFixed(1)}px, 0)`;
});
};
window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
window.addEventListener('resize', update);
update();
}
document.querySelectorAll('[data-hscroll]').forEach((sec) => {
const pin = sec.querySelector('.jz-pin');
const viewport = sec.querySelector('[data-hscroll-viewport]');
const track = sec.querySelector('[data-hscroll-track]');
const bar = sec.querySelector('[data-hscroll-bar]');
if (!pin || !viewport || !track || reduceMotion.matches) return;
let dist = 0;
let raf = 0;
const BG_PIN_TOP = 0.07;
const BG_PIN_BOTTOM = 0.84;
const bg = pin.querySelector('.jz-bg');
let bgTravel = 0;
let bgPinY = 0;
let bgNat = null;
const sizeBg = () => {
if (!bg || !bgNat || !sec.classList.contains('is-hscroll')) {
if (bg) { bg.classList.remove('is-pan', 'is-narrow'); bg.style.width = bg.style.height = bg.style.transform = ''; }
return;
}
const W = pin.clientWidth, H = pin.clientHeight;
const s = H / ((BG_PIN_BOTTOM - BG_PIN_TOP) * bgNat.h);
const w = bgNat.w * s, h = bgNat.h * s;
bg.style.width = `${w.toFixed(1)}px`;
bg.style.height = `${h.toFixed(1)}px`;
bg.classList.add('is-pan');
bg.classList.toggle('is-narrow', w < W);
bgTravel = h - H;
bgPinY = -BG_PIN_TOP * h;
};
if (bg) {
const m = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage);
if (m) {
const im = new Image();
im.onload = () => { bgNat = { w: im.naturalWidth, h: im.naturalHeight }; sizeBg(); setBgAnim(); update(); };
im.src = m[1];
}
}
const bgRange = () => {
const secTop = sec.getBoundingClientRect().top + window.scrollY;
const pinStart = secTop - (parseFloat(getComputedStyle(pin).top) || 0);
const hold = Math.max(0, sec.offsetHeight - pin.offsetHeight);
return { from: secTop - stableVH(), to: secTop + pin.offsetHeight, pinStart, pinEnd: pinStart + hold, hold };
};
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const bgY = (y, r = bgRange()) => {
const yy = y === undefined ? window.scrollY : y;
if (yy < r.pinStart) return -bgTravel + (bgPinY + bgTravel) * clamp01((yy - r.from) / (r.pinStart - r.from));
if (yy < r.pinEnd) return bgPinY;
return bgPinY * (1 - clamp01((yy - r.pinEnd) / (r.to + r.hold - r.pinEnd)));
};
let bgAnim = false;
let bgKey = '';
const bgTl = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
const setBgAnim = () => {
if (!bg || !bg.classList.contains('is-pan') || !bgTl) {
if (bgAnim) { setScrollAnim('jzbg'); bgAnim = false; bgKey = ''; }
return;
}
const r = bgRange();
const key = `${Math.round(r.from)} ${Math.round(r.to)} ${Math.round(r.hold)} ${bgTravel.toFixed(1)} ${bgPinY.toFixed(1)}`;
if (key === bgKey) return;
bgKey = key;
const ys = [r.from, r.pinStart, r.pinEnd, r.to + r.hold].sort((a, b) => a - b).filter((y, i, a) => i === 0 || y > a[i - 1]);
bg.dataset.sky = 'jzbg';
bg.style.transform = '';
setScrollAnim('jzbg', '.jz-bg[data-sky="jzbg"]', 'transform', ys.map((y) => [y, `translate3d(-50%,${bgY(y, r).toFixed(1)}px,0)`]));
bgAnim = true;
};
const update = () => {
raf = 0;
if (!sec.classList.contains('is-hscroll')) return;
const stickyTop = parseFloat(getComputedStyle(pin).top) || 0;
const p = Math.min(1, Math.max(0, (stickyTop - sec.getBoundingClientRect().top) / dist));
track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
if (bg && bg.classList.contains('is-pan') && !bgAnim) {
bg.style.transform = `translate3d(-50%, ${bgY().toFixed(1)}px, 0)`;
}
};
const measure = () => {
sec.classList.add('is-hscroll');
viewport.scrollLeft = 0;
dist = track.scrollWidth - viewport.clientWidth;
const inner = pin.querySelector('.jz-pin__inner');
const fits = !inner || inner.scrollHeight <= pin.clientHeight + 1;
if (dist <= 0 || !fits) {
sec.classList.remove('is-hscroll');
sec.style.height = '';
track.style.transform = '';
sizeBg();
setBgAnim();
return;
}
sec.style.height = `${pin.offsetHeight + dist}px`;
sizeBg();
setBgAnim();
update();
};
new ResizeObserver(() => setBgAnim()).observe(document.body);
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
window.addEventListener('scroll', onScroll, { passive: true });
new ResizeObserver(measure).observe(viewport);
window.addEventListener('resize', measure);
measure();
});
const HERO_PLAY_RATIO = 0.6;
const HERO_FADE = 1.2;
const heroMedia = document.querySelector('[data-hero-videos]');
const saveData = navigator.connection && navigator.connection.saveData;
if (heroMedia && !reduceMotion.matches && !saveData) {
const list = heroMedia.dataset.heroVideos.split(',').map((s) => s.trim()).filter(Boolean);
const players = [...heroMedia.querySelectorAll('video')];
if (list.length && players.length >= 2) {
let index = 0;
let cur = players[0];
let next = players[1];
let nextIndex = -1;
let switching = false;
let visible = true;
const load = (v, i) => {
v.muted = true;
v.defaultMuted = true;
v.playsInline = true;
v.dataset.clip = String(i + 1);
v.src = list[i];
v.preload = 'auto';
v.load();
};
const play = (v) => {
if (!visible) return;
const p = v.play();
if (p && p.catch) p.catch(() => { /* 自動再生できない端末：写真のまま */ });
};
const preloadNext = () => {
nextIndex = (index + 1) % list.length;
load(next, nextIndex);
};
const beginSwitch = () => {
if (switching) return;
switching = true;
const incoming = next;
const outgoing = cur;
const ni = (index + 1) % list.length;
if (nextIndex !== ni) load(incoming, ni);
const show = () => {
incoming.classList.add('is-top', 'is-on');
outgoing.classList.remove('is-top');
let done = false;
const finish = () => {
if (done) return;
done = true;
outgoing.style.transition = 'none';
outgoing.classList.remove('is-on');
outgoing.pause();
void outgoing.offsetWidth;
outgoing.style.transition = '';
index = ni;
cur = incoming;
next = outgoing;
switching = false;
preloadNext();
};
incoming.addEventListener('transitionend', (e) => { if (e.propertyName === 'opacity') finish(); }, { once: true });
setTimeout(finish, HERO_FADE * 1000 + 400);
};
incoming.addEventListener('playing', show, { once: true });
try { incoming.currentTime = 0; } catch (e) { /* 読み込み前 */ }
play(incoming);
};
players.forEach((v) => {
v.addEventListener('timeupdate', () => {
if (v !== cur || switching || !v.duration) return;
if (v.duration - v.currentTime <= HERO_FADE + 0.1) beginSwitch();
});
v.addEventListener('ended', () => { if (v === cur) beginSwitch(); });
v.addEventListener('error', () => { if (v === cur && !switching) beginSwitch(); });
});
cur.addEventListener('playing', () => {
cur.classList.add('is-top', 'is-on');
if (nextIndex < 0) preloadNext();
}, { once: true });
new IntersectionObserver((entries) => {
visible = entries[0].intersectionRatio >= HERO_PLAY_RATIO;
if (visible) {
play(cur);
if (switching) play(next);
} else {
players.forEach((p) => p.pause());
}
}, { threshold: [0, HERO_PLAY_RATIO] }).observe(heroMedia);
document.addEventListener('visibilitychange', () => {
if (document.hidden || !visible) return;
play(cur);
if (switching) play(next);
});
load(cur, 0);
play(cur);
}
}
document.querySelectorAll('[data-filter-group]').forEach((group) => {
const target = document.getElementById(group.dataset.filterGroup);
if (!target) return;
const items = [...target.querySelectorAll('[data-cat]')];
const empty = target.querySelector('[data-empty]');
const buttons = [...group.querySelectorAll('button[data-filter]')];
buttons.forEach((btn) => {
btn.addEventListener('click', () => {
const key = btn.dataset.filter;
buttons.forEach((b) => {
const on = b === btn;
b.classList.toggle('chip-fill', on);
b.classList.toggle('chip', !on);
b.setAttribute('aria-pressed', String(on));
});
let shown = 0;
items.forEach((it) => {
const match = key === 'all' || it.dataset.cat.split(' ').includes(key);
it.hidden = !match;
if (match) { if (shown < 12) fadeUp(it, shown * 40); shown++; }
});
if (empty) { empty.hidden = shown > 0; if (!empty.hidden) fadeUp(empty); }
});
});
});
const EASE_OPEN = 'cubic-bezier(.22, .7, .2, 1)';
const slideHeight = (el, from, to, done) => {
if (reduceMotion.matches || from === to) { done && done(); return; }
const dur = Math.min(700, Math.max(320, Math.abs(to - from) * 0.9));
el.style.overflow = 'hidden';
const anim = el.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: dur, easing: EASE_OPEN });
anim.onfinish = () => { el.style.overflow = ''; done && done(); };
anim.oncancel = () => { el.style.overflow = ''; };
return anim;
};
const fadeUp = (el, delay = 0) => {
if (reduceMotion.matches) return;
el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
{ duration: 450, delay, easing: EASE_OPEN, fill: 'backwards' });
};
document.querySelectorAll('.readmore').forEach((box) => {
const btn = box.querySelector('.readmore__toggle');
const body = box.querySelector('.readmore__body');
if (!btn || !body) return;
box.classList.add('is-collapsed');
btn.setAttribute('aria-expanded', 'false');
let anim = null;
btn.addEventListener('click', () => {
const from = body.getBoundingClientRect().height;
if (anim) anim.cancel();
const collapse = !box.classList.contains('is-collapsed');
btn.setAttribute('aria-expanded', String(!collapse));
btn.textContent = collapse ? '続きを読む' : '閉じる';
if (collapse) {
box.classList.add('is-collapsed');
const to = body.getBoundingClientRect().height;
box.classList.add('is-sliding');
body.style.maxHeight = 'none';
anim = slideHeight(body, from, to, () => { body.style.maxHeight = ''; box.classList.remove('is-sliding'); anim = null; });
const top = box.getBoundingClientRect().top;
const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
if (top < headerH) window.scrollBy({ top: top - headerH - 16, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
} else {
box.classList.remove('is-collapsed');
body.style.maxHeight = '';
const to = body.getBoundingClientRect().height;
box.classList.add('is-sliding');
anim = slideHeight(body, from, to, () => { box.classList.remove('is-sliding'); anim = null; });
}
});
});
document.querySelectorAll('.drawer__toggle').forEach((btn) => {
const panel = document.getElementById(btn.getAttribute('aria-controls'));
if (!panel) return;
if (panel.querySelector('[aria-current="page"]')) { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
let anim = null;
btn.addEventListener('click', () => {
const open = btn.getAttribute('aria-expanded') !== 'true';
btn.setAttribute('aria-expanded', String(open));
btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace(open ? '開く' : '閉じる', open ? '閉じる' : '開く'));
const from = panel.hidden ? 0 : panel.getBoundingClientRect().height;
if (anim) anim.cancel();
panel.hidden = false;
if (open) {
const to = panel.getBoundingClientRect().height;
anim = slideHeight(panel, from, to, () => { anim = null; });
[...panel.children].forEach((a, i) => fadeUp(a, 40 + i * 50));
} else {
anim = slideHeight(panel, from, 0, () => { panel.hidden = true; anim = null; });
if (!anim) panel.hidden = true;
}
});
});
document.querySelectorAll('[data-modal-open]').forEach((btn) => {
const dlg = document.getElementById(btn.dataset.modalOpen);
if (!dlg || typeof dlg.showModal !== 'function') return;
let timer = 0;
const close = (after) => {
if (!dlg.open || dlg.classList.contains('is-closing')) return;
const done = () => {
dlg.classList.remove('is-closing');
dlg.close();
document.documentElement.classList.remove('is-modal-open');
if (after) after();
};
if (reduceMotion.matches) { done(); return; }
dlg.classList.add('is-closing');
clearTimeout(timer);
timer = setTimeout(done, 300);
};
btn.addEventListener('click', () => {
dlg.classList.remove('is-closing');
document.documentElement.classList.add('is-modal-open');
dlg.showModal();
const body = dlg.querySelector('.modal__body');
if (body) body.scrollTop = 0;
});
dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
dlg.addEventListener('click', (e) => {
if (e.target === dlg) { close(); return; }
const c = e.target.closest('[data-modal-close]');
if (!c) return;
const href = c.getAttribute('href');
if (href && href.startsWith('#')) {
e.preventDefault();
close(() => requestAnimationFrame(() => { const t = document.querySelector(href); if (t) t.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); }));
} else close();
});
});
document.querySelectorAll('.accordion details').forEach((det) => {
const sum = det.querySelector('summary');
if (!sum) return;
let anim = null;
sum.addEventListener('click', (e) => {
if (reduceMotion.matches) return;
e.preventDefault();
const from = det.getBoundingClientRect().height;
if (anim) anim.cancel();
if (!det.open || det.classList.contains('is-closing')) {
det.classList.remove('is-closing');
det.open = true;
const to = det.getBoundingClientRect().height;
anim = slideHeight(det, from, to, () => { anim = null; });
[...det.children].filter((c) => c !== sum).forEach((c) => fadeUp(c, 60));
} else {
det.classList.add('is-closing');
const to = sum.getBoundingClientRect().height;
anim = slideHeight(det, from, to, () => { det.open = false; det.classList.remove('is-closing'); anim = null; });
}
});
});
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const CACHE_MIN = 10;
const driveImg = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
const driveThumb = (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;
const DRIVE_PARALLEL = 4;
const DRIVE_RETRY = [
['img', 0], ['thumb', 0], ['img', 1500], ['thumb', 3500], ['img', 7000],
];
const placeholder = (text) => 'data:image/svg+xml,' + encodeURIComponent(
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#101830"/><text x="200" y="207" fill="#CBB27C" font-size="20" font-family="sans-serif" text-anchor="middle" letter-spacing="3">${text}</text></svg>`);
const PH_LOADING = placeholder('読込中…');
const PH_FAILED = placeholder('画像を読み込めません');
let driveActive = 0;
const driveQueue = [];
const driveNext = () => {
while (driveActive < DRIVE_PARALLEL && driveQueue.length) { driveActive++; driveQueue.shift()(); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tryLoad = (src) => new Promise((resolve) => {
const p = new Image();
p.decoding = 'async';
p.onload = () => resolve(p.naturalWidth > 0);
p.onerror = () => resolve(false);
p.src = src;
});
const loadDrive = (id, w) => new Promise((resolve) => {
driveQueue.push(async () => {
let ok = null;
for (let i = 0; i < DRIVE_RETRY.length && !ok; i++) {
const [kind, ms] = DRIVE_RETRY[i];
if (ms) await wait(ms);
const src = kind === 'img' ? driveImg(id, w) : driveThumb(id, w) + (i > 1 ? `&r=${i}` : '');
if (await tryLoad(src)) ok = src;
}
driveActive--;
driveNext();
resolve(ok);
});
driveNext();
});
const lazyDrive = (img, id, size) => {
img.src = PH_LOADING;
img.classList.add('is-ph');
const start = () => loadDrive(id, size).then((src) => {
img.src = src || PH_FAILED;
img.classList.remove('is-ph');
});
if ('IntersectionObserver' in window) {
const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '400px 0px' });
io.observe(img);
} else start();
};
const nameDate = (name) => {
const m = /^(\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})/.exec(name || '');
return m ? { t: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]), y: m[1], mo: +m[2] } : null;
};
async function listDriveImages(key, folder, pinnedJson) {
let pinned = [];
try { pinned = JSON.parse(pinnedJson || '[]'); } catch (e) { /* 書式が違うときは使わない */ }
const cacheKey = `drive:${folder}`;
let files = null;
try {
const hit = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
if (hit && Date.now() - hit.t < CACHE_MIN * 60000) files = hit.files;
} catch (e) { /* 保存できない環境では毎回取得 */ }
if (!files) {
files = [];
let pageToken = '';
do {
const params = new URLSearchParams({
q: `'${folder}' in parents and mimeType contains 'image/' and trashed = false`,
key,
pageSize: '1000',
fields: 'nextPageToken,files(id,name,description,createdTime)',
});
if (pageToken) params.set('pageToken', pageToken);
const res = await fetch(`${DRIVE_API}?${params}`);
if (!res.ok) throw new Error(`Drive API ${res.status}`);
const data = await res.json();
files.push(...(data.files || []));
pageToken = data.nextPageToken || '';
} while (pageToken);
try { sessionStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), files })); } catch (e) { /* noop */ }
}
const base = (n) => (n || '').replace(/\.\w+$/, '');
const pinIndex = new Map(pinned.map((p, i) => [p.n, i]));
return files.map((f) => {
const d = nameDate(f.name);
const pin = pinIndex.has(base(f.name)) ? pinIndex.get(base(f.name)) : -1;
const alt = (pin >= 0 && pinned[pin].alt) || (f.description || '').trim() || (d ? `52番街の写真（${d.y}年${d.mo}月）` : '');
return { ...f, alt, pin, time: d ? d.t : Date.parse(f.createdTime) || 0 };
}).sort((a, b) => {
if (a.pin >= 0 || b.pin >= 0) return (a.pin < 0 ? 1e9 : a.pin) - (b.pin < 0 ? 1e9 : b.pin);
return b.time - a.time || (b.name || '').localeCompare(a.name || '');
});
}
function driveItem(file, box) {
const size = Number(box.dataset.driveSize) || 480;
const img = document.createElement('img');
lazyDrive(img, file.id, size);
img.alt = file.alt || box.dataset.driveAlt || '52番街の写真';
img.loading = 'lazy';
img.decoding = 'async';
img.width = size;
img.height = size;
if (!box.hasAttribute('data-lightbox')) return img;
const a = document.createElement('a');
a.href = driveImg(file.id, 1600);
a.dataset.driveId = file.id;
a.className = 'photo-grid__item';
a.appendChild(img);
return a;
}
document.querySelectorAll('[data-drive-gallery]').forEach(async (box) => {
const { driveKey: key, driveFolder: folder } = box.dataset;
if (!key || !folder) return;
const limit = Number(box.dataset.driveLimit) || 48;
const more = box.dataset.driveMore ? document.getElementById(box.dataset.driveMore) : null;
let shownCount = 0;
const load = async () => {
box.setAttribute('aria-busy', 'true');
try {
const all = await listDriveImages(key, folder, box.dataset.drivePinned);
const files = all.slice(shownCount, shownCount + limit);
if (!shownCount) {
if (!files.length) return;
box.replaceChildren();
}
files.forEach((f) => box.appendChild(driveItem(f, box)));
shownCount += files.length;
if (more) more.hidden = shownCount >= all.length;
} catch (e) {
console.warn('[drive gallery]', e);
} finally {
box.removeAttribute('aria-busy');
}
};
if (more) more.addEventListener('click', load);
load();
});
const galleryEl = document.querySelector('[data-gallery]');
if (galleryEl) {
const pageSize = Number(galleryEl.dataset.pageSize) || 24;
const base = galleryEl.dataset.galleryBase || '';
const moreBtn = document.querySelector('.gallery-more');
const statusEl = document.querySelector('.gallery-status');
const countEl = document.querySelector('[data-gallery-count]');
const { driveKey, driveFolder } = galleryEl.dataset;
let shown = galleryEl.querySelectorAll('.photo-grid__item').length;
let finished = false;
let loading = false;
let next;
let list = null;
const localNext = async () => {
if (!list) {
const res = await fetch(galleryEl.dataset.gallerySrc);
if (!res.ok) throw new Error(`gallery.json ${res.status}`);
list = await res.json();
}
const items = list.slice(shown, shown + pageSize).map((it) => ({
thumb: base + it.t, large: base + it.l, alt: it.alt,
}));
return { items, done: shown + items.length >= list.length };
};
if (driveKey && driveFolder) {
let all = null;
next = async () => {
if (!all) {
try {
all = await listDriveImages(driveKey, driveFolder, galleryEl.dataset.drivePinned);
} catch (e) {
console.warn('[gallery] drive', e);
all = [];
}
if (!all.length) { next = localNext; return { items: [], done: false }; }
galleryEl.replaceChildren();
shown = 0;
if (countEl) countEl.textContent = `全${all.length}枚`;
}
const items = all.slice(shown, shown + pageSize).map((f) => ({
driveId: f.id,
large: driveImg(f.id, 1600),
alt: f.alt || '52番街の写真',
}));
return { items, done: shown + items.length >= all.length };
};
} else {
next = localNext;
}
const append = (items) => {
const frag = document.createDocumentFragment();
items.forEach((it, i) => {
const a = document.createElement('a');
a.className = 'photo-grid__item is-new';
a.href = it.large;
a.style.setProperty('--gd', `${Math.min(i * 40, 600)}ms`);
const img = document.createElement('img');
img.alt = it.alt;
img.width = 600;
img.height = 600;
img.decoding = 'async';
if (it.driveId) {
a.dataset.driveId = it.driveId;
lazyDrive(img, it.driveId, 600);
} else {
img.src = it.thumb;
img.loading = 'lazy';
img.addEventListener('error', () => {
if (img.dataset.retry) { img.src = PH_FAILED; return; }
img.dataset.retry = '1';
setTimeout(() => { img.src = `${it.thumb}${it.thumb.includes('?') ? '&' : '?'}r=1`; }, 1500);
});
}
a.appendChild(img);
frag.appendChild(a);
});
galleryEl.appendChild(frag);
shown += items.length;
};
const setStatus = (text) => { if (statusEl) statusEl.textContent = text; };
const finish = () => {
finished = true;
setStatus('');
if (moreBtn) moreBtn.hidden = true;
};
const loadMore = async () => {
if (loading || finished) return;
loading = true;
setStatus('読み込み中…');
if (moreBtn) moreBtn.disabled = true;
try {
const { items, done } = await next();
append(items);
if (done) { finish(); return; }
setStatus('');
if (moreBtn) moreBtn.hidden = false;
} catch (e) {
console.warn('[gallery]', e);
setStatus('写真を読み込めませんでした。');
if (moreBtn) moreBtn.hidden = false;
return;
} finally {
loading = false;
if (moreBtn) moreBtn.disabled = false;
}
};
if (moreBtn) {
moreBtn.addEventListener('click', loadMore);
const total = countEl ? Number((countEl.textContent.match(/\d+/) || [0])[0]) : 0;
if (!(driveKey && driveFolder) && total > shown) moreBtn.hidden = false;
}
if (driveKey && driveFolder) loadMore();
}
document.querySelectorAll('[data-youtube-archive]').forEach(async (box) => {
const key = box.dataset.ytKey;
const channel = box.dataset.ytChannel;
if (!key || !channel) return;
const count = Number(box.dataset.ytCount) || 3;
const exclude = box.dataset.ytExclude ? new RegExp(box.dataset.ytExclude) : null;
try {
const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=25&playlistId=UU${channel.slice(2)}&key=${encodeURIComponent(key)}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`YouTube API ${res.status}`);
const data = await res.json();
const list = (data.items || [])
.map((it) => ({ id: it.snippet?.resourceId?.videoId, title: it.snippet?.title || '', published: it.snippet?.publishedAt || '' }))
.filter((v) => v.id && !/^(Private|Deleted) video$/.test(v.title) && !(exclude && exclude.test(v.title)))
.slice(0, count);
if (!list.length) return;
box.replaceChildren(...list.map((v) => {
const a = document.createElement('a');
a.href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
a.className = 'stack-s plain-link';
a.target = '_blank';
a.rel = 'noopener';
const wrap = document.createElement('span');
wrap.className = 'video';
const img = document.createElement('img');
Object.assign(img, { className: 'media ar-16-9', src: `https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg`, alt: '', width: 480, height: 270, loading: 'lazy', decoding: 'async' });
wrap.appendChild(img);
const text = document.createElement('span');
text.className = 'text';
text.textContent = v.title.replace(/^【52番街】\s*/, '');
a.append(wrap, text);
const d = new Date(v.published);
if (!isNaN(d)) {
const date = document.createElement('span');
date.className = 'small';
date.textContent = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} 公開`;
a.appendChild(date);
}
return a;
}));
} catch (e) {
console.warn('過去のライブ：YouTube から取得できませんでした', e);
}
});
const lightbox = document.getElementById('lightbox');
if (lightbox && typeof lightbox.showModal === 'function') {
const imgs = [...lightbox.querySelectorAll('.lightbox__img')];
const lbCap = lightbox.querySelector('.lightbox__caption');
const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let list = [];
let index = 0;
let cur = 0;
let token = 0;
const ready = (img) => (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
const closeBtn = lightbox.querySelector('.lightbox__close');
const alignClose = () => {
const img = imgs[cur];
const st = img.parentElement.getBoundingClientRect();
const nw = img.naturalWidth, nh = img.naturalHeight;
if (!nw || !nh || !st.height) return;
const k = Math.min(st.width / nw, st.height / nh);
const top = st.top + (st.height - nh * k) / 2 - lightbox.getBoundingClientRect().top;
closeBtn.style.top = `${Math.max(8, Math.round(top))}px`;
};
window.addEventListener('resize', () => { if (lightbox.open) alignClose(); });
lightbox.addEventListener('animationend', (e) => { if (e.target.classList.contains('lightbox__stage')) alignClose(); });
const setSrc = async (img, a) => {
if (!a.dataset.driveId) { img.src = a.href; return; }
img.src = a.href;
await ready(img);
if (img.naturalWidth > 0) return;
const src = await loadDrive(a.dataset.driveId, 1600);
img.src = src || PH_FAILED;
};
const preload = (i) => {
const a = list[(i + list.length) % list.length];
if (a) { const p = new Image(); p.decoding = 'async'; p.src = a.href; }
};
const LB_LOADING_DELAY = 200;
const show = (i, dir = 1, instant = false) => {
index = (i + list.length) % list.length;
const a = list[index];
const thumb = a.querySelector('img');
const t = ++token;
const next = imgs[1 - cur];
const prev = imgs[cur];
lightbox.style.setProperty('--lb-dir', dir);
lbCap.textContent = `${index + 1} / ${list.length}`;
next.classList.add('no-anim');
next.classList.remove('is-current', 'is-leaving');
next.alt = thumb ? thumb.alt : '';
let loaded = false;
const phTimer = setTimeout(() => {
if (loaded || t !== token || prev.src === PH_LOADING) return;
prev.src = PH_LOADING;
prev.alt = '読込中';
prev.classList.add('is-ph', 'is-current');
prev.classList.remove('is-leaving');
ready(prev).then(alignClose);
}, LB_LOADING_DELAY);
setSrc(next, a).then(() => ready(next)).then(() => {
loaded = true;
clearTimeout(phTimer);
if (t !== token) return;
next.classList.remove('is-ph');
prev.classList.remove('is-ph');
void next.offsetWidth;
if (!instant) next.classList.remove('no-anim');
next.classList.add('is-current');
next.removeAttribute('aria-hidden');
prev.classList.toggle('no-anim', instant);
prev.classList.remove('is-current');
prev.classList.add('is-leaving');
prev.setAttribute('aria-hidden', 'true');
cur = 1 - cur;
alignClose();
if (instant) requestAnimationFrame(() => next.classList.remove('no-anim'));
preload(index + dir);
});
};
const open = (i) => {
lightbox.classList.remove('is-closing');
imgs.forEach((im) => { im.classList.add('no-anim'); im.classList.remove('is-current', 'is-leaving', 'is-ph'); });
imgs[cur].src = PH_LOADING;
show(i, 1, true);
lightbox.showModal();
preload(i - 1);
};
let closing = 0;
const close = () => {
if (!lightbox.open || lightbox.classList.contains('is-closing')) return;
if (reduce) { lightbox.close(); return; }
lightbox.classList.add('is-closing');
clearTimeout(closing);
closing = setTimeout(() => { lightbox.classList.remove('is-closing'); lightbox.close(); }, 300);
};
document.addEventListener('click', (e) => {
const a = e.target.closest('[data-lightbox] a');
if (!a) return;
e.preventDefault();
list = [...a.closest('[data-lightbox]').querySelectorAll('a')];
open(list.indexOf(a));
});
lightbox.querySelector('[data-lb="close"]').addEventListener('click', close);
lightbox.querySelector('[data-lb="prev"]').addEventListener('click', () => show(index - 1, -1));
lightbox.querySelector('[data-lb="next"]').addEventListener('click', () => show(index + 1, 1));
lightbox.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target.classList.contains('lightbox__stage')) close(); });
lightbox.addEventListener('keydown', (e) => {
if (e.key === 'Escape') { e.preventDefault(); close(); }
if (e.key === 'ArrowLeft') show(index - 1, -1);
if (e.key === 'ArrowRight') show(index + 1, 1);
});
let sx = null, sy = 0;
lightbox.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
if (sx === null) return;
const dx = e.changedTouches[0].clientX - sx;
const dy = e.changedTouches[0].clientY - sy;
sx = null;
if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
}, { passive: true });
}
})();
