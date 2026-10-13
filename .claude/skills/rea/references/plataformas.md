# Sinais de plataforma e onde procurar cada recurso

| Plataforma | Sinais | Endpoints/padrões úteis |
|---|---|---|
| **Shopify** | `window.Shopify`, `cdn.shopify.com`, `/cdn/shop/`, meta `shopify-checkout-api-token` | Carrinho: `/cart.js`, `/cart/add.js`, `/cart/change.js`, `/cart/update.js`. Produto: `/products/<handle>.js` ou `.json`. Busca: `/search/suggest.json`. Frete: `/cart/shipping_rates.json`, `/cart/prepare_shipping_rates.json`. Seções renderizadas: `?sections=` / `section_id=`. Apps: scripts em `extensions/`, `shopifycloud`, domínios do app. |
| **Nuvemshop / Tiendanube** | `window.LS`, CDN `d26lpennugtm8s.cloudfront.net` / `acdn-us.mitiendanube.com`, `LS.store` | Carrinho: `/comprar/`, `/cart/`; frete: `/shipping/` / `calculate-shipping`; dados em `LS.product`, `LS.cart`. |
| **VTEX** | `vtexjs`, `vteximg`, `vtexassets`, `__RUNTIME__` (IO) | `/api/checkout/pub/orderForm`, `/api/checkout/pub/orderForms/simulation` (frete), `/api/catalog_system/pub/products/search`, GraphQL `/_v/segment/graphql/`. |
| **Tray** | `tray.com.br`, `traycdn` | `/loja/carrinho`, `/loja/calcula_frete`, `/web_api/`. |
| **Loja Integrada** | `lojaintegrada`, `cdn.awsli.com.br` | `/carrinho/`, `/carrinho/frete`. |
| **WooCommerce** | `wc_add_to_cart_params`, `woocommerce` nos scripts | `?wc-ajax=add_to_cart`, `?wc-ajax=update_order_review`, `/wp-json/wc/store/v1/cart`. |
| **Magento** | `text/x-magento-init`, `requirejs`, `mage/` | `/rest/V1/guest-carts/...`, `/customer/section/load/`. |
| **Headless (Next/Hydrogen)** | `__NEXT_DATA__`, `/_next/`, `hydrogen` | GraphQL Storefront API (`/api/<ver>/graphql.json`), rotas `/api/*`. |

## Recursos comuns e onde costumam estar

- **Frete por CEP:** endpoint de cotação da plataforma ou app (Frenet, Melhor Envio, Intelipost, Kangu). Procure por `cep`, `zipcode`, `postal`, `shipping`.
- **Minicart:** evento de submit do form `add-to-cart` → POST no carrinho → re-render (seção ou template JS). Procure `cart-drawer`, `minicart`, `cart:updated`.
- **Cupom:** muitas vezes só no checkout (`/discount/<code>` no Shopify; `orderForm/coupons` na VTEX).
- **Busca/autocomplete:** endpoint nativo ou app (Algolia, Searchanise, Boost, Klevu, SmartHint, Linx Impulse). Procure o domínio do app.
- **Variantes e preço:** JSON do produto embutido na página (`<script type="application/json">`, `LS.variants`, `skuJson`) + listener de `change`.
- **Popups / captura de e-mail:** Klaviyo, Privy, Justuno, Omnisend, Edrone, Mailchimp. Procure o domínio e o gatilho (tempo, scroll, exit-intent).
- **Upsell / compre junto:** apps como Frequently Bought Together, ReConvert, Zipify, Rebuy, Kit/Buy Together na Nuvemshop.
- **Pixels:** `fbq('track', ...)`, `gtag('event', ...)`, `dataLayer.push`, `ttq.track`. Correlacione o evento com a ação do usuário.
