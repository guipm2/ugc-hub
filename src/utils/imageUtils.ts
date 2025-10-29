// Utilitário para redimensionar imagens antes do upload
// Reduz o tamanho do arquivo e melhora performance

interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export const resizeImage = (
  file: File,
  options: ResizeImageOptions = {}
): Promise<File> => {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.9,
    outputFormat = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calcular dimensões mantendo aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao converter imagem'));
              return;
            }

            // Criar novo arquivo com nome original
            const resizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${outputFormat.split('/')[1]}`),
              { type: outputFormat }
            );

            resolve(resizedFile);
          },
          outputFormat,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'));
    };

    reader.readAsDataURL(file);
  });
};

// Função auxiliar para criar thumbnail quadrado (crop central)
export const createSquareThumbnail = (
  file: File,
  size: number = 400,
  quality: number = 0.9
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Calcular crop central
        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        // Desenhar imagem cropada e redimensionada
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao converter imagem'));
              return;
            }

            const thumbnailFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '.webp'),
              { type: 'image/webp' }
            );

            resolve(thumbnailFile);
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'));
    };

    reader.readAsDataURL(file);
  });
};

// Utilitário para obter informações da imagem
export const getImageInfo = (file: File): Promise<{
  width: number;
  height: number;
  aspectRatio: number;
  size: number;
  type: string;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          size: file.size,
          type: file.type
        });
      };

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'));
    };

    reader.readAsDataURL(file);
  });
};
