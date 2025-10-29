import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const AVATARS_BUCKET = 'avatars';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseAvatarUploadReturn {
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  uploadAvatar: (file: File) => Promise<string | null>;
  deleteAvatar: (avatarUrl?: string | null) => Promise<boolean>;
  updateProfileAvatar: (avatarUrl: string) => Promise<boolean>;
}

export const useAvatarUpload = (): UseAvatarUploadReturn => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Formato inválido. Use JPG, PNG ou WebP.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return 'Arquivo muito grande. Tamanho máximo: 2MB.';
    }

    return null;
  }, []);

  const deleteAvatar = useCallback(async (avatarUrl?: string | null): Promise<boolean> => {
    if (!user || !avatarUrl) return false;

    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = avatarUrl.split(`${AVATARS_BUCKET}/`);
      if (urlParts.length < 2) return false;

      const filePath = urlParts[1].split('?')[0]; // Remove query params

      const { error: deleteError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .remove([filePath]);

      if (deleteError) {
        console.error('Erro ao deletar avatar anterior:', deleteError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao deletar avatar:', err);
      return false;
    }
  }, [user]);

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return null;
    }

    setUploading(true);
    setError(null);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Determinar extensão baseada no tipo do arquivo
      const extension = file.type.split('/')[1];
      const fileName = `avatar.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      // Fazer upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, {
          upsert: true, // Sobrescreve se já existir
          contentType: file.type,
        });

      if (uploadError) {
        console.error('Erro ao fazer upload do avatar:', uploadError);
        setError('Falha ao enviar imagem. Tente novamente.');
        return null;
      }

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        setError('Falha ao gerar URL da imagem.');
        return null;
      }

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Erro ao fazer upload do avatar:', err);
      setError('Erro inesperado ao enviar imagem.');
      return null;
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(null), 1000);
    }
  }, [user, validateFile]);

  const updateProfileAvatar = useCallback(async (avatarUrl: string): Promise<boolean> => {
    if (!user) {
      setError('Usuário não autenticado');
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Erro ao atualizar avatar no perfil:', updateError);
        setError('Falha ao salvar avatar no perfil.');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      setError('Erro ao salvar avatar.');
      return false;
    }
  }, [user]);

  return {
    uploading,
    progress,
    error,
    uploadAvatar,
    deleteAvatar,
    updateProfileAvatar,
  };
};
