// Mobile menu
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('mainNav');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});

// Audience gateway tabs
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', 'false'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.dataset.panel).classList.add('on');
  });
});

// Accessibility tools
let size = 100;
const setSize = n => { size = Math.min(130, Math.max(90, n)); document.documentElement.style.fontSize = size + '%'; };
document.getElementById('txtUp').addEventListener('click', () => setSize(size + 10));
document.getElementById('txtDown').addEventListener('click', () => setSize(size - 10));
const cBtn = document.getElementById('contrast');
cBtn.addEventListener('click', () => {
  const on = document.body.classList.toggle('contrast');
  cBtn.setAttribute('aria-pressed', on);
});

// Vision and mission language switcher
document.querySelectorAll('.lang button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', b === btn));
    document.querySelectorAll('.vm blockquote').forEach(q => q.hidden = q.dataset.lang !== btn.dataset.lang);
  });
});

// Footer year
document.getElementById('yr').textContent = new Date().getFullYear();

// Research and extension: filter entries by quarter
document.querySelectorAll('.qtabs').forEach(bar => {
  const buttons = bar.querySelectorAll('button');
  const panels = bar.parentElement.querySelectorAll('.qpanel');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.setAttribute('aria-selected', b === btn));
      panels.forEach(p => p.hidden = btn.dataset.q !== 'all' && p.dataset.q !== btn.dataset.q);
    });
  });
});

// College pages: enrollment chart (grouped columns, one group per program, one column per academic year)
(function () {
  const charts = document.querySelectorAll('.enroll-chart');
  if (!charts.length) return;
  const NS = 'http://www.w3.org/2000/svg';
  const YEAR_COLORS = ['var(--yr-1)', 'var(--yr-2)', 'var(--yr-3)']; // ordinal blue ramp, oldest to newest

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  // clean axis: tick step from a fixed list so ticks read 0 / 100 / 200 ...
  function niceScale(v) {
    const raw = v * 1.1;
    const step = [25, 50, 100, 200, 250, 500, 1000].find(s => raw / s <= 5) || 1000;
    return { max: Math.ceil(raw / step) * step, step };
  }
  // column with a 4px rounded top, square at the baseline
  function colPath(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  charts.forEach(box => {
    const data = JSON.parse(box.querySelector('script').textContent);

    // legend (always present: three series)
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    data.years.forEach((y, i) => {
      const item = document.createElement('span');
      const sw = document.createElement('i');
      sw.style.background = YEAR_COLORS[i];
      item.appendChild(sw);
      item.appendChild(document.createTextNode('A.Y. ' + y));
      legend.appendChild(item);
    });
    box.appendChild(legend);

    const plot = document.createElement('div');
    plot.className = 'chart-plot';
    box.appendChild(plot);
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.hidden = true;
    plot.appendChild(tip);

    function showTip(evt, prog, yi, bar) {
      tip.replaceChildren();
      const v = document.createElement('strong');
      v.textContent = prog.values[yi].toLocaleString() + ' students';
      const l = document.createElement('span');
      l.textContent = prog.short + ' · A.Y. ' + data.years[yi];
      tip.append(v, l);
      tip.hidden = false;
      const pr = plot.getBoundingClientRect();
      const br = bar.getBoundingClientRect();
      let x = br.left + br.width / 2 - pr.left;
      x = Math.max(70, Math.min(pr.width - 70, x));
      tip.style.left = x + 'px';
      tip.style.top = (br.top - pr.top - 8) + 'px';
    }
    function hideTip() { tip.hidden = true; }

    function render() {
      plot.querySelectorAll('svg').forEach(s => s.remove());
      const W = Math.max(300, plot.clientWidth);
      const H = 300;
      const m = { t: 24, r: 8, b: 44, l: 44 };
      const iw = W - m.l - m.r, ih = H - m.t - m.b;
      const { max, step } = niceScale(Math.max(...data.programs.flatMap(p => p.values)));
      const y = v => m.t + ih - (v / max) * ih;

      const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: 'img',
        'aria-label': 'Enrollment by program for academic years ' + data.years.join(', ') });
      plot.insertBefore(svg, tip);

      // recessive hairline grid + ticks
      for (let v = 0; v <= max; v += step) {
        el('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v === 0 ? 'axis' : 'grid' }, svg);
        const t = el('text', { x: m.l - 8, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' }, svg);
        t.textContent = Math.round(v).toLocaleString();
      }

      const band = iw / data.programs.length;
      const n = data.years.length;
      const bw = Math.min(24, (band * 0.7 - (n - 1) * 2) / n);
      const gw = bw * n + (n - 1) * 2;

      data.programs.forEach((p, pi) => {
        const gx = m.l + band * pi + (band - gw) / 2;
        p.values.forEach((v, yi) => {
          const x = gx + yi * (bw + 2);
          const h = m.t + ih - y(v);
          // hit area bigger than the mark: the whole column slot
          const hit = el('rect', { x: x - 1, y: m.t, width: bw + 2, height: ih, class: 'hit', tabindex: 0,
            'aria-label': `${p.name}, A.Y. ${data.years[yi]}: ${v.toLocaleString()} students` }, svg);
          const bar = el('path', { d: colPath(x, y(v), bw, h), fill: YEAR_COLORS[yi], class: 'bar' }, svg);
          const on = e => { bar.classList.add('on'); showTip(e, p, yi, bar); };
          const off = () => { bar.classList.remove('on'); hideTip(); };
          hit.addEventListener('pointerenter', on);
          hit.addEventListener('pointerleave', off);
          hit.addEventListener('focus', on);
          hit.addEventListener('blur', off);
          // label only the latest year, on the cap
          if (yi === n - 1) {
            const lab = el('text', { x: x + bw / 2, y: y(v) - 6, 'text-anchor': 'middle', class: 'val' }, svg);
            lab.textContent = v.toLocaleString();
          }
        });
        const pl = el('text', { x: m.l + band * pi + band / 2, y: H - m.b + 20, 'text-anchor': 'middle', class: 'cat' }, svg);
        pl.textContent = p.short;
      });
    }

    let lastW = 0;
    const redraw = () => { if (plot.clientWidth !== lastW) { lastW = plot.clientWidth; render(); } };
    redraw();
    if ('ResizeObserver' in window) new ResizeObserver(redraw).observe(plot);
  });
})();

// College pages: program tabs (click, arrow keys, Home/End)
document.querySelectorAll('.ptabs').forEach(list => {
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); select(next, true); }
    });
  });
});

// Job opportunities: filter by teaching / non-teaching
document.querySelectorAll('.job-filter').forEach(bar => {
  const buttons = bar.querySelectorAll('button');
  const jobs = document.querySelectorAll('.job');
  const count = document.querySelector('.job-count');
  const apply = f => {
    let n = 0;
    jobs.forEach(j => { const show = f === 'all' || j.dataset.cat === f; j.hidden = !show; if (show) n++; });
    if (count) count.textContent = `Showing ${n} position${n === 1 ? '' : 's'}`;
  };
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    apply(b.dataset.filter);
  }));
  apply('all');
});
