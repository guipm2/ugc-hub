export class Router {
  private static instance: Router;
  private listeners: (() => void)[] = [];

  private constructor() {
    window.addEventListener('popstate', () => {
      this.notifyListeners();
    });
  }

  static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  navigate(path: string) {
    window.history.pushState(null, '', path);
    this.notifyListeners();
  }

  getCurrentPath(): string {
    return window.location.pathname;
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: () => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const router = Router.getInstance();