

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "public"."user_role" AS ENUM (
    'creator',
    'analyst'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_data"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Delete old activity feed items (older than 90 days)
  DELETE FROM activity_feed
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND read = true;
  
  -- Delete old read notifications (older than 30 days)
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND read = true;
  
  -- Delete old file access logs (older than 1 year)
  DELETE FROM file_access_log
  WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Clean up expired files
  DELETE FROM shared_files
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
    
  -- Update offline users (inactive for more than 15 minutes)
  UPDATE user_presence
  SET status = 'offline'
  WHERE status != 'offline'
    AND last_seen < NOW() - INTERVAL '15 minutes';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_data"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_data"() IS 'Função para limpeza de dados antigos do sistema de colaboração. Deve ser executada periodicamente.';



CREATE OR REPLACE FUNCTION "public"."create_activity_feed_entry"("p_user_id" "uuid", "p_actor_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_priority" integer DEFAULT 3) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activity_feed (
    user_id,
    actor_id,
    activity_type,
    title,
    description,
    entity_type,
    entity_id,
    metadata,
    priority
  ) VALUES (
    p_user_id,
    p_actor_id,
    p_activity_type,
    p_title,
    p_description,
    p_entity_type,
    p_entity_id,
    p_metadata,
    p_priority
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;


ALTER FUNCTION "public"."create_activity_feed_entry"("p_user_id" "uuid", "p_actor_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_priority" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_analyst_profile"("user_id" "uuid", "user_email" "text", "user_name" "text", "user_company" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Tentar criar perfil de analista
  INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    'analyst'::user_role,
    user_name,
    user_company,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    updated_at = NOW();

  -- Tentar criar registro na tabela analysts
  INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
  VALUES (
    user_id,
    user_email,
    user_name,
    user_company,
    'analyst'::user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    company = EXCLUDED.company,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error in create_analyst_profile: %', SQLERRM;
  RETURN false;
END;
$$;


ALTER FUNCTION "public"."create_analyst_profile"("user_id" "uuid", "user_email" "text", "user_name" "text", "user_company" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_conversation_on_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  conversation_id uuid;
  opportunity_record RECORD;
BEGIN
  -- Só executa se o status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Busca informações da oportunidade
    SELECT o.*, a.name as analyst_name, a.company as analyst_company
    INTO opportunity_record
    FROM opportunities o
    JOIN analysts a ON o.created_by = a.id
    WHERE o.id = NEW.opportunity_id;
    
    -- Verifica se já existe conversa para esta oportunidade e criador
    SELECT id INTO conversation_id
    FROM conversations
    WHERE opportunity_id = NEW.opportunity_id 
    AND creator_id = NEW.creator_id;
    
    -- Se não existe, cria nova conversa
    IF conversation_id IS NULL THEN
      INSERT INTO conversations (
        opportunity_id,
        analyst_id,
        creator_id,
        last_message_at
      ) VALUES (
        NEW.opportunity_id,
        opportunity_record.created_by,
        NEW.creator_id,
        NOW()
      ) RETURNING id INTO conversation_id;
      
      -- Envia mensagem inicial automática do analista
      INSERT INTO messages (
        conversation_id,
        sender_id,
        sender_type,
        content
      ) VALUES (
        conversation_id,
        opportunity_record.created_by,
        'analyst',
        'Olá! Sua candidatura para "' || opportunity_record.title || '" foi aprovada! Vamos conversar sobre os próximos passos da campanha.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_conversation_on_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_deliverables_on_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  opp_record opportunities%ROWTYPE;
BEGIN
  -- Só criar deliverables se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Buscar informações da oportunidade
    SELECT * INTO opp_record 
    FROM opportunities 
    WHERE id = NEW.opportunity_id;
    
    -- Criar deliverable padrão: Briefing e Conceito (3 dias após aprovação)
    INSERT INTO project_deliverables (
      application_id,
      opportunity_id,
      creator_id,
      analyst_id,
      title,
      description,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Briefing e Conceito',
      'Apresentar o conceito criativo e briefing do conteúdo',
      CURRENT_DATE + INTERVAL '3 days',
      1
    );
    
    -- Criar deliverable condicional para vídeo/reel: Roteiro (5 dias após aprovação)
    IF opp_record.content_type ILIKE '%video%' OR opp_record.content_type ILIKE '%reel%' THEN
      INSERT INTO project_deliverables (
        application_id,
        opportunity_id,
        creator_id,
        analyst_id,
        title,
        description,
        due_date,
        priority
      ) VALUES (
        NEW.id,
        NEW.opportunity_id,
        NEW.creator_id,
        opp_record.created_by,
        'Roteiro e Storyboard',
        'Roteiro detalhado e storyboard do vídeo',
        CURRENT_DATE + INTERVAL '5 days',
        2
      );
    END IF;
    
    -- Criar deliverable final: Conteúdo Final (usar deadline da oportunidade)
    INSERT INTO project_deliverables (
      application_id,
      opportunity_id,
      creator_id,
      analyst_id,
      title,
      description,
      due_date,
      priority
    ) VALUES (
      NEW.id,
      NEW.opportunity_id,
      NEW.creator_id,
      opp_record.created_by,
      'Conteúdo Final',
      'Entrega do ' || opp_record.content_type || ' finalizado',
      opp_record.deadline,
      3
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_deliverables_on_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_deliverable_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  application_record RECORD;
  deliverable_title TEXT;
  activity_title TEXT;
  activity_desc TEXT;
  recipient_id UUID;
  actor_id UUID;
  actor_name TEXT;
BEGIN
  -- Get deliverable and application info
  SELECT 
    oa.*,
    o.title as opportunity_title,
    o.created_by as analyst_id
  INTO application_record
  FROM opportunity_applications oa
  JOIN opportunities o ON oa.opportunity_id = o.id
  WHERE oa.id = COALESCE(NEW.application_id, OLD.application_id);
  
  deliverable_title := COALESCE(NEW.title, OLD.title);
  
  -- Handle different trigger events
  IF TG_OP = 'INSERT' THEN
    activity_title := 'Novo deliverable: ' || deliverable_title;
    activity_desc := 'Um novo deliverable foi criado para o projeto';
    recipient_id := application_record.creator_id;
    actor_id := NEW.analyst_id;
    SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
    
    PERFORM create_activity_feed_entry(
      recipient_id,
      actor_id,
      'deliverable_created',
      activity_title,
      activity_desc,
      'deliverable',
      NEW.id,
      jsonb_build_object(
        'opportunity_title', application_record.opportunity_title,
        'deliverable_title', deliverable_title,
        'due_date', NEW.due_date,
        'priority', NEW.priority
      ),
      2
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'submitted' THEN
          activity_title := 'Deliverable enviado: ' || deliverable_title;
          activity_desc := 'O creator enviou o deliverable para revisão';
          recipient_id := application_record.analyst_id;
          actor_id := application_record.creator_id;
          SELECT name INTO actor_name FROM profiles WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_submitted',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title
            ),
            2
          );
          
        WHEN 'approved' THEN
          activity_title := 'Deliverable aprovado: ' || deliverable_title;
          activity_desc := 'Seu deliverable foi aprovado!';
          recipient_id := application_record.creator_id;
          actor_id := application_record.analyst_id;
          SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_approved',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title
            ),
            1
          );
          
        WHEN 'rejected' THEN
          activity_title := 'Deliverable precisa de revisão: ' || deliverable_title;
          activity_desc := 'O deliverable foi rejeitado e precisa de ajustes';
          recipient_id := application_record.creator_id;
          actor_id := application_record.analyst_id;
          SELECT name INTO actor_name FROM analysts WHERE id = actor_id;
          
          PERFORM create_activity_feed_entry(
            recipient_id,
            actor_id,
            'deliverable_rejected',
            activity_title,
            activity_desc,
            'deliverable',
            NEW.id,
            jsonb_build_object(
              'opportunity_title', application_record.opportunity_title,
              'deliverable_title', deliverable_title,
              'feedback', NEW.feedback
            ),
            1
          );
      END CASE;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."create_deliverable_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_deliverable_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  creator_name text;
  opportunity_record RECORD;
  analyst_name text;
BEGIN
  -- Get creator name
  SELECT name INTO creator_name
  FROM profiles
  WHERE id = NEW.creator_id;
  
  -- Get opportunity details and analyst info
  SELECT o.title as opportunity_title, o.company, a.name as analyst_name
  INTO opportunity_record
  FROM opportunities o
  JOIN analysts a ON o.created_by = a.id
  WHERE o.id = NEW.opportunity_id;
  
  -- Create notification for the creator
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.creator_id,
    'new_deliverable',
    'Nova entrega definida: ' || NEW.title,
    'Uma nova entrega foi definida para o projeto "' || COALESCE(opportunity_record.opportunity_title, 'Projeto') || '". Prazo: ' || TO_CHAR(NEW.due_date, 'DD/MM/YYYY'),
    jsonb_build_object(
      'deliverable_id', NEW.id,
      'deliverable_title', NEW.title,
      'due_date', NEW.due_date,
      'priority', NEW.priority,
      'opportunity_id', NEW.opportunity_id,
      'opportunity_title', opportunity_record.opportunity_title,
      'company', opportunity_record.company,
      'analyst_id', NEW.analyst_id
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_deliverable_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_message_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  conversation_record RECORD;
  recipient_id UUID;
  actor_name TEXT;
BEGIN
  -- Get conversation details
  SELECT c.*, o.title as opportunity_title
  INTO conversation_record
  FROM conversations c
  LEFT JOIN opportunities o ON c.opportunity_id = o.id
  WHERE c.id = NEW.conversation_id;
  
  -- Determine recipient
  IF NEW.sender_type = 'analyst' THEN
    recipient_id := conversation_record.creator_id;
    SELECT name INTO actor_name FROM analysts WHERE id = NEW.sender_id;
  ELSE
    recipient_id := conversation_record.analyst_id;
    SELECT name INTO actor_name FROM profiles WHERE id = NEW.sender_id;
  END IF;
  
  -- Create activity feed entry
  PERFORM create_activity_feed_entry(
    recipient_id,
    NEW.sender_id,
    'message_sent',
    'Nova mensagem de ' || COALESCE(actor_name, 'Usuário'),
    LEFT(NEW.content, 100),
    'conversation',
    NEW.conversation_id,
    jsonb_build_object(
      'message_id', NEW.id,
      'opportunity_title', conversation_record.opportunity_title,
      'sender_type', NEW.sender_type,
      'message_type', NEW.message_type
    ),
    CASE 
      WHEN NEW.message_type = 'system' THEN 4
      ELSE 3
    END
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_message_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_message_notification"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  recipient_id uuid;
  conversation_record RECORD;
  opportunity_record RECORD;
  sender_name text;
BEGIN
  -- Get conversation details
  SELECT c.*, o.title as opportunity_title
  INTO conversation_record
  FROM conversations c
  JOIN opportunities o ON c.opportunity_id = o.id
  WHERE c.id = NEW.conversation_id;
  
  -- Determine recipient (the person who should receive the notification)
  IF NEW.sender_type = 'analyst' THEN
    recipient_id := conversation_record.creator_id;
    
    -- Get analyst name
    SELECT name INTO sender_name
    FROM analysts
    WHERE id = NEW.sender_id;
  ELSE
    recipient_id := conversation_record.analyst_id;
    
    -- Get creator name  
    SELECT name INTO sender_name
    FROM profiles
    WHERE id = NEW.sender_id;
  END IF;
  
  -- Only create notification if recipient is different from sender
  IF recipient_id != NEW.sender_id THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      recipient_id,
      'new_message',
      'Nova mensagem de ' || COALESCE(sender_name, 'Usuário'),
      LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'opportunity_id', conversation_record.opportunity_id,
        'opportunity_title', conversation_record.opportunity_title,
        'sender_type', NEW.sender_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_message_notification"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_smart_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb" DEFAULT '{}'::"jsonb", "p_priority" integer DEFAULT 3, "p_category" "text" DEFAULT 'general'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  notification_id UUID;
  user_preferences RECORD;
  should_create BOOLEAN := true;
BEGIN
  -- Get user preferences
  SELECT * INTO user_preferences
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- Check if user wants this type of notification
  IF user_preferences.in_app_notifications IS NOT NULL THEN
    should_create := COALESCE(
      (user_preferences.in_app_notifications ->> 'all')::boolean,
      true
    );
  END IF;
  
  -- Create notification if allowed
  IF should_create THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      priority,
      category,
      action_url
    ) VALUES (
      p_user_id,
      p_type,
      p_title,
      p_message,
      p_data,
      p_priority,
      p_category,
      p_data ->> 'action_url'
    ) RETURNING id INTO notification_id;
  END IF;
  
  RETURN notification_id;
END;
$$;


ALTER FUNCTION "public"."create_smart_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_priority" integer, "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_stage_on_approval"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Verificar se o status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Verificar se já existe uma etapa para esta oportunidade
    IF NOT EXISTS (
      SELECT 1 FROM opportunity_stages 
      WHERE opportunity_id = NEW.opportunity_id
    ) THEN
      -- Criar nova etapa
      INSERT INTO opportunity_stages (
        opportunity_id,
        stage,
        created_at,
        updated_at
      ) VALUES (
        NEW.opportunity_id,
        'aguardando_envio',
        now(),
        now()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_stage_on_approval"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_metadata"() RETURNS TABLE("user_id" "uuid", "email" "text", "metadata" "jsonb", "email_confirmed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.email_confirmed_at IS NOT NULL as email_confirmed
  FROM auth.users au
  ORDER BY au.created_at DESC
  LIMIT 10;
END;
$$;


ALTER FUNCTION "public"."debug_user_metadata"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_my_account"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_my_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_existing_analyst_users"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_record RECORD;
  result_text text := '';
BEGIN
  -- Procurar usuários que têm role=analyst no metadata mas são creators
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data, p.role
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE au.raw_user_meta_data->>'role' = 'analyst'
    AND (p.role != 'analyst' OR p.role IS NULL)
  LOOP
    PERFORM set_config('row_security', 'off', true);
    
    -- Atualizar ou criar perfil como analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      'analyst'::user_role,
      COALESCE(user_record.raw_user_meta_data->>'name', ''),
      COALESCE(user_record.raw_user_meta_data->>'company', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'analyst'::user_role,
      name = COALESCE(user_record.raw_user_meta_data->>'name', profiles.name),
      company = COALESCE(user_record.raw_user_meta_data->>'company', profiles.company),
      updated_at = NOW();
    
    -- Criar registro na tabela analysts
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      user_record.id,
      user_record.email,
      COALESCE(user_record.raw_user_meta_data->>'name', ''),
      COALESCE(user_record.raw_user_meta_data->>'company', ''),
      'analyst'::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      role = 'analyst'::user_role,
      updated_at = NOW();
    
    PERFORM set_config('row_security', 'on', true);
    
    result_text := result_text || 'Fixed user: ' || user_record.email || '; ';
  END LOOP;
  
  IF result_text = '' THEN
    result_text := 'No users needed fixing.';
  END IF;
  
  RETURN result_text;
END;
$$;


ALTER FUNCTION "public"."fix_existing_analyst_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Buscar conversa existente
  SELECT id INTO conversation_id
  FROM conversations
  WHERE analyst_id = p_analyst_id AND creator_id = p_creator_id;
  
  -- Se não existe, criar nova conversa única
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (
      analyst_id,
      creator_id,
      opportunity_id,
      last_message_at
    ) VALUES (
      p_analyst_id,
      p_creator_id,
      NULL, -- Conversa geral, não vinculada a projeto específico
      NOW()
    ) RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") IS 'Busca ou cria uma conversa única entre analista e criador. Usado pelo frontend para garantir conversas únicas.';



CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."user_role"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role_result user_role;
BEGIN
  -- Primeiro verifica se é um analista
  SELECT role INTO user_role_result
  FROM analysts
  WHERE id = auth.uid();
  
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- Se não for analista, verifica se é um criador
  SELECT role INTO user_role_result
  FROM profiles
  WHERE id = auth.uid();
  
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- Default para creator se não encontrar
  RETURN 'creator'::user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_analyst boolean := false;
  user_name text;
  user_company text;
BEGIN
  -- Debug: log completo
  RAISE LOG 'handle_new_user called for user: % with full metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar múltiplas formas de identificar um analista
  -- 1. Via role no metadata
  IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
    is_analyst := true;
    RAISE LOG 'Analyst identified via role metadata for: %', NEW.email;
  END IF;
  
  -- 2. Via URL de confirmação (se contém /analysts/)
  IF NEW.confirmation_token IS NOT NULL AND NEW.email_confirm_url LIKE '%/analysts/%' THEN
    is_analyst := true;
    RAISE LOG 'Analyst identified via confirmation URL for: %', NEW.email;
  END IF;
  
  -- 3. Via domínio específico ou padrão de email (backup)
  -- Você pode adicionar regras específicas aqui se necessário
  
  -- Extrair nome e empresa do metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  user_company := COALESCE(NEW.raw_user_meta_data->>'company', '');
  
  IF is_analyst THEN
    RAISE LOG 'Creating analyst profile for: % (name: %, company: %)', NEW.email, user_name, user_company;
    
    -- Desabilitar RLS temporariamente
    PERFORM set_config('row_security', 'off', true);
    
    -- Criar perfil de analista
    INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'analyst'::user_role,
      user_name,
      user_company,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = 'analyst'::user_role,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      updated_at = NOW();
    
    -- Criar registro na tabela analysts
    INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_name,
      user_company,
      'analyst'::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      role = 'analyst'::user_role,
      updated_at = NOW();
      
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
      
    RAISE LOG 'Analyst profile created successfully for: %', NEW.email;
      
  ELSE
    RAISE LOG 'Creating creator profile for: %', NEW.email;
    
    -- Desabilitar RLS temporariamente
    PERFORM set_config('row_security', 'off', true);
    
    -- Criar perfil de criador (comportamento padrão)
    INSERT INTO public.profiles (id, email, role, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      'creator'::user_role,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      role = 'creator'::user_role,
      updated_at = NOW();
      
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
      
    RAISE LOG 'Creator profile created successfully for: %', NEW.email;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Restaurar RLS em caso de erro
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Trigger function robusta que cria perfis e registros de analistas automaticamente. Inclui logs para debug e não falha o signup em caso de erro.';



CREATE OR REPLACE FUNCTION "public"."handle_user_confirmation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  is_analyst boolean := false;
  user_name text;
  user_company text;
BEGIN
  RAISE LOG 'handle_user_confirmation called for user: % with metadata: %', NEW.email, NEW.raw_user_meta_data;
  
  -- Verificar se já existe perfil criado
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RAISE LOG 'No profile found, creating one for: %', NEW.email;
    
    -- Verificar se é analista via metadata
    IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
      is_analyst := true;
    END IF;
    
    -- Extrair dados do metadata
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
    user_company := COALESCE(NEW.raw_user_meta_data->>'company', '');
    
    -- Desabilitar RLS
    PERFORM set_config('row_security', 'off', true);
    
    IF is_analyst THEN
      RAISE LOG 'Creating analyst profile on confirmation for: %', NEW.email;
      
      -- Criar perfil de analista
      INSERT INTO public.profiles (id, email, role, name, company, created_at, updated_at)
      VALUES (NEW.id, NEW.email, 'analyst'::user_role, user_name, user_company, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'analyst'::user_role,
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        updated_at = NOW();
      
      -- Criar registro na tabela analysts
      INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
      VALUES (NEW.id, NEW.email, user_name, user_company, 'analyst'::user_role, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        role = 'analyst'::user_role,
        updated_at = NOW();
    ELSE
      RAISE LOG 'Creating creator profile on confirmation for: %', NEW.email;
      
      -- Criar perfil de criador
      INSERT INTO public.profiles (id, email, role, created_at, updated_at)
      VALUES (NEW.id, NEW.email, 'creator'::user_role, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = 'creator'::user_role,
        updated_at = NOW();
    END IF;
    
    -- Restaurar RLS
    PERFORM set_config('row_security', 'on', true);
    
  ELSE
    RAISE LOG 'Profile already exists for: %', NEW.email;
    
    -- Se o perfil existe mas é criador e deveria ser analista, corrigir
    IF NEW.raw_user_meta_data->>'role' = 'analyst' THEN
      PERFORM set_config('row_security', 'off', true);
      
      UPDATE public.profiles 
      SET role = 'analyst'::user_role, 
          name = COALESCE(NEW.raw_user_meta_data->>'name', name),
          company = COALESCE(NEW.raw_user_meta_data->>'company', company),
          updated_at = NOW()
      WHERE id = NEW.id;
      
      INSERT INTO public.analysts (id, email, name, company, role, created_at, updated_at)
      VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'company', ''),
        'analyst'::user_role, 
        NOW(), 
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        company = EXCLUDED.company,
        role = 'analyst'::user_role,
        updated_at = NOW();
      
      PERFORM set_config('row_security', 'on', true);
      
      RAISE LOG 'Corrected profile from creator to analyst for: %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('row_security', 'on', true);
  RAISE LOG 'Error in handle_user_confirmation for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_confirmation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_analyst"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN get_user_role() = 'analyst';
END;
$$;


ALTER FUNCTION "public"."is_analyst"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_creator"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN get_user_role() = 'creator';
END;
$$;


ALTER FUNCTION "public"."is_creator"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE notifications
  SET read = true
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_analyst_new_application"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  opportunity_record RECORD;
  creator_record RECORD;
BEGIN
  -- Buscar dados da oportunidade
  SELECT * INTO opportunity_record
  FROM opportunities
  WHERE id = NEW.opportunity_id;
  
  -- Buscar dados do criador
  SELECT * INTO creator_record
  FROM profiles
  WHERE id = NEW.creator_id;
  
  -- Inserir notificação para o analista que criou a oportunidade
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    opportunity_record.created_by,
    'new_application',
    'Nova Candidatura Recebida!',
    'O criador ' || COALESCE(creator_record.name, creator_record.email) || ' se candidatou para: ' || opportunity_record.title,
    jsonb_build_object(
      'opportunity_id', NEW.opportunity_id,
      'opportunity_title', opportunity_record.title,
      'application_id', NEW.id,
      'creator_id', NEW.creator_id,
      'creator_name', COALESCE(creator_record.name, creator_record.email)
    )
  );
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_analyst_new_application"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_application_approved"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  opportunity_record RECORD;
  creator_record RECORD;
BEGIN
  -- Só notificar se status mudou para 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    
    -- Buscar dados da oportunidade
    SELECT o.*, a.name as analyst_name, a.company as analyst_company
    INTO opportunity_record
    FROM opportunities o
    JOIN analysts a ON o.created_by = a.id
    WHERE o.id = NEW.opportunity_id;
    
    -- Buscar dados do criador
    SELECT * INTO creator_record
    FROM profiles
    WHERE id = NEW.creator_id;
    
    -- Criar notificação para o criador sobre aprovação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.creator_id,
      'application_approved',
      'Candidatura Aprovada!',
      'Sua candidatura para "' || opportunity_record.title || '" foi aprovada pela empresa ' || opportunity_record.company || '.',
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'company', opportunity_record.company,
        'application_id', NEW.id
      )
    );
    
    -- Criar notificação para o analista sobre nova aprovação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      opportunity_record.created_by,
      'application_approved',
      'Candidatura Aprovada',
      'Você aprovou ' || creator_record.name || ' para a oportunidade "' || opportunity_record.title || '".',
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'creator_id', NEW.creator_id,
        'creator_name', creator_record.name,
        'application_id', NEW.id
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_application_approved"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_creator_application_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  opportunity_record RECORD;
  status_message TEXT;
  notification_title TEXT;
BEGIN
  -- Só notificar se o status mudou para aprovado ou rejeitado
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar dados da oportunidade
    SELECT * INTO opportunity_record
    FROM opportunities
    WHERE id = NEW.opportunity_id;
    
    -- Definir mensagem baseada no status
    IF NEW.status = 'approved' THEN
      notification_title := 'Candidatura Aprovada! 🎉';
      status_message := 'Parabéns! Sua candidatura para "' || opportunity_record.title || '" foi aprovada pela empresa ' || opportunity_record.company || '.';
    ELSE
      notification_title := 'Candidatura Não Aprovada';
      status_message := 'Sua candidatura para "' || opportunity_record.title || '" não foi aprovada desta vez. Continue tentando!';
    END IF;
    
    -- Inserir notificação para o criador
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.creator_id,
      'application_' || NEW.status,
      notification_title,
      status_message,
      jsonb_build_object(
        'opportunity_id', NEW.opportunity_id,
        'opportunity_title', opportunity_record.title,
        'application_id', NEW.id,
        'status', NEW.status,
        'company', opportunity_record.company
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_creator_application_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_creators_new_opportunity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Inserir notificação para todos os criadores
  INSERT INTO notifications (user_id, type, title, message, data)
  SELECT 
    p.id,
    'new_opportunity',
    'Nova Oportunidade Disponível!',
    'A empresa ' || NEW.company || ' criou uma nova oportunidade: ' || NEW.title,
    jsonb_build_object(
      'opportunity_id', NEW.id,
      'opportunity_title', NEW.title,
      'company', NEW.company,
      'budget_min', NEW.budget_min,
      'budget_max', NEW.budget_max
    )
  FROM profiles p
  WHERE p.role = 'creator';
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_creators_new_opportunity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_opportunity_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_opportunity_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_last_message"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE conversations 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_last_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_message_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Auto-mark as delivered when message is created
  IF TG_OP = 'INSERT' THEN
    NEW.status = 'sent';
    NEW.delivered_at = NOW();
    RETURN NEW;
  END IF;
  
  -- Update read status
  IF TG_OP = 'UPDATE' AND OLD.status != 'read' AND NEW.status = 'read' THEN
    NEW.read_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_message_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_opportunity_stages_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_opportunity_stages_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_project_deliverables_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_project_deliverables_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_presence"("p_user_id" "uuid", "p_status" "text" DEFAULT 'online'::"text", "p_activity" "text" DEFAULT NULL::"text", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO user_presence (
    user_id,
    status,
    current_activity,
    activity_context,
    last_seen,
    updated_at
  ) VALUES (
    p_user_id,
    p_status,
    p_activity,
    p_context,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_activity = EXCLUDED.current_activity,
    activity_context = EXCLUDED.activity_context,
    last_seen = EXCLUDED.last_seen,
    updated_at = EXCLUDED.updated_at;
END;
$$;


ALTER FUNCTION "public"."update_user_presence"("p_user_id" "uuid", "p_status" "text", "p_activity" "text", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid",
    "last_webauthn_challenge_data" "jsonb"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



COMMENT ON COLUMN "auth"."mfa_factors"."last_webauthn_challenge_data" IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid",
    "refresh_token_hmac_key" "text",
    "refresh_token_counter" bigint
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_hmac_key" IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';



COMMENT ON COLUMN "auth"."sessions"."refresh_token_counter" IS 'Holds the ID (counter) of the last issued refresh token.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



CREATE TABLE IF NOT EXISTS "public"."activity_feed" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "entity_type" "text",
    "entity_id" "uuid",
    "read" boolean DEFAULT false,
    "priority" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "activity_feed_activity_type_check" CHECK (("activity_type" = ANY (ARRAY['message_sent'::"text", 'deliverable_created'::"text", 'deliverable_updated'::"text", 'deliverable_submitted'::"text", 'deliverable_approved'::"text", 'deliverable_rejected'::"text", 'file_uploaded'::"text", 'comment_added'::"text", 'project_updated'::"text", 'deadline_reminder'::"text", 'milestone_completed'::"text", 'collaboration_started'::"text", 'review_requested'::"text", 'feedback_provided'::"text"]))),
    CONSTRAINT "activity_feed_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."activity_feed" OWNER TO "postgres";


COMMENT ON TABLE "public"."activity_feed" IS 'Feed de atividades em tempo real para monitorar ações importantes no sistema';



CREATE TABLE IF NOT EXISTS "public"."analysts" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "company" "text",
    "role" "public"."user_role" DEFAULT 'analyst'::"public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analysts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collaboration_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "analyst_id" "uuid",
    "creator_id" "uuid",
    "metric_type" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "period_start" timestamp with time zone NOT NULL,
    "period_end" timestamp with time zone NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "collaboration_analytics_metric_type_check" CHECK (("metric_type" = ANY (ARRAY['message_count'::"text", 'response_time'::"text", 'collaboration_score'::"text", 'file_shares'::"text", 'session_duration'::"text", 'project_completion_rate'::"text"])))
);


ALTER TABLE "public"."collaboration_analytics" OWNER TO "postgres";


COMMENT ON TABLE "public"."collaboration_analytics" IS 'Métricas e analytics sobre colaboração entre analistas e creators';



CREATE TABLE IF NOT EXISTS "public"."collaborative_session_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'participant'::"text",
    "permissions" "jsonb" DEFAULT '{"can_edit": false, "can_comment": true, "can_share_screen": false}'::"jsonb",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "collaborative_session_participants_role_check" CHECK (("role" = ANY (ARRAY['host'::"text", 'moderator'::"text", 'participant'::"text", 'observer'::"text"]))),
    CONSTRAINT "collaborative_session_participants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'away'::"text", 'disconnected'::"text"])))
);


ALTER TABLE "public"."collaborative_session_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collaborative_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "session_type" "text" DEFAULT 'deliverable_review'::"text",
    "entity_type" "text",
    "entity_id" "uuid",
    "host_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ends_at" timestamp with time zone,
    CONSTRAINT "collaborative_sessions_session_type_check" CHECK (("session_type" = ANY (ARRAY['deliverable_review'::"text", 'brainstorming'::"text", 'feedback_session'::"text", 'planning_meeting'::"text", 'file_review'::"text", 'general'::"text"]))),
    CONSTRAINT "collaborative_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."collaborative_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."collaborative_sessions" IS 'Sessões colaborativas para trabalho conjunto em deliverables e projetos';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid",
    "analyst_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "last_message_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "custom_title" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[]
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversations"."opportunity_id" IS 'NULL for general conversations, opportunity ID for project-specific conversations';



CREATE TABLE IF NOT EXISTS "public"."file_access_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "file_access_log_action_check" CHECK (("action" = ANY (ARRAY['view'::"text", 'download'::"text", 'share'::"text", 'delete'::"text"])))
);


ALTER TABLE "public"."file_access_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "sender_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_type" "text" DEFAULT 'general'::"text",
    "project_context" "uuid",
    "status" "text" DEFAULT 'sent'::"text",
    "delivered_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "file_url" "text",
    "file_name" "text",
    "file_size" bigint,
    "reply_to_id" "uuid",
    "edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['general'::"text", 'project'::"text", 'system'::"text"]))),
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['analyst'::"text", 'creator'::"text"]))),
    CONSTRAINT "messages_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."message_type" IS 'Type of message: general (default), project (about specific project), system (automated)';



COMMENT ON COLUMN "public"."messages"."project_context" IS 'Reference to opportunity if message is about a specific project';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "user_id" "uuid" NOT NULL,
    "email_notifications" "jsonb" DEFAULT '{"new_message": true, "project_updates": true, "deadline_reminders": true, "deliverable_updates": true, "collaboration_invites": true}'::"jsonb",
    "push_notifications" "jsonb" DEFAULT '{"new_message": true, "urgent_only": false, "deadline_reminders": true, "deliverable_updates": true}'::"jsonb",
    "in_app_notifications" "jsonb" DEFAULT '{"all": true, "sound_enabled": true, "desktop_notifications": true}'::"jsonb",
    "digest_frequency" "text" DEFAULT 'daily'::"text",
    "quiet_hours_start" time without time zone,
    "quiet_hours_end" time without time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notification_preferences_digest_frequency_check" CHECK (("digest_frequency" = ANY (ARRAY['never'::"text", 'realtime'::"text", 'hourly'::"text", 'daily'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Preferências personalizadas de notificações para cada usuário';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "priority" integer DEFAULT 3,
    "category" "text" DEFAULT 'general'::"text",
    "expires_at" timestamp with time zone,
    "action_url" "text",
    "grouped_with" "uuid",
    "analyst_id" "uuid",
    CONSTRAINT "notifications_category_check" CHECK (("category" = ANY (ARRAY['message'::"text", 'deliverable'::"text", 'project'::"text", 'system'::"text", 'collaboration'::"text", 'deadline'::"text", 'general'::"text"]))),
    CONSTRAINT "notifications_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "analyst_id" "uuid",
    "title" "text" NOT NULL,
    "company" "text" NOT NULL,
    "description" "text" NOT NULL,
    "budget" numeric(10,2) DEFAULT 0 NOT NULL,
    "location" "text" DEFAULT 'Remoto'::"text" NOT NULL,
    "content_type" "text" NOT NULL,
    "requirements" "jsonb" DEFAULT '[]'::"jsonb",
    "deadline" "date" NOT NULL,
    "status" "text" DEFAULT 'ativo'::"text" NOT NULL,
    "candidates_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "age_range" "text",
    "gender" "text",
    "company_link" "text",
    "briefing" "text"
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."opportunities"."budget" IS 'Orçamento total do projeto por criador';


COMMENT ON COLUMN "public"."opportunities"."company_link" IS 'Link para o site ou perfil da empresa';



COMMENT ON COLUMN "public"."opportunities"."briefing" IS 'Briefing geral do projeto fornecido pelo analista';



CREATE TABLE IF NOT EXISTS "public"."opportunity_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "message" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone
);


ALTER TABLE "public"."opportunity_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunity_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid",
    "image_url" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."opportunity_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunity_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "stage" "text" DEFAULT 'aguardando_envio'::"text" NOT NULL,
    "tracking_code" "text",
    "notes" "text",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "creator_id" "uuid",
    CONSTRAINT "valid_stage_check" CHECK (("stage" = ANY (ARRAY['mapeamento'::"text", 'contrato'::"text", 'aguardando_envio'::"text", 'produtos_enviados'::"text", 'material_roteirizacao'::"text", 'aguardando_gravacao'::"text", 'pronto_edicao'::"text", 'material_edicao'::"text", 'revisao_final'::"text", 'finalizado'::"text"])))
);


ALTER TABLE "public"."opportunity_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "name" "text",
    "bio" "text",
    "location" "text",
    "followers" "text",
    "website" "text",
    "phone" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."user_role" DEFAULT 'creator'::"public"."user_role",
    "terms_accepted" boolean DEFAULT false,
    "terms_accepted_at" timestamp with time zone,
    "terms_version" "text" DEFAULT '1.0'::"text",
    "company" "text",
    "instagram_url" "text",
    "tiktok_url" "text",
    "portfolio_url" "text",
    "birth_date" "text",
    "gender" "text",
    "niches" "text"[],
    "pix_key" "text",
    "full_name" "text",
    "document_number" "text",
    "address" "jsonb",
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 0,
    "onboarding_completed_at" timestamp with time zone,
    "document_type" "text",
    "age" integer,
    "onboarding_data_incomplete" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL pública do avatar do usuário armazenado no bucket avatars';



COMMENT ON COLUMN "public"."profiles"."instagram_url" IS 'URL do perfil Instagram do criador (opcional)';



COMMENT ON COLUMN "public"."profiles"."tiktok_url" IS 'URL do perfil TikTok do criador (opcional)';



COMMENT ON COLUMN "public"."profiles"."portfolio_url" IS 'URL do site ou portfólio do criador (opcional)';



COMMENT ON COLUMN "public"."profiles"."birth_date" IS 'Idade do criador';



COMMENT ON COLUMN "public"."profiles"."gender" IS 'Gênero do criador';



COMMENT ON COLUMN "public"."profiles"."niches" IS 'Array de nichos/tags do criador';



COMMENT ON COLUMN "public"."profiles"."pix_key" IS 'Chave PIX para pagamentos';



COMMENT ON COLUMN "public"."profiles"."full_name" IS 'Nome completo para contratos';



COMMENT ON COLUMN "public"."profiles"."document_number" IS 'CPF ou CNPJ do criador';



COMMENT ON COLUMN "public"."profiles"."address" IS 'Endereço completo em formato JSON';



COMMENT ON COLUMN "public"."profiles"."onboarding_completed" IS 'Se o onboarding foi concluído';



COMMENT ON COLUMN "public"."profiles"."onboarding_step" IS 'Etapa atual do onboarding (0-4)';



COMMENT ON COLUMN "public"."profiles"."onboarding_completed_at" IS 'Data de conclusão do onboarding';



COMMENT ON COLUMN "public"."profiles"."onboarding_data_incomplete" IS 'Indica se o onboarding foi marcado como completo mas alguns dados não foram salvos corretamente';



CREATE TABLE IF NOT EXISTS "public"."project_deliverables" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "analyst_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" "date" NOT NULL,
    "priority" integer DEFAULT 1,
    "status" "text" DEFAULT 'pending'::"text",
    "analyst_feedback" "text",
    "reviewed_at" timestamp with time zone,
    "deliverable_files" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "depends_on" "uuid",
    "template_id" "text",
    "estimated_hours" integer DEFAULT 0,
    "tags" "jsonb" DEFAULT '[]'::"jsonb",
    "briefing" "text",
    CONSTRAINT "project_deliverables_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5))),
    CONSTRAINT "project_deliverables_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'submitted'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."project_deliverables" OWNER TO "postgres";


COMMENT ON COLUMN "public"."project_deliverables"."briefing" IS 'Briefing específico para esta entrega';



CREATE TABLE IF NOT EXISTS "public"."shared_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "file_name" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" bigint NOT NULL,
    "mime_type" "text",
    "uploaded_by" "uuid" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "access_level" "text" DEFAULT 'private'::"text",
    "permissions" "jsonb" DEFAULT '{"can_share": false, "can_delete": false, "can_download": true}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "shared_files_access_level_check" CHECK (("access_level" = ANY (ARRAY['private'::"text", 'shared'::"text", 'public'::"text"])))
);


ALTER TABLE "public"."shared_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."shared_files" IS 'Sistema aprimorado de compartilhamento de arquivos com controle de acesso';



CREATE TABLE IF NOT EXISTS "public"."user_presence" (
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'offline'::"text",
    "last_seen" timestamp with time zone DEFAULT "now"(),
    "current_activity" "text",
    "activity_context" "jsonb" DEFAULT '{}'::"jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_presence_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'away'::"text", 'busy'::"text", 'offline'::"text"])))
);


ALTER TABLE "public"."user_presence" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_presence" IS 'Sistema de presença em tempo real para mostrar status dos usuários';



CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_feed"
    ADD CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysts"
    ADD CONSTRAINT "analysts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaboration_analytics"
    ADD CONSTRAINT "collaboration_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaborative_session_participants"
    ADD CONSTRAINT "collaborative_session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaborative_session_participants"
    ADD CONSTRAINT "collaborative_session_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."collaborative_sessions"
    ADD CONSTRAINT "collaborative_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_analyst_creator_unique" UNIQUE ("analyst_id", "creator_id");



COMMENT ON CONSTRAINT "conversations_analyst_creator_unique" ON "public"."conversations" IS 'Garante que existe apenas uma conversa única entre cada analista e criador, independente de projetos/oportunidades';



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."file_access_log"
    ADD CONSTRAINT "file_access_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_applications"
    ADD CONSTRAINT "opportunity_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_images"
    ADD CONSTRAINT "opportunity_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_stages"
    ADD CONSTRAINT "opportunity_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_applications"
    ADD CONSTRAINT "unique_opportunity_creator" UNIQUE ("opportunity_id", "creator_id");



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "idx_activity_feed_created_at" ON "public"."activity_feed" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_feed_entity" ON "public"."activity_feed" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_activity_feed_read" ON "public"."activity_feed" USING "btree" ("read");



CREATE INDEX "idx_activity_feed_unread" ON "public"."activity_feed" USING "btree" ("user_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_activity_feed_user_id" ON "public"."activity_feed" USING "btree" ("user_id");



CREATE INDEX "idx_analysts_email" ON "public"."analysts" USING "btree" ("email");



CREATE INDEX "idx_analysts_id" ON "public"."analysts" USING "btree" ("id");



CREATE INDEX "idx_collaboration_analytics_analyst" ON "public"."collaboration_analytics" USING "btree" ("analyst_id");



CREATE INDEX "idx_collaboration_analytics_creator" ON "public"."collaboration_analytics" USING "btree" ("creator_id");



CREATE INDEX "idx_collaboration_analytics_metric" ON "public"."collaboration_analytics" USING "btree" ("metric_type");



CREATE INDEX "idx_collaboration_analytics_period" ON "public"."collaboration_analytics" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_collaborative_sessions_entity" ON "public"."collaborative_sessions" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_collaborative_sessions_host" ON "public"."collaborative_sessions" USING "btree" ("host_id");



CREATE INDEX "idx_collaborative_sessions_status" ON "public"."collaborative_sessions" USING "btree" ("status");



CREATE INDEX "idx_conversations_analyst_creator" ON "public"."conversations" USING "btree" ("analyst_id", "creator_id");



CREATE INDEX "idx_conversations_analyst_id" ON "public"."conversations" USING "btree" ("analyst_id");



CREATE INDEX "idx_conversations_creator_id" ON "public"."conversations" USING "btree" ("creator_id");



CREATE UNIQUE INDEX "idx_conversations_general_unique" ON "public"."conversations" USING "btree" ("analyst_id", "creator_id") WHERE ("opportunity_id" IS NULL);



CREATE INDEX "idx_conversations_last_message_at" ON "public"."conversations" USING "btree" ("last_message_at" DESC);



CREATE INDEX "idx_conversations_opportunity_id" ON "public"."conversations" USING "btree" ("opportunity_id");



CREATE UNIQUE INDEX "idx_conversations_project_unique" ON "public"."conversations" USING "btree" ("opportunity_id", "creator_id") WHERE ("opportunity_id" IS NOT NULL);



CREATE INDEX "idx_conversations_tags" ON "public"."conversations" USING "gin" ("tags");



CREATE INDEX "idx_file_access_log_action" ON "public"."file_access_log" USING "btree" ("action");



CREATE INDEX "idx_file_access_log_file" ON "public"."file_access_log" USING "btree" ("file_id");



CREATE INDEX "idx_file_access_log_user" ON "public"."file_access_log" USING "btree" ("user_id");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_project_context" ON "public"."messages" USING "btree" ("project_context");



CREATE INDEX "idx_messages_read" ON "public"."messages" USING "btree" ("read");



CREATE INDEX "idx_notifications_analyst_id" ON "public"."notifications" USING "btree" ("analyst_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_opportunity_applications_applied_at" ON "public"."opportunity_applications" USING "btree" ("applied_at" DESC);



CREATE INDEX "idx_opportunity_applications_creator_id" ON "public"."opportunity_applications" USING "btree" ("creator_id");



CREATE INDEX "idx_opportunity_applications_opportunity_id" ON "public"."opportunity_applications" USING "btree" ("opportunity_id");



CREATE INDEX "idx_opportunity_applications_status" ON "public"."opportunity_applications" USING "btree" ("status");



CREATE INDEX "idx_opportunity_stages_created_at" ON "public"."opportunity_stages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_opportunity_stages_creator_id" ON "public"."opportunity_stages" USING "btree" ("creator_id");



CREATE INDEX "idx_opportunity_stages_opportunity_id" ON "public"."opportunity_stages" USING "btree" ("opportunity_id");



CREATE INDEX "idx_opportunity_stages_stage" ON "public"."opportunity_stages" USING "btree" ("stage");



CREATE INDEX "idx_profiles_avatar_url" ON "public"."profiles" USING "btree" ("avatar_url") WHERE ("avatar_url" IS NOT NULL);



CREATE INDEX "idx_project_deliverables_analyst_id" ON "public"."project_deliverables" USING "btree" ("analyst_id");



CREATE INDEX "idx_project_deliverables_application_id" ON "public"."project_deliverables" USING "btree" ("application_id");



CREATE INDEX "idx_project_deliverables_creator_id" ON "public"."project_deliverables" USING "btree" ("creator_id");



CREATE INDEX "idx_project_deliverables_depends_on" ON "public"."project_deliverables" USING "btree" ("depends_on");



CREATE INDEX "idx_project_deliverables_due_date" ON "public"."project_deliverables" USING "btree" ("due_date");



CREATE INDEX "idx_project_deliverables_estimated_hours" ON "public"."project_deliverables" USING "btree" ("estimated_hours");



CREATE INDEX "idx_project_deliverables_opportunity_id" ON "public"."project_deliverables" USING "btree" ("opportunity_id");



CREATE INDEX "idx_project_deliverables_status" ON "public"."project_deliverables" USING "btree" ("status");



CREATE INDEX "idx_project_deliverables_tags" ON "public"."project_deliverables" USING "gin" ("tags");



CREATE INDEX "idx_project_deliverables_template_id" ON "public"."project_deliverables" USING "btree" ("template_id");



CREATE INDEX "idx_shared_files_created" ON "public"."shared_files" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_shared_files_entity" ON "public"."shared_files" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_shared_files_uploader" ON "public"."shared_files" USING "btree" ("uploaded_by");



CREATE INDEX "idx_user_presence_last_seen" ON "public"."user_presence" USING "btree" ("last_seen");



CREATE INDEX "idx_user_presence_status" ON "public"."user_presence" USING "btree" ("status");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE OR REPLACE TRIGGER "on_auth_user_confirmed" AFTER UPDATE OF "email_confirmed_at" ON "auth"."users" FOR EACH ROW WHEN ((("old"."email_confirmed_at" IS NULL) AND ("new"."email_confirmed_at" IS NOT NULL))) EXECUTE FUNCTION "public"."handle_user_confirmation"();



CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "set_opportunity_created_by_trigger" BEFORE INSERT ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."set_opportunity_created_by"();



CREATE OR REPLACE TRIGGER "trigger_create_default_deliverables_on_approval" AFTER UPDATE ON "public"."opportunity_applications" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_deliverables_on_approval"();



CREATE OR REPLACE TRIGGER "trigger_create_deliverable_activity" AFTER INSERT OR UPDATE ON "public"."project_deliverables" FOR EACH ROW EXECUTE FUNCTION "public"."create_deliverable_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_deliverable_notification" AFTER INSERT ON "public"."project_deliverables" FOR EACH ROW EXECUTE FUNCTION "public"."create_deliverable_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_message_activity" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."create_message_activity"();



CREATE OR REPLACE TRIGGER "trigger_create_message_notification" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."create_message_notification"();



CREATE OR REPLACE TRIGGER "trigger_create_stage_on_approval" AFTER UPDATE ON "public"."opportunity_applications" FOR EACH ROW EXECUTE FUNCTION "public"."create_stage_on_approval"();



CREATE OR REPLACE TRIGGER "trigger_notify_analyst_new_application" AFTER INSERT ON "public"."opportunity_applications" FOR EACH ROW EXECUTE FUNCTION "public"."notify_analyst_new_application"();



CREATE OR REPLACE TRIGGER "trigger_notify_application_approved" AFTER UPDATE ON "public"."opportunity_applications" FOR EACH ROW EXECUTE FUNCTION "public"."notify_application_approved"();



CREATE OR REPLACE TRIGGER "trigger_notify_creator_application_status" AFTER UPDATE ON "public"."opportunity_applications" FOR EACH ROW EXECUTE FUNCTION "public"."notify_creator_application_status"();



CREATE OR REPLACE TRIGGER "trigger_notify_creators_new_opportunity" AFTER INSERT ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."notify_creators_new_opportunity"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_last_message" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_last_message"();



CREATE OR REPLACE TRIGGER "trigger_update_conversation_timestamp" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_message_status" BEFORE INSERT OR UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_message_status"();



CREATE OR REPLACE TRIGGER "update_opportunities_updated_at" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_opportunity_stages_updated_at" BEFORE UPDATE ON "public"."opportunity_stages" FOR EACH ROW EXECUTE FUNCTION "public"."update_opportunity_stages_updated_at"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_project_deliverables_updated_at" BEFORE UPDATE ON "public"."project_deliverables" FOR EACH ROW EXECUTE FUNCTION "public"."update_project_deliverables_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_feed"
    ADD CONSTRAINT "activity_feed_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_feed"
    ADD CONSTRAINT "activity_feed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysts"
    ADD CONSTRAINT "analysts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaboration_analytics"
    ADD CONSTRAINT "collaboration_analytics_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaboration_analytics"
    ADD CONSTRAINT "collaboration_analytics_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_session_participants"
    ADD CONSTRAINT "collaborative_session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."collaborative_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_session_participants"
    ADD CONSTRAINT "collaborative_session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_sessions"
    ADD CONSTRAINT "collaborative_sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_access_log"
    ADD CONSTRAINT "file_access_log_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."shared_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."file_access_log"
    ADD CONSTRAINT "file_access_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "fk_user_presence_profiles" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_project_context_fkey" FOREIGN KEY ("project_context") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_grouped_with_fkey" FOREIGN KEY ("grouped_with") REFERENCES "public"."notifications"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "public"."analysts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_applications"
    ADD CONSTRAINT "opportunity_applications_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_applications"
    ADD CONSTRAINT "opportunity_applications_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_images"
    ADD CONSTRAINT "opportunity_images_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_stages"
    ADD CONSTRAINT "opportunity_stages_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_stages"
    ADD CONSTRAINT "opportunity_stages_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_analyst_id_fkey" FOREIGN KEY ("analyst_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."opportunity_applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_depends_on_fkey" FOREIGN KEY ("depends_on") REFERENCES "public"."project_deliverables"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_deliverables"
    ADD CONSTRAINT "project_deliverables_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shared_files"
    ADD CONSTRAINT "shared_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_presence"
    ADD CONSTRAINT "user_presence_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow analyst signup" ON "public"."analysts" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow analyst update during signup" ON "public"."analysts" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow profile creation during signup" ON "public"."profiles" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "Allow profile update during signup" ON "public"."profiles" FOR UPDATE TO "authenticated", "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Allow system insert for new users" ON "public"."analysts" FOR INSERT WITH CHECK (true);



CREATE POLICY "Analysts and creators can create conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "analyst_id") OR ("auth"."uid"() = "creator_id") OR ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'analyst'::"public"."user_role")))) AND ("auth"."uid"() = "analyst_id"))));



CREATE POLICY "Analysts can create opportunities" ON "public"."opportunities" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_analyst"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Analysts can delete own opportunities" ON "public"."opportunities" FOR DELETE TO "authenticated" USING (("public"."is_analyst"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Analysts can insert own data" ON "public"."analysts" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Analysts can manage deliverables for their opportunities" ON "public"."project_deliverables" TO "authenticated" USING ((("analyst_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "project_deliverables"."opportunity_id") AND ("opportunities"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Analysts can manage stages of their opportunities" ON "public"."opportunity_stages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "opportunity_stages"."opportunity_id") AND ("opportunities"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "opportunity_stages"."opportunity_id") AND ("opportunities"."created_by" = "auth"."uid"())))));



CREATE POLICY "Analysts can update own data" ON "public"."analysts" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Analysts can update own opportunities" ON "public"."opportunities" FOR UPDATE TO "authenticated" USING (("public"."is_analyst"() AND ("created_by" = "auth"."uid"()))) WITH CHECK (("public"."is_analyst"() AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Analysts can view own data" ON "public"."analysts" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Analysts can view own opportunities" ON "public"."opportunities" FOR SELECT TO "authenticated" USING ((("public"."is_analyst"() AND ("created_by" = "auth"."uid"())) OR "public"."is_creator"()));



CREATE POLICY "Analysts can view their collaboration analytics" ON "public"."collaboration_analytics" FOR SELECT TO "authenticated" USING (("analyst_id" = "auth"."uid"()));



CREATE POLICY "Creators can view and update their deliverables" ON "public"."project_deliverables" TO "authenticated" USING ((("creator_id" = "auth"."uid"()) OR ("application_id" IN ( SELECT "opportunity_applications"."id"
   FROM "public"."opportunity_applications"
  WHERE ("opportunity_applications"."creator_id" = "auth"."uid"()))))) WITH CHECK ((("creator_id" = "auth"."uid"()) OR ("application_id" IN ( SELECT "opportunity_applications"."id"
   FROM "public"."opportunity_applications"
  WHERE ("opportunity_applications"."creator_id" = "auth"."uid"())))));



CREATE POLICY "Creators can view their collaboration analytics" ON "public"."collaboration_analytics" FOR SELECT TO "authenticated" USING (("creator_id" = "auth"."uid"()));



CREATE POLICY "Enable delete for application creator" ON "public"."opportunity_applications" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "Enable insert for authenticated creators" ON "public"."opportunity_applications" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Enable read access for creators and opportunity owners" ON "public"."opportunity_applications" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "creator_id") OR (EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "opportunity_applications"."opportunity_id") AND (("opportunities"."created_by" = "auth"."uid"()) OR ("opportunities"."analyst_id" = "auth"."uid"())))))));



CREATE POLICY "Enable update for opportunity owner" ON "public"."opportunity_applications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "opportunity_applications"."opportunity_id") AND (("opportunities"."created_by" = "auth"."uid"()) OR ("opportunities"."analyst_id" = "auth"."uid"())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."opportunities"
  WHERE (("opportunities"."id" = "opportunity_applications"."opportunity_id") AND (("opportunities"."created_by" = "auth"."uid"()) OR ("opportunities"."analyst_id" = "auth"."uid"()))))));



CREATE POLICY "Enable update for users based on user_id" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "File owners can manage their files" ON "public"."shared_files" TO "authenticated" USING (("uploaded_by" = "auth"."uid"())) WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Hosts can manage their sessions" ON "public"."collaborative_sessions" TO "authenticated" USING (("host_id" = "auth"."uid"())) WITH CHECK (("host_id" = "auth"."uid"()));



CREATE POLICY "Participants can delete conversations" ON "public"."conversations" FOR DELETE TO "authenticated" USING ((("analyst_id" = "auth"."uid"()) OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Participants can update conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((("analyst_id" = "auth"."uid"()) OR ("creator_id" = "auth"."uid"()))) WITH CHECK ((("analyst_id" = "auth"."uid"()) OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "System can create activities" ON "public"."activity_feed" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert activity feed items" ON "public"."activity_feed" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can insert messages in their conversations" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."creator_id" = "auth"."uid"()) OR ("conversations"."analyst_id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their own notification preferences" ON "public"."notification_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their presence" ON "public"."user_presence" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING (("sender_id" = "auth"."uid"())) WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their activities" ON "public"."activity_feed" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own presence" ON "public"."user_presence" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can upload files" ON "public"."shared_files" FOR INSERT TO "authenticated" WITH CHECK (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can view all presence data" ON "public"."user_presence" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view files they have access to" ON "public"."shared_files" FOR SELECT TO "authenticated" USING ((("uploaded_by" = "auth"."uid"()) OR ("access_level" = 'public'::"text") OR (("access_level" = 'shared'::"text") AND
CASE
    WHEN ("entity_type" = 'conversation'::"text") THEN ("entity_id" IN ( SELECT "conversations"."id"
       FROM "public"."conversations"
      WHERE (("conversations"."analyst_id" = "auth"."uid"()) OR ("conversations"."creator_id" = "auth"."uid"()))))
    WHEN ("entity_type" = 'deliverable'::"text") THEN ("entity_id" IN ( SELECT "pd"."id"
       FROM ("public"."project_deliverables" "pd"
         JOIN "public"."opportunity_applications" "oa" ON (("pd"."application_id" = "oa"."id")))
      WHERE (("pd"."analyst_id" = "auth"."uid"()) OR ("oa"."creator_id" = "auth"."uid"()))))
    ELSE true
END)));



CREATE POLICY "Users can view messages in their conversations" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND (("conversations"."creator_id" = "auth"."uid"()) OR ("conversations"."analyst_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view online presence" ON "public"."user_presence" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view own conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("analyst_id" = "auth"."uid"()) OR ("creator_id" = "auth"."uid"())));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "Users can view sessions they participate in" ON "public"."collaborative_sessions" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "collaborative_session_participants"."session_id"
   FROM "public"."collaborative_session_participants"
  WHERE ("collaborative_session_participants"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their activities" ON "public"."activity_feed" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own activity feed" ON "public"."activity_feed" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their participation" ON "public"."collaborative_session_participants" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("session_id" IN ( SELECT "collaborative_sessions"."id"
   FROM "public"."collaborative_sessions"
  WHERE ("collaborative_sessions"."host_id" = "auth"."uid"())))));



ALTER TABLE "public"."activity_feed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaboration_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborative_session_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborative_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."file_access_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_analyst_policy" ON "public"."notifications" USING ((("analyst_id" = "auth"."uid"()) OR (("user_id" = "auth"."uid"()) AND ("analyst_id" IS NULL))));



ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunity_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunity_stages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."project_deliverables" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_presence" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Analysts can delete opportunity images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'opportunity-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'analyst'::"text")));



CREATE POLICY "Analysts can update opportunity images" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'opportunity-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'analyst'::"text"))) WITH CHECK ((("bucket_id" = 'opportunity-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'analyst'::"text")));



CREATE POLICY "Analysts can upload opportunity images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'opportunity-images'::"text") AND ((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = 'analyst'::"text")));



CREATE POLICY "Authenticated users can view opportunity images" ON "storage"."objects" FOR SELECT TO "authenticated" USING (("bucket_id" = 'opportunity-images'::"text"));



CREATE POLICY "Avatares são públicos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'avatars'::"text"));



CREATE POLICY "Creators overwrite own deliverables" ON "storage"."objects" FOR UPDATE TO "authenticated" USING ((("bucket_id" = 'deliverables'::"text") AND ("owner" = "auth"."uid"()))) WITH CHECK ((("bucket_id" = 'deliverables'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."project_deliverables" "pd"
  WHERE (("pd"."id" = ("split_part"("objects"."name", '/'::"text", 1))::"uuid") AND ("pd"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Creators read own deliverables" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'deliverables'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."project_deliverables" "pd"
  WHERE (("pd"."id" = ("split_part"("objects"."name", '/'::"text", 1))::"uuid") AND ("pd"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Creators upload deliverables" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'deliverables'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."project_deliverables" "pd"
  WHERE (("pd"."id" = ("split_part"("objects"."name", '/'::"text", 1))::"uuid") AND ("pd"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Usuários podem atualizar o próprio avatar" ON "storage"."objects" FOR UPDATE USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Usuários podem deletar o próprio avatar" ON "storage"."objects" FOR DELETE USING ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



CREATE POLICY "Usuários podem fazer upload do próprio avatar" ON "storage"."objects" FOR INSERT WITH CHECK ((("bucket_id" = 'avatars'::"text") AND (("auth"."uid"())::"text" = ("storage"."foldername"("name"))[1])));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."cleanup_old_data"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_data"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_data"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"("p_user_id" "uuid", "p_actor_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_priority" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"("p_user_id" "uuid", "p_actor_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_priority" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_activity_feed_entry"("p_user_id" "uuid", "p_actor_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_metadata" "jsonb", "p_priority" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_analyst_profile"("user_id" "uuid", "user_email" "text", "user_name" "text", "user_company" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_analyst_profile"("user_id" "uuid", "user_email" "text", "user_name" "text", "user_company" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_analyst_profile"("user_id" "uuid", "user_email" "text", "user_name" "text", "user_company" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_conversation_on_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_conversation_on_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_conversation_on_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_deliverables_on_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_deliverables_on_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_deliverables_on_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_deliverable_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_deliverable_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_deliverable_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_deliverable_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_deliverable_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_deliverable_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_message_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_message_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_message_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_message_notification"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_message_notification"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_message_notification"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_smart_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_priority" integer, "p_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_smart_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_priority" integer, "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_smart_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_data" "jsonb", "p_priority" integer, "p_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_stage_on_approval"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_stage_on_approval"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stage_on_approval"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_metadata"() TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_metadata"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_metadata"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_my_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_completely"("user_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_existing_analyst_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_existing_analyst_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_existing_analyst_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_unique_conversation"("p_analyst_id" "uuid", "p_creator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_confirmation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_confirmation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_confirmation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_analyst"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_analyst"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_analyst"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_creator"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_creator"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_creator"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_as_read"("notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_analyst_new_application"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_analyst_new_application"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_analyst_new_application"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_application_approved"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_application_approved"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_application_approved"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_creator_application_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_creator_application_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_creator_application_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_creators_new_opportunity"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_creators_new_opportunity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_creators_new_opportunity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_opportunity_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_opportunity_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_opportunity_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_last_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_message_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_message_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_message_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_opportunity_stages_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_opportunity_stages_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_opportunity_stages_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_project_deliverables_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_project_deliverables_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_project_deliverables_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_presence"("p_user_id" "uuid", "p_status" "text", "p_activity" "text", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_presence"("p_user_id" "uuid", "p_status" "text", "p_activity" "text", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_presence"("p_user_id" "uuid", "p_status" "text", "p_activity" "text", "p_context" "jsonb") TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "public"."activity_feed" TO "anon";
GRANT ALL ON TABLE "public"."activity_feed" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_feed" TO "service_role";



GRANT ALL ON TABLE "public"."analysts" TO "anon";
GRANT ALL ON TABLE "public"."analysts" TO "authenticated";
GRANT ALL ON TABLE "public"."analysts" TO "service_role";



GRANT ALL ON TABLE "public"."collaboration_analytics" TO "anon";
GRANT ALL ON TABLE "public"."collaboration_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."collaboration_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."collaborative_session_participants" TO "anon";
GRANT ALL ON TABLE "public"."collaborative_session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborative_session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."collaborative_sessions" TO "anon";
GRANT ALL ON TABLE "public"."collaborative_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborative_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."file_access_log" TO "anon";
GRANT ALL ON TABLE "public"."file_access_log" TO "authenticated";
GRANT ALL ON TABLE "public"."file_access_log" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."opportunity_applications" TO "anon";
GRANT ALL ON TABLE "public"."opportunity_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunity_applications" TO "service_role";



GRANT ALL ON TABLE "public"."opportunity_images" TO "anon";
GRANT ALL ON TABLE "public"."opportunity_images" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunity_images" TO "service_role";



GRANT ALL ON TABLE "public"."opportunity_stages" TO "anon";
GRANT ALL ON TABLE "public"."opportunity_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunity_stages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."project_deliverables" TO "anon";
GRANT ALL ON TABLE "public"."project_deliverables" TO "authenticated";
GRANT ALL ON TABLE "public"."project_deliverables" TO "service_role";



GRANT ALL ON TABLE "public"."shared_files" TO "anon";
GRANT ALL ON TABLE "public"."shared_files" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_files" TO "service_role";



GRANT ALL ON TABLE "public"."user_presence" TO "anon";
GRANT ALL ON TABLE "public"."user_presence" TO "authenticated";
GRANT ALL ON TABLE "public"."user_presence" TO "service_role";



GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";



