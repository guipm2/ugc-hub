import React from 'react';
import { User } from 'lucide-react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  fallbackInitials?: string;
  className?: string;
  onClick?: () => void;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-24 w-24 text-3xl'
};

const iconSizeClasses: Record<AvatarSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
  '2xl': 'h-12 w-12'
};

const getInitials = (name?: string): string => {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  size = 'md',
  fallbackInitials,
  className = '',
  onClick
}) => {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const initials = getInitials(fallbackInitials);
  const showFallback = !src || imageError;

  React.useEffect(() => {
    if (!src) {
      setImageLoading(false);
      setImageError(false);
      return;
    }

    // Reset states
    setImageError(false);
    setImageLoading(true);

    // Se a imagem já estiver carregada no cache, marca como carregada imediatamente
    const img = imgRef.current;
    if (img && img.complete && img.naturalHeight !== 0) {
      setImageLoading(false);
    }

    // Timeout de segurança: se após 5s ainda não carregou, assume erro
    const timeoutId = setTimeout(() => {
      setImageLoading(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [src]);

  const baseClasses = `
    relative inline-flex items-center justify-center
    rounded-full overflow-hidden
    border-2 border-white/10
    bg-gradient-to-br from-[#00FF41]/20 via-[#00CC34]/20 to-[#00FF41]/20
    ${sizeClasses[size]}
    ${onClick ? 'cursor-pointer hover:border-white/30 transition-all' : ''}
    ${className}
  `;

  if (showFallback) {
    return (
      <div className={baseClasses} onClick={onClick}>
        {initials ? (
          <span className="font-semibold text-white/90 select-none">
            {initials}
          </span>
        ) : (
          <User className={`${iconSizeClasses[size]} text-white/60`} />
        )}
      </div>
    );
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 z-10">
          <div className="h-4 w-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onLoad={() => {
          setImageLoading(false);
        }}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        crossOrigin="anonymous"
      />
    </div>
  );
};

export default Avatar;
