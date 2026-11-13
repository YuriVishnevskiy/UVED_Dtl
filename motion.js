const reducedMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const desktopMedia = matchMedia('(min-width: 761px) and (pointer: fine)');
const videos = [...document.querySelectorAll('[data-video]')];
const motionControl = document.querySelector('#motion-control');
const visibleVideos = new Set();
let videoPaused = false;

const heroIntro = document.querySelector('.hero');
const introSkip = heroIntro.querySelector('.intro-skip');
const introKey = 'uved-intro-seen';
let introSeen = false;
try { introSeen = sessionStorage.getItem(introKey) === '1'; } catch {}
if (!introSeen && !location.hash && !reducedMotionPreference.matches) {
  try { sessionStorage.setItem(introKey, '1'); } catch {}
  heroIntro.classList.add('intro-playing');
  introSkip.hidden = false;
  const introTimer = setTimeout(endIntro, 4600);
  function endIntro() {
    if (!heroIntro.classList.contains('intro-playing')) return;
    clearTimeout(introTimer);
    heroIntro.classList.remove('intro-playing');
    const skipFocused = document.activeElement === introSkip;
    introSkip.hidden = true;
    if (skipFocused || returnFocus) {
      heroIntro.querySelector('.hero-content .primary').focus({preventScroll:true});
    }
    syncVideos();
    document.removeEventListener('keydown', escapeIntro);
    removeEventListener('hashchange', endIntro);
    reducedMotionPreference.removeEventListener('change', endIntro);
  }
  let returnFocus = false;
  introSkip.addEventListener('click', () => { returnFocus = true; endIntro(); });
  function escapeIntro(event) { if (event.key === 'Escape') endIntro(); }
  document.addEventListener('keydown', escapeIntro);
  addEventListener('hashchange', endIntro);
  reducedMotionPreference.addEventListener('change', endIntro);
  heroIntro.querySelector('.hero-content').addEventListener('focusin', endIntro, {once:true});
}

function syncVideos() {
  const enabled = desktopMedia.matches && !reducedMotionPreference.matches;
  motionControl.hidden = !enabled;
  for (const video of videos) {
    if (!enabled || videoPaused || heroIntro.classList.contains('intro-playing') || document.hidden || !visibleVideos.has(video)) {
      video.pause();
      continue;
    }
    if (!video.hasAttribute('src')) video.src = video.dataset.video;
    video.play().catch(() => {});
  }
}

if ('IntersectionObserver' in window) {
  const videoObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleVideos.add(entry.target);
      else visibleVideos.delete(entry.target);
    }
    syncVideos();
  }, {threshold:0.12});
  videos.forEach(video => videoObserver.observe(video));

  const revealObserver = new IntersectionObserver(entries => {
    for (const {isIntersecting, target} of entries) {
      if (!isIntersecting) continue;
      if (!reducedMotionPreference.matches && !target.contains(document.activeElement)) {
        target.animate([{opacity:0.78, transform:'translateY(12px)'}, {opacity:1, transform:'none'}],
          {duration:640, easing:'cubic-bezier(.22,.65,.32,1)'});
      }
      revealObserver.unobserve(target);
    }
  }, {threshold:0.12});
  document.querySelectorAll('.service-cards article, .finish-compare, .studio-grid figure, #works .section-heading')
    .forEach(element => revealObserver.observe(element));

  const headerObserver = new IntersectionObserver(([entry]) => {
    document.querySelector('header').classList.toggle('scrolled', !entry.isIntersecting);
  });
  headerObserver.observe(document.querySelector('.hero-location'));

  const calculatorObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle('calculator-in-view', entry.isIntersecting);
  });
  calculatorObserver.observe(document.querySelector('#calculator'));
}

motionControl.addEventListener('click', () => {
  videoPaused = !videoPaused;
  motionControl.setAttribute('aria-pressed', String(videoPaused));
  motionControl.textContent = videoPaused ? 'Воспроизвести видео' : 'Пауза видео';
  syncVideos();
});
for (const query of [desktopMedia, reducedMotionPreference]) query.addEventListener('change', syncVideos);
document.addEventListener('visibilitychange', syncVideos);

const quote = document.querySelector('.totals');
const quoteList = document.querySelector('#line-items');
const priceValues = new Map();
const priceFrames = new Map();
const quoteObserver = new MutationObserver(() => {
  for (const price of quote.querySelectorAll('strong')) {
    const label = price.textContent;
    const previous = priceValues.get(price);
    if (previous?.label === label) continue;
    const next = /^([\d\s]+)₽$/.exec(label);
    const amount = next ? Number(next[1].replace(/\s/g, '')) : label === '—' ? 0 : null;
    const start = previous?.displayed ?? 0;
    const value = {label, displayed:amount};
    priceValues.set(price, value);
    cancelAnimationFrame(priceFrames.get(price));
    delete price.dataset.count;
    if (amount === null || reducedMotionPreference.matches || start === amount) continue;
    const started = performance.now();
    function count(now) {
      if (reducedMotionPreference.matches || now - started >= 520) {
        delete price.dataset.count;
        value.displayed = amount;
        return;
      }
      const progress = 1 - (1 - (now - started) / 520) ** 3;
      value.displayed = Math.round(start + (amount - start) * progress);
      price.dataset.count = currency.format(value.displayed);
      priceFrames.set(price, requestAnimationFrame(count));
    }
    priceFrames.set(price, requestAnimationFrame(count));
  }
});
quoteObserver.observe(quote, {childList:true, subtree:true, characterData:true});
new MutationObserver(records => {
  if (reducedMotionPreference.matches) return;
  for (const record of records) for (const element of record.addedNodes) {
    if (element instanceof HTMLLIElement) element.animate([{opacity:.4}, {opacity:1}], {duration:420});
  }
}).observe(quoteList, {childList:true});

const siteNavigation = document.querySelector('#site-navigation');
const navToggle = document.querySelector('.nav-toggle');
function closeNavigation() {
  navToggle.setAttribute('aria-expanded', 'false');
}
navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
});
siteNavigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeNavigation();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || navToggle.getAttribute('aria-expanded') !== 'true') return;
  closeNavigation();
  navToggle.focus();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('header')) closeNavigation();
});

if ('IntersectionObserver' in window) {
  const processObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('process-visible');
        processObserver.unobserve(entry.target);
      }
    }
  }, {threshold:0.55});
  document.querySelectorAll('.process li').forEach(step => processObserver.observe(step));
}

const serviceIndex = document.querySelector('.service-index');
const serviceCards = [...document.querySelectorAll('.service-story article')];
const serviceLinks = new Map();
for (const [index, card] of serviceCards.entries()) {
  card.id = 'service-' + (index + 1);
  const link = document.createElement('a');
  link.href = '#' + card.id;
  link.textContent = card.querySelector('h3').textContent;
  serviceIndex.append(link);
  serviceLinks.set(card, link);
}
if ('IntersectionObserver' in window) {
  const serviceObserver = new IntersectionObserver(entries => {
    const active = entries.find(entry => entry.isIntersecting);
    if (!active) return;
    serviceIndex.querySelector('[aria-current]')?.removeAttribute('aria-current');
    serviceLinks.get(active.target).setAttribute('aria-current','true');
  }, {rootMargin:'-24% 0px -46% 0px'});
  serviceCards.forEach(card => serviceObserver.observe(card));
}

const filmStage = document.querySelector('.film-stage');
const chapters = [...document.querySelectorAll('.process-chapters li')];
let filmFrame = 0;
let storyVisible = false;

function renderFilmStory() {
  filmFrame = 0;
  const marker = innerHeight * .63;
  let phase = 0;
  for (let index = 1; index < chapters.length; index++) {
    if (chapters[index].getBoundingClientRect().top <= marker) phase = index;
  }
  const chapter = chapters[phase].getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (marker - chapter.top) / chapter.height));
  const still = reducedMotionPreference.matches;
  filmStage.dataset.phase = String(still ? 5 : phase);
  filmStage.style.setProperty('--application', (still || phase > 3 ? 100 : phase === 3 ? progress * 100 : 0) + '%');
  filmStage.style.setProperty('--smoothing', (phase === 4 ? progress * 100 : 0) + '%');
  chapters.forEach((item, index) => item.classList.toggle('process-current', index === phase));
}
function queueFilmStory() {
  if (storyVisible && !filmFrame) filmFrame = requestAnimationFrame(renderFilmStory);
}
if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    storyVisible = entry.isIntersecting;
    queueFilmStory();
  }).observe(document.querySelector('#process'));
  addEventListener('scroll', queueFilmStory, {passive:true});
  addEventListener('resize', queueFilmStory);
  reducedMotionPreference.addEventListener('change', queueFilmStory);

}
