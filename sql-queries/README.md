# SQL Queries

Esta pasta contém queries SQL utilitárias para debugging, manutenção e análise do banco de dados Supabase.

## Arquivos

### Debug e Análise
- `check_auth_status.sql` - Verifica status de autenticação e sessões
- `check_profiles_policies.sql` - Analisa políticas RLS da tabela profiles
- `debug_is_analyst_function.sql` - Debug da função is_analyst()
- `debug_profiles_rls.sql` - Debug das políticas RLS de profiles

### Correções e Manutenção
- `fix_profiles_policy.sql` - Correção de políticas da tabela profiles
- `migration_to_run.sql` - Script de migração para execução manual

## Como usar

Estas queries podem ser executadas diretamente no SQL Editor do Supabase Dashboard ou através da CLI do Supabase:

```bash
supabase db reset --db-url <your-db-url>
```

## Observações

- Sempre faça backup antes de executar queries de modificação
- Algumas queries são apenas para debug e análise (não modificam dados)
- Queries de correção devem ser executadas com cuidado em produção