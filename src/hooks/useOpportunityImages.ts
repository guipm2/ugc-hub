import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { createSquareThumbnail } from '../utils/imageUtils';

interface OpportunityImage {
  id: string;
  opportunity_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const useOpportunityImages = () => {
  const [images, setImages] = useState<OpportunityImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Buscar imagens da oportunidade
  const fetchImages = useCallback(async (oppId: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Buscando imagens para oportunidade:', oppId);
      
      const { data, error: fetchError } = await supabase
        .from('opportunity_images')
        .select('*')
        .eq('opportunity_id', oppId)
        .order('display_order', { ascending: true });

      if (fetchError) {
        console.error('Erro ao buscar imagens:', fetchError);
        throw fetchError;
      }

      console.log('Imagens encontradas:', data);
      setImages(data || []);
    } catch (err) {
      console.error('Erro ao buscar imagens:', err);
      setError('Erro ao carregar imagens da oportunidade');
      setImages([]); // Garantir que images seja array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  }, []);

  // Validar arquivo
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG ou WebP.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 5MB.`;
    }

    return null;
  };

  // Upload de múltiplas imagens
  const uploadImages = async (
    files: File[],
    oppId: string
  ): Promise<OpportunityImage[]> => {
    setError(null);

    // Validar quantidade máxima
    const currentCount = images.length;
    if (currentCount + files.length > MAX_IMAGES) {
      setError(`Máximo de ${MAX_IMAGES} imagens por oportunidade. Você já tem ${currentCount}.`);
      throw new Error(`Máximo de ${MAX_IMAGES} imagens permitidas`);
    }

    // Validar arquivos
    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        throw new Error(validationError);
      }
    }

    // Inicializar progresso
    const progressList: UploadProgress[] = files.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }));
    setUploadProgress(progressList);

    const uploadedImages: OpportunityImage[] = [];

    try {
      // Upload paralelo de todas as imagens
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Otimizar imagem (400x400 WebP)
          const optimizedBlob = await createSquareThumbnail(file, 800); // 800x800 para melhor qualidade
          
          // Gerar nome único
          const fileExt = 'webp';
          const fileName = `${oppId}/${Date.now()}-${index}.${fileExt}`;

          // Upload para Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('opportunity-images')
            .upload(fileName, optimizedBlob, {
              contentType: 'image/webp',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          // Obter URL pública (válida por 1 ano = 31536000 segundos)
          const { data: signedUrlData } = await supabase.storage
            .from('opportunity-images')
            .createSignedUrl(fileName, 31536000); // 1 ano

          const publicUrl = signedUrlData?.signedUrl || '';
          console.log('URL assinada gerada para imagem:', publicUrl);

          // Calcular display_order (próximo número disponível)
          const nextOrder = currentCount + index;

          // Salvar no banco de dados
          const { data: dbData, error: dbError } = await supabase
            .from('opportunity_images')
            .insert({
              opportunity_id: oppId,
              image_url: publicUrl,
              display_order: nextOrder
            })
            .select()
            .single();

          if (dbError) {
            // Se falhar ao salvar no banco, deletar do storage
            await supabase.storage
              .from('opportunity-images')
              .remove([fileName]);
            throw dbError;
          }

          // Atualizar progresso
          setUploadProgress(prev =>
            prev.map((p, i) =>
              i === index ? { ...p, progress: 100, status: 'success' } : p
            )
          );

          uploadedImages.push(dbData);
        } catch (err) {
          console.error(`Erro ao fazer upload de ${file.name}:`, err);
          
          // Atualizar progresso com erro
          setUploadProgress(prev =>
            prev.map((p, i) =>
              i === index
                ? { ...p, status: 'error', error: err instanceof Error ? err.message : 'Erro desconhecido' }
                : p
            )
          );
          
          throw err;
        }
      });

      await Promise.all(uploadPromises);

      // Atualizar lista de imagens
      setImages(prev => [...prev, ...uploadedImages].sort((a, b) => a.display_order - b.display_order));

      return uploadedImages;
    } catch (err) {
      console.error('Erro durante upload de imagens:', err);
      setError('Erro ao fazer upload de uma ou mais imagens');
      throw err;
    } finally {
      // Limpar progresso após 3 segundos
      setTimeout(() => setUploadProgress([]), 3000);
    }
  };

  // Deletar imagem
  const deleteImage = async (imageId: string) => {
    setError(null);

    const imageToDelete = images.find(img => img.id === imageId);
    if (!imageToDelete) {
      setError('Imagem não encontrada');
      return;
    }

    try {
      // Extrair nome do arquivo da URL
      const url = new URL(imageToDelete.image_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-2).join('/'); // opportunity-images/{opportunityId}/{fileName}

      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('opportunity-images')
        .remove([fileName]);

      if (storageError) {
        console.error('Erro ao deletar do storage:', storageError);
        // Continuar mesmo com erro no storage
      }

      // Deletar do banco de dados
      const { error: dbError } = await supabase
        .from('opportunity_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        throw dbError;
      }

      // Atualizar estado local
      setImages(prev => prev.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Erro ao deletar imagem:', err);
      setError('Erro ao deletar imagem');
      throw err;
    }
  };

  // Reordenar imagens
  const reorderImages = async (reorderedImages: OpportunityImage[]) => {
    setError(null);

    try {
      // Atualizar display_order de cada imagem
      const updates = reorderedImages.map((img, index) =>
        supabase
          .from('opportunity_images')
          .update({ display_order: index })
          .eq('id', img.id)
      );

      await Promise.all(updates);

      // Atualizar estado local
      setImages(reorderedImages);
    } catch (err) {
      console.error('Erro ao reordenar imagens:', err);
      setError('Erro ao reordenar imagens');
      throw err;
    }
  };

  return {
    images,
    loading,
    uploadProgress,
    error,
    fetchImages,
    uploadImages,
    deleteImage,
    reorderImages,
    maxImages: MAX_IMAGES,
    remainingSlots: MAX_IMAGES - images.length
  };
};
