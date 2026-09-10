import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';

import { authInterceptor } from '@/shared/core/http/auth.interceptor';

import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideArrowLeft,
  lucideBell,
  lucideBuilding,
  lucideBuilding2,
  lucideCalendar,
  lucideCalendarDays,
  lucideCheckCircle,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronUp,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCircleAlert,
  lucideEllipsis,
  lucideHome,
  lucideInbox,
  lucideLock,
  lucideLogOut,
  lucideMenu,
  lucideMoon,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideSettings,
  lucideSlash,
  lucideSun,
  lucideTrash2,
  lucideTriangleAlert,
  lucideUser,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: OVERLAY_DEFAULT_CONFIG,
      useValue: { usePopover: false },
    },
    provideIcons({
      lucideAlertCircle,
      lucideArrowLeft,
      lucideBell,
      lucideBuilding,
      lucideBuilding2,
      lucideCalendar,
      lucideCalendarDays,
      lucideCheckCircle,
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronUp,
      lucideChevronsLeft,
      lucideChevronsRight,
      lucideCircleAlert,
      lucideEllipsis,
      lucideHome,
      lucideInbox,
      lucideLock,
      lucideLogOut,
      lucideMenu,
      lucideMoon,
      lucidePencil,
      lucidePlus,
      lucideRefreshCw,
      lucideSearch,
      lucideSettings,
      lucideSlash,
      lucideSun,
      lucideTrash2,
      lucideTriangleAlert,
      lucideUser,
      lucideUsers,
      lucideX,
    }),
  ],
};
