import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, GripVertical } from 'lucide-react';
import { useOpportunityImages } from '../../hooks/useOpportunityImages';

interface OpportunityImage {
  id: string;
  opportunity_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

interface OpportunityImageUploadProps {
  opportunityId: string;
  onImagesChange?: (images: OpportunityImage[]) => void;
  disabled?: boolean;
}

const OpportunityImageUpload: React.FC<OpportunityImageUploadProps> = ({
  opportunityId,
  onImagesChange,
  disabled = false
}) => {
  const {
    images,
    uploadProgress,
    error,
    fetchImages,
    uploadImages,
    deleteImage,
    reorderImages,
    maxImages,
    remainingSlots
  } = useOpportunityImages();

  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar imagens existentes ao montar
  React.useEffect(() => {
    if (opportunityId) {
      fetchImages(opportunityId);
    }
  }, [opportunityId, fetchImages]);

  // Notificar mudanças
  React.useEffect(() => {
    if (onImagesChange) {
      onImagesChange(images);
    }
  }, [images, onImagesChange]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const fileArray = Array.from(files);
    
    try {
      await uploadImages(fileArray, opportunityId);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (disabled) return;
    
    try {
      await deleteImage(imageId);
    } catch (err) {
      console.error('Erro ao deletar imagem:', err);
    }
  };

  // Drag and drop para reordenação
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOverImage = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    reorderImages(newImages.map((img, i) => ({ ...img, display_order: i })));
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all
          ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 bg-white/5'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400/50'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <Upload className="h-8 w-8 text-indigo-200" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">
              Arraste imagens ou clique para selecionar
            </p>
            <p className="text-xs text-gray-400 mt-1">
              JPEG, PNG ou WebP • Máx. 5MB por imagem • Até {maxImages} imagens
            </p>
            {remainingSlots < maxImages && (
              <p className="text-xs text-indigo-200 mt-1">
                {remainingSlots} {remainingSlots === 1 ? 'espaço disponível' : 'espaços disponíveis'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="surface-muted border border-red-300/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-200 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-100">Erro no upload</p>
            <p className="text-xs text-red-200/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress, index) => (
            <div
              key={index}
              className="surface-muted border border-white/12 rounded-2xl p-3 flex items-center gap-3"
            >
              <ImageIcon className="h-4 w-4 text-indigo-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/90 truncate">{progress.fileName}</p>
                {progress.status === 'uploading' && (
                  <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 transition-all duration-300"
                      style={{ width: `${progress.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {progress.status === 'success' && (
                  <span className="text-xs text-emerald-200">✓</span>
                )}
                {progress.status === 'error' && (
                  <span className="text-xs text-red-200">✗</span>
                )}
                {progress.status === 'uploading' && (
                  <span className="text-xs text-indigo-200">{progress.progress}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-500">
              Imagens da Oportunidade ({images.length}/{maxImages})
            </p>
            <p className="text-xs text-gray-400">
              Arraste para reordenar
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable={!disabled}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOverImage(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group aspect-square rounded-2xl overflow-hidden
                  border-2 transition-all
                  ${draggedIndex === index ? 'border-indigo-400 opacity-50' : 'border-white/12'}
                  ${disabled ? 'cursor-default' : 'cursor-move'}
                `}
              >
                <img
                  src={image.image_url}
                  alt={`Imagem ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Overlay com ações */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleDeleteImage(image.id)}
                    disabled={disabled}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remover imagem"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>

                {/* Indicador de ordem */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-lg flex items-center gap-1">
                  <GripVertical className="h-3 w-3 text-white/70" />
                  <span className="text-xs text-white font-semibold">{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpportunityImageUpload;
