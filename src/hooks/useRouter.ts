import { useState, useEffect } from 'react';
import { router } from '../utils/router';

export const useRouter = () => {
  const [currentPath, setCurrentPath] = useState(router.getCurrentPath());

  useEffect(() => {
    const updatePath = () => {
      setCurrentPath(router.getCurrentPath());
    };

    router.addListener(updatePath);

    return () => {
      router.removeListener(updatePath);
    };
  }, []);

  const navigate = (path: string) => {
    router.navigate(path);
  };

  return {
    currentPath,
    navigate
  };
};