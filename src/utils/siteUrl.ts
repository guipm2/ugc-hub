export const resolveSiteUrl = () => {
  const envUrl = import.meta.env.VITE_SITE_URL;

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // Fallback para o domínio Netlify padrão caso esteja fora do navegador
  return 'https://turbocontent.netlify.app';
};
