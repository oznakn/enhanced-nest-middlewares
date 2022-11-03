import { MIDDLEWARE_KEY } from './constants';
import { extendArrayMetadata, isFunction, validateEach } from './helpers';
import { Middleware } from './middleware.interface';

const isMiddlewareValid = <T extends Function | Record<string, any>>(
  middleware: T,
) => middleware
  && (isFunction(middleware)
    || isFunction((middleware as Record<string, any>).use));

export function UseMiddlewares(
  ...middlewares: (Middleware | Function)[]
): MethodDecorator & ClassDecorator {
  return (
    target: any,
    _key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      validateEach(
        target.constructor,
        middlewares,
        isMiddlewareValid,
        '@UseMiddlewares',
        'middleware',
      );

      extendArrayMetadata(MIDDLEWARE_KEY, middlewares, descriptor.value);

      return descriptor;
    }
    validateEach(target, middlewares, isMiddlewareValid, '@UseMiddlewares', 'middleware');
    extendArrayMetadata(MIDDLEWARE_KEY, middlewares, target);

    return target;
  };
}
