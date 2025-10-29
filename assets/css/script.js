// Background parallax disabled to keep background static on scroll
(() => {
  document.documentElement.style.setProperty('--bg-shift', '0px');
})();

// Reveal on scroll for headings and text across pages
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Helper to collect groups of elements per section for controlled staggering
  const collectGroups = () => {
    const result = [];

    const inContainerChildren = (root) => {
      const c = root.querySelector('.container');
      return c ? Array.from(c.children) : [];
    };

    const inContainerTags = (root, tags) => {
      const c = root.querySelector('.container');
      if (!c) return [];
      return Array.from(c.children).filter((el) => tags.includes(el.tagName));
    };

    const pushIf = (arr) => { if (arr && arr.length) result.push(arr); };

    const accueil = document.querySelector('#accueil');
    if (accueil) pushIf(inContainerChildren(accueil));

    const events = document.querySelector('#evenements');
    if (events) {
      pushIf(inContainerTags(events, ['H2']));
      pushIf(Array.from(events.querySelectorAll('.events .event')));
    }

    const equipe = document.querySelector('#equipe');
    if (equipe) {
      pushIf(inContainerTags(equipe, ['H2']));
      pushIf(Array.from(equipe.querySelectorAll('.team .member')));
    }

    const contact = document.querySelector('#contact');
    if (contact) {
      pushIf(inContainerTags(contact, ['H2', 'P']));
      const form = contact.querySelector('form');
      if (form) pushIf(Array.from(form.children));
    }

    const reseau = document.querySelector('#reseau');
    if (reseau) {
      pushIf(inContainerChildren(reseau));
      pushIf(Array.from(reseau.querySelectorAll('nav ul > li')));
    }

    return result;
  };

  if (reduceMotion) return; // Respect reduced motion: keep everything static

  const groups = collectGroups();
  if (!groups.length) return;

  // Apply base reveal class to all items
  groups.forEach((group) => {
    group.forEach((el) => el.classList.add('reveal'));
  });

  const isInView = (el) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return rect.top <= vh * 0.9 && rect.bottom >= 0;
  };

  // Reveal any items already in view (e.g., on load)
  groups.forEach((group) => {
    group.forEach((el) => { if (isInView(el)) el.classList.add('is-visible'); });
  });

  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Find the group this element belongs to for a local stagger
        const group = groups.find((g) => g.includes(el));
        const index = group ? group.indexOf(el) : 0;
        // Cap the delay for control (shorter, snappier)
        el.style.transitionDelay = `${Math.min(index * 60, 240)}ms`;
        el.classList.add('is-visible');
        obs.unobserve(el);
      });
    },
    { root: null, rootMargin: '0px 0px -20% 0px', threshold: 0.1 }
  );

  groups.forEach((group) => {
    group.forEach((el) => {
      if (!el.classList.contains('is-visible')) io.observe(el);
    });
  });
})();

// Homepage hero logo shrink-and-dock animation
(() => {
  const hero = document.getElementById('hero-logo');
  if (!hero) return; // Only on index

  const img = hero.querySelector('.hero-img');
  const slogan = hero.querySelector('.hero-slogan');
  const headerLogo = document.querySelector('.site-header .brand .logo');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    hero.classList.add('hero-hidden');
    if (headerLogo) headerLogo.style.opacity = '';
    return;
  }

  let ticking = false;
  // Tune when and how fast the animation progresses
  const START_OFFSET = 60;   // px scrolled before animation begins
  const DISTANCE = 240;      // px span to complete the animation
  const OFFSET_X = 0;        // fine-tune dock X (px)
  const OFFSET_Y = -6;       // fine-tune dock Y (px)

  // Hide header logo initially to avoid double-vision
  if (headerLogo) headerLogo.style.opacity = '0';

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const smoothstep = (edge0, edge1, x) => {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const update = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scroll = window.scrollY || window.pageYOffset || 0;
    const p = clamp((scroll - START_OFFSET) / DISTANCE, 0, 1);

    // Compute target center at the header logo position (viewport coords)
    let tx = 0, ty = 0, scale = 1;
    const imgBox = img.getBoundingClientRect();
    const centerX = vw / 2;
    const centerY = vh / 2;

    if (headerLogo) {
      const target = headerLogo.getBoundingClientRect();
      const targetCX = target.left + target.width / 2 + OFFSET_X;
      const targetCY = target.top + target.height / 2 + OFFSET_Y;

      // Current hero image size used as base
      const baseH = imgBox.height || 1;
      const smallH = Math.max(target.height, 36);
      const smallScale = smallH / baseH;
      scale = (1 - p) * 1 + p * smallScale;

      const dx = targetCX - centerX;
      const dy = targetCY - centerY;
      tx = dx * p;
      ty = dy * p;
    } else {
      // Fallback: move to top-left corner with small size
      const targetCX = 24; // near left
      const targetCY = 24; // near top
      const baseH = imgBox.height || 1;
      const smallH = 40;
      const smallScale = smallH / baseH;
      scale = (1 - p) * 1 + p * smallScale;
      const dx = targetCX - centerX;
      const dy = targetCY - centerY;
      tx = dx * p;
      ty = dy * p;
    }

    img.style.setProperty('--hero-tx', `${Math.round(tx)}px`);
    img.style.setProperty('--hero-ty', `${Math.round(ty)}px`);
    img.style.setProperty('--hero-scale', `${scale}`);

    // Crossfade header logo with a smooth curve
    if (headerLogo) headerLogo.style.opacity = String(smoothstep(0.6, 0.95, p));

    // Fade out slogan a bit earlier for polish
    if (slogan) slogan.style.opacity = String(1 - smoothstep(0.25, 0.6, p));

    // Hide hero once complete
    if (p >= 1) {
      hero.classList.add('hero-hidden');
    } else {
      hero.classList.remove('hero-hidden');
    }

    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { update(); }, { passive: true });
  update();
})();
