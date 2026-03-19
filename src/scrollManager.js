import gsap from 'gsap';
import { state } from './state.js';

let currentIndex  = 0;
let isAnimating   = false;
let drivingTween  = null;

const SECTION_COUNT = 5;

// ── Init ──────────────────────────────────────────────────────
export function initScrollManager() {
  const container = document.getElementById('scroll-container');

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeyDown);

  // Touch support
  let touchStartY = 0;
  window.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', e => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 40) navigate(delta > 0 ? 1 : -1);
  }, { passive: true });

  // Nav dot / link clicks
  document.querySelectorAll('[data-section]').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.section, 10);
      if (!isNaN(idx)) navigateTo(idx);
    });
  });

  // Expandable project cards
  document.querySelectorAll('.card-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card    = btn.closest('.project-card');
      const details = card.querySelector('.card-details');
      const isOpen  = card.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', isOpen);
      details.classList.toggle('is-open', isOpen);
      details.setAttribute('aria-hidden', !isOpen);
    });
  });

  // Contact form
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('.cta-btn--submit');
      btn.textContent = 'Message Sent!';
      btn.style.background = 'linear-gradient(135deg, #1FCFB4, #18CEFE)';
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        form.reset();
      }, 3000);
    });
  }

  // Reviews carousel
  initReviewsCarousel();

  // Initial reveal
  revealSection(0, false);
}

// ── Reviews Carousel ──────────────────────────────────────────
function initReviewsCarousel() {
  const track = document.getElementById('reviews-track');
  const dots  = document.querySelectorAll('.reviews-dot');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  if (!track) return;

  let reviewIndex = 0;
  const reviewCount = 8;

  function goToReview(idx) {
    reviewIndex = ((idx % reviewCount) + reviewCount) % reviewCount;
    track.style.transform = `translateX(-${reviewIndex * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === reviewIndex));
  }

  prevBtn && prevBtn.addEventListener('click', e => { e.stopPropagation(); goToReview(reviewIndex - 1); });
  nextBtn && nextBtn.addEventListener('click', e => { e.stopPropagation(); goToReview(reviewIndex + 1); });
  dots.forEach(d => {
    d.addEventListener('click', e => {
      e.stopPropagation();
      goToReview(parseInt(d.dataset.review, 10));
    });
  });

  // Auto-advance when on reviews section (every 6s)
  setInterval(() => {
    if (state.currentSection === 3) goToReview(reviewIndex + 1);
  }, 6000);
}

// ── Wheel handler ─────────────────────────────────────────────
function onWheel(e) {
  e.preventDefault();
  if (isAnimating) return;
  navigate(e.deltaY > 0 ? 1 : -1);
}

function onKeyDown(e) {
  if (e.key === 'ArrowDown' || e.key === 'PageDown') navigate(1);
  if (e.key === 'ArrowUp'   || e.key === 'PageUp')   navigate(-1);
}

function navigate(dir) {
  const next = Math.max(0, Math.min(SECTION_COUNT - 1, currentIndex + dir));
  if (next === currentIndex) return;
  navigateTo(next);
}

// ── Core navigation ───────────────────────────────────────────
function navigateTo(index) {
  if (isAnimating || index === currentIndex) return;

  const prevIndex = currentIndex;
  const direction = index > currentIndex ? 1 : -1;
  currentIndex = index;
  isAnimating  = true;

  state.isDriving        = true;
  state.drivingDirection = direction;
  state.currentSection   = index;

  // ── Hub snap (fires immediately, parallel with truck animation) ──
  if (window.__snapToHub) window.__snapToHub(index);

  // ── Hide outgoing foreground shape ───────────────────────────
  if (window.__hideFgShape) window.__hideFgShape(prevIndex);

  // Kill previous driving tween
  if (drivingTween) drivingTween.kill();

  // Ramp driving progress up
  drivingTween = gsap.to(state, {
    drivingProgress: 1,
    duration: 0.5,
    ease: 'power2.in',
  });

  // Hide current section content
  hideSection(prevIndex);

  // Scroll to target
  const container = document.getElementById('scroll-container');
  gsap.to(container, {
    scrollTop: index * window.innerHeight,
    duration: 1.1,
    ease: 'power2.inOut',
    onComplete: () => {
      if (drivingTween) drivingTween.kill();
      drivingTween = gsap.to(state, {
        drivingProgress: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          state.isDriving = false;
          isAnimating     = false;
        },
      });

      gsap.delayedCall(0.2, () => {
        revealSection(index, true);
        // ── Show incoming foreground shape ────────────────────
        if (window.__showFgShape) window.__showFgShape(index);
      });
    },
  });

  updateNavDots(index);
  updateScrollHint(index);
}

// ── Section reveal / hide ─────────────────────────────────────
function revealSection(index, animate) {
  const section = document.querySelector(`.scene-section[data-index="${index}"]`);
  if (!section) return;
  const target = section.querySelector('.panel-overlay, .hero-content');
  if (!target) return;

  const isMobile = window.innerWidth <= 768;
  const fromX    = isMobile ? 0 : -20;

  if (animate) {
    gsap.fromTo(target,
      { opacity: 0, x: fromX },
      { opacity: 1, x: 0, duration: 0.55, ease: 'power2.out' }
    );
  } else {
    gsap.set(target, { opacity: 1, x: 0 });
  }
}

function hideSection(index) {
  const section = document.querySelector(`.scene-section[data-index="${index}"]`);
  if (!section) return;
  const target = section.querySelector('.panel-overlay, .hero-content');
  if (!target) return;
  gsap.to(target, { opacity: 0, x: -15, duration: 0.3, ease: 'power2.in' });
}

// ── Nav UI ────────────────────────────────────────────────────
function updateNavDots(index) {
  document.querySelectorAll('.nav-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
  document.querySelectorAll('.nav-link').forEach((link, i) => {
    link.classList.toggle('active', i === index);
  });
}

function updateScrollHint(index) {
  const hint = document.getElementById('scroll-hint');
  if (!hint) return;
  hint.classList.toggle('hidden', index > 0);
}

export function getCurrentSection() { return currentIndex; }
