const byId = (id) => document.getElementById(id);

const carousel = byId('productCarousel');
const prev = byId('prevBtn');
const next = byId('nextBtn');
// Hide prev by default so it doesn't cover the first card's text on initial load
prev?.classList.add('is-hidden');
const navToggle = byId('navToggle');
const header = document.querySelector('.site-header');
const nav = document.querySelector('.nav');
const navList = byId('primaryNav');
const langToggle = byId('langToggle');
const progress = document.querySelector('.scroll-progress span');
const productsSection = document.querySelector('#products');

function scrollByCard(direction) {
  if (!carousel) return;
  const firstCard = carousel.querySelector('.card');
  const delta = (firstCard?.getBoundingClientRect().width || 280) + 24;
  carousel.scrollBy({ left: direction * delta, behavior: 'smooth' });
  // Immediately reflect intent; scroll event will finalize state
  updateCarouselButtons();
}

prev?.addEventListener('click', () => scrollByCard(-1));
next?.addEventListener('click', () => scrollByCard(1));

// Keyboard support
carousel?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') scrollByCard(1);
  if (e.key === 'ArrowLeft') scrollByCard(-1);
});

// Drag to scroll with smooth mouse-drag and native touch inertia
let isDragging = false;
let isMouseDrag = false;
let dragStartX = 0;
let dragStartScrollLeft = 0;
let lastMoveX = 0;
let lastMoveTime = 0;
let velocityX = 0; // px/ms
let rafId = 0;
let momentumId = 0;

// Performance optimization variables
let isScrolling = false;
let scrollTimeout = null;

function getPointX(e) {
  return e.touches ? e.touches[0].pageX : (e.pageX ?? (e.clientX || 0));
}

function scheduleScrollLeft(target) {
  if (!carousel) return;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    carousel.scrollLeft = target;
  });
}

function stopMomentum() {
  if (momentumId) cancelAnimationFrame(momentumId);
  momentumId = 0;
}

function startMomentum(initialVelocityPxPerMs) {
  if (!carousel) return;
  stopMomentum();
  let v = initialVelocityPxPerMs; // px/ms
  const friction = 0.92; // decay per frame
  let prevTs = performance.now();

  const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);

  function step(ts) {
    const dt = Math.max(0.001, ts - prevTs); // ms
    prevTs = ts;

    // Apply velocity to scroll position
    const delta = v * dt; // px
    const next = Math.min(maxScroll, Math.max(0, carousel.scrollLeft - delta));
    carousel.scrollLeft = next;

    // Reverse direction if we hit edges to avoid sticking overscroll
    if (next <= 0 || next >= maxScroll) {
      v = 0;
    }

    // Apply friction
    v *= Math.pow(friction, dt / 16); // normalize decay to ~60fps

    if (Math.abs(v) < 0.02) {
      momentumId = 0;
      return;
    }
    momentumId = requestAnimationFrame(step);
  }

  momentumId = requestAnimationFrame(step);
}

function onPointerDown(e) {
  if (!carousel) return;
  isDragging = true;
  isMouseDrag = !(e.touches || e.pointerType === 'touch');
  dragStartX = getPointX(e);
  dragStartScrollLeft = carousel.scrollLeft;
  lastMoveX = dragStartX;
  lastMoveTime = performance.now();
  velocityX = 0;
  stopMomentum();
  carousel.classList.add('is-dragging');
}

function onPointerMove(e) {
  if (!isDragging) return;
  const pointX = getPointX(e);
  const deltaX = pointX - dragStartX;

  // Let touch devices use native scrolling for the smoothest inertia
  if (!isMouseDrag) return;

  const now = performance.now();
  const dt = Math.max(1, now - lastMoveTime);
  const dx = pointX - lastMoveX;
  // Low-pass filter for velocity for stability
  const instantV = dx / dt; // px/ms
  velocityX = 0.85 * velocityX + 0.15 * instantV;
  lastMoveX = pointX;
  lastMoveTime = now;

  // natural scroll: invert
  const target = dragStartScrollLeft - deltaX;
  scheduleScrollLeft(target);
  // Prevent text selection while dragging with mouse
  e.preventDefault?.();
}

function onPointerUp() {
  if (!isDragging) return;
  isDragging = false;
  carousel.classList.remove('is-dragging');
  // Apply momentum only for mouse drags
  if (isMouseDrag) {
    // Convert to px/ms towards scrollLeft direction (invert)
    const v = velocityX;
    if (Math.abs(v) > 0.02) {
      startMomentum(v);
    }
  }
}

if (carousel) {
  // Mouse drag (manual)
  carousel.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('mousemove', onPointerMove);
  // Touch: rely on native scrolling (no manual scrollLeft updates)
  carousel.addEventListener('touchstart', onPointerDown, { passive: true });
  carousel.addEventListener('touchend', onPointerUp, { passive: true });
  carousel.addEventListener('touchcancel', onPointerUp, { passive: true });
}

// Show/hide next/prev buttons at the edges
function updateCarouselButtons() {
  if (!carousel || !prev || !next) return;
  const scrollable = carousel.scrollWidth > carousel.clientWidth + 1;
  const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth - 1); // subtract 1 to avoid float rounding
  const atStart = carousel.scrollLeft <= 1;
  const atEnd = carousel.scrollLeft >= maxScroll;
  // If not scrollable at all, hide both buttons
  prev.classList.toggle('is-hidden', atStart || !scrollable);
  next.classList.toggle('is-hidden', atEnd || !scrollable);
}

// Update on scroll and on load
carousel?.addEventListener('scroll', updateCarouselButtons, { passive: true });
window.addEventListener('resize', updateCarouselButtons);
updateCarouselButtons();

// Footer year
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = String(new Date().getFullYear());

// Mobile nav toggle
navToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

// Close menu on link click (mobile)
navList?.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;

  // Close mobile menu if open
  if (nav?.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }

  const href = link.getAttribute('href');
  if (!href) return;

  // Smooth scroll for specific anchors
  if (href === '#products') {
    e.preventDefault();
    productsSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    history.replaceState(null, '', '#products');
  } else if (href === '#home') {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#home');
  }
});

// Ensure any link to #home (e.g., brand logo) scrolls to very top (0)
document.addEventListener('click', (e) => {
  const homeAnchor = e.target?.closest?.('a[href="#home"]');
  if (!homeAnchor) return;
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', '#home');
  if (nav?.classList.contains('is-open')) {
    nav.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});

// Simple i18n toggle (EN <-> VI)
const translations = {
  en: {
    'nav.products': 'Products',
    'nav.resources': 'Resources',
    'hero.title': 'Welcome to Rimiko',
    'hero.lead': 'The ultimate library for modifying Windows. A clean, modern toolkit with a beautiful developer experience. Explore components, automations and deep customization – built for power users.',
    'hero.exploreNow': 'Explore Now',
    'hero.documentation': 'Documentation',
    'products.heading': 'Products',
    'products.description': 'RimikoOS is a custom version of Windows created for users to use completely free of charge. It is also one of the projects developed by the Rimiko Development Community.',
    'products.items.0.title': 'RimikoOS 10 (V4 UPDATE)',
    'products.items.0.desc': 'A customization of Windows we are making with our partner Moonie to create a good Windows Lite for users.',
    'products.items.1.title': 'RimikoOS 10 (V5 UPDATE)',
    'products.items.1.desc': 'A customization of Windows we are making with our partner Moonie to create a good Windows Lite for users.',
    'products.items.2.title': 'RimikoOS 11 V2 (NO DEFENDER)',
    'products.items.2.desc': 'The 2nd custom Windows we are making with our partner Moonie to create a good Windows Lite for users.',
    'products.items.3.title': 'RimikoOS 11 V2 (DEFENDER)',
    'products.items.3.desc': 'As same as the first one, this version includes Windows Defender for those who want security.',
    'resources.heading': 'Resources',
    'resources.description': 'A collection of resources we have gathered to optimize the user experience with Windows!',
    'resources.cards.0.title': 'Optimization Tools',
    'resources.cards.0.desc': 'The place to find easy-to-use optimizing tools.',
    'resources.cards.1.title': 'Playbook & AmeWizard',
    'resources.cards.1.desc': 'Requires installation of the authorized version of Playbook, or using your own Playbook and run the programme within AmeWizard.',
    'resources.cards.2.title': 'Windows Lite',
    'resources.cards.2.desc': 'Windows Lite consumes less memory & CPU usage compared to the stock version, giving its user a smoother experience.',
    'resources.cards.3.title': 'Optimizations by Toolkit',
    'resources.cards.3.desc': 'Optimizing your device via Toolkit can utilize every integrated tools from different OS.',
    'resources.cards.4.title': 'Programme',
    'resources.cards.4.desc': 'Files that are ready to be installed and used nigh-instantaneously.',
    'resources.cards.5.title': 'Community',
    'resources.cards.5.desc': 'Join discussions and grow the community up together.',
    'common.download': 'Download',
    'common.view': 'VIEW'
  },
  vi: {
    'nav.products': 'Sản phẩm',
    'nav.resources': 'Tài nguyên',
    'hero.title': 'Chào mừng đến với Rimiko',
    'hero.lead': 'Thư viện tối ưu để tuỳ biến Windows. Bộ công cụ hiện đại, dễ dùng, hỗ trợ tự động hoá và tuỳ chỉnh sâu dành cho người dùng nâng cao.',
    'hero.exploreNow': 'Khám phá',
    'hero.documentation': 'Tài liệu',
    'products.heading': 'Sản phẩm',
    'products.description': 'RimikoOS là custom Windows được làm ra dành cho người dùng sử dụng một cách hoàn toàn miễn phí và cũng là những dự án mà Rimiko Development Community đã làm ra.',
    'products.items.0.title': 'RimikoOS 10 (Cập nhật V4)',
    'products.items.0.desc': 'Bản Windows tuỳ biến hợp tác cùng Moonie nhằm mang lại trải nghiệm Windows Lite mượt mà.',
    'products.items.1.title': 'RimikoOS 10 (Cập nhật V5)',
    'products.items.1.desc': 'Bản Windows tuỳ biến hợp tác cùng Moonie nhằm mang lại trải nghiệm Windows Lite mượt mà.',
    'products.items.2.title': 'RimikoOS 11 V2 (Không Defender)',
    'products.items.2.desc': 'Bản Windows 11 tuỳ biến thứ hai hợp tác cùng Moonie, hướng đến hiệu năng nhẹ.',
    'products.items.3.title': 'RimikoOS 11 V2 (Có Defender)',
    'products.items.3.desc': 'Tương tự bản trên nhưng bao gồm Windows Defender cho nhu cầu bảo mật.',
    'resources.heading': 'Tài nguyên',
    'resources.description': 'Tổng hợp những tài nguyên được chúng tôi sưu tầm nhằm tối ưu hóa trải nghiệm của người dùng với Windows!',
    'resources.cards.0.title': 'Công cụ tối ưu hóa',
    'resources.cards.0.desc': 'Nơi bạn tìm thấy các công cụ tối ưu dễ sử dụng.',
    'resources.cards.1.title': 'Playbook & AmeWizard',
    'resources.cards.1.desc': 'Yêu cầu cài đặt phiên bản Playbook được cấp phép, hoặc dùng Playbook của bạn và chạy trong AmeWizard.',
    'resources.cards.2.title': 'Windows Lite',
    'resources.cards.2.desc': 'Tiêu thụ ít bộ nhớ và CPU hơn so với bản tiêu chuẩn, mang lại trải nghiệm mượt mà hơn.',
    'resources.cards.3.title': 'Tối ưu với Toolkit',
    'resources.cards.3.desc': 'Tối ưu thiết bị qua Toolkit, tận dụng các công cụ tích hợp từ nhiều hệ điều hành.',
    'resources.cards.4.title': 'Gói chương trình',
    'resources.cards.4.desc': 'Các tệp sẵn sàng cài đặt và sử dụng gần như tức thì.',
    'resources.cards.5.title': 'Cộng đồng',
    'resources.cards.5.desc': 'Tham gia thảo luận và cùng nhau phát triển cộng đồng.',
    'common.download': 'Tải về',
    'common.view': 'XEM'
  }
};

function applyLanguage(lang) {
  const dict = translations[lang] || translations.en;
  document.querySelectorAll('[data-i18n]')
    .forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = dict[key];
      if (typeof val === 'string') el.textContent = val;
    });
  document.documentElement.lang = lang === 'vi' ? 'vi' : 'en';
  const code = document.querySelector('#langToggle .lang-code');
  if (code) code.textContent = lang === 'vi' ? 'VI' : 'EN';
  localStorage.setItem('lang', lang);
}

// Initialize language from storage
applyLanguage(localStorage.getItem('lang') === 'vi' ? 'vi' : 'en');

langToggle?.addEventListener('click', () => {
  const current = localStorage.getItem('lang') === 'vi' ? 'vi' : 'en';
  const next = current === 'en' ? 'vi' : 'en';
  applyLanguage(next);
});

// Active section highlight and header shadow
const links = [...document.querySelectorAll('.nav-list a')];
const sections = links
  .map(a => {
    const href = a.getAttribute('href');
    if (!href || href === '#' || href === '') return null;
    if (href.startsWith('#')) {
      return document.querySelector(href);
    }
    return null;
  })
  .filter(Boolean);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = '#' + entry.target.id;
    const link = links.find(a => a.getAttribute('href') === id);
    if (!link) return;
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.remove('is-active'));
      link.classList.add('is-active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });

sections.forEach(sec => observer.observe(sec));

// If landing with #products in URL, center it after load
if (location.hash === '#products' && productsSection) {
  setTimeout(() => {
    productsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

// Header shadow + progress bar
function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop;
  if (header) header.style.boxShadow = y > 6 ? '0 6px 16px rgba(0,0,0,.08)' : 'none';
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = Math.max(0, Math.min(1, y / (max || 1)));
  if (progress) progress.style.width = `${pct * 100}%`;
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// No 3D: CSS retro computer is rendered in HTML/CSS
const typewriter = document.getElementById('typewriter');
const texts = [
  'was founded in June 2024 and focus on user experience',
  'được thành lập vào tháng 6 năm 2024, nhằm hướng đến trải nghiệm của người dùng',
  'thank you for using our service',
  'cảm ơn bạn đã sử dụng dịch vụ của chúng tôi',
  'regards, Riley and Emiko.'
];

// Typewriter effect
function typeWriter(element, text, speed = 100, callback = null) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (callback) {
      setTimeout(callback, 1000);
    }
  }
  
  type();
}

function clearText(element, callback = null) {
  let text = element.textContent;
  let i = text.length;
  
  function clear() {
    if (i > 0) {
      element.textContent = text.substring(0, i - 1);
      i--;
      setTimeout(clear, 50);
    } else if (callback) {
      setTimeout(callback, 500);
    }
  }
  
  clear();
}

// Start typewriter sequence
function startTypewriterSequence() {
  console.log('Starting typewriter sequence...');
  const typewriterElement = document.getElementById('typewriter');
  if (!typewriterElement) {
    console.error('Typewriter element not found!');
    return;
  }
  
  console.log('Typewriter element found:', typewriterElement);
  
  let currentIndex = 0;
  
  function showNextText() {
    console.log('Showing text:', currentIndex, texts[currentIndex]);
    if (currentIndex < texts.length) {
      typeWriter(typewriterElement, texts[currentIndex], 100, () => {
        console.log('Finished typing text:', currentIndex);
        setTimeout(() => {
          clearText(typewriterElement, () => {
            console.log('Finished clearing text:', currentIndex);
            currentIndex++;
            if (currentIndex < texts.length) {
              showNextText();
            } else {
              // Loop back to first text
              currentIndex = 0;
              setTimeout(showNextText, 2000);
            }
          });
        }, 2000);
      });
    }
  }
  
  showNextText();
}

// Start typewriter when page loads
function initTypewriter() {
  console.log('Initializing typewriter...');
  setTimeout(startTypewriterSequence, 1000);
}

// Initialize typewriter when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTypewriter);
} else {
  initTypewriter();
}
