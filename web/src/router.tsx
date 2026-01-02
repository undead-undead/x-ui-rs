import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { Dashboard } from './views/Dashboard.tsx';
import { InboundPage } from './views/InboundPage.tsx';
import { SettingsPage } from './views/SettingsPage.tsx';
import { LoginPage } from './views/LoginPage.tsx';
import { NotFound } from './views/NotFound.tsx';
import App from './App.tsx';

const rootRoute = createRootRoute({
    component: App,
    notFoundComponent: NotFound,
});

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Dashboard });
const inboundsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/inbounds', component: InboundPage });
const settingsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/settings', component: SettingsPage });
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: LoginPage });

const routeTree = rootRoute.addChildren([indexRoute, inboundsRoute, settingsRoute, loginRoute]);

const getPersistedWebRoot = () => {
    try {
        const stored = localStorage.getItem('x-ui-settings-storage');
        if (stored) {
            const parsed = JSON.parse(stored);
            const webRoot = parsed.state?.savedPanel?.webRoot;
            if (webRoot) {
                return webRoot;
            }
        }
    } catch (e) {
        console.error('Failed to parse webRoot from storage', e);
    }

    // 默认值：开发环境使用 /，生产环境使用 /
    return import.meta.env.DEV ? '/' : '/';
};

const basepath = getPersistedWebRoot();

export const router = createRouter({
    routeTree,
    basepath: basepath,
    defaultNotFoundComponent: NotFound,
});

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router;
    }
}