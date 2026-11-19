// Shared motion layer: aurora glow, scroll bar, card spotlight + 3D tilt,
// magnetic buttons, and a three.js particle field behind the page.
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('fx');

  function mk(cls, tag) { var e = document.createElement(tag || 'div'); e.className = cls; e.setAttribute('aria-hidden', 'true'); return e; }
  var aur = mk('fx-aurora'); aur.innerHTML = '<i></i><i></i><i></i>';
  var cv = mk('fx-bg', 'canvas');
  var bar = mk('fx-progress');
  document.body.prepend(cv); document.body.prepend(aur); document.body.appendChild(bar);

  function onScroll() {
    var h = root.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (fine) {
    document.querySelectorAll('.card, .proj').forEach(function (c) {
      if (c.classList.contains('soon')) return;
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        if (!reduce && r.height < 560) c.style.transform = 'perspective(1000px) rotateX(' + ((0.5 - y) * 7).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * 9).toFixed(2) + 'deg) translateY(-4px)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
    if (!reduce) document.querySelectorAll('.btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3 - 2).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  import('/fx/particles.js').then(function (m) { m.start(cv); }).catch(function () { cv.remove(); });
})();
