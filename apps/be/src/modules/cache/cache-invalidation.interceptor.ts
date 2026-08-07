import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { ApplicationCacheService } from './application-cache.service.js';

const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: ApplicationCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const method = context
      .switchToHttp()
      .getRequest<{ method?: string }>().method;
    if (!method || READ_ONLY_METHODS.has(method.toUpperCase())) {
      return next.handle();
    }

    return next.handle().pipe(
      mergeMap(async (value) => {
        await this.cache.invalidate(
          'dashboard-briefing',
          'field-officer-summary',
          'map-markers',
        );
        return value;
      }),
    );
  }
}
