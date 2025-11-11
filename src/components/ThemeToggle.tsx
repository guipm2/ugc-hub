import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle = () => {
  const { theme, toggleTheme, isDarkModeAvailable } = useTheme();

  if (!isDarkModeAvailable) {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-9 w-16 items-center rounded-full border border-gray-300 bg-gray-100 px-1 transition-colors duration-300 ease-in-out hover:border-gray-400 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:bg-gray-700"
      aria-label={`Ativar modo ${isDark ? 'claro' : 'escuro'}`}
    >
      <span
        className={`absolute inset-y-1 z-10 flex w-7 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out dark:bg-gray-900 ${
          isDark ? 'translate-x-7' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-[#00FF41]" />
        ) : (
          <Sun className="h-4 w-4 text-amber-400" />
        )}
      </span>

      <div className="flex w-full justify-between px-2 text-gray-400 dark:text-gray-500">
        <Sun
          className={`h-4 w-4 transition-opacity duration-300 ${
            isDark ? 'opacity-0' : 'opacity-100 text-amber-500'
          }`}
        />
        <Moon
          className={`h-4 w-4 transition-opacity duration-300 ${
            isDark ? 'opacity-100 text-[#00FF41]' : 'opacity-0'
          }`}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
