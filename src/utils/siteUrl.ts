export const resolveSiteUrl = () => {
  const envUrl = import.meta.env.VITE_SITE_URL;

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // Fallback genérico - configure VITE_SITE_URL nas variáveis de ambiente
  return 'http://localhost:5173';
};
