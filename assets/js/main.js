/* ダイニングバー 52番街 — 共通スクリプト */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- ローディング画面 ----------
     head のスクリプトが <html class="is-loading"> を付けて表示。ページ（画像・フォント）の読み込みが
     終わったら、最低表示時間を待ってフェードアウトし、'loader:done' を知らせる。
     最初のページは minFirst、同じタブの2ページ目以降は minRepeat。読み込みが遅くても max で消す。 */
  const LOADER = { minFirst: 1800, minRepeat: 500, max: 4000, fade: 900 };
  const rootEl = document.documentElement;
  const loaderEl = document.querySelector('.loader');
  const loaderActive = () => rootEl.classList.contains('is-loading');
  const whenLoaderDone = new Promise((resolve) => {
    if (!loaderEl || !loaderActive()) { resolve(); return; }
    document.addEventListener('loader:done', () => resolve(), { once: true });
    // head の保険（6秒）で消えた場合にも進める
    setTimeout(() => { if (!loaderActive()) resolve(); }, 6100);
  });
  if (loaderEl && loaderActive()) {
    // TOP：ローディング画面のロゴを、実際のヒーローのロゴと同じ位置（縦・横）にそろえる（CSSで同じ配置にしてあるので通常はずれない）
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

    // プログレスバー：実際の読み込み（すぐ読む画像・フォント・ページ全体）の割合と、最低表示時間の経過の
    // 小さい方まで、なめらかに伸ばす。読み込みが終わったら100%まで伸ばしてから消す
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
      return Math.min(real, time, 0.98); // 100% は消す直前だけ
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
    // 100%まで伸ばしてから次へ（最大0.4秒待つ）
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
      const wait = Math.max(0, minShow - performance.now()); // performance.now() はページを開いてからの経過時間
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

  /* ---------- 表示アニメーション ----------
     ・タイトル（.h1 / .h2 / .jz-intro__title）：画面に入ると一文字ずつ浮かび上がる
     ・その他のパーツ：画面に入ると下からフェードイン（並んでいるものは少しずつ時間差）
     head の小さなスクリプトが <html> に .anim を付けたときだけ動く（動きを減らす設定では付かない） */
  // 「ようこそ」「ちょっと気取った、」の写真：前の段より早めに始め（0.7秒前）、ゆっくり（2.7秒＝ほかの3倍）、0.25秒ずつ1枚ずつ
  const PHOTO_STEP = { early: 700, dur: 2700, stagger: 0.25 };
  const REVEAL = {
    titles: 'main .h1, main .h2, main .jz-intro__title',
    // 下からフェードインさせるパーツ（外側のものが選ばれていれば、その中のパーツは個別には動かさない）
    parts: [
      // ヒーローのロゴと文字、お知らせの帯（.ticker）は最初から表示（対象外）。
      // 帯は画面のいちばん下にあり、表示の判定ライン（下から8%）より下なので、対象にすると読み込み時に見えなくなる
      '.breadcrumb', '.tabs', '.eyebrow', '.lead', 'p.small', '.note', '.chip-list', '.rule',
      '.btn-row', '.btn', '.signature',
      '.media', '.welcome__photo', '.map', // 「ちょっと気取った、」の写真3枚は .media として1枚ずつ '.vision', '.access-dl', '.dress-img',
      '.live-card', '.jz-card', '.menu-card', '.goods__item', '.gallery', '.photo-grid',
      '.box', '.plan', '.svc', '.steps > li', '.tbl', '.week', '.cmp-wrap', '.lines', '.row',
      '.accordion', '.live-item', '.toolbar', '.news-item', '.pager', '.news-side',
      '.sitemap__group', '.timeline > li', '.contact-links', '.form', '.cta-band',
      'main .grid > article', 'main .grid > a',
      'main #concept .link-arrow', // 「ちょっと気取った、」の「店名の由来を読む」（順番に出すため）
    ].map((s) => (s.startsWith('main') ? s : `main ${s}`)).join(','),
    // 順番に出すセクション：{ セクション: [1番目, 2番目, …] }。各段は、前の段（表示中のもの）が出終わる少し前（overlap）から始まる。
    // 前の段が画面に入っていない（スマホで下にある等）ときは待たない
    order: {
      // 段は文字列（セレクタ）か { sel, … }：
      //   early … 前の段が出終わるこの時間（ms）前から始める（省略時 overlap）
      //   dur   … フェードインにかかる時間（ms、省略時 partDur）
      //   stagger … 並んだものの時間差（秒、省略時 stagger）。together: true なら全部同時
      '#welcome': ['.h2, .eyebrow, .rule', '.lead', '.btn-row', { sel: '.welcome__photo', ...PHOTO_STEP }], // タイトル → 文章 → ボタン → 写真
      '#concept': ['.h2, .eyebrow, .rule', '.lead', '.link-arrow', { sel: '.concept-photos img', ...PHOTO_STEP }], // タイトル → 文章 → リンク → 写真（3枚を1枚ずつ）
    },
    overlap: 300, // 次の段を、前の段が出終わるこの時間（ms）前から始める
    waitMax: 3000, // 前の段が画面に入らないときに待つ上限（ms）
    charDur: 700, // タイトルの一文字が出るのにかかる時間（ms、CSS の .char と合わせる）
    partDur: 900, // パーツのフェードインにかかる時間（ms、CSS の [data-reveal] と合わせる）
    charStep: 45, // 一文字ごとの時間差（ms）
    charTotal: 1100, // 長いタイトルでも全体でこの時間（ms）以内に出し切る
    // 下層ページのタイトル上の英字（eyebrow）は少し速く：一文字の時間差・一文字が出る時間（ms）
    eyebrowStep: 30, eyebrowDur: 450,
    titleGap: 200, // 英字のあと h1 が出始めるまでの間（ms）
    stagger: 0.08, // 並んだパーツの時間差（秒）
    staggerMax: 0.48,
  };
  const animOn = document.documentElement.classList.contains('anim');
  // 下層ページ（.anim--h1）：ページタイトル（h1）だけ一文字ずつ。ほかのパーツは最初から表示
  const h1Only = document.documentElement.classList.contains('anim--h1');
  if (h1Only) {
    REVEAL.titles = 'main .page-hero .eyebrow, main .h1';
    REVEAL.parts = ':not(*)';
    // 英字の最後の一文字が出始めてから titleGap（ms）後に、h1 の一文字目が出始める
    REVEAL.order = { '.page-hero': ['.eyebrow', { sel: '.h1', early: REVEAL.eyebrowDur - REVEAL.titleGap }] };
  }
  // 店舗についてのタブで移るときは、次のページのタイトルを動かさない（head のスクリプトが読む）
  document.querySelectorAll('.tabs a').forEach((a) => {
    a.addEventListener('click', () => { try { sessionStorage.setItem('skipTitleAnim', '1'); } catch (e) { /* 保存できなければ通常どおり */ } });
  });
  window.__revealReady = true;
  if (animOn) {
    // タイトルを一文字ずつの <span class="char"> に分ける（<br> や数字用の <span> はそのまま残す）
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
      if (fast) t.style.setProperty('--cdur', `${REVEAL.eyebrowDur}ms`); // CSS の .char の時間
      t.classList.add('split-title');
    });

    // フェードインさせるパーツに印を付ける（タイトルの中・すでに印のある要素の中は除く）
    const parts = [];
    document.querySelectorAll(REVEAL.parts).forEach((el) => {
      if (el.closest('.split-title, .hero__inner') || (el.parentElement && el.parentElement.closest('[data-reveal]'))) return;
      el.setAttribute('data-reveal', '');
      parts.push(el);
    });
    // 同じ親に並ぶパーツは少しずつ遅らせる
    const groups = new Map();
    parts.forEach((el) => {
      const key = el.parentElement;
      const n = groups.get(key) || 0;
      groups.set(key, n + 1);
      el.style.setProperty('--rd', `${Math.min(n * REVEAL.stagger, REVEAL.staggerMax).toFixed(2)}s`);
    });

    const targets = [...titles, ...parts];
    // 順番に出すセクション：各パーツが何段目か（stepOf）。2段目以降の並んだパーツの時間差は、段の中で数え直す
    const stepOf = new Map();
    Object.entries(REVEAL.order).forEach(([secSel, steps]) => {
      const sec = document.querySelector(secSel);
      if (!sec) return;
      steps.forEach((entry, step) => {
        const { sel, together, early, dur, stagger } = typeof entry === 'string' ? { sel: entry } : entry;
        [...sec.querySelectorAll(sel)].filter((el) => targets.includes(el)).forEach((el, k) => {
          stepOf.set(el, { sec, step, overlap: early ?? REVEAL.overlap });
          if ((step > 0 || together || stagger != null) && el.hasAttribute('data-reveal')) {
            const gap = together ? 0 : Math.min(k * (stagger ?? REVEAL.stagger), REVEAL.staggerMax);
            el.style.setProperty('--rd', `${gap.toFixed(2)}s`);
          }
          if (dur && el.hasAttribute('data-reveal')) el.style.setProperty('--rdur', `${dur}ms`); // フェードインの時間（CSS）
        });
      });
    });
    // ローディング画面が消えてから動かし始める（裏で再生されて見逃さないように）
    whenLoaderDone.then(() => {
    if ('IntersectionObserver' in window) {
      // 出し終わる時刻（ms）：タイトルは最後の一文字、パーツは時間差（--rd）の分も含める
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
        // 出終わったら印を外し、ボタンのホバーなど本来の動きに戻す
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
      // 順番に出すパーツ：同じセクションの前の段（表示中・表示予定のもの）が出終わる少し前まで待つ（もう出ていれば、すぐ）
      const revealInOrder = (el) => {
        const { sec, step, overlap } = stepOf.get(el);
        const now = performance.now();
        let until = now;
        stepOf.forEach((s, t) => {
          if (s.sec !== sec || s.step >= step) return;
          const end = endsAt.get(t);
          if (end && end - overlap > until) until = end - overlap; // この段の early（省略時 overlap）だけ早めに始める
        });
        endsAt.set(el, finishTime(el, until)); // 待っている間も「いつ出終わるか」を次の段が使えるように
        if (until <= now) reveal(el);
        else setTimeout(() => reveal(el), until - now);
      };
      // 前の段がまだ始まっていないうちは待たせる（ホイールで移るとスクロールの途中で写真が先に画面に入るため）。
      // 前の段が「始まった」「画面より上へ通り過ぎた」「表示されていない（スマホで非表示など）」なら進める。
      // 文字が画面に入らないまま止まったときのため、waitMax たったら出す
      const waiting = new Map(); // 待っているパーツ → 待ち始めた時刻
      let waitTimer = 0;
      const prevStarted = (el) => {
        const { sec, step } = stepOf.get(el);
        for (const [t, s] of stepOf) {
          if (s.sec !== sec || s.step >= step || endsAt.has(t)) continue;
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
      // waitMax は「スクロールが止まってから」数える（セクション送りの途中や、前のセクションを見ている間は数えない）
      window.addEventListener('scroll', () => {
        if (!waiting.size) return;
        const now = performance.now();
        waiting.forEach((_, el) => waiting.set(el, now));
      }, { passive: true });
      const io = new IntersectionObserver((entries) => {
        const seen = [];
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          // 横に並ぶ列（スマホのライブ・グッズの横スクロールなど）は、画面外の右側の分も一緒に出す
          const row = en.target.parentElement && en.target.parentElement.matches('.live-cards, .goods, .jz-track')
            ? [...en.target.parentElement.children].filter((c) => c.hasAttribute('data-reveal') && !c.classList.contains('is-inview'))
            : [en.target];
          row.forEach((el) => { io.unobserve(el); seen.push(el); });
        });
        // 同時に画面に入ったものは、段の順に処理する（前の段の出終わる時刻が先に決まるように）
        const stepNum = (el) => (stepOf.has(el) ? stepOf.get(el).step : 0);
        seen.sort((a, b) => stepNum(a) - stepNum(b)).forEach((el) => {
          if (stepNum(el) === 0) reveal(el);
          else waiting.set(el, performance.now());
        });
        tryWaiting();
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 }); // 少しでも画面に入ったら（背の高い要素でも必ず出るように）
      targets.forEach((el) => io.observe(el));
      // 速いスクロールで画面を素通りした要素も、通り過ぎた時点で出しておく（戻ったときに隠れていないように）
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
            el.removeAttribute('data-reveal'); // 画面外なのでアニメーションなしで本来の状態へ
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

  /* ---------- 夜空：ゆっくり点滅する星（canvas） ----------
     .night-sky（build.mjs が黒い背景のセクションとヒーローに挿入）に、
     大小さまざまな星を描き、1つずつ違う周期でゆっくり明滅させる。 */
  const SKY = {
    density: 1 / 2200, // 星の密度（px² あたり）
    maxStars: 650,
    edgeFade: 24, // セクションの上下端から、この距離（px）で星を消す
    dprMax: 1.5, // 高解像度画面でも描画の細かさはここまで（負担を抑える）
    periodMin: 5, // 点滅の周期（秒）
    periodMax: 13,
    fps: 24, // 点滅だけのときの描画の上限（スクロール中は毎フレーム描く）
    // キラッと光る輝き：大きく明るい星の一部が、glintMin〜glintMax 秒ごとに一瞬強く光る
    glintShare: 0.5, // 大きい星のうち光らせる割合
    glintMin: 4,
    glintMax: 9,
    // スクロール連動（パララックス）：セクションが画面を通過する間に動く幅（±px）
    parallaxNear: 90, // 大きく明るい星（手前）
    parallaxFar: 12, // 小さく暗い星（奥）
    nebulaShift: 28, // 星雲・天の川
    ease: 0.06, // スクロール位置への追従の速さ（小さいほどゆっくり遅れてついてくる）
    // 色：白・シャンパンゴールド・淡い青（出現比率つき）
    colors: [[255, 252, 244, 0.62], [232, 214, 168, 0.24], [190, 205, 255, 0.14]],
  };
  // 決まった乱数（ページを開くたびに模様が変わらないように）
  const seeded = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // 星の光のにじみ（色ごとに1枚作って使い回す）
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
    const state = skies.map((el, i) => {
      const canvas = el.querySelector('canvas');
      const rnd = seeded(1000 + i * 7919);
      // 星雲の位置と天の川の角度をセクションごとに変える
      el.style.setProperty('--n1x', `${10 + rnd() * 35}%`);
      el.style.setProperty('--n1y', `${10 + rnd() * 50}%`);
      el.style.setProperty('--n2x', `${55 + rnd() * 35}%`);
      el.style.setProperty('--n2y', `${40 + rnd() * 50}%`);
      el.style.setProperty('--n3x', `${30 + rnd() * 50}%`);
      el.style.setProperty('--n3y', `${5 + rnd() * 30}%`);
      el.style.setProperty('--sky-angle', `${95 + rnd() * 50}deg`);
      return { el, canvas, ctx: canvas.getContext('2d'), seed: 5000 + i * 104729, stars: [], visible: false, w: 0, h: 0, dpr: 1, shift: null };
    });

    const layout = (s) => {
      const w = s.el.clientWidth, h = s.el.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, SKY.dprMax);
      s.w = w; s.h = h; s.dpr = dpr;
      s.canvas.width = Math.round(w * dpr);
      s.canvas.height = Math.round(h * dpr);
      const rnd = seeded(s.seed);
      const n = Math.min(SKY.maxStars, Math.round(w * h * SKY.density));
      s.stars = Array.from({ length: n }, () => {
        const big = rnd() < 0.06; // 6% は大きめの明るい星
        const r = big ? 1.1 + rnd() * 0.9 : 0.35 + Math.pow(rnd(), 2) * 0.75;
        return {
          x: rnd() * w,
          y: rnd() * h,
          r,
          a: big ? 0.75 + rnd() * 0.25 : 0.3 + rnd() * 0.55, // 一番明るいときの明るさ
          low: 0.12 + rnd() * 0.3, // 一番暗いときの割合（消えきらない）
          p: SKY.periodMin + rnd() * (SKY.periodMax - SKY.periodMin),
          ph: rnd() * Math.PI * 2,
          c: pickColor(rnd()),
          // 奥行き（0=奥〜1=手前）：大きく明るい星ほど手前でよく動く
          z: Math.min(1, (r - 0.35) / 1.65 * 0.7 + rnd() * 0.3),
          // キラッと光る輝き（周期と開始のずれ）
          gp: big && rnd() < SKY.glintShare ? SKY.glintMin + rnd() * (SKY.glintMax - SKY.glintMin) : 0,
          go: rnd() * 10,
        };
      });
      draw(s, performance.now() / 1000);
    };

    // セクションが画面下端に入った時 +1 → 中央 0 → 上端から抜けた時 -1
    const scrollPos = (s) => {
      const r = s.el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh - r.top) / (vh + r.height);
      return 1 - 2 * Math.min(1, Math.max(0, p));
    };

    const draw = (s, t) => {
      const { ctx, dpr } = s;
      const k = s.shift || 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, s.w, s.h);
      const span = s.h + 20; // 上下にはみ出した星は反対側から出す（空白を作らない）
      for (const st of s.stars) {
        // サイン波でなめらかに明滅（動きを減らす設定では一定）
        const wave = reduceMotion.matches ? 0.75 : 0.5 + 0.5 * Math.sin((t / st.p) * Math.PI * 2 + st.ph);
        const eased = wave * wave * (3 - 2 * wave);
        const amp = SKY.parallaxFar + (SKY.parallaxNear - SKY.parallaxFar) * st.z;
        const y = ((((st.y + amp * k + 10) % span) + span) % span) - 10;
        const d = st.r * 8; // にじみ込みの描画サイズ
        // セクションの上下の端では星を薄くして消す（端で切れた半円の光が境目に並ばないように）
        const edge = Math.min(y, s.h - y);
        const fade = (r) => Math.min(1, Math.max(0, (edge - r) / SKY.edgeFade));
        const f0 = fade(d / 2);
        ctx.globalAlpha = st.a * (st.low + (1 - st.low) * eased) * f0;
        if (f0 > 0) ctx.drawImage(sprites[st.c], st.x - d / 2, y - d / 2, d, d);
        // キラッと光る輝き：周期の終わりの12%で、ふくらんで強く光って消える
        if (st.gp && !reduceMotion.matches) {
          const ph = ((t + st.go) % st.gp) / st.gp;
          if (ph > 0.88) {
            const g = Math.sin(((ph - 0.88) / 0.12) * Math.PI);
            const gd = d * (1 + 2.2 * g);
            ctx.globalAlpha = Math.min(1, 0.95 * g) * fade(gd / 2);
            if (ctx.globalAlpha > 0) ctx.drawImage(sprites[0], st.x - gd / 2, y - gd / 2, gd, gd);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    // スクロール位置へ少しずつ近づける（ゆっくり遅れてついてくる動き）
    const follow = (s) => {
      const target = scrollPos(s);
      const first = s.shift === null;
      if (first) s.shift = target;
      const diff = target - s.shift;
      if (!first && Math.abs(diff) < 0.0005) return false;
      s.shift += diff * SKY.ease;
      s.el.style.setProperty('--sky-shift', `${(SKY.nebulaShift * s.shift).toFixed(2)}px`);
      return true;
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const s = state.find((x) => x.el === en.target);
        if (s) s.visible = en.isIntersecting;
      });
    }, { rootMargin: '100px 0px' });
    const ro = new ResizeObserver((entries) => {
      entries.forEach((en) => {
        const s = state.find((x) => x.el === en.target);
        if (s) layout(s);
      });
    });
    state.forEach((s) => { io.observe(s.el); ro.observe(s.el); });

    if (!reduceMotion.matches) {
      let last = 0;
      const frame = (now) => {
        requestAnimationFrame(frame);
        const t = now / 1000;
        const tick = now - last >= 1000 / SKY.fps; // 点滅の更新タイミング
        if (tick) last = now;
        state.forEach((s) => {
          if (!s.visible || !s.stars.length) return;
          const moving = follow(s); // 動いている間は毎フレーム描いてなめらかに
          if (moving || tick) draw(s, t);
        });
      };
      requestAnimationFrame(frame);
    }
  }

  /* ---------- スマホのメニュー（ドロワー） ---------- */
  const drawer = document.getElementById('drawer');
  const openBtn = document.querySelector('.menu-toggle');
  const closeBtn = drawer && drawer.querySelector('.menu-close');
  if (drawer && openBtn && closeBtn) {
    // 右からスライドして開く（CSS .drawer.is-open）。閉じるときはスライドし終えてから hidden に戻す
    let hideTimer = 0;
    const setOpen = (open) => {
      clearTimeout(hideTimer);
      openBtn.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('is-drawer-open', open);
      if (open) {
        drawer.hidden = false;
        void drawer.offsetWidth; // 画面の右外の位置を確定させてから動かす
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

  /* ---------- ヒーロー背景のパララックス（scroll() 未対応ブラウザ向け） ---------- */
  const heroImg = document.querySelector('.hero__media'); // 写真・動画をまとめて動かす
  const supportsScrollTl = window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()');
  if (heroImg && !supportsScrollTl && !reduceMotion.matches) {
    let raf = 0;
    const update = () => {
      raf = 0;
      // CSSと同じ：ヒーロー上端が固定ヘッダーに隠れてから、スクロール量の40%（1000pxまで）
      const start = 0; // ヒーローは固定ヘッダーの真下から始まる
      const y = Math.min(Math.max(0, window.scrollY - start), 1000) * 0.4;
      heroImg.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    update();
  }

  /* ---------- TOP：1回のスクロールで次のセクションへ移る（ホイール・キーボード） ----------
     ・画面に収まるセクションでは、ホイール1回（トラックパッドなら1回のスワイプ）で前後のセクションへ移動。
     ・画面より背の高いセクション（横スクロールの「こだわりの音響空間で、」など）は中を普通にスクロールし、
       端まで来たら次のスワイプで前後のセクションへ移る。
     ・移動中と、その直後に続く慣性のホイールは無視して、1回で2つ以上進まないようにする。
     ・タッチ操作が主の端末（スマホ・タブレット）では使わず、CSSの「近くで止めたら吸い付く」スナップのまま。 */
  const spWidth = window.matchMedia('(max-width: 900px)'); // スマホの幅（スナップ・セクション送りなし）
  const PAGE = { duration: 850, gap: 220, edge: 2, slack: 160 }; // 移動の時間(ms)・新しい操作とみなす間隔(ms)・端の許容差(px)
  // slack：見えている高さよりこの分(px)までの超過は「画面に収まる」とみなす（はみ出すのは下の余白程度のため）
  if (document.body.classList.contains('page-top') && !window.matchMedia('(pointer: coarse)').matches) {
    document.documentElement.classList.add('is-paged'); // CSSのスナップを止める
    const header = document.querySelector('.site-header');
    const dock = document.querySelector('.sp-dock');
    const targets = () => {
      const els = [...document.querySelectorAll('main > section'), document.querySelector('.site-footer')].filter(Boolean);
      const hh = header ? header.offsetHeight : 0;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const list = els.map((el, i) => {
        // ヒーローはページの一番上、それ以外は固定ヘッダーの真下に上端をそろえる
        const top = i === 0 ? 0 : Math.min(maxY, el.getBoundingClientRect().top + window.scrollY - hh);
        return { el, top: Math.max(0, Math.round(top)) };
      });
      // 縦に長い画面では、最後のほう（アクセス・フッター）の位置がどれもページの一番下（maxY）にそろってしまう。
      // 同じ位置が並ぶと「上へ」で同じ位置に戻るだけになり、上へ移れなくなるので、同じ位置は最初の1つだけ残す
      return list.filter((t, k) => k === 0 || t.top > list[k - 1].top + PAGE.edge);
    };
    // ヘッダーと（表示されていれば）下の固定ナビを除いた、見えている高さ
    const viewH = () => window.innerHeight - (header ? header.offsetHeight : 0) - (dock && dock.offsetParent ? dock.offsetHeight : 0);

    let animating = false;
    let blocked = false; // 移動後に続く慣性のホイールを止める
    let lastWheel = 0;
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const goTo = (y) => {
      const from = window.scrollY;
      const dur = reduceMotion.matches ? 0 : PAGE.duration;
      animating = true;
      blocked = true;
      const t0 = performance.now();
      const step = (now) => {
        const p = dur ? Math.min(1, (now - t0) / dur) : 1;
        window.scrollTo({ top: from + (y - from) * ease(p), behavior: 'instant' });
        if (p < 1) requestAnimationFrame(step);
        else animating = false;
      };
      requestAnimationFrame(step);
    };

    // 下(+1)・上(-1)へ1セクション進む。移動したら true（＝ブラウザ標準のスクロールを止める）
    // 背の高いセクションの中を普通にスクロールする。ただし端を越える分は端で止める
    // （次の操作が必ずセクションの境目から始まるように）
    const scrollWithin = (y, delta, min, max) => {
      if (y + delta <= max && y + delta >= min) return false; // 端を越えない：ブラウザ標準のスクロール
      window.scrollTo({ top: Math.min(max, Math.max(min, y + delta)), behavior: 'instant' });
      blocked = true; // 同じスワイプの続きで次のセクションへ飛ばないよう、いったん止める
      return true;
    };

    const page = (dir, delta = dir * 100) => {
      const list = targets();
      const y = window.scrollY;
      const vh = viewH();
      // 今いるセクション：上端が画面上端（ヘッダー直下）以上にある最後のもの
      let i = 0;
      list.forEach((t, k) => { if (t.top <= y + PAGE.edge) i = k; });
      const cur = list[i];
      const next = list[i + 1];
      const bottom = next ? next.top : document.documentElement.scrollHeight - window.innerHeight + vh;
      const tall = bottom - cur.top > vh + PAGE.slack;
      if (dir > 0) {
        if (!next) return false;
        // 背の高いセクションの途中：下端が見えるまでは普通にスクロール
        if (tall && y + vh < bottom - PAGE.edge) return scrollWithin(y, delta, cur.top, bottom - vh);
        goTo(next.top);
        return true;
      }
      // 上へ
      if (y > cur.top + PAGE.edge) {
        // セクションの途中：背が高ければ普通にスクロール（上端で止める）、収まるならその上端へ
        if (tall) return scrollWithin(y, delta, cur.top, bottom - vh);
        goTo(cur.top);
        return true;
      }
      const prev = list[i - 1];
      if (!prev) return false;
      // 前のセクションが背の高いものなら、その下端が見える位置へ（続けて上へ普通にスクロールできる）
      const h = cur.top - prev.top;
      goTo(h > vh + PAGE.slack ? cur.top - vh : prev.top);
      return true;
    };

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX) || e.deltaY === 0) return; // ズーム・横スクロールはそのまま
      if (loaderActive() || rootEl.classList.contains('loader-out')) { e.preventDefault(); return; } // ローディング画面のあいだ（消えていく途中も）はセクション送りしない
      if (spWidth.matches) return; // スマホの幅ではセクション送りしない（普通のスクロール）
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      if (animating) { e.preventDefault(); return; }
      if (blocked) {
        if (gap < PAGE.gap) { e.preventDefault(); return; } // 慣性の続き
        blocked = false;
      }
      // deltaMode 1（行単位）は px に換算
      const delta = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (page(e.deltaY > 0 ? 1 : -1, delta)) e.preventDefault();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || spWidth.matches) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable], button, dialog')) return;
      const down = e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
      const up = e.key === 'PageUp' || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      if (loaderActive() || rootEl.classList.contains('loader-out')) { e.preventDefault(); return; } // ローディング画面のあいだは送らない
      if (animating) { e.preventDefault(); return; }
      if (page(down ? 1 : -1, (down ? 1 : -1) * viewH() * 0.9)) e.preventDefault();
    });
  }

  /* ---------- 横スクロール：縦スクロールの間セクションを固定し、カードを横へスライド ----------
     <section data-hscroll> … 固定する面 .jz-pin と、[data-hscroll-viewport] > [data-hscroll-track]
     セクションの高さを「固定面の高さ＋横に動かす距離」にして、縦1pxのスクロールを横1pxに対応させる。
     横に動かす必要がない（カードが画面に収まる）・動きを減らす設定では、固定せず普通に表示。 */
  document.querySelectorAll('[data-hscroll]').forEach((sec) => {
    const pin = sec.querySelector('.jz-pin');
    const viewport = sec.querySelector('[data-hscroll-viewport]');
    const track = sec.querySelector('[data-hscroll-track]');
    const bar = sec.querySelector('[data-hscroll-bar]');
    if (!pin || !viewport || !track || reduceMotion.matches) return;
    let dist = 0;
    let raf = 0;
    // 背景の写真：固定のあいだ、スクロールに合わせて上へ動かし、写真の縦いっぱいを見せる。
    // 最初は写真の上端を、最後は下端を合わせる。写真は面の幅いっぱい（スマホなど縦長の画面では
    // 面の高さの BG_MIN_RATIO 倍以上）に拡大して、必ず縦に動く余地をつくる
    const BG_MIN_RATIO = 1.25;
    const BG_TRAVEL_PC = 0.5; // PC（901px以上）で写真を動かす量：動かせる幅のうちの割合（スマホは全部）
    const isPC = window.matchMedia('(min-width: 901px)');
    const bg = pin.querySelector('.jz-bg');
    let bgTravel = 0;
    let bgNat = null;
    const sizeBg = () => {
      if (!bg || !bgNat || !sec.classList.contains('is-hscroll')) {
        if (bg) { bg.classList.remove('is-pan'); bg.style.width = bg.style.height = bg.style.transform = ''; }
        return;
      }
      const W = pin.clientWidth, H = pin.clientHeight;
      const s = Math.max(W / bgNat.w, (H * BG_MIN_RATIO) / bgNat.h);
      const w = bgNat.w * s, h = bgNat.h * s;
      bg.style.width = `${w.toFixed(1)}px`;
      bg.style.height = `${h.toFixed(1)}px`;
      bg.classList.add('is-pan');
      bgTravel = (h - H) * (isPC.matches ? BG_TRAVEL_PC : 1);
    };
    if (bg) {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(bg).backgroundImage);
      if (m) {
        const im = new Image();
        im.onload = () => { bgNat = { w: im.naturalWidth, h: im.naturalHeight }; sizeBg(); update(); };
        im.src = m[1];
      }
    }
    const update = () => {
      raf = 0;
      if (!sec.classList.contains('is-hscroll')) return;
      const stickyTop = parseFloat(getComputedStyle(pin).top) || 0;
      const p = Math.min(1, Math.max(0, (stickyTop - sec.getBoundingClientRect().top) / dist));
      track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px, 0, 0)`;
      if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
      if (bg && bg.classList.contains('is-pan')) {
        bg.style.transform = `translate3d(-50%, ${(-p * bgTravel).toFixed(1)}px, 0)`;
      }
    };
    const measure = () => {
      sec.classList.add('is-hscroll');
      viewport.scrollLeft = 0;
      dist = track.scrollWidth - viewport.clientWidth;
      // 横に動かす必要がない、または中身が画面の高さに収まらないときは固定しない（指で横スクロール）
      const inner = pin.querySelector('.jz-pin__inner'); // 先頭は星空レイヤーなのでクラスで探す
      const fits = !inner || inner.scrollHeight <= pin.clientHeight + 1;
      if (dist <= 0 || !fits) {
        sec.classList.remove('is-hscroll');
        sec.style.height = '';
        track.style.transform = '';
        sizeBg();
        return;
      }
      sec.style.height = `${pin.offsetHeight + dist}px`;
      sizeBg();
      update();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    new ResizeObserver(measure).observe(viewport);
    window.addEventListener('resize', measure);
    measure();
  });

  /* ---------- ヒーローの背景動画：番号順に音声なしで自動再生 ----------
     data-hero-videos に並べた動画を順番に再生し、最後まで行ったら最初に戻る。
     2つの <video> を交互に使う。今の動画の終わる HERO_FADE 秒前に次の動画を再生し始め、
     上に重ねてフェードインさせる（止まった最後のコマや別の映像が見えないように）。
     次の動画の読み込みは、フェードが完全に終わって下に隠れた方の <video> にだけ行う。
     各 <video> には data-clip（1〜）を付けるので、CSS で動画ごとにトリミング位置を変えられる。
     動きを減らす設定・データセーバーでは再生せず、写真のまま。画面外に出たら一時停止。 */
  const HERO_FADE = 1.2; // 切り替えのフェード（秒）。CSS の .hero__video の transition と合わせる
  const heroMedia = document.querySelector('[data-hero-videos]');
  const saveData = navigator.connection && navigator.connection.saveData;
  if (heroMedia && !reduceMotion.matches && !saveData) {
    const list = heroMedia.dataset.heroVideos.split(',').map((s) => s.trim()).filter(Boolean);
    const players = [...heroMedia.querySelectorAll('video')];
    if (list.length && players.length >= 2) {
      let index = 0; // 今表示している動画の番号（0始まり）
      let cur = players[0];
      let next = players[1];
      let nextIndex = -1; // next に読み込んである動画の番号
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
      // 次の動画へ：上に重ねて再生 → 映像が出たらフェードイン → 終わったら前の動画を片付けて、その次を読み込む
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
            // 次の動画が完全に見えてから、下の前の動画を一瞬で消して止める（その後で次の次を読み込む）
            outgoing.style.transition = 'none';
            outgoing.classList.remove('is-on');
            outgoing.pause();
            void outgoing.offsetWidth; // ここで不透明度0を確定させる
            outgoing.style.transition = '';
            index = ni;
            cur = incoming;
            next = outgoing;
            switching = false;
            preloadNext();
          };
          incoming.addEventListener('transitionend', (e) => { if (e.propertyName === 'opacity') finish(); }, { once: true });
          setTimeout(finish, HERO_FADE * 1000 + 400); // transitionend が来ない場合の保険
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
        v.addEventListener('ended', () => { if (v === cur) beginSwitch(); }); // 念のため
        v.addEventListener('error', () => { if (v === cur && !switching) beginSwitch(); }); // 読み込めない動画は飛ばす
      });
      // 最初の動画：写真の上にフェードイン。始まったら次を読み込んでおく
      cur.addEventListener('playing', () => {
        cur.classList.add('is-top', 'is-on');
        if (nextIndex < 0) preloadNext();
      }, { once: true });
      // ヒーローが画面外にあるあいだは止める
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) {
          play(cur);
          if (switching) play(next); // 切り替えの途中なら、重ねている次の動画も再開
        } else {
          players.forEach((p) => p.pause());
        }
      }).observe(heroMedia);
      // 別のタブから戻ったときに再開（ブラウザは見えていない動画を止めるため）
      document.addEventListener('visibilitychange', () => {
        if (document.hidden || !visible) return;
        play(cur);
        if (switching) play(next);
      });
      load(cur, 0);
      play(cur);
    }
  }

  /* ---------- 絞り込み（ライブ・お知らせ） ---------- */
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
          if (match) { if (shown < 12) fadeUp(it, shown * 40); shown++; } // 表示された項目を順にふわっと
        });
        if (empty) { empty.hidden = shown > 0; if (!empty.hidden) fadeUp(empty); }
      });
    });
  });

  /* ---------- クリックで開閉する部分の高さアニメーション（共通） ----------
     el の高さを from → to（px）へなめらかに変える。終わったら高さの指定を外す。 */
  const EASE_OPEN = 'cubic-bezier(.22, .7, .2, 1)';
  const slideHeight = (el, from, to, done) => {
    if (reduceMotion.matches || from === to) { done && done(); return; }
    const dur = Math.min(700, Math.max(320, Math.abs(to - from) * 0.9)); // 動く量に合わせて 0.32〜0.7秒
    el.style.overflow = 'hidden';
    const anim = el.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: dur, easing: EASE_OPEN });
    anim.onfinish = () => { el.style.overflow = ''; done && done(); };
    anim.oncancel = () => { el.style.overflow = ''; }; // 途中で逆向きに押されたときは、次の動きに任せる
    return anim;
  };
  // 新しく現れた要素を、少し下からふわっと表示する
  const fadeUp = (el, delay = 0) => {
    if (reduceMotion.matches) return;
    el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 450, delay, easing: EASE_OPEN, fill: 'backwards' });
  };

  /* ---------- 続きを読む（スマホのみ折りたたみ） ----------
     開くとき：折りたたんだ高さ → 全文の高さへのばしてから、下のぼかしを消す
     閉じるとき：全文の高さ → 折りたたんだ高さへ縮める。見出しが画面の上に隠れていたら、そこまで戻す */
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
        body.style.maxHeight = 'none'; // 縮めている間は高さの上限を外す（アニメーションで高さを決める）
        anim = slideHeight(body, from, to, () => { body.style.maxHeight = ''; box.classList.remove('is-sliding'); anim = null; });
        const top = box.getBoundingClientRect().top;
        const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
        if (top < headerH) window.scrollBy({ top: top - headerH - 16, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      } else {
        box.classList.remove('is-collapsed');
        body.style.maxHeight = '';
        const to = body.getBoundingClientRect().height;
        box.classList.add('is-sliding'); // のびている間はぼかしを残す
        anim = slideHeight(body, from, to, () => { box.classList.remove('is-sliding'); anim = null; });
      }
    });
  });

  /* ---------- スマホのメニュー：「店舗について」の下層ページを「＋」で開閉 ---------- */
  document.querySelectorAll('.drawer__toggle').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    // 今いるページが下層ページなら、最初から開いておく
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
        if (!anim) panel.hidden = true; // 動きを減らす設定（アニメーションなし）
      }
    });
  });

  /* ---------- モーダル（<dialog class="modal">） ----------
     [data-modal-open="ID"] で開く。閉じる：×ボタン・[data-modal-close]・Esc・外側（暗い部分）をクリック。フェードして閉じる */
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
    // Esc：ブラウザ標準の「すぐ閉じる」を止めてフェードで閉じる
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { close(); return; } // 外側（暗い部分）
      const c = e.target.closest('[data-modal-close]');
      if (!c) return;
      const href = c.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault(); // 閉じ終わってから、ページ内のその場所へ移動
        close(() => requestAnimationFrame(() => { const t = document.querySelector(href); if (t) t.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' }); }));
      } else close();
    });
  });

  /* ---------- アコーディオン（details）：開閉をなめらかに ---------- */
  document.querySelectorAll('.accordion details').forEach((det) => {
    const sum = det.querySelector('summary');
    if (!sum) return;
    let anim = null;
    sum.addEventListener('click', (e) => {
      if (reduceMotion.matches) return; // 動きを減らす設定では標準の開閉
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
        det.classList.add('is-closing'); // ＋/− の表示を先に戻す
        const to = sum.getBoundingClientRect().height;
        anim = slideHeight(det, from, to, () => { det.open = false; det.classList.remove('is-closing'); anim = null; });
      }
    });
  });

  /* ---------- Google ドライブの共有フォルダから写真を表示 ----------
     <div data-drive-gallery data-drive-key="APIキー" data-drive-folder="フォルダID"
          data-drive-limit="6" data-drive-size="480" data-drive-alt="代替テキスト">
       （ここに書いた写真は、未設定・読み込み失敗時にそのまま表示される）
     </div>
     data-drive-more="ボタンのID" … 続きを読み込むボタン（ギャラリーページ）
     子要素が <a> の場合は、拡大表示（ライトボックス）用のリンクとして作る */
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const CACHE_MIN = 10; // 同じ一覧は10分間ブラウザに保存して、APIの呼び出しを減らす
  // 画像URL：公開ファイルを指定幅で配信。表示できない場合はサムネイルURLに切り替える
  const driveImg = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
  const driveThumb = (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;

  /* ---------- ドライブの写真の読み込み（失敗したら少し待って取り直す） ----------
     ドライブの画像は、一度にたくさん頼むと一時的に断られることがある。そこで
     ・同時に読み込むのは DRIVE_PARALLEL 枚まで（順番待ち）
     ・失敗したら URL を変えたり、少し待ったりして DRIVE_RETRY の順に取り直す
     ・読み込み中は「読込中…」、最後までだめなら「画像を読み込めません」の仮の画像を出す */
  const DRIVE_PARALLEL = 4;
  const DRIVE_RETRY = [ // [使うURL, 待つ時間(ms)]
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
  // id の写真を幅 w で読み込み、成功した URL を返す（だめなら null）
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
  // <img> にドライブの写真を入れる：まず「読込中…」、画面に近づいたら読み込み（失敗時は取り直し → だめなら「画像を読み込めません」）
  const lazyDrive = (img, id, size) => {
    img.src = PH_LOADING;
    img.classList.add('is-ph');
    const start = () => loadDrive(id, size).then((src) => {
      img.src = src || PH_FAILED;
      img.classList.remove('is-ph'); // 失敗時の「画像を読み込めません」は明滅させない
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); start(); } }, { rootMargin: '400px 0px' });
      io.observe(img);
    } else start();
  };

  // フォルダの写真を一覧で取得し、並べ替えて返す（1回の呼び出しで最大1000枚。それ以上は続けて取得）。
  // 並び順：① 最初に並べる写真（pinned：site.config.mjs の galleryPinned と同じ名前のファイル、その順）
  //         ② 残りを新しい順。日付は、ファイル名が「撮影日-時刻」（20221224-112206-01.jpg など）ならその日時、
  //            そうでなければドライブに入れた日時（まとめてアップロードしても撮影日の順に並ぶ）
  // 代替テキスト：pinned の文言 → ドライブの「説明」欄 → 「52番街の写真（2022年12月）」（名前に日付があるとき）
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
      return b.time - a.time || (b.name || '').localeCompare(a.name || ''); // 同じ日時（同じ投稿の複数枚）は名前の逆順
    });
  }

  function driveItem(file, box) {
    const size = Number(box.dataset.driveSize) || 480;
    const img = document.createElement('img');
    lazyDrive(img, file.id, size);
    // 代替テキスト（listDriveImages で決めたもの）。なければ共通の文言
    img.alt = file.alt || box.dataset.driveAlt || '52番街の写真';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = size;
    img.height = size;
    if (!box.hasAttribute('data-lightbox')) return img;
    const a = document.createElement('a');
    a.href = driveImg(file.id, 1600);
    a.dataset.driveId = file.id; // 拡大表示でも失敗時に取り直せるように
    a.className = 'photo-grid__item';
    a.appendChild(img);
    return a;
  }

  document.querySelectorAll('[data-drive-gallery]').forEach(async (box) => {
    const { driveKey: key, driveFolder: folder } = box.dataset;
    if (!key || !folder) return; // 未設定：HTMLの写真のまま
    const limit = Number(box.dataset.driveLimit) || 48;
    const more = box.dataset.driveMore ? document.getElementById(box.dataset.driveMore) : null;
    let shownCount = 0;
    const load = async () => {
      box.setAttribute('aria-busy', 'true');
      try {
        const all = await listDriveImages(key, folder, box.dataset.drivePinned);
        const files = all.slice(shownCount, shownCount + limit);
        if (!shownCount) {
          if (!files.length) return; // フォルダが空：HTMLの写真のまま
          box.replaceChildren();
        }
        files.forEach((f) => box.appendChild(driveItem(f, box)));
        shownCount += files.length;
        if (more) more.hidden = shownCount >= all.length;
      } catch (e) {
        console.warn('[drive gallery]', e); // 失敗時：HTMLの写真のまま
      } finally {
        box.removeAttribute('aria-busy');
      }
    };
    if (more) more.addEventListener('click', load);
    load();
  });

  /* ---------- ギャラリー：スクロールに合わせて続きを読み込む ----------
     [data-gallery] … 最初の数枚はページに書き出し済み。「もっと見る」ボタン（.gallery-more）を押したら
     data-page-size 枚ずつ追加する。写真の出どころは2通り：
       ・Google ドライブ（data-drive-key と data-drive-folder があるとき）… 共有フォルダを新しい順に
       ・それ以外 … ビルド時に作る一覧 data-gallery-src（gallery.json）
     「もっと見る」ボタンで pageSize 枚ずつ読み込み、最後まで出したらボタンを消す */
  const galleryEl = document.querySelector('[data-gallery]');
  if (galleryEl) {
    const pageSize = Number(galleryEl.dataset.pageSize) || 24;
    const base = galleryEl.dataset.galleryBase || '';
    const moreBtn = document.querySelector('.gallery-more'); // 「もっと見る」ボタン
    const statusEl = document.querySelector('.gallery-status');
    const countEl = document.querySelector('[data-gallery-count]');
    const { driveKey, driveFolder } = galleryEl.dataset;
    let shown = galleryEl.querySelectorAll('.photo-grid__item').length;
    let finished = false;
    let loading = false;
    let next; // () => Promise<{ items: [{thumb, large, alt, fallback?}], done }>

    // 書き出し済みの写真の一覧（gallery.json）から続きを出す
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
      // ドライブ：書き出し済みの写真は置き換える。一覧が取れない・空のときは、書き出し済みの写真の一覧に切り替える
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
          // 書き出し済みの写真をドライブの写真に置き換え、枚数もドライブの枚数に
          galleryEl.replaceChildren();
          shown = 0;
          if (countEl) countEl.textContent = `全${all.length}枚`;
        }
        const items = all.slice(shown, shown + pageSize).map((f) => ({
          driveId: f.id, // 一覧の写真は lazyDrive で読み込む（失敗時の取り直し・仮の画像つき）
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
        a.style.setProperty('--gd', `${Math.min(i * 40, 600)}ms`); // 少しずつ時間差で出す
        const img = document.createElement('img');
        img.alt = it.alt;
        img.width = 600;
        img.height = 600;
        img.decoding = 'async';
        if (it.driveId) {
          a.dataset.driveId = it.driveId;
          lazyDrive(img, it.driveId, 600);
        } else {
          // 書き出し済みの写真：失敗したら1回だけ少し待って取り直し、だめなら「画像を読み込めません」
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
      if (moreBtn) moreBtn.hidden = true; // 全部出したらボタンを消す
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
        if (moreBtn) moreBtn.hidden = false; // もう一度押せるように残す
        return;
      } finally {
        loading = false;
        if (moreBtn) moreBtn.disabled = false;
      }
    };

    // 「もっと見る」ボタンで続きを読み込む（書き出し済みの分より多くあるときだけボタンを出す）
    if (moreBtn) {
      moreBtn.addEventListener('click', loadMore);
      const total = countEl ? Number((countEl.textContent.match(/\d+/) || [0])[0]) : 0;
      if (!(driveKey && driveFolder) && total > shown) moreBtn.hidden = false;
    }
    // ドライブのときは最初の分をすぐ読み込む（書き出し済みの写真と入れ替える）
    if (driveKey && driveFolder) loadMore();
  }

  /* ---------- 過去のライブ：チャンネルの最近の動画（YouTube） ----------
     ふだんは build.mjs がビルド時に取得して書き出した動画を表示する。
     site.config.mjs の youtube.apiKey（YouTube Data API v3）が入っていれば、ページを開くたびに最新の動画に入れ替える。
     失敗したとき（キーの制限・回数の上限など）は、書き出してある動画のまま */
  document.querySelectorAll('[data-youtube-archive]').forEach(async (box) => {
    const key = box.dataset.ytKey;
    const channel = box.dataset.ytChannel;
    if (!key || !channel) return;
    const count = Number(box.dataset.ytCount) || 3;
    const exclude = box.dataset.ytExclude ? new RegExp(box.dataset.ytExclude) : null;
    try {
      // チャンネルのアップロード一覧（UC… → UU…）を新しい順に取得（1回あたり割り当て1ユニット）
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
        // build.mjs の ytCard と同じ形
        const a = document.createElement('a');
        a.href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}`;
        a.className = 'stack-s plain-link';
        a.target = '_blank'; // YouTube は別タブで開く
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

  /* ---------- 写真の拡大表示（ライトボックス） ---------- */
  const lightbox = document.getElementById('lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    // 写真は2枚の <img> を重ね、読み込み（デコード）が済んでから入れ替えてクロスフェードする（途中まで描かれた写真を見せない）
    const imgs = [...lightbox.querySelectorAll('.lightbox__img')];
    const lbCap = lightbox.querySelector('.lightbox__caption');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let list = [];
    let index = 0;
    let cur = 0; // 今見えている <img> の番号（0 / 1）
    let token = 0; // 速く連打されたときは最後の操作だけ反映する
    const ready = (img) => (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
    // 閉じるボタンの上端を、表示中の写真の上端にそろえる（写真は枠の中で縦横比を保って中央に置かれる）
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
    // 開くときの写真の拡大アニメーション（lb-zoom）が終わったら、もう一度そろえる
    lightbox.addEventListener('animationend', (e) => { if (e.target.classList.contains('lightbox__stage')) alignClose(); });
    // 写真を入れる：ドライブの写真は、失敗したら取り直し（それでもだめなら「画像を読み込めません」）
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
    const show = (i, dir = 1, instant = false) => {
      index = (i + list.length) % list.length;
      const a = list[index];
      const thumb = a.querySelector('img');
      const t = ++token;
      const next = imgs[1 - cur];
      const prev = imgs[cur];
      lightbox.style.setProperty('--lb-dir', dir);
      lbCap.textContent = `${index + 1} / ${list.length}`;
      // 入ってくる写真を、アニメーションなしで開始位置（進む向きの少し先・透明）に置いてから読み込む
      next.classList.add('no-anim');
      next.classList.remove('is-current', 'is-leaving');
      next.alt = thumb ? thumb.alt : '';
      setSrc(next, a).then(() => ready(next)).then(() => {
        if (t !== token) return;
        void next.offsetWidth; // 開始位置を確定させてから動かす
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
        preload(index + dir); // 次に開きそうな写真を先に読んでおく
      });
    };
    const open = (i) => {
      lightbox.classList.remove('is-closing');
      imgs.forEach((im) => { im.classList.add('no-anim'); im.classList.remove('is-current', 'is-leaving'); });
      show(i, 1, true);
      lightbox.showModal();
      preload(i - 1);
    };
    // 閉じる：フェードアウトしてから閉じる（Esc キーでも同じ）
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
      if (e.key === 'Escape') { e.preventDefault(); close(); } // ブラウザ標準の「すぐ閉じる」を止めてフェードで閉じる
      if (e.key === 'ArrowLeft') show(index - 1, -1);
      if (e.key === 'ArrowRight') show(index + 1, 1);
    });
    // スマホ：左右にスワイプで切り替え
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
