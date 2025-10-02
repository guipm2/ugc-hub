-- Função para deletar completamente um usuário
-- Esta função deve ser executada com privilégios de service role

CREATE OR REPLACE FUNCTION delete_user_completely(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_to_delete) THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;

  -- Deletar dados relacionados primeiro (CASCADE já deve cuidar disso via FK)
  DELETE FROM opportunity_applications WHERE creator_id = user_id_to_delete;
  DELETE FROM opportunity_stages WHERE creator_id = user_id_to_delete;
  DELETE FROM messages WHERE sender_id = user_id_to_delete;
  DELETE FROM conversations WHERE creator_id = user_id_to_delete OR analyst_id = user_id_to_delete;
  DELETE FROM notifications WHERE user_id = user_id_to_delete;
  DELETE FROM opportunities WHERE analyst_id = user_id_to_delete OR created_by = user_id_to_delete;
  DELETE FROM analysts WHERE id = user_id_to_delete;
  
  -- Deletar perfil (isso vai cascatear para outras tabelas)
  DELETE FROM profiles WHERE id = user_id_to_delete;
  
  -- Deletar usuário do sistema de autenticação
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro e retorna false
    RAISE NOTICE 'Erro ao deletar usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Dar permissão para usuários autenticados chamarem esta função
-- mas apenas para deletar sua própria conta
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obter ID do usuário atual
  current_user_id := auth.uid();
  
  -- Verificar se usuário está autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Chamar função de deletar com o ID do usuário atual
  RETURN delete_user_completely(current_user_id);
END;
$$;

-- Conceder acesso à função para usuários autenticados
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;