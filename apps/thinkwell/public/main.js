// Reveal-on-scroll + subtle hero parallax. No frameworks.
(function () {

  // --- Reveal-on-scroll -------------------------------------------------
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12 })
    : null;

  document.querySelectorAll('.reveal').forEach(function (el) {
    if (io) io.observe(el); else el.classList.add('in');
  });

  // Hero parallax — desktop pointers only, respects reduced motion.
  var reducedMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var desktopMq = window.matchMedia ? window.matchMedia('(min-width: 960px)') : null;
  var stage = document.querySelector('.device-stage');
  if (!stage || !desktopMq) return;
  var front = stage.querySelector('.device:not(.rear):not(.rear-right)');
  if (!front) return;

  var pendingX = 0, pendingY = 0, rafScheduled = false, bound = false;

  function flush() {
    rafScheduled = false;
    front.style.transform = 'translate3d(' + pendingX.toFixed(2) + 'px,' + pendingY.toFixed(2) + 'px,0)';
  }
  function onMove(e) {
    var r = stage.getBoundingClientRect();
    pendingX = ((e.clientX - r.left) / r.width - 0.5) * 6;
    pendingY = ((e.clientY - r.top) / r.height - 0.5) * 6;
    if (!rafScheduled) { rafScheduled = true; requestAnimationFrame(flush); }
  }
  function onLeave() { front.style.transform = ''; }

  function sync() {
    var enabled = desktopMq.matches && !(reducedMq && reducedMq.matches);
    if (enabled && !bound) {
      stage.addEventListener('mousemove', onMove);
      stage.addEventListener('mouseleave', onLeave);
      bound = true;
    } else if (!enabled && bound) {
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
      front.style.transform = '';
      bound = false;
    }
  }
  sync();
  var onChange = function () { sync(); };
  if (desktopMq.addEventListener) desktopMq.addEventListener('change', onChange);
  else if (desktopMq.addListener) desktopMq.addListener(onChange);
  if (reducedMq) {
    if (reducedMq.addEventListener) reducedMq.addEventListener('change', onChange);
    else if (reducedMq.addListener) reducedMq.addListener(onChange);
  }
})();
