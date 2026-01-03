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

declare global {
    interface Window {
        __WEB_ROOT__?: string;
    }
}

// 规范化 basepath
const getNormalizedRoot = () => {
    let root = (window.__WEB_ROOT__ && window.__WEB_ROOT__ !== "{{WEB_ROOT}}")
        ? window.__WEB_ROOT__
        : '/';

    // 确保以 / 开头
    if (!root.startsWith('/')) root = '/' + root;
    // 对于非根目录，移除末尾斜杠以适配 TanStack Router 的 basepath 习惯
    if (root.length > 1 && root.endsWith('/')) {
        root = root.slice(0, -1);
    }
    return root;
};

const basepath = getNormalizedRoot();

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