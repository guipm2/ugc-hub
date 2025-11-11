import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import Avatar from './Avatar';
import { createSquareThumbnail } from '../../utils/imageUtils';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userName?: string;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  userName,
  onUploadComplete,
  onUploadError
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploading, error, uploadAvatar, deleteAvatar, updateProfileAvatar } = useAvatarUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validações básicas no frontend
    if (!file.type.startsWith('image/')) {
      onUploadError?.(  'Por favor, selecione uma imagem válida.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onUploadError?.('A imagem deve ter no máximo 2MB.');
      return;
    }

    setSelectedFile(file);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setShowUploadModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // Otimizar imagem antes do upload (resize + crop)
      let fileToUpload = selectedFile;
      
      try {
        // Criar thumbnail quadrado de 400x400px para economizar espaço
        const optimizedFile = await createSquareThumbnail(selectedFile, 400, 0.85);
        fileToUpload = optimizedFile;
        console.log('✅ Imagem otimizada:', {
          original: `${(selectedFile.size / 1024).toFixed(1)}KB`,
          otimizada: `${(optimizedFile.size / 1024).toFixed(1)}KB`,
          economia: `${(((selectedFile.size - optimizedFile.size) / selectedFile.size) * 100).toFixed(1)}%`
        });
      } catch (optimizeError) {
        console.warn('⚠️ Não foi possível otimizar a imagem, usando original:', optimizeError);
        // Continua com arquivo original se otimização falhar
      }

      // Se já tem avatar, deletar o anterior
      if (currentAvatarUrl) {
        await deleteAvatar(currentAvatarUrl);
      }

      // Upload da nova imagem (otimizada)
      const newAvatarUrl = await uploadAvatar(fileToUpload);
      
      if (!newAvatarUrl) {
        onUploadError?.(error || 'Falha ao fazer upload da imagem.');
        return;
      }

      // Atualizar perfil no banco
      const updated = await updateProfileAvatar(newAvatarUrl);
      
      if (!updated) {
        onUploadError?.('Falha ao salvar avatar no perfil.');
        return;
      }

      // Sucesso!
      onUploadComplete?.(newAvatarUrl);
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao fazer upload do avatar:', err);
      onUploadError?.('Erro inesperado ao enviar imagem.');
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl) return;

    const confirmDelete = window.confirm('Tem certeza que deseja remover sua foto de perfil?');
    if (!confirmDelete) return;

    try {
      // Deletar do storage
      await deleteAvatar(currentAvatarUrl);

      // Atualizar perfil (avatar_url = null)
      const updated = await updateProfileAvatar('');
      
      if (updated) {
        onUploadComplete?.('');
      } else {
        onUploadError?.('Falha ao remover avatar do perfil.');
      }
    } catch (err) {
      console.error('Erro ao remover avatar:', err);
      onUploadError?.('Erro ao remover avatar.');
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar
            src={currentAvatarUrl}
            alt={userName || 'Avatar do usuário'}
            size="2xl"
            fallbackInitials={userName}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 p-2.5 rounded-full border-2 border-white/20 bg-gradient-to-r from-[#00FF41] to-[#00CC34] text-black shadow-neon hover:shadow-neon-lg transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Alterar foto de perfil"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">
            JPG, PNG ou WebP • Máx. 2MB
          </p>
          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Remover foto atual
            </button>
          )}
        </div>
      </div>

      {/* Modal de Preview e Confirmação */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pt-24">
          <div className="glass-card max-w-md w-full p-6 space-y-6 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Confirmar nova foto</h3>
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="btn-ghost-glass px-2 py-2 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview da imagem */}
            <div className="flex justify-center">
              {previewUrl && (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-48 w-48 rounded-full object-cover border-4 border-white/10"
                  />
                </div>
              )}
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-200">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Informações do arquivo */}
            {selectedFile && (
              <div className="surface-muted rounded-xl p-3 text-sm text-gray-300 space-y-1">
                <p><span className="text-gray-500">Arquivo:</span> {selectedFile.name}</p>
                <p><span className="text-gray-500">Tamanho:</span> {(selectedFile.size / 1024).toFixed(1)} KB</p>
                <p><span className="text-gray-500">Tipo:</span> {selectedFile.type}</p>
              </div>
            )}

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="btn-ghost-glass flex-1 justify-center disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="btn-primary-glow flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AvatarUpload;
