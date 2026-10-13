# Montez Base — tema Shopify

Tema Online Store 2.0 da Montez, escrito do zero (Liquid, CSS com variáveis, JS sem dependências).
Estrutura e recursos inspirados na análise de lojas de alta conversão de alimentos/suplementos.

## Recursos
- **Home:** banner com slides (desktop/celular), atalhos de categoria, coleção em destaque (carrossel ou grade),
  faixa rolante, lançamento com troca de versão, imagem com texto, posts do blog e FAQ com marcação para o Google.
- **Produto:** galeria com miniaturas, destaques abaixo da foto, seletor de variantes, **produtos irmãos**
  (outros sabores/tamanhos ligados por metafield), cashback exibido, **Leve junto**, selos de confiança,
  abas recolhíveis (texto, página ou metafield), barra fixa de compra e dados estruturados de produto.
- **Carrinho:** gaveta lateral via AJAX (Section Rendering API), barra de frete grátis, página de carrinho.
- **Global:** cards com selo "Economize R$", parcelamento sem juros configurável, botão de WhatsApp,
  cabeçalho fixo com botão de destaque (clube/assinatura), menu mobile, rodapé com newsletter.

## Metafields usados (Configurações → Dados personalizados → Produtos)
| Metafield | Tipo | Uso |
|---|---|---|
| `custom.outros_sabores` | Lista de produtos | Bloco "Produtos irmãos" (com imagem) |
| `custom.outros_tamanhos` | Lista de produtos | Bloco "Produtos irmãos" (botões) |
| `custom.rotulo_variacao` | Texto de linha única | Nome curto mostrado no seletor de irmãos (ex.: "40g", "Chocolate") |
| `custom.leve_junto` | Lista de produtos | Bloco "Leve junto" |
| `custom.tabela_nutricional` | Rich text ou texto | Aba recolhível |
| `custom.ingredientes` | Rich text ou texto | Aba recolhível |

Inclua o próprio produto nas listas de irmãos para ele aparecer marcado.

## Desenvolvimento
```bash
shopify theme dev --path theme --store sua-loja
shopify theme check --path theme
shopify theme push --path theme --unpublished
```

## Próximas etapas
- Seção "Monte sua caixa" (kit com degraus de desconto e brindes).
- Filtros de coleção (Search & Discovery) e busca preditiva.
- Templates de conta de cliente clássica (lojas com contas novas não precisam).
