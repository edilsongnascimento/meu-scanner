# MeuScaner

Aplicativo web para pesquisar produtos no Open Food Facts, comparar informações nutricionais e salvar favoritos privados por conta.

## Como funciona

- A busca por texto usa a API Search-a-licious do Open Food Facts; resultados e termos pesquisados não são gravados no banco.
- Os detalhes completos, incluindo nutrição, são solicitados à API de produto do Open Food Facts quando um item entra na comparação.
- É possível pesquisar pelo nome ou pelo código de barras e carregar mais resultados.
- A comparação aceita até três produtos e mostra informações nutricionais por 100 g/100 ml. O botão de favoritar só aparece depois de selecionar pelo menos dois produtos.
- Favoritos são salvos em `public.favoritos_openfoodfacts` com uma cópia dos dados do produto. Cada cliente só pode consultar e remover os próprios favoritos.
- A API do Open Food Facts não fornece preços globais confiáveis. Dados nutricionais podem estar ausentes ou ter sido informados pela comunidade.

## Configuração do Supabase

1. No SQL Editor do seu projeto Supabase, execute [`db/migrations/001_create_favorites.sql`](./db/migrations/001_create_favorites.sql).
2. Confira a URL do projeto e a chave pública `publishable`/`anon` em [`js/supabase.js`](./js/supabase.js). Nunca use a chave `service_role` no navegador.
3. Configure a autenticação por e-mail no Supabase e os endereços de redirecionamento para o endereço local do app e para o domínio publicado.
4. Abra `index.html` por um servidor local (por exemplo, XAMPP) ou publique em HTTPS. O acesso à câmera não é necessário para pesquisar por código de barras.

Se a autenticação ou o carregamento de favoritos retornar HTTP 401, confira se a URL e a chave pública pertencem ao mesmo projeto Supabase. A pesquisa no Open Food Facts continua independente do banco.

## Dados e segurança

A política RLS da migração limita leitura, inclusão e remoção de favoritos ao usuário autenticado proprietário da linha. Não há política para usuários anônimos nem permissão de atualização. As buscas e comparações não consultam nem gravam na tabela de produtos; somente favoritos são persistidos.

O código de barras e os dados básicos do produto são copiados para o registro de favorito para que ele continue visível mesmo que o produto mude ou deixe de estar disponível na API. Os dados da API são atribuídos ao [Open Food Facts](https://world.openfoodfacts.org/).
