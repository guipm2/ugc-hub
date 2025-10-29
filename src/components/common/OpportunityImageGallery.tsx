import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useOpportunityImages } from '../../hooks/useOpportunityImages';
import ModalPortal from './ModalPortal';

interface OpportunityImageGalleryProps {
  opportunityId: string;
  className?: string;
}

const OpportunityImageGallery: React.FC<OpportunityImageGalleryProps> = ({
  opportunityId,
  className = ''
}) => {
  const { images, loading, fetchImages } = useOpportunityImages();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (opportunityId) {
      fetchImages(opportunityId);
    }
  }, [opportunityId, fetchImages]);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;

      switch (e.key) {
        case 'Escape':
          setLightboxOpen(false);
          break;
        case 'ArrowLeft':
          setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
          break;
        case 'ArrowRight':
          setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, images.length]);

  if (loading) {
    return (
      <div className={`glass-card p-6 md:p-8 ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white/80"></div>
            <p className="text-sm text-gray-400">Carregando imagens...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    // Não exibir nada se não houver imagens
    return null;
  }

  return (
    <>
      <div className={className}>
        <div className="glass-section-title mb-4">
          <div className="icon-wrap">
            <ImageIcon className="h-5 w-5" />
          </div>
          <h2>Galeria de Imagens</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image.id}
              onClick={() => openLightbox(index)}
              className="aspect-square rounded-2xl overflow-hidden border-2 border-white/12 hover:border-indigo-400/50 transition-all group relative"
            >
              <img
                src={image.image_url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="text-white text-sm font-semibold">
                  Visualizar
                </div>
              </div>

              {/* Index badge */}
              {images.length > 1 && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-lg">
                  <span className="text-xs text-white font-semibold">{index + 1}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
              aria-label="Fechar"
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/70 rounded-full z-10">
                <span className="text-sm text-white font-semibold">
                  {currentImageIndex + 1} / {images.length}
                </span>
              </div>
            )}

            {/* Main image */}
            <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
              <img
                src={images[currentImageIndex].image_url}
                alt={`Imagem ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-full overflow-x-auto px-4">
                <div className="flex gap-2 p-2 bg-black/70 rounded-2xl backdrop-blur-sm">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`
                        flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                        ${index === currentImageIndex ? 'border-indigo-400 scale-110' : 'border-white/30 opacity-60 hover:opacity-100'}
                      `}
                    >
                      <img
                        src={image.image_url}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Click outside to close */}
            <div
              className="absolute inset-0 -z-10"
              onClick={closeLightbox}
            />
          </div>
        </ModalPortal>
      )}
    </>
  );
};

export default OpportunityImageGallery;
