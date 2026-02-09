/**
 * CraftyCrib - Main JavaScript
 * AI-Powered Interior Design Platform
 * With Scroll Animations & Interactive Elements
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize theme first (before rendering)
  initTheme();
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Core functionality
  initNavbarScroll();
  initAlertDismiss();
  initMobileMenu();
  initSmoothScroll();
  initFormEnhancements();
  initThemeToggle();
  
  // Landing page animations
  initScrollAnimations();
  initComparisonSliders();
  initCounterAnimations();
  initParallaxEffects();
  initDraggableCarousel();
  initRoomsCarousel();
  initSpecialistsSection();
  initVideoSoundToggle();
  initGallerySlideColumns();
  
  // Fallback: ensure all content is visible after 2 seconds
  setTimeout(() => {
    document.querySelectorAll('[data-animate]').forEach(el => {
      el.classList.add('animated');
    });
  }, 2000);
});

/**
 * Theme initialization - respects system preference
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Use saved theme, or fall back to system preference
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

/**
 * Theme toggle button
 */
function initThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  
  toggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Re-initialize icons after theme change
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  });
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
  const navbars = document.querySelectorAll('.navbar, .navbar-landing');
  if (!navbars.length) return;
  
  const handleScroll = () => {
    navbars.forEach(navbar => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  };
  
  window.addEventListener('scroll', handleScroll);
  handleScroll();
}

/**
 * Alert auto-dismiss
 */
function initAlertDismiss() {
  const alerts = document.querySelectorAll('.alert');
  
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
    
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(() => alert.remove(), 300);
      });
    }
  });
}

/**
 * Mobile menu toggle
 */
function initMobileMenu() {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav');
  
  if (!menuBtn || !mobileNav) return;
  let lastToggle = 0;
  
  const updateIcon = (isOpen) => {
    // Clear existing icons
    menuBtn.innerHTML = '';
    // Create new icon
    const newIcon = document.createElement('i');
    newIcon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
    menuBtn.appendChild(newIcon);
    // Render the icon
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  };
  
  const toggleMenu = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastToggle < 300) return;
    lastToggle = now;
    
    const isOpen = mobileNav.classList.toggle('active');
    menuBtn.classList.toggle('active', isOpen);
    menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    mobileNav.style.display = isOpen ? 'flex' : '';
    updateIcon(isOpen);
  };
  
  menuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMenu();
  });
  
  menuBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    toggleMenu(e);
  }, { passive: false });
  
  // Close menu when clicking on a link
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      menuBtn.classList.remove('active');
      updateIcon(false);
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (mobileNav.classList.contains('active') && 
        !mobileNav.contains(e.target) && 
        !menuBtn.contains(e.target)) {
      mobileNav.classList.remove('active');
      menuBtn.classList.remove('active');
      updateIcon(false);
    }
  });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = 80; // Navbar height
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Form enhancements
 */
function initFormEnhancements() {
  // File input preview
  const fileInputs = document.querySelectorAll('input[type="file"]');
  fileInputs.forEach(input => {
    input.addEventListener('change', function() {
      const preview = document.querySelector(`#${this.id}-preview`);
      if (!preview) return;
      
      preview.innerHTML = '';
      
      Array.from(this.files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'file-preview-img';
            preview.appendChild(img);
          };
          reader.readAsDataURL(file);
        }
      });
    });
  });
  
  // Character counter for textareas
  const textareas = document.querySelectorAll('textarea[maxlength]');
  textareas.forEach(textarea => {
    const maxLength = textarea.getAttribute('maxlength');
    const counter = document.createElement('div');
    counter.className = 'char-counter';
    counter.textContent = `0 / ${maxLength}`;
    textarea.parentNode.appendChild(counter);
    
    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length} / ${maxLength}`;
    });
  });
}

/**
 * Scroll-triggered animations
 */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('[data-animate]');
  
  if (animatedElements.length === 0) return;
  
  // Function to animate an element
  const animateElement = (el) => {
    const delay = el.dataset.delay || 0;
    setTimeout(() => {
      el.classList.add('animated');
    }, parseInt(delay));
  };
  
  // Immediately animate elements in viewport
  const animateVisibleElements = () => {
    animatedElements.forEach(el => {
      if (el.classList.contains('animated')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 100 && rect.bottom > -100) {
        animateElement(el);
      }
    });
  };
  
  // Run immediately
  animateVisibleElements();
  
  // Also run after a short delay to catch late-loading elements
  setTimeout(animateVisibleElements, 100);
  setTimeout(animateVisibleElements, 500);
  
  // Use IntersectionObserver for remaining elements
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '50px 0px',
      threshold: 0.05
    };
    
    const animationObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
          animateElement(entry.target);
          animationObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    animatedElements.forEach(el => {
      if (!el.classList.contains('animated')) {
        animationObserver.observe(el);
      }
    });
  } else {
    // Fallback: animate all on scroll
    const scrollHandler = throttle(() => {
      animateVisibleElements();
    }, 100);
    
    window.addEventListener('scroll', scrollHandler);
  }
  
  // Also animate on scroll as backup
  window.addEventListener('scroll', throttle(animateVisibleElements, 150));
}

/**
 * Before/After Comparison Sliders
 */
function initComparisonSliders() {
  const sliders = document.querySelectorAll('.comparison-slider');
  
  sliders.forEach(slider => {
    const afterElement = slider.querySelector('.comparison-after');
    const handle = slider.querySelector('.comparison-handle');
    
    if (!afterElement || !handle) return;
    
    let isDragging = false;
    
    const updateSliderPosition = (x) => {
      const rect = slider.getBoundingClientRect();
      let percentage = ((x - rect.left) / rect.width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      
      afterElement.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
      handle.style.left = `${percentage}%`;
    };
    
    // Mouse events
    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      updateSliderPosition(e.clientX);
      slider.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      updateSliderPosition(e.clientX);
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      slider.style.cursor = 'ew-resize';
    });
    
    // Touch events
    slider.addEventListener('touchstart', (e) => {
      isDragging = true;
      updateSliderPosition(e.touches[0].clientX);
    });
    
    slider.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      updateSliderPosition(e.touches[0].clientX);
    });
    
    slider.addEventListener('touchend', () => {
      isDragging = false;
    });
    
    // Initialize at 50%
    updateSliderPosition(slider.getBoundingClientRect().left + slider.offsetWidth / 2);
  });
}

/**
 * Counter animations for stats
 */
function initCounterAnimations() {
  const counters = document.querySelectorAll('[data-counter]');
  
  if (counters.length === 0) return;
  
  const animateCounter = (element) => {
    const target = parseInt(element.dataset.counter);
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const updateCounter = () => {
      current += step;
      if (current < target) {
        element.textContent = Math.floor(current).toLocaleString();
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target.toLocaleString();
      }
    };
    
    updateCounter();
  };
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.5
  };
  
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  counters.forEach(counter => {
    counterObserver.observe(counter);
  });
}

/**
 * Parallax effects for background elements
 */
function initParallaxEffects() {
  const shapes = document.querySelectorAll('.shape');
  
  if (shapes.length === 0) return;
  
  let ticking = false;
  
  const updateParallax = () => {
    const scrollY = window.pageYOffset;
    
    shapes.forEach((shape, index) => {
      const speed = 0.05 + (index * 0.02);
      const yPos = scrollY * speed;
      shape.style.transform = `translateY(${yPos}px)`;
    });
    
    ticking = false;
  };
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  });
}

/**
 * API Helper
 */
const api = {
  async get(url) {
    const response = await fetch(url);
    return response.json();
  },
  
  async post(url, data) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  async put(url, data) {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  async delete(url) {
    const response = await fetch(url, { method: 'DELETE' });
    return response.json();
  }
};

/**
 * Toast notifications
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
    <span>${message}</span>
  `;
  
  document.body.appendChild(toast);
  lucide.createIcons();
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Loading state helper
 */
function setLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span> Loading...';
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText;
  }
}

/**
 * Format currency
 */
function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format date
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(date));
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle helper for scroll events
 */
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Add toast styles dynamically
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 24px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 9999;
  }
  
  .toast.show {
    transform: translateY(0);
    opacity: 1;
  }
  
  .toast-success {
    border-color: rgba(16, 185, 129, 0.3);
  }
  
  .toast-success i {
    color: var(--success);
  }
  
  .toast-error {
    border-color: rgba(239, 68, 68, 0.3);
  }
  
  .toast-error i {
    color: var(--error);
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .char-counter {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: right;
    margin-top: 4px;
  }
  
  .file-preview-img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: var(--radius-md);
    margin: 4px;
  }
  
  /* Mobile menu styles */
  @media (max-width: 768px) {
    .nav-links.mobile-active,
    .nav-actions.mobile-active {
      display: flex !important;
      flex-direction: column;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-primary);
      border-bottom: 1px solid var(--border-color);
      padding: 1rem;
      gap: 0.5rem;
    }
    
    .nav-actions.mobile-active {
      top: auto;
      border-top: 1px solid var(--border-color);
    }
  }
`;
document.head.appendChild(toastStyles);

/**
 * Draggable Carousel for Styles Section
 */
function initDraggableCarousel() {
  const wrapper = document.querySelector('.styles-carousel-wrapper');
  const carousel = document.querySelector('.styles-carousel');
  const track = document.querySelector('.styles-track');
  
  if (!wrapper || !carousel || !track) return;
  
  const scrollEl = carousel;
  let isDown = false;
  let isPaused = false;
  let startX;
  let scrollLeft;
  let momentumID;
  let velX = 0;
  let autoScrollId;
  const autoScrollSpeed = 0.25;
  
  const pauseAuto = () => { isPaused = true; };
  const resumeAuto = () => { isPaused = false; };
  
  // Pause animation on hover
  wrapper.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
    pauseAuto();
  });
  
  wrapper.addEventListener('mouseleave', () => {
    if (!isDown) {
      track.style.animationPlayState = 'running';
      resumeAuto();
    }
  });
  
  // Mouse events for dragging
  scrollEl.addEventListener('mousedown', (e) => {
    isDown = true;
    wrapper.classList.add('is-dragging');
    startX = e.pageX - scrollEl.offsetLeft;
    scrollLeft = scrollEl.scrollLeft;
    track.style.animationPlayState = 'paused';
    pauseAuto();
    cancelMomentum();
  });
  
  scrollEl.addEventListener('mouseleave', () => {
    if (isDown) {
      isDown = false;
      wrapper.classList.remove('is-dragging');
      resumeAuto();
    }
  });
  
  scrollEl.addEventListener('mouseup', () => {
    isDown = false;
    wrapper.classList.remove('is-dragging');
    startMomentum();
    resumeAuto();
  });
  
  scrollEl.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollEl.offsetLeft;
    const walk = (x - startX) * 2;
    velX = walk - (scrollEl.scrollLeft - scrollLeft);
    scrollEl.scrollLeft = scrollLeft - walk;
  });
  
  // Touch events for mobile
  scrollEl.addEventListener('touchstart', (e) => {
    isDown = true;
    wrapper.classList.add('is-dragging');
    startX = e.touches[0].pageX - scrollEl.offsetLeft;
    scrollLeft = scrollEl.scrollLeft;
    track.style.animationPlayState = 'paused';
    pauseAuto();
    cancelMomentum();
  }, { passive: true });
  
  scrollEl.addEventListener('touchend', () => {
    isDown = false;
    wrapper.classList.remove('is-dragging');
    track.style.animationPlayState = 'running';
    startMomentum();
    resumeAuto();
  });
  
  scrollEl.addEventListener('touchmove', (e) => {
    if (!isDown) return;
    const x = e.touches[0].pageX - scrollEl.offsetLeft;
    const walk = (x - startX) * 2;
    velX = walk - (scrollEl.scrollLeft - scrollLeft);
    scrollEl.scrollLeft = scrollLeft - walk;
  }, { passive: true });
  
  // Momentum scrolling
  function startMomentum() {
    cancelMomentum();
    momentumID = requestAnimationFrame(momentumLoop);
  }
  
  function cancelMomentum() {
    if (momentumID) {
      cancelAnimationFrame(momentumID);
      momentumID = null;
    }
  }
  
  function momentumLoop() {
    scrollEl.scrollLeft -= velX;
    velX *= 0.95;
    if (Math.abs(velX) > 0.5) {
      momentumID = requestAnimationFrame(momentumLoop);
    }
  }
  
  // Auto-scroll fallback (in case CSS animation is blocked)
  function autoScrollLoop() {
    if (!isPaused && !isDown) {
      scrollEl.scrollLeft += autoScrollSpeed;
      if (scrollEl.scrollLeft >= track.scrollWidth / 2) {
        scrollEl.scrollLeft -= track.scrollWidth / 2;
      }
    }
    autoScrollId = requestAnimationFrame(autoScrollLoop);
  }
  
  // Make carousel scrollable
  scrollEl.style.overflowX = 'auto';
  scrollEl.style.scrollbarWidth = 'none';
  scrollEl.style.msOverflowStyle = 'none';
  
  // Hide scrollbar for Chrome/Safari
  const style = document.createElement('style');
  style.textContent = `
    .styles-carousel::-webkit-scrollbar {
      display: none;
    }
  `;
  document.head.appendChild(style);
  
  // Start auto-scroll
  autoScrollLoop();
}

// Export for use in other scripts
window.CraftyCrib = {
  api,
  showToast,
  setLoading,
  formatCurrency,
  formatDate,
  debounce,
  throttle
};

/**
 * Rooms carousel auto-scroll
 */
function initRoomsCarousel() {
  const carousel = document.querySelector('.rooms-carousel');
  if (!carousel) return;
  const prevBtn = document.querySelector('.rooms-nav-prev');
  const nextBtn = document.querySelector('.rooms-nav-next');
  
  let isPaused = false;
  let rafId;
  const speed = 0.3;
  
  const loop = () => {
    if (!isPaused) {
      carousel.scrollLeft += speed;
      if (carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 1) {
        carousel.scrollLeft = 0;
      }
    }
    rafId = requestAnimationFrame(loop);
  };
  
  carousel.addEventListener('mouseenter', () => { isPaused = true; });
  carousel.addEventListener('mouseleave', () => { isPaused = false; });
  carousel.addEventListener('touchstart', () => { isPaused = true; }, { passive: true });
  carousel.addEventListener('touchend', () => { isPaused = false; });

  if (prevBtn && nextBtn) {
    const scrollByCard = (direction) => {
      const card = carousel.querySelector('.room-card');
      const cardWidth = card ? card.getBoundingClientRect().width : 160;
      isPaused = true;
      carousel.scrollBy({ left: direction * (cardWidth + 16), behavior: 'smooth' });
      setTimeout(() => { isPaused = false; }, 800);
    };
    
    prevBtn.addEventListener('click', () => scrollByCard(-1));
    nextBtn.addEventListener('click', () => scrollByCard(1));
  }
  
  loop();
}

/**
 * Specialists section dropdown + options
 */
function initSpecialistsSection() {
  const select = document.getElementById('specialists-select');
  const optionsWrap = document.getElementById('specialists-options');
  if (!select || !optionsWrap) return;

  const config = window.SpecialistsConfig || {};
  const optionsByCategory = {};
  const labelByCategory = {};

  if (Array.isArray(config.categories)) {
    config.categories.forEach((category) => {
      optionsByCategory[category.key] = category.options || [];
      labelByCategory[category.key] = category.label || category.key;
    });
  }

  const renderOptions = () => {
    const category = select.value;
    const options = optionsByCategory[category] || [];

    optionsWrap.innerHTML = options
      .map((option) => `
        <button type="button" class="specialists-option" data-category="${category}" data-option="${option}">
          ${option}
        </button>
      `)
      .join('');
  };

  optionsWrap.addEventListener('click', (event) => {
    const button = event.target.closest('.specialists-option');
    if (!button) return;
    const category = button.getAttribute('data-category');
    const option = button.getAttribute('data-option');
    const categoryLabel = labelByCategory[category] || category;
    const params = new URLSearchParams({
      service: option,
      category: categoryLabel
    });
    window.location.href = `/contact?${params.toString()}`;
  });

  select.addEventListener('change', renderOptions);
  renderOptions();
}

/**
 * Video sound toggle + fullscreen for gallery hero video
 */
function initVideoSoundToggle() {
  const video = document.getElementById('gallery-hero-video');
  const soundBtn = document.getElementById('video-sound-toggle');
  const fsBtn = document.getElementById('video-fullscreen-btn');
  if (!video) return;

  // Sound toggle
  if (soundBtn) {
    const iconOff = soundBtn.querySelector('.sound-icon-off');
    const iconOn = soundBtn.querySelector('.sound-icon-on');

    const updateIcons = () => {
      if (video.muted) {
        if (iconOff) iconOff.style.display = '';
        if (iconOn) iconOn.style.display = 'none';
        soundBtn.classList.remove('unmuted');
      } else {
        if (iconOff) iconOff.style.display = 'none';
        if (iconOn) iconOn.style.display = '';
        soundBtn.classList.add('unmuted');
      }
    };

    soundBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      video.muted = !video.muted;
      updateIcons();
    });

    updateIcons();
  }

  // Fullscreen
  if (fsBtn) {
    fsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Pause the background video and remember its time
      const wasPlaying = !video.paused;
      const savedTime = video.currentTime;
      const savedMuted = video.muted;
      video.pause();

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'video-fullscreen-overlay';

      const fsVideo = document.createElement('video');
      fsVideo.src = video.src;
      fsVideo.currentTime = savedTime;
      fsVideo.autoplay = true;
      fsVideo.loop = true;
      fsVideo.playsInline = true;
      fsVideo.controls = true;
      fsVideo.muted = false;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'video-fullscreen-close';
      closeBtn.innerHTML = '✕';
      closeBtn.setAttribute('aria-label', 'Close fullscreen');

      overlay.appendChild(fsVideo);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';

      const close = () => {
        // Resume background video from where fullscreen left off
        video.currentTime = fsVideo.currentTime;
        video.muted = savedMuted;
        fsVideo.pause();
        overlay.remove();
        document.body.style.overflow = '';
        if (wasPlaying) video.play();
      };

      closeBtn.addEventListener('click', close);
      overlay.addEventListener('click', (ev) => {
        if (ev.target === overlay) close();
      });
      document.addEventListener('keydown', function handler(ev) {
        if (ev.key === 'Escape') {
          close();
          document.removeEventListener('keydown', handler);
        }
      });
    });
  }
}

/**
 * Gallery side columns - interactive vertical slider
 * Adds touch / mouse drag support & ensures smooth auto-scroll
 */
function initGallerySlideColumns() {
  const cols = document.querySelectorAll('.gallery-slide-col');
  if (!cols.length) return;

  cols.forEach(col => {
    const track = col.querySelector('.gallery-slide-track');
    if (!track) return;

    let isDown = false;
    let startY = 0;
    let scrollOffset = 0;
    let currentOffset = 0;
    let resumeTimer;

    // Helper: pause CSS animation and switch to manual offset
    const pauseAnimation = () => {
      col.classList.add('is-dragging');
      const computedTransform = getComputedStyle(track).transform;
      if (computedTransform && computedTransform !== 'none') {
        const matrix = new DOMMatrix(computedTransform);
        currentOffset = matrix.m42; // translateY value
      }
      track.style.animation = 'none';
      track.style.transform = `translateY(${currentOffset}px)`;
    };

    // Helper: resume CSS animation
    const resumeAnimation = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        col.classList.remove('is-dragging');
        track.style.animation = '';
        track.style.transform = '';
      }, 2000); // resume after 2s of inactivity
    };

    // Clamp offset so we don't scroll past content
    const clampOffset = (offset) => {
      const trackHeight = track.scrollHeight / 2; // half because of duplicates
      // Wrap around
      while (offset > 0) offset -= trackHeight;
      while (offset < -trackHeight) offset += trackHeight;
      return offset;
    };

    // --- Mouse drag ---
    col.addEventListener('mousedown', (e) => {
      isDown = true;
      startY = e.clientY;
      pauseAnimation();
      scrollOffset = currentOffset;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const delta = e.clientY - startY;
      currentOffset = clampOffset(scrollOffset + delta);
      track.style.transform = `translateY(${currentOffset}px)`;
    });

    document.addEventListener('mouseup', () => {
      if (!isDown) return;
      isDown = false;
      resumeAnimation();
    });

    // --- Touch drag ---
    col.addEventListener('touchstart', (e) => {
      isDown = true;
      startY = e.touches[0].clientY;
      pauseAnimation();
      scrollOffset = currentOffset;
    }, { passive: true });

    col.addEventListener('touchmove', (e) => {
      if (!isDown) return;
      const delta = e.touches[0].clientY - startY;
      currentOffset = clampOffset(scrollOffset + delta);
      track.style.transform = `translateY(${currentOffset}px)`;
    }, { passive: true });

    col.addEventListener('touchend', () => {
      if (!isDown) return;
      isDown = false;
      resumeAnimation();
    });

    // --- Mouse wheel scroll ---
    col.addEventListener('wheel', (e) => {
      e.preventDefault();
      pauseAnimation();
      currentOffset = clampOffset(currentOffset - e.deltaY * 0.5);
      track.style.transform = `translateY(${currentOffset}px)`;
      resumeAnimation();
    }, { passive: false });
  });
}
