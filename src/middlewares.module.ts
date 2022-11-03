import { DynamicModule, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { MiddlewaresInterceptor } from './middlewares.interceptor';

@Module({
  providers: [
    MiddlewaresInterceptor,
  ],
  exports: [
    MiddlewaresInterceptor,
  ],
})
export class MiddlewaresModule {
  static forRoot({ registerInterceptor }: { registerInterceptor?: boolean } = {}): DynamicModule {
    return {
      module: MiddlewaresModule,
      providers: registerInterceptor === false ? [] : [{
        provide: APP_INTERCEPTOR,
        useClass: MiddlewaresInterceptor,
      }],
    };
  }
}
