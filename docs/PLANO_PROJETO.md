# MeuScaner

## Objetivo
Pesquisar produtos no Open Food Facts, comparar informações nutricionais e permitir que cada cliente mantenha uma lista privada de favoritos.

## Tecnologias
- HTML5, CSS3 e JavaScript
- PWA
- Open Food Facts Search-a-licious e API de produtos
- Supabase Auth e PostgreSQL com Row Level Security

## Fluxo atual
1. Pesquisar por nome ou código de barras diretamente na API.
2. Selecionar até três produtos e carregar os detalhes nutricionais para comparação por 100 g/100 ml.
3. Após comparar pelo menos dois produtos, entrar na conta e favoritar os itens desejados.
4. Persistir apenas os produtos favoritados, protegidos por políticas RLS por usuário.

## Regras
- Não armazenar pesquisas ou resultados que não forem favoritados.
- Não expor chaves secretas no frontend.
- Isolar favoritos por conta com políticas RLS.
- Tratar campos nutricionais ausentes como indisponíveis, sem estimar valores.
- Atribuir os dados ao Open Food Facts e informar que os dados podem estar incompletos.

## Pendências de implantação
- Executar `db/migrations/001_create_favorites.sql` no Supabase.
- Confirmar URL e chave pública do projeto e configurar autenticação por e-mail.
- Adicionar ícones válidos ao manifesto antes de publicar a instalação da PWA.
