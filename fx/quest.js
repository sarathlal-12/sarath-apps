// Page sections driven by a JSON config in <script type="application/json" id="fx-cfg">:
// intro loader, floating cards in the hero, pinned scroll lines, a sliding sheet,
// a phone with small playable app demos, and a sticky bottom button.
(function () {
  var root = document.documentElement;
  var cfgEl = document.getElementById('fx-cfg');
  if (!cfgEl) return;
  var cfg; try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /still/.test(location.search);
  var A = cfg.accent || 'var(--accent)';

  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pad(i) { return (i < 9 ? '0' : '') + (i + 1); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function card(c, i) {
    if (c.back) return '<div class="q-card back"><span class="q-card-mark">' + esc(c.mark || '✦') + '</span></div>';
    return '<div class="q-card" style="--c:' + (c.accent || A) + '"><div class="q-card-top"><span>' + esc(c.kicker || 'Free app') + '</span><span>' + pad(i) + '</span></div>' +
      (c.icon ? '<img src="' + c.icon + '" alt="">' : '<span class="q-card-mark">' + esc(c.mark || '✦') + '</span>') +
      '<b>' + esc(c.title) + '</b><small>' + esc(c.sub) + '</small><div class="q-card-foot"><span>' + esc(c.foot || 'Free') + '</span><span>→</span></div></div>';
  }

  // Where new sections go. Home has placeholders; app pages get them right after the hero.
  var hero = document.querySelector('.hero');
  var anchor = hero;
  function slot(name) {
    var el = document.querySelector('[data-q="' + name + '"]');
    if (el) return el;
    if (!anchor) return null;
    el = document.createElement('div'); el.setAttribute('data-q', name);
    anchor.after(el); anchor = el;
    return el;
  }
  if (!document.querySelector('[data-q]') && hero) slot('show');   // app3d.js puts its 3D scene here

  // ---------------- intro loader ----------------
  function loader() {
    var L = cfg.loader; if (!L || reduce) return;
    var key = 'q-load:' + location.pathname;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) {}
    var el = h('<div class="q-load" aria-hidden="true">' +
      '<div class="q-load-top"><span class="q-load-brand"><i>SL</i>Sarath Lal</span><span>' + esc(L.top) + '</span></div>' +
      '<div class="q-load-mid"><p class="q-kick">' + esc(L.kicker) + '</p><h2 class="q-load-h">' + L.title + '</h2><p class="q-load-sub">' + esc(L.sub) + '</p>' +
      '<div class="q-fan">' + L.cards.map(card).join('') + '</div></div>' +
      '<div class="q-load-bot"><div class="q-load-row"><span>' + esc(L.status) + '</span><span class="q-load-n"><b>0</b> / 100</span></div>' +
      '<div class="q-bars">' + new Array(7).join('<i><u></u></i>') + '</div></div></div>');
    document.body.appendChild(el);
    root.classList.add('q-lock');
    var num = el.querySelector('b'), bars = el.querySelectorAll('.q-bars u'), t0 = performance.now(), D = 1900, ended = false;
    function finish() {
      if (ended) return; ended = true;
      el.classList.add('done'); root.classList.remove('q-lock');
      setTimeout(function () { el.remove(); }, 1100);
    }
    (function step(now) {
      var p = clamp((now - t0) / D), e = 1 - Math.pow(1 - p, 2);
      num.textContent = Math.round(e * 100);
      for (var i = 0; i < bars.length; i++) bars[i].style.transform = 'scaleX(' + clamp(e * bars.length - i) + ')';
      if (p < 1) requestAnimationFrame(step); else setTimeout(finish, 300);
    })(t0);
    setTimeout(finish, 4500);
  }

  // ---------------- floating cards in the hero ----------------
  function floaters() {
    var F = cfg.float; if (!F || !F.length) return;
    var host = document.querySelector('[data-q-float]'), side = false;
    if (!host) {
      if (!hero) return;
      side = true;
      host = h('<div class="q-float q-float-side" aria-hidden="true"></div>');
      hero.classList.add('q-has-float'); hero.prepend(host);
    }
    var slots = side
      ? [{ x: 7, y: 26, z: -80, r: -9 }, { x: 93, y: 22, z: -160, r: 8 }, { x: 10, y: 74, z: -260, r: 6 }, { x: 90, y: 70, z: -60, r: -6 }, { x: 3, y: 50, z: -420, r: 3 }, { x: 97, y: 46, z: -460, r: -4 }]
      : [{ x: 12, y: 30, z: -60, r: -10 }, { x: 84, y: 24, z: -180, r: 9 }, { x: 22, y: 78, z: -280, r: 7 }, { x: 78, y: 76, z: -90, r: -7 }, { x: 50, y: 12, z: -520, r: 2 }, { x: 96, y: 52, z: -420, r: -4 }, { x: 3, y: 56, z: -460, r: 5 }];
    var els = F.slice(0, slots.length).map(function (c, i) {
      var s = slots[i], e = h('<div class="q-fl" style="left:' + s.x + '%;top:' + s.y + '%">' + card(c, i) + '</div>');
      e._s = s; e._i = i; host.appendChild(e); return e;
    });
    var mx = 0, my = 0, tx = 0, ty = 0, vis = true, t = 0, last = performance.now();
    addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; }, { passive: true });
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(host);
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!vis) return;
      if (!reduce) t += dt;
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      var sy = Math.min(scrollY, innerHeight * 1.5);
      els.forEach(function (e) {
        var s = e._s, i = e._i, d = 1 + s.z / 700;
        var x = mx * 60 * d + Math.sin(t * 0.45 + i * 1.7) * 14;
        var y = my * 40 * d + Math.cos(t * 0.38 + i * 1.3) * 16 - sy * (0.15 + 0.45 * d);
        e.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + s.z + 'px) rotateZ(' + (s.r + Math.sin(t * 0.3 + i) * 3).toFixed(2) + 'deg) rotateY(' + (mx * 18 + Math.sin(t * 0.5 + i) * 6).toFixed(2) + 'deg) rotateX(' + (-my * 12).toFixed(2) + 'deg)';
      });
    }
    requestAnimationFrame(frame);
  }

  // ---------------- pinned scroll lines ----------------
  var scrollers = [];
  function lines() {
    var Ls = cfg.lines; if (!Ls) return;
    var el = slot('lines'); if (!el) return;
    var sec = h('<section class="q-lines" style="--n:' + Ls.length + '"><div class="q-lines-in"><div class="q-lines-text">' +
      Ls.map(function (l) { return '<p class="q-l">' + esc(l) + '</p>'; }).join('') + '</div>' +
      (cfg.linesCard ? '<div class="q-lines-card" aria-hidden="true">' + card(cfg.linesCard, 0) + '</div>' : '') + '</div></section>');
    el.replaceWith(sec); if (anchor === el) anchor = sec;
    var ps = sec.querySelectorAll('.q-l'), cardEl = sec.querySelector('.q-lines-card'), n = ps.length;
    scrollers.push(function () {
      var r = sec.getBoundingClientRect(), p = clamp(-r.top / (r.height - innerHeight));
      if (reduce) p = 1;
      for (var i = 0; i < n; i++) ps[i].style.opacity = (0.12 + 0.88 * clamp((p * (n + 0.4) - i) * 1.4)).toFixed(3);
      if (cardEl) cardEl.style.transform = 'translateY(' + ((0.5 - p) * 120).toFixed(1) + 'px) rotate(' + (8 - p * 16).toFixed(2) + 'deg) scale(' + (0.88 + p * 0.14).toFixed(3) + ')';
    });
  }

  // ---------------- small animated scenes for the "Made for" pictures ----------------
  // Each scene is a tiny made-up screen. Parts with sc-pop / sc-up / sc-type / sc-fill animate in
  // when the item scrolls into view (.q-item.in); loops (eq bars, plane, road) always run.
  function at(l, t, w, extra) { return 'style="left:' + l + '%;top:' + t + '%;' + (w ? 'width:' + w + '%;' : '') + (extra || '') + '"'; }
  function bars(ws, d0, cls) { return ws.map(function (w, i) { return '<i class="sc-l ' + (cls || 'sc-type') + '" style="--w:' + w + '%;--d:' + (d0 + i * 0.18).toFixed(2) + 's"></i>'; }).join(''); }
  var EQ = '<span class="sc-eq"><i></i><i></i><i></i><i></i></span>';
  var SCENES = {
    // SpotVault
    'sv-flight': '<span class="sc-fly">✈</span>' +
      '<div class="sc-c sc-up" ' + at(20, 26, 60) + '><div class="sc-head"><span>✈ Airplane mode</span><small>Wi-Fi off</small></div>' +
      '<div class="sc-row"><span class="sc-art"></span><span class="sc-t"><b>Low Tide Radio</b><small>Saved offline ✓</small></span>' + EQ + '</div>' +
      '<div class="sc-bar"><i class="sc-fill" style="--w:62%;--d:.4s"></i></div></div>',
    'sv-road': '<div class="sc-road"></div>' +
      '<div class="sc-c sc-up" ' + at(20, 12, 60) + '><div class="sc-head"><span><span class="sc-sig"><i></i><i></i><i></i><i></i></span> No service</span><small class="sc-bad">✕</small></div>' +
      '<div class="sc-row"><span class="sc-art"></span><span class="sc-t"><b>Still playing</b><small>Low Tide Radio</small></span>' + EQ + '</div></div>',
    'sv-lyrics': '<div class="sc-c sc-up sc-lyc" ' + at(18, 12, 64) + '><p>Windows down on the coast road</p><p>No bars left on my phone</p><p>But the song keeps on playing</p><p>Saved it before we left home</p></div>',
    'sv-jam': '<div class="sc-c sc-up" ' + at(30, 16, 40) + '><div class="sc-head"><span><span class="sc-dot"></span> Jam</span><small>3 listening</small></div>' +
      '<small class="sc-mut">Up next</small><div class="sc-q"><span class="sc-art s"></span>Low Tide Radio</div><div class="sc-q"><span class="sc-art s b"></span>Paper Kites at Noon</div></div>' +
      '<span class="sc-av sc-pop" ' + at(13, 22, 0, '--d:.4s;background:#F0605A') + '>A</span>' +
      '<span class="sc-av sc-pop" ' + at(77, 16, 0, '--d:.7s;background:#5B8FFF') + '>M</span>' +
      '<span class="sc-av sc-pop" ' + at(75, 58, 0, '--d:1s;background:#30D158') + '>R</span>',
    // AirBridge
    'ab-desk': '<span class="sc-spk sc-up" ' + at(9, 20, 0, '--d:.1s') + '><i></i><i class="b"></i></span><span class="sc-wave" ' + at(12, 30) + '></span>' +
      '<span class="sc-spk sc-up" ' + at(77, 20, 0, '--d:.2s') + '><i></i><i class="b"></i></span><span class="sc-wave r" ' + at(80, 30) + '></span>' +
      '<div class="sc-ph sc-pop" ' + at(42, 14, 16, '--d:.35s') + '><small>AirBridge</small><b>Playing on PC</b>' + EQ + '</div>',
    'ab-night': '<span class="sc-moon"></span>' +
      '<div class="sc-vid sc-up" ' + at(14, 16, 52) + '><span class="sc-play">▶</span><div class="sc-bar"><i class="sc-fill" style="--w:38%;--d:.5s"></i></div></div>' +
      '<span class="sc-p sc-pop" ' + at(46, 66, 0, '--d:.8s') + '><span class="sc-dot"></span> Sound on your PC headphones</span>',
    'ab-podcast': '<div class="sc-c light sc-up" ' + at(10, 12, 58) + '><div class="sc-win"><i></i><i></i><i></i> Report.xlsx</div>' + bars([90, 70, 85, 55], 0.3) + '</div>' +
      '<div class="sc-c sc-pop" ' + at(52, 52, 40, '--d:.7s') + '><div class="sc-head"><span><span class="sc-dot"></span> Podcast</span><small>24:10</small></div><span class="sc-eq wide"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span></div>',
    'ab-phones': '<div class="sc-c sc-up" ' + at(7, 12, 30) + '><b>iPhone</b><small class="sc-mut">AirPlay</small></div>' +
      '<div class="sc-c sc-up" ' + at(7, 54, 30, '--d:.2s') + '><b>Android</b><small class="sc-mut">Bluetooth</small></div>' +
      '<span class="sc-flow" ' + at(39, 26, 24) + '></span><span class="sc-flow" ' + at(39, 66, 24, 'transform:rotate(-14deg);transform-origin:right') + '></span>' +
      '<div class="sc-c sc-pop" ' + at(64, 30, 29, '--d:.5s') + '><b>Your PC</b>' + EQ + '</div>',
    // .light
    'li-clip': '<div class="sc-isl sc-pop" ' + at(24, 8, 52) + '><small class="sc-mut">Clipboard</small>' +
      '<div class="sc-q sc-up" style="--d:.5s">Meeting at 4</div><div class="sc-q sc-up" style="--d:.7s">git push origin main</div><div class="sc-q sc-up" style="--d:.9s"><span class="sc-sw"></span>#7C5CFF</div></div>',
    'li-claude': '<div class="sc-c light sc-up" ' + at(10, 30, 62) + '><div class="sc-win"><i></i><i></i><i></i> main.py</div>' + bars([60, 82, 45, 70], 0.3, 'sc-type code') + '</div>' +
      '<div class="sc-isl pill sc-pop" ' + at(26, 9, 48, '--d:1s') + '><span class="sc-dot pulse"></span> Claude Code · Done ✓</div>',
    'li-music': '<div class="sc-isl sc-pop" ' + at(22, 12, 56) + '><div class="sc-row"><span class="sc-art"></span><span class="sc-t"><b>Low Tide Radio</b><small>Now playing</small></span>' + EQ + '</div>' +
      '<div class="sc-ctl"><span>⏮</span><span class="big">❚❚</span><span>⏭</span></div><div class="sc-bar"><i class="sc-fill" style="--w:45%;--d:.5s"></i></div></div>',
    'li-grab': '<div class="sc-c light sc-up" ' + at(12, 12, 64) + '><div class="sc-win"><i></i><i></i><i></i> Browser</div>' + bars([80, 60, 90, 50, 70], 0.2, 'sc-st') + '</div>' +
      '<span class="sc-sel" ' + at(30, 34) + '></span>' +
      '<span class="sc-p sc-pop" ' + at(56, 70, 0, '--d:1.5s') + '>✓ Copied to clipboard</span>',
    // Byterake
    'br-full': '<div class="sc-c sc-up" ' + at(16, 22, 68) + '><div class="sc-head"><span>Local Disk (C:)</span><small class="sc-bad">2.1 GB free</small></div>' +
      '<div class="sc-bar red"><i class="sc-fill" style="--w:97%;--d:.3s"></i></div></div>' +
      '<span class="sc-p warn sc-pop" ' + at(56, 9, 0, '--d:1.1s') + '>⚠ Almost full</span>',
    'br-explain': '<div class="sc-c sc-up" ' + at(5, 14, 52) + '>' +
      '<div class="sc-li"><span>Temp files</span><b>3.4 GB</b><em>Safe</em></div><div class="sc-li"><span>Old downloads</span><b>6.1 GB</b><em class="chk">Review</em></div><div class="sc-li"><span>Browser cache</span><b>1.8 GB</b><em>Safe</em></div></div>' +
      '<div class="sc-c light sc-tip sc-pop" ' + at(60, 38, 35, '--d:.9s') + '><b>Temp files</b><small>Leftovers apps made and no longer need. Safe to clean.</small></div>',
    'br-bin': '<div class="sc-c sc-up" ' + at(10, 22, 36) + '><b>3 items</b><small class="sc-mut">13.5 GB cleaned</small><span class="sc-btn">↺ Restore</span></div>' +
      '<span class="sc-doc" ' + at(66, 4, 0, '--d:0s') + '></span><span class="sc-doc" ' + at(70, 4, 0, '--d:.8s') + '></span><span class="sc-doc" ' + at(62, 4, 0, '--d:1.6s') + '></span>' +
      '<span class="sc-bin" ' + at(58, 44) + '><i></i></span>',
    'br-offline': '<div class="sc-c sc-up" ' + at(20, 18, 60) + '><div class="sc-head"><span>Byterake</span><span class="sc-p off"><span class="sc-dot"></span> Offline</span></div>' +
      '<b class="sc-big">Nothing leaves your PC.</b><small class="sc-mut">No account · No upload · No internet needed</small></div>',
    // Utter
    'ut-email': '<span class="sc-mic sc-pop" ' + at(8, 30) + '><i></i></span>' +
      '<div class="sc-c light sc-up" ' + at(30, 12, 60, '--d:.2s') + '><small class="sc-mut">To: Sam</small><b class="sc-type-t">Hi Sam,</b>' + bars([95, 88, 92, 60], 0.6) + '</div>',
    'ut-chat': '<span class="sc-p sc-pop" ' + at(8, 8) + '><span class="sc-dot"></span> Casual tone</span>' +
      '<span class="sc-bub me sc-pop" ' + at(52, 22, 0, '--d:.3s') + '>omw, 5 mins</span>' +
      '<span class="sc-bub sc-pop" ' + at(14, 44, 0, '--d:.9s') + '>nice, grabbing coffee</span>' +
      '<span class="sc-bub me sc-pop" ' + at(56, 66, 0, '--d:1.5s') + '>sounds good</span>',
    'ut-dict': '<div class="sc-c sc-up" ' + at(16, 14, 68) + '><div class="sc-head"><span>Your dictionary</span><small>3 words</small></div>' +
      '<div class="sc-fix sc-up" style="--d:.4s"><s>kubernetes</s>→<b>Kubernetes</b><em>✓</em></div>' +
      '<div class="sc-fix sc-up" style="--d:.7s"><s>sarath</s>→<b>Sarath</b><em>✓</em></div>' +
      '<div class="sc-fix sc-up" style="--d:1s"><s>next js</s>→<b>Next.js</b><em>✓</em></div></div>',
    'ut-notes': '<div class="sc-c light sc-up" ' + at(12, 12, 54) + '><b>Notes</b>' + bars([90, 75, 85, 50], 0.4) + '</div>' +
      '<span class="sc-p sc-pop" ' + at(52, 64, 0, '--d:1.1s') + '><span class="sc-dot"></span> On this PC · no cloud</span>',
  };

  // ---------------- sliding sheet ----------------
  function sheet() {
    var S = cfg.sheet; if (!S) return;
    var el = slot('sheet'); if (!el) return;
    var sec = h('<section class="q-sheet-wrap"' + (S.id ? ' id="' + S.id + '"' : '') + '><div class="q-big" aria-hidden="true">' + esc(S.big) + '</div>' +
      '<div class="q-sheet"><div class="q-sheet-head"><h2>' + S.title + '</h2><span>' + esc(S.label) + '</span></div><div class="q-items">' +
      S.items.map(function (it, i) {
        var tag = it.href ? 'a' : 'div';
        return '<' + tag + ' class="q-item"' + (it.href ? ' href="' + it.href + '"' : '') + ' style="--c:' + (it.accent || A) + '">' +
          '<p class="q-made">' + esc(it.kicker || 'Made for') + '</p>' +
          '<div class="q-item-h"><h3>' + esc(it.title) + '</h3><span>' + pad(i) + '</span></div>' +
          '<div class="q-pic' + (SCENES[it.scene] ? ' has-sc' : '') + '">' + (SCENES[it.scene] ? '<div class="sc" aria-hidden="true">' + SCENES[it.scene] + '</div>' : it.icon ? '<img src="' + it.icon + '" alt="">' : '') + (it.tag ? '<i>' + esc(it.tag) + '</i>' : '') + '</div>' +
          '<p class="q-text">' + esc(it.text) + '</p>' +
          (it.chips ? '<div class="q-chips">' + it.chips.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
          (it.href ? '<span class="q-go">' + esc(it.go || 'Open') + ' <span aria-hidden="true">→</span></span>' : '') +
          '</' + tag + '>';
      }).join('') + '</div></div></section>');
    el.replaceWith(sec); if (anchor === el) anchor = sec;
    var items = sec.querySelectorAll('.q-item');
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.15 });
      items.forEach(function (it) { it.classList.add('q-rv'); io.observe(it); });
    }
  }

  // ---------------- phone with small app demos ----------------
  var DEMO = {
    spotvault: { name: 'SpotVault', icon: '/logo.png', c: '#F0605A', dev: 'phone' },
    airbridge: { name: 'AirBridge', icon: '/airbridge/icon.png', c: '#5B8FFF', dev: 'phone' },
    light: { name: '.light', icon: '/light/icon.png', c: '#30D158', dev: 'pc' },
    byterake: { name: 'Byterake', icon: '/byterake/icon.png', c: '#9579FC', dev: 'pc' },
    utter: { name: 'Utter', icon: '/utter/icon.png', c: '#E8453C', dev: 'pc' },
  };
  var LYRICS = ['Windows down on the coast road', 'No bars left on my phone', 'But the song keeps on playing', 'Saved it before we left home', 'Every word right where it should be', 'No signal, just you and me', 'Turn it up, the tide is low', 'Some songs never need to load'];

  function phone() {
    var P = cfg.phone; if (!P) return;
    var el = slot('phone'); if (!el) return;
    var keys = P.apps.filter(function (k) { return DEMO[k]; });
    var single = keys.length === 1;
    var panes = {
      spotvault: '<div class="sv-top"><span>Now playing</span><span class="sv-off">✓ Saved offline</span></div>' +
        '<div class="sv-art"><img src="/logo.png" alt=""></div>' +
        '<div class="sv-meta"><b>Low Tide Radio</b><small>Demo track · plays offline</small></div>' +
        '<div class="sv-bar"><i></i></div><div class="sv-times"><span class="sv-cur">0:00</span><span>0:32</span></div>' +
        '<button type="button" class="sv-play" aria-label="Play">▶</button>' +
        '<div class="sv-ly"><div class="sv-ly-in">' + LYRICS.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') + '</div></div>',
      airbridge: '<div class="ab-head"><b>AirBridge</b><small class="ab-state">Not connected</small></div>' +
        '<div class="ab-stage"><div class="ab-dev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>Phone</div>' +
        '<div class="ab-waves"><i></i><i></i><i></i><i></i><i></i></div>' +
        '<div class="ab-dev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Your PC</div></div>' +
        '<div class="ab-eq">' + new Array(15).join('<i></i>') + '</div>' +
        '<p class="ab-note">iPhone over AirPlay, Android over Bluetooth.</p>' +
        '<button type="button" class="q-btn ab-go">Connect to PC</button>',
      light: '<div class="pc-desk li-desk"><div class="li-wins"><span class="pc-win"><span class="win-bar"><i></i><i></i><i></i>Editor</span><span class="win-code"><u></u><u></u><u></u><u></u><u></u></span></span><span class="pc-win"><span class="win-bar"><i></i><i></i><i></i>Browser</span></span></div>' +
        '<button type="button" class="li-isl" aria-label="Open the island"><span class="li-min"><span class="li-art">♪</span>Low Tide Radio<span class="li-dot"></span></span>' +
        '<span class="li-open"><span class="li-row"><span class="li-art big">♪</span><span><b>Low Tide Radio</b><small>Now playing</small></span><span class="li-pp">❚❚</span></span>' +
        '<span class="li-lab">Clipboard</span><span class="li-chips"><span>git push</span><span>Meeting at 4</span><span>#7C5CFF</span></span>' +
        '<span class="li-lab">Claude Code</span><span class="li-cc"><span class="li-dot"></span>Task done. Ready for you.</span></span></button>' +
        '<p class="li-hint">Click the island</p>' + taskbar('/light/icon.png') + '</div>',
      byterake: '<div class="pc-desk br-desk"><div class="pc-win br-win"><span class="win-bar"><img src="/byterake/icon.png" alt="">Byterake<span class="win-ctl">─ ▢ ✕</span></span><div class="br-body">' +
        '<div class="br-drive"><div class="br-row"><b>Local Disk (C:)</b><span class="br-free">18.0 GB free</span></div><div class="br-bar"><i></i></div></div>' +
        '<div class="br-list"></div><p class="br-msg">Find out what is filling your drive.</p>' +
        '<button type="button" class="q-btn br-go">Scan drive</button></div></div>' + taskbar('/byterake/icon.png') + '</div>',
      utter: '<div class="pc-desk ut-desk"><div class="pc-win ut-win"><span class="win-bar"><i></i><i></i><i></i>Mail · New message<span class="win-ctl">─ ▢ ✕</span></span><div class="ut-body">' +
        '<div class="ut-field"><span>To</span>team@example.com</div><div class="ut-field"><span>Subject</span>Friday review</div>' +
        '<div class="ut-text"><span class="ut-typed"></span><span class="ut-caret"></span></div>' +
        '<p class="ut-said"></p>' +
        '<button type="button" class="q-btn ut-go">Hold Ctrl + Win and talk</button></div></div>' +
        '<span class="ut-pill"><i></i><i></i><i></i><i></i><i></i></span>' + taskbar('/utter/icon.png') + '</div>',
    };
    function taskbar(icon) {
      return '<div class="pc-task"><span class="pc-start"><i></i><i></i><i></i><i></i></span><span class="pc-search"></span><img src="' + icon + '" alt=""><span class="pc-clock">12:41</span></div>';
    }
    var sec = h('<section class="q-demo" id="demo"><p class="q-kick">' + esc(P.kicker) + '</p><h2 class="q-demo-h">' + P.title + '</h2><p class="q-demo-sub">' + esc(P.sub) + '</p>' +
      (single ? '' : '<nav class="q-tabs" aria-label="Pick an app demo">' + keys.map(function (k, i) { return '<button type="button" class="' + (i ? '' : 'on') + '" data-k="' + k + '"><img src="' + DEMO[k].icon + '" alt="">' + DEMO[k].name + '</button>'; }).join('') + '</nav>') +
      '<div class="q-stage"><div class="q-phone" style="--c:' + DEMO[keys[0]].c + '"><span class="q-notch"></span><span class="q-cam"></span><div class="q-screen">' +
      keys.map(function (k, i) { return '<div class="q-pane' + (i ? '' : ' on') + '" data-k="' + k + '">' + panes[k] + '</div>'; }).join('') + '</div></div></div>' +
      '</section>');
    el.replaceWith(sec); if (anchor === el) anchor = sec;
    var ph = sec.querySelector('.q-phone'), stage = sec.querySelector('.q-stage'), current = keys[0];
    var stop = {};
    // Phone apps show on a phone; Windows apps morph the device into a laptop.
    function fit() {
      var pc = DEMO[current].dev === 'pc';
      ph.classList.toggle('pc', pc);
      var s = pc ? Math.min(1, (stage.clientWidth - 8) / 860) : 1;
      ph.style.setProperty('--s', s.toFixed(3));
      stage.style.height = ((pc ? 520 : 690) * s + (pc ? 40 * s : 0)) + 'px';
    }
    addEventListener('resize', fit);
    sec.querySelectorAll('.q-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        Object.keys(stop).forEach(function (k) { stop[k](); });
        current = b.dataset.k;
        sec.querySelectorAll('.q-tabs button, .q-pane').forEach(function (x) { x.classList.toggle('on', x.dataset.k === current); });
        ph.style.setProperty('--c', DEMO[current].c);
        fit();
      });
    });
    fit();

    // SpotVault: play, progress, lyrics follow along
    var sv = sec.querySelector('[data-k="spotvault"].q-pane');
    if (sv) (function () {
      var btn = sv.querySelector('.sv-play'), bar = sv.querySelector('.sv-bar i'), cur = sv.querySelector('.sv-cur'),
        lyIn = sv.querySelector('.sv-ly-in'), ps = lyIn.querySelectorAll('p'), D = 32, t = 0, on = false, last = 0;
      function draw() {
        var line = Math.min(ps.length - 1, Math.floor(t / D * ps.length));
        bar.style.width = (t / D * 100) + '%';
        cur.textContent = '0:' + ('0' + Math.floor(t)).slice(-2);
        ps.forEach(function (p, i) { p.className = i === line ? 'on' : i < line ? 'past' : ''; });
        lyIn.style.transform = 'translateY(' + (-line * 30) + 'px)';
      }
      function tick(now) { if (!on) return; t += Math.min(0.1, (now - last) / 1000); last = now; if (t >= D) t = 0; draw(); requestAnimationFrame(tick); }
      function set(v) { on = v; btn.textContent = on ? '❚❚' : '▶'; btn.setAttribute('aria-label', on ? 'Pause' : 'Play'); sv.classList.toggle('playing', on); if (on) { last = performance.now(); requestAnimationFrame(tick); } }
      btn.addEventListener('click', function () { set(!on); });
      stop.spotvault = function () { set(false); };
      draw();
    })();

    // AirBridge: connect, then sound flows to the PC
    var ab = sec.querySelector('[data-k="airbridge"].q-pane');
    if (ab) (function () {
      var btn = ab.querySelector('.ab-go'), st = ab.querySelector('.ab-state'), state = 0, tm;
      function set(s) {
        state = s; clearTimeout(tm);
        ab.classList.toggle('live', s === 2); ab.classList.toggle('busy', s === 1);
        st.textContent = ['Not connected', 'Connecting…', 'Playing on your PC'][s];
        btn.textContent = ['Connect to PC', 'Connecting…', 'Disconnect'][s];
        if (s === 1) tm = setTimeout(function () { set(2); }, 1100);
      }
      btn.addEventListener('click', function () { set(state === 0 ? 1 : 0); });
      stop.airbridge = function () { set(0); };
    })();

    // .light: tap the island to open it
    var li = sec.querySelector('[data-k="light"].q-pane');
    if (li) (function () {
      var isl = li.querySelector('.li-isl');
      isl.addEventListener('click', function () { var o = li.classList.toggle('open'); isl.setAttribute('aria-label', o ? 'Close the island' : 'Open the island'); });
      stop.light = function () { li.classList.remove('open'); };
    })();

    // Byterake: scan, review, clean to the Recycle Bin
    var br = sec.querySelector('[data-k="byterake"].q-pane');
    if (br) (function () {
      var btn = br.querySelector('.br-go'), list = br.querySelector('.br-list'), msg = br.querySelector('.br-msg'),
        bar = br.querySelector('.br-bar i'), free = br.querySelector('.br-free'), state = 0, timers = [];
      var ROWS = [['Temporary files', 3.4], ['Old downloads', 6.1], ['Browser cache', 1.8], ['Update leftovers', 2.2]];
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      function reset() {
        timers.forEach(clearTimeout); timers = []; state = 0;
        list.innerHTML = ''; bar.style.width = '93%'; free.textContent = '18.0 GB free';
        msg.textContent = 'Find out what is filling your drive.'; btn.textContent = 'Scan drive'; btn.disabled = false; br.classList.remove('clean');
      }
      btn.addEventListener('click', function () {
        if (state === 0) {
          state = 1; btn.disabled = true; msg.textContent = 'Scanning, nothing is deleted yet…';
          ROWS.forEach(function (r, i) {
            later(function () {
              list.appendChild(h('<div class="br-item"><span class="br-cb">✓</span><span>' + r[0] + '</span><span class="br-safe">Safe</span><b>' + r[1].toFixed(1) + ' GB</b></div>'));
              btn.textContent = 'Scanning… ' + Math.round((i + 1) / ROWS.length * 100) + '%';
            }, 450 * (i + 1));
          });
          later(function () { state = 2; btn.disabled = false; btn.textContent = 'Clean 13.5 GB'; msg.textContent = 'All four are safe to clean. You choose what goes.'; }, 450 * ROWS.length + 200);
        } else if (state === 2) {
          state = 3; btn.disabled = true; btn.textContent = 'Cleaning…';
          bar.style.width = '88%';
          later(function () { state = 4; br.classList.add('clean'); free.textContent = '31.5 GB free'; msg.textContent = '13.5 GB moved to the Recycle Bin.'; btn.disabled = false; btn.textContent = 'Scan again'; }, 1000);
        } else if (state === 4) reset();
      });
      stop.byterake = reset;
      reset();
    })();

    // Utter: hold to talk, the messy speech comes out as clean text
    var ut = sec.querySelector('[data-k="utter"].q-pane');
    if (ut) (function () {
      var btn = ut.querySelector('.ut-go'), typed = ut.querySelector('.ut-typed'), said = ut.querySelector('.ut-said'), pill = ut.querySelector('.ut-pill'), timers = [], busy = false;
      var RAW = '“um hi team so the review is at 2… actually 3 on Friday, uh, see you there”';
      var OUT = 'Hi team, the review is at 3 on Friday. See you there.';
      function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
      function reset() { timers.forEach(clearTimeout); timers = []; busy = false; typed.textContent = ''; said.textContent = 'What you say comes out clean.'; pill.className = 'ut-pill'; btn.disabled = false; btn.textContent = 'Hold Ctrl + Win and talk'; }
      btn.addEventListener('click', function () {
        if (busy) return; busy = true; btn.disabled = true; typed.textContent = ''; said.textContent = '';
        pill.className = 'ut-pill listen'; btn.textContent = 'Listening…';
        for (var i = 1; i <= RAW.length; i++) (function (n) { later(function () { said.textContent = RAW.slice(0, n); }, n * 30); })(i);
        var t = RAW.length * 30 + 300;
        later(function () { pill.className = 'ut-pill busy'; btn.textContent = 'Cleaning up…'; }, t);
        for (var j = 1; j <= OUT.length; j++) (function (n) { later(function () { typed.textContent = OUT.slice(0, n); }, t + 600 + n * 14); })(j);
        later(function () { pill.className = 'ut-pill done'; busy = false; btn.disabled = false; btn.textContent = 'Try again'; }, t + 700 + OUT.length * 14);
      });
      stop.utter = reset;
      reset();
    })();
  }

  // ---------------- sticky bottom button ----------------
  function cta() {
    var C = cfg.cta; if (!C) return;
    var el = h('<a class="q-cta" href="' + C.href + '">' + (C.icon ? '<img src="' + C.icon + '" alt="">' : '<i>SL</i>') + '<span>' + esc(C.label) + '</span></a>');
    document.body.appendChild(el);
    var hide = (C.hideIn || [C.href]).map(function (s) { try { return document.querySelector(s); } catch (e) { return null; } }).filter(Boolean);
    scrollers.push(function () {
      var show = scrollY > innerHeight * 0.6;
      hide.forEach(function (t) { var r = t.getBoundingClientRect(); if (r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2) show = false; });
      el.classList.toggle('on', show);
    });
  }

  loader();
  floaters();
  lines();
  sheet();
  phone();
  cta();

  var ticking = false;
  function run() { ticking = false; scrollers.forEach(function (f) { f(); }); }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run);
  run();
})();
