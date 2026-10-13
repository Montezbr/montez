---
name: rea
description: REA (Reverse Engineering de lojas) — analisa uma loja online pela URL e explica, com evidências, como funciona um recurso específico (frete por CEP, minicart, cupom, busca/filtros, seletor de variantes, popups, upsell/compre junto, pixels e rastreamento). Use quando o usuário pedir "use o REA", "analise a loja X", "como funciona o recurso Y nesta loja", "engenharia reversa de loja", ou quiser saber qual app/endpoint/script está por trás de um recurso de e-commerce.
---

# REA — Engenharia reversa de recursos de lojas online

Objetivo: dado **uma URL de loja** e **um recurso**, descobrir *como* ele funciona
(plataforma, app/script responsável, endpoints, dados trafegados, sequência de
eventos) e explicar isso **sempre com evidências verificáveis**.

## 0. Entradas

Precisa de duas coisas. Se faltar alguma (ou vier como placeholder tipo
`[loja-que-você-quer]` / `[recurso X]`), pergunte antes de começar:

1. URL da loja (de preferência a página onde o recurso aparece: produto, coleção, carrinho).
2. Recurso a analisar. Exemplos: cálculo de frete por CEP, minicart/carrinho lateral,
   cupom, busca/autocomplete, filtros de coleção, seletor de variantes e preço,
   popup de e-mail, upsell / compre junto, pixels (Meta, GA4, TikTok, Pinterest).

Responda no idioma do usuário (padrão: português).

## 1. Escolher a ferramenta disponível

Use a melhor que existir no ambiente, nesta ordem:

1. **Navegador controlável** (Playwright MCP, browser-use, Claude in Chrome,
   computer use): permite interagir e capturar rede/eventos. É o modo completo.
2. **Só fetch/web** (WebFetch, curl): análise estática — HTML, scripts
   referenciados, JSON públicos da plataforma. Avise o usuário que sem navegador
   não dá para observar requisições disparadas por interação; ainda assim
   tente reproduzir os endpoints diretamente.

Nunca invente evidência. Se algo não foi observado, diga "não observado" e
explique o que faltou.

## 2. Reconhecimento (sempre)

1. Abra a URL. Tire um screenshot do estado inicial.
2. Rode o script de reconhecimento de `references/snippets.md` (seção
   *Reconhecimento*) via avaliação de JS na página. Ele retorna plataforma
   provável, apps/scripts de terceiros, globais relevantes e pixels.
3. Identifique a plataforma pelos sinais (tabela em `references/plataformas.md`).
   Isso define onde procurar: endpoints nativos, apps comuns, padrões de tema.

## 3. Capturar o cenário do recurso

1. **Antes** de interagir, instale o interceptador de rede/eventos
   (`references/snippets.md`, seção *Interceptador*). Ele registra `fetch`,
   `XMLHttpRequest`, `sendBeacon`, pushes em `dataLayer`/`fbq`/`ttq`/`gtag`
   e eventos customizados em `document`.
   - Se a ferramenta tiver captura nativa de rede (ex.: `browser_network_requests`
     do Playwright), use também e compare.
2. Execute a interação que aciona o recurso, como um usuário faria
   (digitar CEP e calcular, adicionar ao carrinho, aplicar cupom, trocar variante,
   rolar até o popup aparecer, etc.). Uma ação por vez.
3. Depois de cada ação: leia o log do interceptador, tire screenshot, e
   anote o que mudou no DOM (elemento que apareceu/atualizou).
4. Para cada requisição relevante registre: método, URL/endpoint, payload
   (resuma; mascare dados pessoais), status, trecho da resposta que alimenta a UI.

## 4. Rastrear o código responsável

1. A partir da requisição ou do elemento da UI, encontre o script que a dispara:
   - Busque no código dos scripts carregados pela string do endpoint, nome do
     evento, classe/ID do elemento ou texto do botão (snippet *Buscar nos scripts*).
   - Pelo `stack` gravado pelo interceptador (ele salva a pilha de chamada de
     cada requisição), identifique arquivo e linha/coluna do bundle.
2. Leia o trecho em volta (±30 linhas, ou o equivalente em código minificado)
   e explique a lógica: gatilho → coleta de dados → requisição → tratamento da
   resposta → atualização da UI.
3. Identifique se é **nativo da plataforma**, **do tema** ou **de um app/terceiro**
   (pelo domínio do script, nome do arquivo, globais, comentários de licença).

## 5. Reproduzir (quando seguro)

Se o endpoint for público e de leitura (ex.: cotação de frete, busca,
`/products/handle.js`), reproduza a chamada isoladamente (curl/fetch) para
confirmar parâmetros obrigatórios e formato da resposta. **Não** finalize
compras, não crie contas, não envie formulários com dados reais, não faça
requisições em volume.

## 6. Entregar a explicação

Estrutura da resposta:

```
## Resumo
O que é o recurso, quem fornece (plataforma/tema/app) e como funciona em 3–5 linhas.

## Fluxo passo a passo
1. Gatilho (o que o usuário faz / qual evento)
2. Código que reage (arquivo, função)
3. Requisição(ões)
4. Resposta e como vira UI
(diagrama simples em texto, se ajudar)

## Evidências
- E1 — Requisição: `POST https://.../cart/add.js` · payload `{id, quantity}` · 200 · trecho da resposta
- E2 — Código: `https://cdn.../theme.js` linha L:C — trecho
- E3 — Screenshot antes/depois
- E4 — Globais/pixels detectados
(cada afirmação do fluxo deve citar uma evidência E#)

## Como replicar na sua loja
Opções concretas por plataforma (nativo, app equivalente, ou implementação própria),
com o que precisaria ser feito.

## Limitações
O que não foi possível observar e por quê.
```

Regras:
- Toda afirmação técnica cita uma evidência (E#). Hipótese sem evidência é
  marcada como **hipótese**.
- Mascare dados pessoais e tokens (CEP de teste ok; e-mails, telefones, tokens de sessão não).
- Se o usuário pedir, salve o relatório como arquivo (Markdown/HTML) além de responder.
