/* main.js - cleaned & consolidated
   - Keeps layout helpers, hero reveal, profile interactions
   - Consolidates achievements modal preview (single robust implementation)
   - Keeps forced-open behaviour for LinkedIn/resume
   - Comments out optional cosmetic animations (easy to restore)
*/

/* ---------- layout helpers ---------- */
function setVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
function setHeaderHeight() {
  const header = document.querySelector('header');
  if (!header) return;
  const h = Math.round(header.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-h', `${h}px`);
}
function initLayout() {
  setVh();
  setHeaderHeight();
}
window.addEventListener('load', initLayout);
window.addEventListener('resize', () => {
  setVh();
  clearTimeout(window._resizeT);
  window._resizeT = setTimeout(setHeaderHeight, 80);
});
window.addEventListener('orientationchange', initLayout);

/* ---------- set profile image src (use uploaded local path) ---------- */
(function setProfileImage() {
  const UPLOADED_PATH = "profile.jpg"; // relative path inside your project
  const img = document.getElementById('profileImg');
  if (!img) return;
  try {
    img.src = encodeURI(UPLOADED_PATH);
  } catch (e) {
    console.warn('Could not set profile image from uploaded path:', e);
  }
})();

/* ---------- hero reveal (IntersectionObserver) + init profile interactions ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // set footer year if exists
  const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // hero reveal
  const hero = document.getElementById('hero');
  if (!hero) {
    document.querySelector('.hero-left')?.classList.add('in-view');
    document.querySelector('.photo-card')?.classList.add('in-view');
  } else {
    if (reduceMotion) {
      document.querySelector('.hero-left')?.classList.add('in-view');
      document.querySelector('.photo-card')?.classList.add('in-view');
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            document.querySelector('.hero-left')?.classList.add('in-view');
            document.querySelector('.photo-card')?.classList.add('in-view');
            setTimeout(() => document.querySelector('.photo-frame img')?.classList.add('breathe'), 700);
            obs.disconnect();
          }
        });
      }, { threshold: 0.22 });
      io.observe(hero);
    }
  }

  // initialize modern profile interactions
  initProfileInteractions({ reduceMotion });
});

/* ---------- modern profile interactions (tilt + subtle parallax) ---------- */
function initProfileInteractions({ reduceMotion = false } = {}) {
  const frame = document.querySelector('.photo-frame');
  if (!frame) return;
  const img = frame.querySelector('img');
  if (!img) return;

  if (reduceMotion) {
    img.classList.remove('breathe');
    return;
  }

  // configuration
  const maxTilt = 6;      // degrees
  const scaleHover = 1.04;
  const transitionFast = 'transform 0.08s ease-out';
  const transitionSlow = 'transform 0.45s cubic-bezier(.2,.9,.3,1)';

  function handleMove(e) {
    const rect = frame.getBoundingClientRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    if (clientX == null || clientY == null) return;

    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const dx = (px - 0.5) * 2;
    const dy = (py - 0.5) * 2;

    const rotateY = dx * maxTilt;
    const rotateX = -dy * maxTilt;
    const translateX = dx * 6;
    const translateY = dy * 6;

    img.style.transition = transitionFast;
    img.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translate3d(${translateX}px, ${translateY}px, 0) scale(${scaleHover})`;
    frame.style.boxShadow = '0 36px 90px rgba(2,6,23,0.12)';
  }

  function handleLeave() {
    img.style.transition = transitionSlow;
    img.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0) scale(1)';
    frame.style.boxShadow = '';
  }

  frame.addEventListener('mousemove', handleMove);
  frame.addEventListener('touchmove', handleMove, { passive: true });
  frame.addEventListener('mouseleave', handleLeave);
  frame.addEventListener('touchend', handleLeave);
  frame.addEventListener('touchcancel', handleLeave);

  // breathe animation is added via CSS class 'breathe' after reveal
}

/* ---------- simple nav mark active based on current file name ---------- */
(function markActiveNav(){
  const anchors = document.querySelectorAll('nav a');
  if (!anchors.length) return;
  const path = window.location.pathname.split('/').pop() || 'index.html';
  anchors.forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    if (href === path || (href === 'index.html' && (path === '' || path === 'index.html'))) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
})();

/* ---------- Achievements: single consolidated modal preview implementation ---------- */
(function achievementsModal() {
  const modal = document.getElementById('docModal');
  if (!modal) return; // page doesn't have modal, nothing to do

  const frame = document.getElementById('docFrame');
  const closeBtn = modal.querySelector('.doc-close');
  const openLink = document.getElementById('docOpen');
  const downloadLink = document.getElementById('docDownload');

  function openDoc(url){
    if (!frame) return;
    const encoded = encodeURI(url);
    frame.src = encoded;
    if (openLink) openLink.href = encoded;
    if (downloadLink) downloadLink.href = encoded;
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('visible');
    document.body.style.overflow = 'hidden';

    // best-effort check if embed is blocked
    setTimeout(()=>{
      try {
        const cw = frame.contentWindow;
        if (!cw || (cw.document && cw.document.body && cw.document.body.childElementCount === 0)) {
          console.warn('Document preview appears empty or blocked—use "Open in new tab".');
        }
      } catch(e){
        console.warn('Embedding blocked by browser headers or cross-origin.', e);
      }
    },700);
  }

  function closeDoc(){
    modal.setAttribute('aria-hidden','true');
    modal.classList.remove('visible');
    if (frame) frame.src = '';
    document.body.style.overflow = '';
  }

  // wire preview buttons (data-doc contains the exact path)
  document.querySelectorAll('.cert-preview').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-doc');
      if (!path) return;
      openDoc(path);
    });
  });

  // modal close handlers
  closeBtn?.addEventListener('click', closeDoc);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeDoc(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDoc(); });

})();

/* ---------- Contact behaviour: optional cosmetic + important forced-open handling ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Optional: entrance animation (cosmetic) ----------
  // If you want the small fade/translate entrance for contact buttons, uncomment the block below.
  /*
  const btns = document.querySelectorAll('.contact-btn');
  btns.forEach((b, i) => {
    b.style.opacity = 0;
    b.style.transform = 'translateY(8px)';
    setTimeout(() => {
      b.style.transition = 'opacity .45s ease, transform .45s cubic-bezier(.2,.9,.3,1)';
      b.style.opacity = 1;
      b.style.transform = 'translateY(0)';
    }, 120 * i);
    b.addEventListener('focus', () => b.classList.add('focused'));
    b.addEventListener('blur',  () => b.classList.remove('focused'));
  });
  */

  // ---------- Important: force-link open in new tab to avoid replacing the app page ----------
  const linkedin = document.getElementById('linkedinBtn');
  if (linkedin) {
    linkedin.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(linkedin.href, '_blank', 'noopener');
    });
  }

  const resume = document.getElementById('resumeBtn');
  if (resume) {
    resume.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(resume.href, '_blank', 'noopener');
    });

    // keyboard accessibility: open on Enter / Space
    resume.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.open(resume.href, '_blank', 'noopener');
      }
    });
  }

  // ensure SVGs are not focusable
  document.querySelectorAll('.contact-btn svg').forEach(svg => {
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');
  });
});
// === header/nav safety + contact handlers ===
(function headerAndContactFixes(){
  // 1) Ensure header height CSS var is up to date (helps anchor offsets).
  function updateHeaderVar(){
    const header = document.querySelector('header');
    if (!header) return;
    const h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', `${h}px`);
  }
  updateHeaderVar();
  // update after load/resize to keep offsets correct
  window.addEventListener('load', updateHeaderVar);
  window.addEventListener('resize', () => {
    clearTimeout(window._hdrT);
    window._hdrT = setTimeout(updateHeaderVar, 80);
  });

  // 2) Improved nav active marking (robust to index.html and hash routes)
  (function markNavActive(){
    const anchors = Array.from(document.querySelectorAll('nav a'));
    if (!anchors.length) return;
    // Use pathname + possible index mapping
    const current = window.location.pathname.split('/').pop() || 'index.html';
    anchors.forEach(a => {
      try {
        const href = a.getAttribute('href') || '';
        // Normalize both sides: remove query/hash
        const hrefPath = href.split('?')[0].split('#')[0];
        const anchorFile = hrefPath.split('/').pop() || 'index.html';
        if (anchorFile === current || (anchorFile === 'index.html' && (current === '' || current === 'index.html'))) {
          a.classList.add('active');
        } else {
          a.classList.remove('active');
        }
      } catch(e) {
        // ignore
      }
    });
  })();

  // 3) Contact buttons: ensure linkedin/resume open in new tab only and don't accidentally navigate same window
  const linkedinBtn = document.getElementById('linkedinBtn');
  if (linkedinBtn) {
    linkedinBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const href = linkedinBtn.getAttribute('href');
      if (!href) return;
      window.open(href, '_blank', 'noopener');
    });
    // also add keyboard activation
    linkedinBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const href = linkedinBtn.getAttribute('href');
        if (!href) return;
        window.open(href, '_blank', 'noopener');
      }
    });
  }

  const resumeBtn = document.getElementById('resumeBtn');
  if (resumeBtn) {
    resumeBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      const href = resumeBtn.getAttribute('href');
      if (!href) return;
      window.open(href, '_blank', 'noopener');
    });
  }

  // 4) small safety: ensure contact icon anchors that have real hrefs don't navigate to file:// (sometimes dev servers produce odd paths)
  document.querySelectorAll('.contact-btn').forEach(btn => {
    const href = btn.getAttribute('href') || '';
    if (!href) return;
    // If href looks like an absolute file path or empty, disable in-page navigation
    if (/^file:\/\//i.test(href) || href.trim() === '') {
      btn.addEventListener('click', (e) => e.preventDefault());
    }
  });
})();
// defensive: ensure header stays single-row and update --header-h variable
(function ensureHeaderSingleRow(){
  function updateHeaderHeight(){
    const header = document.querySelector('header');
    if (!header) return;
    const h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', `${h}px`);
  }

  // detect wrapping: brand and nav should be on same row; if nav's top is lower than brand top -> wrapped
  function checkWrap(){
    const header = document.querySelector('header');
    const brand = document.querySelector('.brand');
    const nav = document.querySelector('nav');
    if (!header || !brand || !nav) return;
    const brandRect = brand.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    // if nav's top is below brand top by > 6px we assume wrapping occurred
    if ((navRect.top - brandRect.top) > 6) {
      header.classList.add('header-force-row');
      // force a compact header style when wrapped (prevents layout collapse)
      header.style.alignItems = 'center';
      header.style.gridTemplateColumns = 'auto 1fr'; // re-enforce
    } else {
      header.classList.remove('header-force-row');
      header.style.gridTemplateColumns = ''; // let CSS decide
    }
    // always update header height var
    updateHeaderHeight();
  }

  // run on load + resize + small throttle on scroll (some browsers change layout during scroll)
  window.addEventListener('load', () => { checkWrap(); });
  window.addEventListener('resize', () => {
    clearTimeout(window._hdrChkT);
    window._hdrChkT = setTimeout(checkWrap, 100);
  });
  window.addEventListener('orientationchange', () => { setTimeout(checkWrap, 120); });
  // also check after small delay in case fonts/metrics change
  setTimeout(checkWrap, 350);
})();
