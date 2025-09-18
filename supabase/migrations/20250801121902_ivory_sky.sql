/*
  # Adicionar etapas de Mapeamento e Contrato

  1. Alterações
    - Atualizar constraint para incluir novas etapas: 'mapeamento' e 'contrato'
    - Manter todas as etapas existentes
    - Adicionar as novas etapas no início do fluxo

  2. Ordem das Etapas
    1. mapeamento
    2. contrato
    3. aguardando_envio
    4. produtos_enviados
    5. material_roteirizacao
    6. aguardando_gravacao
    7. pronto_edicao
    8. material_edicao
    9. revisao_final
    10. finalizado
*/

-- Remover constraint existente
ALTER TABLE opportunity_stages DROP CONSTRAINT IF EXISTS valid_stage_check;

-- Adicionar nova constraint com todas as etapas incluindo as novas
ALTER TABLE opportunity_stages ADD CONSTRAINT valid_stage_check 
CHECK (stage = ANY (ARRAY[
  'mapeamento'::text,
  'contrato'::text,
  'aguardando_envio'::text,
  'produtos_enviados'::text,
  'material_roteirizacao'::text,
  'aguardando_gravacao'::text,
  'pronto_edicao'::text,
  'material_edicao'::text,
  'revisao_final'::text,
  'finalizado'::text
]));

-- Atualizar etapas existentes que estão em 'aguardando_envio' para 'mapeamento'
UPDATE opportunity_stages 
SET stage = 'mapeamento' 
WHERE stage = 'aguardando_envio';