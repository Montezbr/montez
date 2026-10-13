# Snippets JS para o REA

Rode cada um como avaliação de JavaScript na página (ex.: `browser_evaluate`
no Playwright, `js()` no browser-use, console no Claude in Chrome).

## Reconhecimento

```js
(() => {
  const w = window, has = k => typeof w[k] !== 'undefined';
  const scripts = [...document.scripts].map(s => s.src).filter(Boolean);
  const hosts = [...new Set(scripts.map(s => { try { return new URL(s).host } catch { return s } }))];
  const meta = n => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content;
  const platform = [];
  if (has('Shopify')) platform.push('Shopify' + (w.Shopify?.theme ? ` (tema: ${w.Shopify.theme.name} #${w.Shopify.theme.id})` : ''));
  if (has('LS') || scripts.some(s => /nuvemshop|tiendanube|d26lpennugtm8s\.cloudfront/.test(s))) platform.push('Nuvemshop/Tiendanube');
  if (has('vtex') || has('vtexjs') || /vtex/.test(document.documentElement.innerHTML.slice(0, 200000))) platform.push('VTEX');
  if (scripts.some(s => /tray\.com\.br|traycdn/.test(s))) platform.push('Tray');
  if (scripts.some(s => /lojaintegrada/.test(s))) platform.push('Loja Integrada');
  if (has('wc_add_to_cart_params') || scripts.some(s => /woocommerce/.test(s))) platform.push('WooCommerce');
  if (has('require') && document.querySelector('script[type="text/x-magento-init"]')) platform.push('Magento');
  if (has('__NEXT_DATA__') || document.getElementById('__NEXT_DATA__')) platform.push('Next.js (headless?)');
  const pixels = {
    metaPixel: has('fbq'), ga4_gtag: has('gtag'), gtm: has('google_tag_manager'),
    dataLayer: Array.isArray(w.dataLayer) ? w.dataLayer.length + ' eventos' : false,
    tiktok: has('ttq'), pinterest: has('pintrk'), clarity: has('clarity'), hotjar: has('hj'),
    klaviyo: has('klaviyo') || has('_learnq'),
  };
  return {
    url: location.href, title: document.title, generator: meta('generator'),
    platform, pixels, scriptHosts: hosts, scripts: scripts.slice(0, 80),
  };
})()
```

## Interceptador

Instale **antes** da interação. Os registros ficam em `window.__REA`.

```js
(() => {
  if (window.__REA) return 'já instalado';
  const log = window.__REA = [];
  const push = (type, data) => log.push({ t: Math.round(performance.now()), type, ...data,
    stack: new Error().stack.split('\n').slice(2, 7).map(s => s.trim()) });
  const cut = v => { try { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 800 ? s.slice(0, 800) + '…' : s } catch { return String(v) } };

  const of = window.fetch;
  window.fetch = async function (input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    const entry = { method: init.method || input.method || 'GET', url, body: cut(init.body) };
    push('fetch', entry);
    const res = await of.apply(this, arguments);
    res.clone().text().then(t => { entry.status = res.status; entry.response = cut(t) }).catch(() => {});
    return res;
  };

  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__rea = { method: m, url: u }; return oo.apply(this, arguments) };
  XMLHttpRequest.prototype.send = function (b) {
    const entry = { ...this.__rea, body: cut(b) }; push('xhr', entry);
    this.addEventListener('loadend', () => { entry.status = this.status; entry.response = cut(this.responseText) });
    return os.apply(this, arguments);
  };

  const ob = navigator.sendBeacon?.bind(navigator);
  if (ob) navigator.sendBeacon = (u, d) => { push('beacon', { url: u, body: cut(d) }); return ob(u, d) };

  const wrap = name => {
    const f = window[name]; if (typeof f !== 'function') return;
    window[name] = function () { push(name, { args: cut([...arguments]) }); return f.apply(this, arguments) };
    Object.assign(window[name], f);
  };
  ['fbq', 'ttq', 'gtag', 'pintrk'].forEach(wrap);
  if (Array.isArray(window.dataLayer)) {
    const dp = window.dataLayer.push.bind(window.dataLayer);
    window.dataLayer.push = (...a) => { push('dataLayer', { args: cut(a) }); return dp(...a) };
  }

  const od = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (e) {
    if (e instanceof CustomEvent) push('customEvent', { name: e.type, detail: cut(e.detail) });
    return od.apply(this, arguments);
  };
  return 'REA interceptador instalado';
})()
```

Ler o log (filtrando ruído de analytics se quiser):

```js
window.__REA.filter(e => !/google-analytics|doubleclick|facebook\.com\/tr/.test(e.url || ''))
```

Observação: se a página recarregar/navegar, o interceptador some — reinstale.
Para pegar requisições do carregamento inicial, use a captura de rede nativa da
ferramenta (ex.: `browser_network_requests`) ou `performance.getEntriesByType('resource')`.

## Buscar nos scripts

Procura uma string (endpoint, nome de evento, classe, texto) em todos os
scripts externos e inline e devolve o trecho ao redor, com linha:coluna.

```js
(async (needle) => {
  const out = [];
  const scan = (src, code) => {
    let i = code.indexOf(needle);
    while (i !== -1 && out.length < 20) {
      const before = code.slice(0, i), line = before.split('\n').length, col = i - before.lastIndexOf('\n');
      out.push({ src, line, col, snippet: code.slice(Math.max(0, i - 300), i + 300) });
      i = code.indexOf(needle, i + needle.length);
    }
  };
  [...document.scripts].forEach((s, n) => !s.src && scan(`inline#${n}`, s.textContent));
  for (const s of [...document.scripts].filter(s => s.src)) {
    try { scan(s.src, await (await fetch(s.src)).text()) } catch (e) { out.push({ src: s.src, erro: String(e) }) }
  }
  return out;
})('TROQUE_PELA_STRING')
```

## Quem escuta um elemento

Se a ferramenta expõe CDP (`DOMDebugger.getEventListeners`), use. Sem CDP:
inspecione atributos (`onclick`, `data-*`, `x-on:*`, `@click`, `hx-*`), o
`form` pai (`action`/`method`) e busque a classe/ID com *Buscar nos scripts*.

```js
(sel => { const el = document.querySelector(sel); if (!el) return 'não achou';
  const form = el.closest('form');
  return { tag: el.tagName, attrs: Object.fromEntries([...el.attributes].map(a => [a.name, a.value])),
    form: form && { action: form.action, method: form.method, id: form.id, cls: form.className } };
})('SELETOR')
```
