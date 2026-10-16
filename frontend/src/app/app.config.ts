import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // New pages open at the top (also when only the painting changes and the
    // same component is reused); Back/Forward restore the previous position.
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),
    // Deliberately not withFetch(): on the server, Node's fetch keeps a
    // keep-alive timer running after each API call and Angular waits for it
    // before finishing the render, adding ~3 s to every uncached page. The
    // XHR path closes its connection immediately.
    provideHttpClient(withInterceptors([authInterceptor])),
    // Reuses the server-rendered DOM instead of rebuilding it, and replays
    // GET responses from the server so the browser doesn't refetch them.
    provideClientHydration(),
    provideAnimations()
  ]
};
