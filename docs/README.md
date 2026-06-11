# Índice da Documentação

**Ponto de entrada único.** Comece aqui para qualquer tarefa de correção, ajuste ou melhoria.

## Leitura rápida por objetivo

| Tarefa | Documento |
|---|---|
| Mapear arquivos / encontrar feature | [00-arquitetura.md](00-arquitetura.md) |
| Login não funciona, sessão persiste, logout | [01-fluxo-autenticacao.md](01-fluxo-autenticacao.md) |
| Ajustar tela de login (CPF/senha, validações, modais) | [02-tela-login.md](02-tela-login.md) |
| Sincronização inicial / primeira preparação | [03-preparacao-offline.md](03-preparacao-offline.md) |
| Lista de registros (busca, filtro, paginação) | [04-tela-registros.md](04-tela-registros.md) |
| Campos do formulário / validação / rascunho | [05-formulario-dinamico.md](05-formulario-dinamico.md) |
| Visão geral / reset de dados | [06-tela-visao-geral.md](06-tela-visao-geral.md) |
| Tabelas, migrações, FTS | [07-banco-dados.md](07-banco-dados.md) |
| Endpoints, axios, bearer token | [08-api-http.md](08-api-http.md) |
| Header, drawer, navegação interna | [09-layout-autenticado.md](09-layout-autenticado.md) |
| `.env`, build EAS, scripts | [10-build-config.md](10-build-config.md) |

## Convenção dos documentos

- Cada doc lista **componentes por arquivo** com responsabilidade em uma linha.
- Comportamentos críticos são referenciados por `arquivo:linha` para busca direta.
- "Buscas comuns" no fim de cada doc lista cenários de manutenção e o caminho para resolver.
- Tipos de domínio são citados por arquivo, sem repetir a forma completa (ir ao código-fonte).

## Antes de mexer

1. Ler `AGENTS.md` (Expo v56).
2. Identificar o documento da feature.
3. Buscar a linha do comportamento que vai alterar.
4. Se for migração de DB: ler [07-banco-dados.md](07-banco-dados.md) §"Como adicionar migração".
5. Se for endpoint novo: ler [08-api-http.md](08-api-http.md) §"Contrato comum".
