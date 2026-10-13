/* Montez Base — JavaScript do tema (sem dependências) */
(() => {
  const theme = window.theme || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Dinheiro ---------- */
  function formatMoney(cents, format = theme.moneyFormat || 'R$ {{amount_with_comma_separator}}') {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = Number(cents) / 100;
    const withDelimiters = (decimals, thousands, decimal) => {
      const fixed = value.toFixed(decimals).split('.');
      fixed[0] = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return fixed.join(decimal);
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount': return withDelimiters(2, ',', '.');
        case 'amount_no_decimals': return withDelimiters(0, ',', '.');
        case 'amount_with_comma_separator': return withDelimiters(2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelimiters(0, '.', ',');
        case 'amount_with_apostrophe_separator': return withDelimiters(2, "'", '.');
        default: return withDelimiters(2, '.', ',');
      }
    });
  }
  theme.formatMoney = formatMoney;

  function installmentText(cents) {
    const max = Number(theme.installments || 1);
    const minCents = Number(theme.installmentMin || 0) * 100;
    if (max <= 1) return '';
    let n = max;
    while (n > 1 && cents / n < minCents) n--;
    if (n <= 1) return '';
    return `${n}x de ${formatMoney(Math.floor(cents / n))} sem juros`;
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(message) {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
  }
  theme.toast = toast;

  /* ---------- Gavetas (menu e carrinho) ---------- */
  let lastFocus = null;
  function openDrawer(id) {
    const drawer = document.getElementById(id);
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    const focusable = drawer.querySelector('button, a, input');
    setTimeout(() => focusable && focusable.focus(), 50);
  }
  function closeDrawer(drawer) {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (!$('.drawer.is-open')) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-drawer-open]');
    if (opener) {
      const id = opener.getAttribute('data-drawer-open');
      if (id === 'CartDrawer' && theme.cartType !== 'drawer') return;
      e.preventDefault();
      openDrawer(id);
      return;
    }
    const closer = e.target.closest('[data-drawer-close]');
    if (closer) closeDrawer(closer.closest('.drawer'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.drawer.is-open').forEach(closeDrawer);
  });
  theme.openDrawer = openDrawer;

  /* ---------- Carrinho (AJAX + Section Rendering API) ---------- */
  const CART_SECTIONS = ['cart-drawer'];

  function cartSectionIds() {
    const ids = [...CART_SECTIONS];
    $$('[data-cart-section]').forEach((el) => ids.push(el.dataset.cartSection));
    return [...new Set(ids)];
  }

  function renderSections(sections) {
    if (!sections) return;
    Object.entries(sections).forEach(([id, html]) => {
      if (!html) return;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const fresh = doc.querySelector('[data-cart-root]');
      const target = id === 'cart-drawer'
        ? $('#CartDrawer [data-cart-root]')
        : $(`[data-cart-section="${id}"] [data-cart-root]`);
      if (fresh && target) target.replaceWith(fresh);
    });
  }

  function updateCount(count) {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.dataset.count = count;
    });
  }

  async function refreshCart() {
    const ids = cartSectionIds().join(',');
    const res = await fetch(`${theme.routes.root}?sections=${ids}`);
    renderSections(await res.json());
    const cart = await fetch(`${theme.routes.cart}.js`).then((r) => r.json());
    updateCount(cart.item_count);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    return cart;
  }

  // body: FormData de um form de produto ou { items: [{ id, quantity, properties }] }
  async function addToCart(body) {
    const isForm = body instanceof FormData;
    if (isForm) body.append('sections', cartSectionIds().join(','));
    else body.sections = cartSectionIds();
    const res = await fetch(`${theme.routes.cartAdd}.js`, {
      method: 'POST',
      headers: isForm ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: isForm ? body : JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.status) throw new Error(data.description || data.message || theme.strings.cartError);
    renderSections(data.sections);
    const cart = await fetch(`${theme.routes.cart}.js`).then((r) => r.json());
    updateCount(cart.item_count);
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart, added: data } }));
    return data;
  }

  async function changeLine(line, quantity) {
    const roots = $$('[data-cart-root]');
    roots.forEach((r) => r.classList.add('is-updating'));
    try {
      const res = await fetch(`${theme.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity, sections: cartSectionIds() })
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || theme.strings.cartError);
      renderSections(data.sections);
      updateCount(data.item_count);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: data } }));
    } catch (err) {
      toast(err.message);
      refreshCart();
    } finally {
      $$('[data-cart-root]').forEach((r) => r.classList.remove('is-updating'));
    }
  }
  theme.cart = { add: addToCart, change: changeLine, refresh: refreshCart };

  function afterAdd() {
    if (theme.cartType === 'drawer') openDrawer('CartDrawer');
    else window.location.href = theme.routes.cart;
  }

  // Alterar quantidade / remover no carrinho
  let changeTimer;
  document.addEventListener('click', (e) => {
    const remove = e.target.closest('[data-cart-remove]');
    if (remove) {
      e.preventDefault();
      changeLine(Number(remove.dataset.cartRemove), 0);
    }
  });
  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-cart-qty]');
    if (!input) return;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => changeLine(Number(input.dataset.cartQty), Math.max(0, Number(input.value))), 250);
  });

  /* ---------- Seletor de quantidade ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty-step]');
    if (!btn) return;
    e.preventDefault();
    const wrap = btn.closest('.quantity');
    const input = wrap && wrap.querySelector('input');
    if (!input) return;
    const min = Number(input.min || 0);
    const max = input.max ? Number(input.max) : Infinity;
    const next = Math.min(max, Math.max(min, Number(input.value || 0) + Number(btn.dataset.qtyStep)));
    if (next !== Number(input.value)) {
      input.value = next;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  /* ---------- Formulário de produto ---------- */
  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const message = form.querySelector('[data-form-message]');
    if (message) message.textContent = '';
    button && button.classList.add('is-loading');
    try {
      await addToCart(new FormData(form));
      afterAdd();
    } catch (err) {
      if (message) message.textContent = err.message;
      else toast(err.message);
    } finally {
      button && button.classList.remove('is-loading');
    }
  });

  // Botões de adicionar rápido (upsell, cards, lançamento)
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-quick-add]');
    if (!btn) return;
    e.preventDefault();
    btn.classList.add('is-loading');
    try {
      await addToCart({ items: [{ id: Number(btn.dataset.quickAdd), quantity: Number(btn.dataset.quantity || 1) }] });
      afterAdd();
    } catch (err) {
      toast(err.message);
    } finally {
      btn.classList.remove('is-loading');
    }
  });

  /* ---------- Seletor de variantes ---------- */
  class VariantPicker {
    constructor(root) {
      this.root = root;
      const json = root.querySelector('script[type="application/json"]');
      this.variants = json ? JSON.parse(json.textContent) : [];
      root.addEventListener('change', () => this.onChange());
    }
    selectedOptions() {
      return $$('[data-option-index]', this.root).map((fieldset) => {
        const checked = fieldset.querySelector('input:checked');
        const select = fieldset.querySelector('select');
        return checked ? checked.value : select ? select.value : null;
      });
    }
    onChange() {
      const options = this.selectedOptions();
      const variant = this.variants.find((v) => v.options.every((opt, i) => opt === options[i]));
      this.update(variant);
    }
    update(variant) {
      // A página de produto tem um só produto principal: preço da barra fixa também é atualizado.
      const s = document;
      $$('[data-variant-id-input]', s).forEach((input) => { input.value = variant ? variant.id : ''; });
      $$('[data-add-button]', s).forEach((btn) => {
        const label = btn.querySelector('[data-add-label]') || btn;
        if (!variant) { btn.disabled = true; label.textContent = theme.strings.unavailable; return; }
        btn.disabled = !variant.available;
        label.textContent = variant.available ? (btn.dataset.defaultLabel || theme.strings.addToCart) : theme.strings.soldOut;
      });
      if (!variant) return;
      $$('[data-price-current]', s).forEach((el) => { el.textContent = formatMoney(variant.price); });
      $$('[data-price-compare]', s).forEach((el) => {
        const show = variant.compare_at_price && variant.compare_at_price > variant.price;
        el.textContent = show ? formatMoney(variant.compare_at_price) : '';
        el.hidden = !show;
      });
      $$('[data-price-installments]', s).forEach((el) => { el.textContent = installmentText(variant.price); });
      $$('[data-cashback]', s).forEach((el) => {
        const pct = Number(el.dataset.cashback || 0);
        const amount = el.querySelector('[data-cashback-amount]');
        if (amount) amount.textContent = formatMoney(Math.round(variant.price * pct / 100));
      });
      if (variant.featured_media) {
        const slide = $(`[data-media-id="${variant.featured_media.id}"]`, s);
        if (slide) slide.closest('[data-gallery]')?.dispatchEvent(new CustomEvent('gallery:goto', { detail: slide }));
      }
      if (this.root.dataset.updateUrl !== 'false') {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }

  /* ---------- Galeria ---------- */
  function initGallery(root) {
    const main = $('[data-gallery-main]', root);
    const thumbs = $$('[data-gallery-thumb]', root);
    if (!main) return;
    const slides = $$('[data-media-id]', main);
    const go = (slide) => {
      main.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
      setCurrent(slides.indexOf(slide));
    };
    const setCurrent = (i) => thumbs.forEach((t, idx) => t.setAttribute('aria-current', idx === i ? 'true' : 'false'));
    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => go(slides[i])));
    root.addEventListener('gallery:goto', (e) => go(e.detail));
    let raf;
    main.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCurrent(Math.round(main.scrollLeft / main.clientWidth)));
    });
  }

  /* ---------- Carrossel ---------- */
  function initCarousel(root) {
    const track = $('[data-carousel-track]', root);
    if (!track) return;
    const prev = $('[data-carousel-prev]', root);
    const next = $('[data-carousel-next]', root);
    const step = () => {
      const item = track.firstElementChild;
      if (!item) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return item.getBoundingClientRect().width + gap;
    };
    const update = () => {
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Slideshow ---------- */
  function initSlideshow(root) {
    const track = $('[data-slides]', root);
    const dots = $$('[data-slide-dot]', root);
    if (!track || track.children.length < 2) return;
    const count = track.children.length;
    let index = 0;
    const go = (i) => {
      index = (i + count) % count;
      track.scrollTo({ left: track.clientWidth * index, behavior: 'smooth' });
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => { go(i); restart(); }));
    track.addEventListener('scroll', () => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
      index = i;
    }, { passive: true });
    const speed = Number(root.dataset.autoplay || 0) * 1000;
    let timer;
    const restart = () => {
      clearInterval(timer);
      if (speed && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(index + 1), speed);
    };
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', restart);
    restart();
  }

  /* ---------- Barra de anúncio rotativa ---------- */
  function initAnnouncement(root) {
    const items = $$('.announcement__item', root);
    if (items.length < 2) return;
    let i = 0;
    items[0].classList.add('is-active');
    setInterval(() => {
      items[i].classList.remove('is-active');
      i = (i + 1) % items.length;
      items[i].classList.add('is-active');
    }, Number(root.dataset.speed || 4) * 1000);
  }

  /* ---------- Lançamento (troca de versão) ---------- */
  function initLaunch(root) {
    const buttons = $$('[data-launch-tab]', root);
    const panels = $$('[data-launch-panel]', root);
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      buttons.forEach((b) => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      panels.forEach((p) => { p.hidden = p.dataset.launchPanel !== btn.dataset.launchTab; });
    }));
  }

  /* ---------- Barra fixa de compra ---------- */
  function initStickyCta(bar) {
    const anchor = document.getElementById(bar.dataset.anchor);
    if (!anchor) return;
    const io = new IntersectionObserver(([entry]) => {
      bar.classList.toggle('is-visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(anchor);
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sticky-submit]');
      if (!btn) return;
      e.preventDefault();
      const form = document.getElementById(btn.dataset.stickySubmit);
      if (form) form.requestSubmit();
    });
  }

  /* ---------- Header ---------- */
  function initHeader(header) {
    if (!header.classList.contains('header-wrapper--sticky')) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Revelar ao rolar ---------- */
  function initReveal() {
    const els = $$('[data-reveal]:not(.is-revealed)');
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-revealed')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-revealed'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Ordenação da coleção ---------- */
  document.addEventListener('change', (e) => {
    const select = e.target.closest('[data-sort-by]');
    if (!select) return;
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', select.value);
    url.searchParams.delete('page');
    window.location.href = url.toString();
  });

  /* ---------- FAQ: abrir só um por vez ---------- */
  document.addEventListener('toggle', (e) => {
    const item = e.target;
    if (!(item instanceof HTMLDetailsElement) || !item.open) return;
    const group = item.closest('[data-accordion-single]');
    if (!group) return;
    $$('details[open]', group).forEach((d) => { if (d !== item) d.open = false; });
  }, true);

  /* ---------- Inicialização (também no editor de temas) ---------- */
  function init(root = document) {
    $$('[data-variant-picker]', root).forEach((el) => { if (!el._picker) el._picker = new VariantPicker(el); });
    $$('[data-gallery]', root).forEach(initGallery);
    $$('[data-carousel]', root).forEach(initCarousel);
    $$('[data-slideshow]', root).forEach(initSlideshow);
    $$('[data-announcement]', root).forEach(initAnnouncement);
    $$('[data-launch]', root).forEach(initLaunch);
    $$('[data-sticky-cta]', root).forEach(initStickyCta);
    $$('.header-wrapper', root).forEach(initHeader);
    initReveal();
  }

  document.addEventListener('DOMContentLoaded', () => init());
  document.addEventListener('shopify:section:load', (e) => init(e.target));
})();
