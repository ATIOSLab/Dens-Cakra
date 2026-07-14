import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiExceptionFilter } from './common/api/api-exception.filter.js';
import { ApiResponseInterceptor } from './common/api/api-response.interceptor.js';
import { IdempotencyInterceptor } from './common/api/idempotency.interceptor.js';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware.js';
import { AccessModule } from './modules/access/access.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { SpatialModule } from './modules/spatial/spatial.module.js';
import { RuntimeModule } from './modules/runtime/runtime.module.js';
import { InfrastructureModule } from './modules/infrastructure/infrastructure.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { UserProfileModule } from './modules/users/user-profile.module.js';
import { RbacModule } from './modules/rbac/rbac.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { PositionModule } from './modules/positions/position.module.js';
import { AreaModule } from './modules/areas/area.module.js';
import { FileModule } from './modules/files/file.module.js';
import { NotificationModule } from './modules/notifications/notification.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { IntegrationModule } from './modules/integrations/integration.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { TaskModule } from './modules/tasks/task.module.js';
import { JaringModule } from './modules/jaring/jaring.module.js';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module.js';
import { DirectiveModule } from './modules/directives/directive.module.js';
import { UukModule } from './modules/uuk/uuk.module.js';
import { BaketModule } from './modules/baket/baket.module.js';
import { AnalysisModule } from './modules/analysis/analysis.module.js';
import { IntelligenceProductsModule } from './modules/intelligence-products/intelligence-products.module.js';
import { MapMarkersModule } from './modules/map-markers/map-markers.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 20 },
      { name: 'default', ttl: 60_000, limit: 300 },
    ]),
    PrismaModule,
    RuntimeModule,
    InfrastructureModule,
    HealthModule,
    AuthModule,
    AccessModule,
    SpatialModule,
    IdentityModule,
    UserProfileModule,
    RbacModule,
    OrganizationModule,
    PositionModule,
    AreaModule,
    FileModule,
    NotificationModule,
    AuditModule,
    IntegrationModule,
    SystemModule,
    DirectiveModule,
    UukModule,
    BaketModule,
    AnalysisModule,
    IntelligenceProductsModule,
    MapMarkersModule,
    TaskModule,
    JaringModule,
    WhatsAppModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
