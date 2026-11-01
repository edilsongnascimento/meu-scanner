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
2. Ler código de barras pela câmera ou fotografar o rótulo; OCR local sugere nome e peso editáveis antes da busca.
3. Selecionar até três produtos e carregar os detalhes nutricionais para comparação por 100 g/100 ml.
4. Após comparar pelo menos dois produtos, entrar na conta e favoritar os itens desejados.
5. Persistir apenas os produtos favoritados, protegidos por políticas RLS por usuário.

## Regras
- Não armazenar pesquisas ou resultados que não forem favoritados.
- Não expor chaves secretas no frontend.
- Isolar favoritos por conta com políticas RLS.
- Tratar campos nutricionais ausentes como indisponíveis, sem estimar valores.
- Atribuir os dados ao Open Food Facts e informar que os dados podem estar incompletos.
- Não transmitir nem persistir as imagens capturadas para OCR.

## Pendências de implantação
- Executar `db/migrations/001_create_favorites.sql` no Supabase.
- Confirmar URL e chave pública do projeto e configurar autenticação por e-mail.
- Empacotar com Capacitor e preparar assinaturas/contas quando for iniciar a publicação na Play Store e App Store.
