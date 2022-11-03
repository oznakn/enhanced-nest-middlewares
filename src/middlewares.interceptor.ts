import createDebug from 'debug';
import { lastValueFrom, Observable } from 'rxjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ModuleRef, Reflector } from '@nestjs/core';

import { MIDDLEWARE_KEY } from './constants';

import type { CallHandler, CanActivate, ExecutionContext, NestInterceptor } from '@nestjs/common';

import type { Middleware } from './middleware.interface';

interface ClassType<T = any> extends Function {
  new (...args: any[]): T;
}

const debug = createDebug('enhanced-nest-middlewares');

const globalMiddlewares: Array<ClassType<Middleware>> = [];

async function pickResult<T>(result: T | Promise<T> | Observable<T>): Promise<T> {
  if (result instanceof Observable) {
    return lastValueFrom(result);
  }

  return result;
}

export function RegisterMiddleware({ isGlobal }: { isGlobal?: boolean } = {}): ClassDecorator {
  return (target: any) => {
    Injectable()(target);

    debug(`Registering middleware ${target.name}`);

    if (isGlobal === true) {
      globalMiddlewares.push(target);
    }
  };
}

@Injectable()
export class MiddlewaresInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  private async runGuards(context: ExecutionContext): Promise<void> {
    const guards = this.reflector.getAllAndMerge<ClassType<CanActivate>[]>(GUARDS_METADATA, [context.getHandler(), context.getClass()]);

    for (const guard of guards) {
      const guardInstance = this.moduleRef.get(guard, { strict: false });
      debug(`Running guard ${(guardInstance as any).constructor.name}`);

      const result = guardInstance.canActivate(context);

      // eslint-disable-next-line no-await-in-loop
      if (!await pickResult(result)) {
        throw new UnauthorizedException();
      }
    }
  }

  private async runMiddlewares(context: ExecutionContext, next: ()=>Promise<void>): Promise<void> {
    const middlewares = globalMiddlewares.concat(
      this.reflector.getAllAndMerge<ClassType<Middleware>[]>(MIDDLEWARE_KEY, [context.getHandler(), context.getClass()]),
    );

    let anchor = 0;
    const handler = async () => {
      if (anchor >= middlewares.length) {
        await next();
      } else {
        const middleware = middlewares[anchor++];

        const middlewareInstance = this.moduleRef.get(middleware, { strict: false });
        debug(`Running middleware ${(middlewareInstance as any).constructor.name}`);

        const result = middlewareInstance.use(context, handler);

        await pickResult(result);
      }
    };

    await handler();
  }

  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    debug('Running MiddlewareInterceptor');

    return new Observable<T>((observer) => {
      this.runMiddlewares(
        context,
        async () => {
          try {
            await this.runGuards(context);

            next.handle()
              .subscribe({
                next: async (result) => {
                  try {
                    observer.next(result);

                    observer.complete();
                  } catch (err) {
                    observer.error(err);
                  }
                },
                error: (err) => {
                  try {
                    observer.error(err);
                  } catch (err2) {
                    observer.error(err2);
                  }
                },
              });
          } catch (err) {
            observer.error(err);
          }
        },
      ).catch((err) => {
        observer.error(err);
      });
    });
  }
}
