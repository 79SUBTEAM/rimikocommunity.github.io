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

document.addEventListener('DOMContentLoaded', initTypewriter);

// Also try to start immediately if DOM is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTypewriter);
} else {
  initTypewriter();
}

// Mini Chat Widget Functionality
document.addEventListener('DOMContentLoaded', function() {
  const chatWidget = document.getElementById('chatWidget');
  const chatToggle = document.getElementById('chatToggle');
  const chatWindow = document.getElementById('chatWindow');
  const chatClose = document.getElementById('chatClose');
  const chatMinimize = document.getElementById('chatMinimize');
  const chatMessages = document.getElementById('chatMessages');
  const notificationDot = document.querySelector('.notification-dot');
  const chatInput = document.querySelector('.chat-input-field input');
  const sendButton = document.querySelector('.chat-input-actions .fa-paper-plane').parentElement;

  // Smart auto-scroll variables
  let userHasScrolled = false;
  let isUserAtBottom = true;

  // Check if user is at bottom of chat
  function isAtBottom() {
    const threshold = 10; // 10px tolerance
    return chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < threshold;
  }

  // Smart scroll to bottom function
  function smartScrollToBottom() {
    if (!userHasScrolled || isUserAtBottom) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Track user scroll behavior with performance optimization
  chatMessages.addEventListener('scroll', function() {
    // Throttle scroll events for better performance
    if (isScrolling) return;
    isScrolling = true;
    
    // Clear previous timeout
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    // Set new timeout
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 16); // ~60fps
    
    isUserAtBottom = isAtBottom();
    
    // If user scrolls to bottom, re-enable auto-scroll
    if (isUserAtBottom) {
      userHasScrolled = false;
    } else {
      // If user scrolls up, disable auto-scroll
      userHasScrolled = true;
    }
  }, { passive: true });

  // Enable chat input for AI interaction
  chatInput.disabled = false;
  chatInput.placeholder = "Nhập tin nhắn...";

  // ChatGPT API Configuration
  const OPENAI_API_KEY = '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';
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  // System prompt for Rimiko Community context with Vietnamese focus
  const SYSTEM_PROMPT = `Bạn là trợ lý AI của Rimiko Community - một cộng đồng phát triển Windows tùy chỉnh và các công cụ tối ưu hóa. 

Thông tin về Rimiko:
- RimikoOS: Windows tùy chỉnh nhẹ, tối ưu hiệu năng
- Các sản phẩm: RimikoOS 10 V4/V5, RimikoOS 11 V2
- Dịch vụ: Tối ưu Windows, công cụ thiết kế, VPN, AI tools
- Ngôn ngữ: Ưu tiên trả lời bằng tiếng Việt, hỗ trợ cả tiếng Anh

HƯỚNG DẪN TRẢ LỜI:
1. Luôn trả lời đầy đủ và chi tiết
2. Nếu là hướng dẫn cài đặt, liệt kê từng bước rõ ràng
3. Nếu là giải thích, cung cấp thông tin đầy đủ
4. Trả lời thân thiện và hữu ích
5. Nếu không biết, đề xuất liên hệ Discord hoặc Facebook

Hãy trả lời chi tiết và đầy đủ, không bỏ dở câu.`;

  // Message history for context
  let messageHistory = [
    { role: "system", content: SYSTEM_PROMPT }
  ];

  let isFirstOpen = true;

  // Toggle chat window
  chatToggle.addEventListener('click', function() {
    chatWindow.classList.toggle('active');
    if (chatWindow.classList.contains('active')) {
      // Hide notification dot when chat is opened
      notificationDot.style.display = 'none';
      
      // Show welcome message on first open
      if (isFirstOpen) {
        setTimeout(() => {
          typeMessage(`Chào bạn! 👋 Tôi là AI trợ lý của Rimiko Community. 

Tôi có thể giúp bạn:
• Tìm hiểu về RimikoOS và các sản phẩm
• Hướng dẫn tối ưu Windows
• Giải đáp thắc mắc về công cụ
• Hỗ trợ kỹ thuật

Bạn cần hỗ trợ gì không? 😊`);
        }, 500);
        isFirstOpen = false;
      }
    }
  });

  // Close chat window
  chatClose.addEventListener('click', function() {
    chatWindow.classList.remove('active');
  });

  // Minimize chat window
  chatMinimize.addEventListener('click', function() {
    chatWindow.classList.remove('active');
  });

  // Close chat when clicking outside
  document.addEventListener('click', function(event) {
    if (!chatWidget.contains(event.target) && chatWindow.classList.contains('active')) {
      chatWindow.classList.remove('active');
    }
  });

  // Prevent chat window from closing when clicking inside it
  chatWindow.addEventListener('click', function(event) {
    event.stopPropagation();
  });



  // Show notification dot after 3 seconds if chat is not open
  setTimeout(() => {
    if (!chatWindow.classList.contains('active')) {
      notificationDot.style.display = 'block';
    }
  }, 3000);

  // Add typing indicator effect
  function addTypingIndicator() {
    const typingMessage = document.createElement('div');
    typingMessage.className = 'message received typing-indicator';
    typingMessage.innerHTML = `
      <div class="message-avatar">
        <img src="assets/data/rimiko.png" alt="Rimiko Support" style="width: 32px; height: 32px; border-radius: 50%;">
      </div>
      <div class="message-content">
        <div class="message-text">
          <span class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      </div>
    `;
    chatMessages.appendChild(typingMessage);
    
    // Smart scroll to bottom for typing indicator
    setTimeout(() => smartScrollToBottom(), 100);
    
    return typingMessage;
  }

  // Remove typing indicator
  function removeTypingIndicator(typingElement) {
    if (typingElement && typingElement.parentNode) {
      typingElement.parentNode.removeChild(typingElement);
    }
  }

  // Add user message to chat
  function addUserMessage(text) {
    const userMessage = document.createElement('div');
    userMessage.className = 'message sent';
    userMessage.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-user"></i>
      </div>
      <div class="message-content">
        <div class="message-text">${text}</div>
      </div>
    `;
    chatMessages.appendChild(userMessage);
    
    // Smart scroll to bottom
    setTimeout(() => smartScrollToBottom(), 100);
  }

  // Add AI message to chat
  function addAIMessage(text) {
    const aiMessage = document.createElement('div');
    aiMessage.className = 'message received';
    aiMessage.innerHTML = `
      <div class="message-avatar">
        <img src="assets/data/rimiko.png" alt="Rimiko Support" style="width: 32px; height: 32px; border-radius: 50%;">
      </div>
      <div class="message-content">
        <div class="message-text">${text}</div>
      </div>
    `;
    chatMessages.appendChild(aiMessage);
    
    // Smart scroll to bottom
    setTimeout(() => smartScrollToBottom(), 100);
  }

  // Type message character by character for realistic effect
  function typeMessage(text) {
    const aiMessage = document.createElement('div');
    aiMessage.className = 'message received';
    aiMessage.innerHTML = `
      <div class="message-avatar">
        <img src="assets/data/rimiko.png" alt="Rimiko Support" style="width: 32px; height: 32px; border-radius: 50%;">
      </div>
      <div class="message-content">
        <div class="message-text"></div>
      </div>
    `;
    chatMessages.appendChild(aiMessage);
    
    const messageText = aiMessage.querySelector('.message-text');
    let index = 0;
    
    function typeChar() {
      if (index < text.length) {
        messageText.textContent += text.charAt(index);
        index++;
        
        // Smart scroll during typing (only if user hasn't scrolled up)
        if (index % 5 === 0) { // Scroll every 5 characters for smooth experience
          smartScrollToBottom();
        }
        
        setTimeout(typeChar, 30 + Math.random() * 20); // Random delay for natural typing
      }
    }
    
    typeChar();
  }

  // Call ChatGPT API
  async function callChatGPT(userMessage) {
    try {
      // Add user message to history
      messageHistory.push({ role: "user", content: userMessage });

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messageHistory,
          max_tokens: 1500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Add AI response to history
      messageHistory.push({ role: "assistant", content: aiResponse });

      return aiResponse;
    } catch (error) {
      console.error('Error calling ChatGPT:', error);
      return getFallbackResponse(userMessage);
    }
  }

  // Improved fallback response system with better Vietnamese understanding
  function getFallbackResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Enhanced keyword responses based on reference code
    const fallbackResponses = {
      // Rimiko Community related
      'rimiko': 'Rimiko Community là cộng đồng phát triển Windows tùy chỉnh và các công cụ tối ưu hóa. Chúng tôi cung cấp RimikoOS - phiên bản Windows nhẹ và tối ưu hiệu năng. Bạn có muốn tìm hiểu thêm về sản phẩm nào không?',
      'rimikoos': 'RimikoOS là Windows tùy chỉnh được phát triển bởi Rimiko Community. Hiện có:\n• RimikoOS 10 V5 UPDATE\n• RimikoOS 11 V2 (có và không có Defender)\n\nBạn muốn tải phiên bản nào?',
      'community': 'Rimiko Community được thành lập tháng 6/2024, tập trung vào trải nghiệm người dùng. Chúng tôi phát triển Windows tùy chỉnh và các công cụ tối ưu hóa.',
      'cài bằng wintohdd': 'Bạn tải file trên filecr.com. Khi tải xong, giải nén file ra, pass là 123. Bạn mở file setup lên để cài wintohdd, rồi bỏ tick launch WintoHDD, và nhấn OK. Giải nén tiếp file patch ở trong thư mục, mở lên và setup như bình thường (Chọn phiên bản bạn muốn patch). Sau khi đã cài xong, bạn mở WintoHDD lên, chọn phần Reinstall Windows. Chọn tiếp đường dẫn đến file iso, lựa phiên bản bạn muốn cài. Về sau cứ ấn Next là được, rồi đợi nó chạy lên thôi. Ở đây bạn không cần setup gì cả vì nó boot thẳng luôn. Vậy là xong rồi!',
      'cài qua wintohdd': 'Bạn tải file trên filecr.com. Khi tải xong, giải nén file ra, pass là 123. Bạn mở file setup lên để cài wintohdd, rồi bỏ tick launch WintoHDD, và nhấn OK. Giải nén tiếp file patch ở trong thư mục, mở lên và setup như bình thường (Chọn phiên bản bạn muốn patch). Sau khi đã cài xong, bạn mở WintoHDD lên, chọn phần Reinstall Windows. Chọn tiếp đường dẫn đến file iso, lựa phiên bản bạn muốn cài. Về sau cứ ấn Next là được, rồi đợi nó chạy lên thôi. Ở đây bạn không cần setup gì cả vì nó boot thẳng luôn. Vậy là xong rồi!',
      'wintohdd': 'Bạn tải file trên filecr.com. Khi tải xong, giải nén file ra, pass là 123. Bạn mở file setup lên để cài wintohdd, rồi bỏ tick launch WintoHDD, và nhấn OK. Giải nén tiếp file patch ở trong thư mục, mở lên và setup như bình thường (Chọn phiên bản bạn muốn patch). Sau khi đã cài xong, bạn mở WintoHDD lên, chọn phần Reinstall Windows. Chọn tiếp đường dẫn đến file iso, lựa phiên bản bạn muốn cài. Về sau cứ ấn Next là được, rồi đợi nó chạy lên thôi. Ở đây bạn không cần setup gì cả vì nó boot thẳng luôn. Vậy là xong rồi!',
      'cài rimikoos': 'Để có thể cài được win của chúng tôi. Trước hết, hãy chuẩn bị một cái usb. Tiếp theo đó, vào rufus.ie/en/ tải phiên bản mới nhất. Ở trong phần setup rufus, nó sẽ hiện usb bạn dã cắm vào từ trước, ở phần boot selection, bạn ấn select để lựa file iso RimikoOS vừa mới tải về từ website, bạn có thể sài tổ hợp phím Alt + E để bật multi boot bios hoặc uefi. Ấn Start để bắt đầu chạy, lúc đấy nó sẽ báo warning gì đó bạn cứ ấn next hoặc ok để tiếp tục, đợi đến khi nó báo READY thì bạn restart lại máy và boot vào boot menu và lựa usb bạn đã tạo. Cuối cùng setup win thôi! Vậy là xong.',
      'cài bằng usb': 'Để có thể cài được win. Trước hết, hãy chuẩn bị một cái usb. Tiếp theo đó, vào rufus.ie/en/ tải phiên bản mới nhất. Ở trong phần setup rufus, nó sẽ hiện usb bạn dã cắm vào từ trước, ở phần boot selection, bạn ấn select để lựa file iso Windows vừa mới tải về từ website, bạn có thể sài tổ hợp phím Alt + E để bật multi boot bios hoặc uefi. Ấn Start để bắt đầu chạy, lúc đấy nó sẽ báo warning gì đó bạn cứ ấn next hoặc ok để tiếp tục, đợi đến khi nó báo READY thì bạn restart lại máy và boot vào boot menu và lựa usb bạn đã tạo. Cuối cùng setup win thôi! Vậy là xong.',
      'cài qua usb': 'Để có thể cài được win. Trước hết, hãy chuẩn bị một cái usb. Tiếp theo đó, vào rufus.ie/en/ tải phiên bản mới nhất. Ở trong phần setup rufus, nó sẽ hiện usb bạn dã cắm vào từ trước, ở phần boot selection, bạn ấn select để lựa file iso Windows vừa mới tải về từ website, bạn có thể sài tổ hợp phím Alt + E để bật multi boot bios hoặc uefi. Ấn Start để bắt đầu chạy, lúc đấy nó sẽ báo warning gì đó bạn cứ ấn next hoặc ok để tiếp tục, đợi đến khi nó báo READY thì bạn restart lại máy và boot vào boot menu và lựa usb bạn đã tạo. Cuối cùng setup win thôi! Vậy là xong.',
      // Windows optimization
      'tối ưu': 'Để tối ưu Windows, bạn có nhiều lựa chọn:\n\n🔧 **Optimization Tools:**\n• Optimizer - Tối ưu toàn diện hệ thống\n• Hone - Công cụ tối ưu hiệu năng\n• CTT Tool - Windows optimization toolkit\n\n💾 **Memory Management:**\n• Mem Reduct - Giải phóng RAM tự động\n• Reduce Memory - Giảm sử dụng bộ nhớ\n\n🖥️ **Windows Lite:**\n• GhostSpectre Win 10 AIO - Windows 10 nhẹ\n• GhostSpectre Win 11 (22H2/23H2/24H2) - Windows 11 tối ưu\n• Tiny 10/11 Core - Windows siêu nhẹ\n\n🛠️ **Advanced Tools:**\n• GhostSpectre Toolkit - Bộ công cụ chuyên nghiệp\n• AmeWizard - Tối ưu Windows nâng cao\n• ReviOS - Windows tùy chỉnh\n• Atlas - Windows tối ưu hiệu năng\n\n📁 **Tất cả đều có trong Resources!** Vào mục Resources để tải về và xem hướng dẫn chi tiết.\n\nBạn muốn tối ưu phần nào cụ thể?',
      'windows': 'RimikoOS là phiên bản Windows tùy chỉnh nhẹ và tối ưu. Nó giúp giảm sử dụng RAM và CPU so với Windows gốc, mang lại trải nghiệm mượt mà hơn.',
      'lag': 'Nếu Windows bị lag, bạn có thể:\n• Cài đặt RimikoOS để tối ưu hiệu năng\n• Sử dụng Optimization Tools\n• Dọn dẹp hệ thống với Toolkit',
      
      // Specific optimization tools
      'optimizer': 'Optimizer là công cụ tối ưu Windows mạnh mẽ:\n\n🔧 **Tính năng chính:**\n• Tối ưu hiệu năng hệ thống\n• Vô hiệu hóa các dịch vụ không cần thiết\n• Tối ưu registry\n• Dọn dẹp file tạm\n\n📁 **Tải về:** Vào mục Optimization Tools trong Resources\n\n💡 **Lưu ý:** Chạy với quyền Administrator để có hiệu quả tốt nhất!',
      'hone': 'Hone là công cụ tối ưu hiệu năng Windows:\n\n⚡ **Tính năng:**\n• Tối ưu CPU và GPU\n• Giảm độ trễ hệ thống\n• Tối ưu gaming performance\n• Giải phóng tài nguyên\n\n📁 **Tải về:** Vào mục Optimization Tools trong Resources\n\n🎮 **Phù hợp cho:** Gaming và công việc nặng',
      'ctt tool': 'CTT Tool (Chris Titus Tech Tool) là bộ công cụ tối ưu Windows:\n\n🛠️ **Tính năng:**\n• Tối ưu Windows services\n• Vô hiệu hóa telemetry\n• Tối ưu privacy settings\n• Performance tweaks\n\n📁 **Tải về:** Vào mục Optimization Tools trong Resources\n\n🔒 **An toàn:** Được phát triển bởi Chris Titus Tech',
      'ctt': 'CTT Tool (Chris Titus Tech Tool) là bộ công cụ tối ưu Windows:\n\n🛠️ **Tính năng:**\n• Tối ưu Windows services\n• Vô hiệu hóa telemetry\n• Tối ưu privacy settings\n• Performance tweaks\n\n📁 **Tải về:** Vào mục Optimization Tools trong Resources\n\n🔒 **An toàn:** Được phát triển bởi Chris Titus Tech',
      'chris titus': 'CTT Tool (Chris Titus Tech Tool) là bộ công cụ tối ưu Windows:\n\n🛠️ **Tính năng:**\n• Tối ưu Windows services\n• Vô hiệu hóa telemetry\n• Tối ưu privacy settings\n• Performance tweaks\n\n📁 **Tải về:** Vào mục Optimization Tools trong Resources\n\n🔒 **An toàn:** Được phát triển bởi Chris Titus Tech',
      
      // Memory management
      'mem reduct': 'Mem Reduct là công cụ quản lý bộ nhớ RAM:\n\n💾 **Tính năng:**\n• Giải phóng RAM tự động\n• Theo dõi sử dụng bộ nhớ\n• Tối ưu memory usage\n• Giảm memory leaks\n\n📁 **Tải về:** Vào mục Programme trong Resources\n\n⚙️ **Cài đặt:** Chạy với quyền Admin và cấu hình auto-start',
      'mem': 'Mem Reduct là công cụ quản lý bộ nhớ RAM:\n\n💾 **Tính năng:**\n• Giải phóng RAM tự động\n• Theo dõi sử dụng bộ nhớ\n• Tối ưu memory usage\n• Giảm memory leaks\n\n📁 **Tải về:** Vào mục Programme trong Resources\n\n⚙️ **Cài đặt:** Chạy với quyền Admin và cấu hình auto-start',
      'reduct': 'Mem Reduct là công cụ quản lý bộ nhớ RAM:\n\n💾 **Tính năng:**\n• Giải phóng RAM tự động\n• Theo dõi sử dụng bộ nhớ\n• Tối ưu memory usage\n• Giảm memory leaks\n\n📁 **Tải về:** Vào mục Programme trong Resources\n\n⚙️ **Cài đặt:** Chạy với quyền Admin và cấu hình auto-start',
      'reduce memory': 'Reduce Memory là công cụ giảm sử dụng RAM:\n\n📉 **Tính năng:**\n• Giải phóng RAM ngay lập tức\n• Giảm memory usage\n• Tối ưu cho máy yếu\n• Giao diện đơn giản\n\n📁 **Tải về:** Vào mục Programme trong Resources\n\n💡 **Phù hợp:** Máy tính có RAM thấp',
      'reduce': 'Reduce Memory là công cụ giảm sử dụng RAM:\n\n📉 **Tính năng:**\n• Giải phóng RAM ngay lập tức\n• Giảm memory usage\n• Tối ưu cho máy yếu\n• Giao diện đơn giản\n\n📁 **Tải về:** Vào mục Programme trong Resources\n\n💡 **Phù hợp:** Máy tính có RAM thấp',
      
      // Windows Lite versions
      'ghostspectre': 'GhostSpectre là Windows tùy chỉnh nhẹ và tối ưu:\n\n👻 **Các phiên bản:**\n• Win 10 AIO - Tất cả trong một\n• Win 11 22H2 - Ổn định\n• Win 11 23H2 - Cập nhật mới\n• Win 11 24H2 - Phiên bản mới nhất\n\n📁 **Tải về:** Vào mục Windows Lite trong Resources\n\n🚀 **Ưu điểm:** Nhẹ, nhanh, ổn định',
      'ghost': 'GhostSpectre là Windows tùy chỉnh nhẹ và tối ưu:\n\n👻 **Các phiên bản:**\n• Win 10 AIO - Tất cả trong một\n• Win 11 22H2 - Ổn định\n• Win 11 23H2 - Cập nhật mới\n• Win 11 24H2 - Phiên bản mới nhất\n\n📁 **Tải về:** Vào mục Windows Lite trong Resources\n\n🚀 **Ưu điểm:** Nhẹ, nhanh, ổn định',
      'ghost spectre': 'GhostSpectre là Windows tùy chỉnh nhẹ và tối ưu:\n\n👻 **Các phiên bản:**\n• Win 10 AIO - Tất cả trong một\n• Win 11 22H2 - Ổn định\n• Win 11 23H2 - Cập nhật mới\n• Win 11 24H2 - Phiên bản mới nhất\n\n📁 **Tải về:** Vào mục Windows Lite trong Resources\n\n🚀 **Ưu điểm:** Nhẹ, nhanh, ổn định',
      'tiny': 'Tiny Windows là phiên bản Windows siêu nhẹ:\n\n🔸 **Tiny 10:**\n• Windows 10 22H2 siêu nhẹ\n• Chỉ ~2GB RAM sử dụng\n• Phù hợp máy cũ\n\n🔸 **Tiny 11 Core:**\n• Windows 11 22H2 core\n• Hiệu năng cao\n• Ít tính năng không cần thiết\n\n📁 **Tải về:** Vào mục Windows Lite trong Resources\n\n💻 **Phù hợp:** Máy tính cũ, RAM thấp',
      'tiny10': 'Tiny Windows là phiên bản Windows siêu nhẹ:\n\n🔸 **Tiny 10:**\n• Windows 10 22H2 siêu nhẹ\n• Chỉ ~2GB RAM sử dụng\n• Phù hợp máy cũ\n\n🔸',
      'tiny11': 'Tiny Windows là phiên bản Windows siêu nhẹ:\n\n🔸 **Tiny 11 Core:**\n• Windows 11 22H2 core\n• Hiệu năng cao\n• Ít tính năng không cần thiết\n\n📁 **Tải về:** Vào mục Windows Lite trong Resources\n\n💻 **Phù hợp:** Máy tính cũ, RAM thấp',
      
      // Advanced tools
      'amewizard': 'AmeWizard là công cụ tối ưu Windows nâng cao:\n\n🔮 **Tính năng:**\n• Tối ưu Windows services\n• Customization nâng cao\n• Performance tweaks\n• Privacy optimization\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n⚙️ **Cách cài đặt:**\n1. Tải AmeWizard từ Resources\n2. Chạy file .exe với quyền Administrator\n3. Chọn các tùy chọn tối ưu phù hợp\n4. Click Apply để áp dụng\n5. Restart máy tính\n\n💡 **Lưu ý:** Backup dữ liệu trước khi cài đặt!',
      'ame': 'AmeWizard là công cụ tối ưu Windows nâng cao:\n\n🔮 **Tính năng:**\n• Tối ưu Windows services\n• Customization nâng cao\n• Performance tweaks\n• Privacy optimization\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n⚙️ **Cách cài đặt:**\n1. Tải AmeWizard từ Resources\n2. Chạy file .exe với quyền Administrator\n3. Chọn các tùy chọn tối ưu phù hợp\n4. Click Apply để áp dụng\n5. Restart máy tính\n\n💡 **Lưu ý:** Backup dữ liệu trước khi cài đặt!',
      'revios': 'ReviOS là Windows tùy chỉnh tối ưu:\n\n🔄 **Tính năng:**\n• Windows 10 21H2 tối ưu\n• Performance improvements\n• Gaming optimizations\n• Privacy focused\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n📖 **Cách thêm Playbook (theo tài liệu chính thức):**\n\n🔧 **Chuẩn bị hệ thống:**\n1. Cài đặt tất cả Windows Updates và restart nhiều lần\n2. Gỡ bỏ antivirus và tweaking tools\n3. Tắt OneDrive\n4. Backup dữ liệu quan trọng\n\n⚙️ **Vô hiệu hóa bảo mật:**\n1. Mở AME Beta và chọn playbook\n2. Hoàn thành action "Disable Security"\n3. Sử dụng Windows Security để tắt các dịch vụ\n4. Xác nhận hoàn thành để mở khóa "Next"\n\n🚀 **Áp dụng Playbook:**\n1. Click "Next" và đồng ý điều khoản\n2. Chọn features hoặc dùng mặc định\n3. Đặt credentials (nhớ lưu lại!)\n4. Chờ hệ thống tự động restart\n\n🎮 **Phù hợp:** Gaming và công việc',
      'revi': 'ReviOS là Windows tùy chỉnh tối ưu:\n\n🔄 **Tính năng:**\n• Windows 10 21H2 tối ưu\n• Performance improvements\n• Gaming optimizations\n• Privacy focused\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n📖 **Cách thêm Playbook (theo tài liệu chính thức):**\n\n🔧 **Chuẩn bị hệ thống:**\n1. Cài đặt tất cả Windows Updates và restart nhiều lần\n2. Gỡ bỏ antivirus và tweaking tools\n3. Tắt OneDrive\n4. Backup dữ liệu quan trọng\n\n⚙️ **Vô hiệu hóa bảo mật:**\n1. Mở AME Beta và chọn playbook\n2. Hoàn thành action "Disable Security"\n3. Sử dụng Windows Security để tắt các dịch vụ\n4. Xác nhận hoàn thành để mở khóa "Next"\n\n🚀 **Áp dụng Playbook:**\n1. Click "Next" và đồng ý điều khoản\n2. Chọn features hoặc dùng mặc định\n3. Đặt credentials (nhớ lưu lại!)\n4. Chờ hệ thống tự động restart\n\n🎮 **Phù hợp:** Gaming và công việc',
      'atlas': 'Atlas là Windows tối ưu hiệu năng:\n\n🗺️ **Tính năng:**\n• Windows 10 21H2 optimized\n• Performance focused\n• Gaming optimizations\n• Privacy enhancements\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n📖 **Cách thêm Playbook (theo tài liệu chính thức):**\n\n🔧 **Chuẩn bị hệ thống:**\n1. Cài đặt tất cả Windows Updates và restart nhiều lần\n2. Gỡ bỏ antivirus và tweaking tools\n3. Tắt OneDrive\n4. Backup dữ liệu quan trọng\n\n⚙️ **Vô hiệu hóa bảo mật:**\n1. Mở AME Beta và chọn playbook\n2. Hoàn thành action "Disable Security"\n3. Sử dụng Windows Security để tắt các dịch vụ\n4. Xác nhận hoàn thành để mở khóa "Next"\n\n🚀 **Áp dụng Playbook:**\n1. Click "Next" và đồng ý điều khoản\n2. Chọn features hoặc dùng mặc định\n3. Đặt credentials (nhớ lưu lại!)\n4. Chờ hệ thống tự động restart\n\n⚡ **Ưu điểm:** Hiệu năng cao, ổn định',
      
      // Playbook specific
      'playbook': 'Playbook là bộ công cụ tối ưu bổ sung cho Windows tùy chỉnh:\n\n📖 **Tính năng:**\n• Tối ưu hiệu năng nâng cao\n• Customization bổ sung\n• Performance tweaks\n• Privacy enhancements\n\n📁 **Tải về:** Vào mục Playbook & AmeWizard trong Resources\n\n⚙️ **Cách sử dụng (theo tài liệu chính thức):**\n\n🔧 **Chuẩn bị hệ thống:**\n1. Cài đặt tất cả Windows Updates và restart nhiều lần\n2. Gỡ bỏ antivirus và tweaking tools\n3. Tắt OneDrive\n4. Backup dữ liệu quan trọng\n\n⚙️ **Vô hiệu hóa bảo mật:**\n1. Mở AME Beta và chọn playbook\n2. Hoàn thành action "Disable Security"\n3. Sử dụng Windows Security để tắt các dịch vụ\n4. Xác nhận hoàn thành để mở khóa "Next"\n\n🚀 **Áp dụng Playbook:**\n1. Click "Next" và đồng ý điều khoản\n2. Chọn features hoặc dùng mặc định\n3. Đặt credentials (nhớ lưu lại!)\n4. Chờ hệ thống tự động restart\n\n💡 **Lưu ý:** Chỉ dùng sau khi đã cài Windows tùy chỉnh!\n\n📚 **Tài liệu tham khảo:** [docs.ameliorated.io](https://docs.ameliorated.io/installing_playbooks/playbook_apply.html)',
      
      // Download and installation
      'download': 'Bạn có thể tải RimikoOS từ trang sản phẩm:\n• RimikoOS 10 V5 UPDATE\n• RimikoOS 11 V2 (có/không Defender)\n\nTất cả đều miễn phí!\n\nHướng dẫn tải:\n1. Vào trang sản phẩm\n2. Chọn phiên bản phù hợp\n3. Click nút Download\n4. Chờ tải xong file ISO\n5. Tạo USB boot để cài đặt\n\nBạn muốn tải phiên bản nào?',
      'tải': 'Để tải RimikoOS:\n1. Vào trang sản phẩm\n2. Chọn phiên bản phù hợp\n3. Click Download\n4. Tạo USB boot để cài đặt\n\nCác phiên bản có sẵn:\n• RimikoOS 10 V5 UPDATE - Ổn định, nhẹ\n• RimikoOS 11 V2 (không Defender) - Hiệu năng cao\n• RimikoOS 11 V2 (có Defender) - Bảo mật tốt\n\nBạn muốn tải phiên bản nào?',
      'cài đặt': 'Hướng dẫn cài đặt RimikoOS chi tiết:\n\nCHUẨN BỊ:\n1. USB 8GB trở lên\n2. Tải Rufus (công cụ tạo USB boot)\n3. Tải file ISO RimikoOS\n\nCÁC BƯỚC CÀI ĐẶT:\n1. Tải file ISO từ trang sản phẩm\n2. Cài đặt và mở Rufus\n3. Chọn USB và file ISO\n4. Click Start để tạo USB boot\n5. Restart máy tính\n6. Boot từ USB (F12 hoặc Del)\n7. Chọn Install RimikoOS\n8. Làm theo hướng dẫn cài đặt\n\nLưu ý: Backup dữ liệu trước khi cài đặt!\n\nCần hỗ trợ chi tiết không?',
      'cài': 'Cài đặt RimikoOS:\n• Tải ISO từ trang sản phẩm\n• Tạo USB boot\n• Boot và cài đặt\n\nHướng dẫn chi tiết có trong Discord!\n\nCác bước cụ thể:\n1. Tải file ISO RimikoOS\n2. Tải Rufus từ rufus.ie\n3. Mở Rufus, chọn USB và ISO\n4. Click Start, chờ hoàn thành\n5. Restart máy, boot từ USB\n6. Chọn Install và làm theo hướng dẫn\n\nQuan trọng: Backup dữ liệu trước khi cài!',
      
      // Tools and resources
      'công cụ': 'Các công cụ chính:\n• Optimization Tools\n• Windows Lite\n• Toolkit\n• VPN\n• AI Tools\n• Steam\n\nBạn quan tâm công cụ nào?\n\nMỗi công cụ có chức năng riêng:\n• Optimization: Tối ưu Windows\n• Windows Lite: Hệ điều hành nhẹ\n• Toolkit: Bộ công cụ tổng hợp',
      'tool': 'Các công cụ chính:\n• Optimization Tools\n• Windows Lite\n• Toolkit\n• VPN\n• AI Tools\n• Steam\n\nBạn quan tâm công cụ nào?\n\nMỗi công cụ có chức năng riêng:\n• Optimization: Tối ưu Windows\n• Windows Lite: Hệ điều hành nhẹ\n• Toolkit: Bộ công cụ tổng hợp',
      
      // Support and help
      'lỗi': 'Nếu gặp lỗi:\n• Liên hệ Discord: https://dsc.gg/rimikocommunity\n• Facebook: https://www.facebook.com/rimikocommunity\n• YouTube: @RimikoDC\n\nChúng tôi sẽ hỗ trợ ngay!',
      'vấn đề': 'Gặp vấn đề gì vậy? Bạn có thể:\n• Liên hệ Discord để được hỗ trợ trực tiếp\n• Xem hướng dẫn trên YouTube\n• Tham gia cộng đồng Facebook',
      'help': 'Tôi có thể giúp bạn:\n• Tìm hiểu RimikoOS\n• Hướng dẫn tối ưu Windows\n• Giải đáp về công cụ\n• Hỗ trợ kỹ thuật\n\nBạn cần hỗ trợ gì cụ thể?',
      'hỗ trợ': 'Tôi sẵn sàng hỗ trợ bạn về:\n• RimikoOS và sản phẩm\n• Tối ưu Windows\n• Công cụ và tài nguyên\n• Vấn đề kỹ thuật\n\nHãy cho tôi biết bạn cần gì!',
      
      // Greetings
      'xin chào': 'Chào bạn! 👋 Tôi là AI trợ lý của Rimiko Community. Tôi có thể giúp bạn tìm hiểu về RimikoOS, tối ưu Windows, và các công cụ khác. Bạn cần hỗ trợ gì không?',
      'hello': 'Xin chào! Tôi là trợ lý AI của Rimiko Community. Tôi có thể giúp gì cho bạn hôm nay?',
      'hi': 'Chào bạn! Chào mừng đến với Rimiko Community. Tôi có thể giúp gì cho bạn?',
      // Donation
      'donate': 'Cảm ơn bạn muốn ủng hộ! 💝\n\nThông tin thanh toán:\n🏦 Ngân hàng: MB Bank\n👤 Chủ TK: NGUYEN TRONG TAI\n💳 Số TK: 0377608318\n📝 Nội dung: Donate để Owner có tiền phát triển\n\nMọi đóng góp đều được sử dụng để phát triển cộng đồng!',
      'ủng hộ': 'Cảm ơn bạn muốn ủng hộ Rimiko Community! 💝\n\nThông tin thanh toán đã có trong chat. Mọi đóng góp đều được sử dụng để phát triển cộng đồng và tạo ra nhiều sản phẩm tốt hơn!',
      
      // Thanks
      'cảm ơn': 'Không có gì! 😊 Nếu cần hỗ trợ thêm, hãy liên hệ qua Discord hoặc Facebook nhé!',
      'thanks': 'Không có gì! 😊 Tôi luôn sẵn sàng hỗ trợ bạn!',
      
      // Apologize
      'ngu': 'Xin lỗi bạn. Tôi vẫn chưa có thể hiểu được ý của bạn vì suy nghĩ còn giới hạn, nếu cần giải đáp sâu hơn bạn có thể vào server discord của chúng tôi để được hỗ trợ thêm.
      'dỏm': 'Xin lỗi bạn. Tôi vẫn chưa có thể hiểu được ý của bạn vì suy nghĩ còn giới hạn, nếu cần giải đáp sâu hơn bạn có thể vào server discord của chúng tôi để được hỗ trợ thêm.
      // General questions
      'gì': 'Tôi có thể giúp bạn:\n• Tìm hiểu RimikoOS\n• Hướng dẫn tối ưu Windows\n• Giải đáp về công cụ\n• Hỗ trợ kỹ thuật\n\nBạn muốn biết gì cụ thể?',
      'là gì': 'Rimiko Community là cộng đồng phát triển Windows tùy chỉnh và các công cụ tối ưu hóa. Chúng tôi tạo ra RimikoOS - phiên bản Windows nhẹ, tối ưu hiệu năng.',
      'thế nào': 'Tôi có thể hướng dẫn bạn:\n• Cách tải và cài đặt RimikoOS\n• Cách tối ưu Windows\n• Sử dụng các công cụ\n\nBạn muốn biết cách làm gì?'
    };
    
    // Check for keyword matches with better logic
    for (const [keyword, response] of Object.entries(fallbackResponses)) {
      if (lowerMessage.includes(keyword)) {
        return response;
      }
    }
    
    // If no specific keyword found, try to understand the intent
    if (lowerMessage.includes('làm sao') || lowerMessage.includes('cách') || lowerMessage.includes('hướng dẫn')) {
      return 'Tôi có thể hướng dẫn bạn:\n• Cách tải và cài đặt RimikoOS\n• Cách tối ưu Windows\n• Sử dụng các công cụ\n\nBạn muốn hướng dẫn cụ thể về gì?';
    }
    
    if (lowerMessage.includes('miễn phí') || lowerMessage.includes('giá') || lowerMessage.includes('tiền')) {
      return 'Tất cả sản phẩm của Rimiko Community đều miễn phí! 🎉\n\n• RimikoOS: Miễn phí\n• Công cụ tối ưu: Miễn phí\n• Hỗ trợ: Miễn phí\n\nChỉ cần donate nếu bạn muốn ủng hộ phát triển!';
    }
    
    // Default response with more helpful suggestions
    return 'Tôi hiểu bạn đang hỏi về Rimiko Community! 😊\n\nTôi có thể giúp bạn:\n• Tìm hiểu về RimikoOS và sản phẩm\n• Hướng dẫn tối ưu Windows\n• Giải đáp về công cụ và tài nguyên\n• Hỗ trợ kỹ thuật\n\nHoặc bạn có thể liên hệ trực tiếp qua Discord: https://dsc.gg/rimikocommunity\n\nBạn muốn biết gì cụ thể?';
  }

  // Handle send message
  async function handleSendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Clear input
    chatInput.value = '';

    // Add user message
    addUserMessage(message);

    // Check for keyword response first
    const keywordResponse = getFallbackResponse(message);
    const hasKeywordMatch = keywordResponse !== 'Tôi hiểu bạn đang hỏi về Rimiko Community! 😊\n\nTôi có thể giúp bạn:\n• Tìm hiểu về RimikoOS và sản phẩm\n• Hướng dẫn tối ưu Windows\n• Giải đáp về công cụ và tài nguyên\n• Hỗ trợ kỹ thuật\n\nHoặc bạn có thể liên hệ trực tiếp qua Discord: https://dsc.gg/rimikocommunity\n\nBạn muốn biết gì cụ thể?';

    if (hasKeywordMatch) {
      // If keyword match found, use keyword response with typing effect
      const typingIndicator = addTypingIndicator();
      
      setTimeout(() => {
        removeTypingIndicator(typingIndicator);
        typeMessage(keywordResponse);
      }, 1000);
    } else {
      // If no keyword match, use ChatGPT API
      const typingIndicator = addTypingIndicator();

      try {
        // Simulate typing delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        // Get AI response
        const aiResponse = await callChatGPT(message);
        
        // Remove typing indicator
        removeTypingIndicator(typingIndicator);
        
        // Add AI response with typing effect
        typeMessage(aiResponse);
      } catch (error) {
        // Remove typing indicator
        removeTypingIndicator(typingIndicator);
        
        // Show error message
        addAIMessage('Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau hoặc liên hệ qua Discord: https://dsc.gg/rimikocommunity');
      }
    }
  }

  // Send message on Enter key
  chatInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  });

  // Send message on button click
  sendButton.addEventListener('click', handleSendMessage);
  
  // Fix QR code image loading
  const qrImage = document.querySelector('.qr-image img');
  if (qrImage) {
    qrImage.addEventListener('error', function() {
      // Try alternative paths if the main path fails
      const currentSrc = this.src;
      const alternativePaths = [
        './assets/privacy/qrcode.jpg',
        'assets/privacy/qrcode.jpg',
        '/assets/privacy/qrcode.jpg',
        '../assets/privacy/qrcode.jpg'
      ];
      
      const currentIndex = alternativePaths.indexOf(currentSrc);
      const nextIndex = (currentIndex + 1) % alternativePaths.length;
      
      if (currentIndex === -1 || currentIndex < alternativePaths.length - 1) {
        this.src = alternativePaths[nextIndex];
      } else {
        // If all paths fail, show a placeholder
        this.style.display = 'none';
        const placeholder = document.createElement('div');
        placeholder.style.cssText = `
          width: 120px;
          height: 120px;
          background: #f0f0f0;
          border: 2px solid #ddd;
          border-radius: 8px;
          color: #666;
          font-size: 12px;
          text-align: center;
          line-height: 120px;
          margin: 8px auto;
        `;
        placeholder.textContent = 'QR Code không tải được';
        this.parentNode.appendChild(placeholder);
      }
    });
  }
});



