import { ClassType } from './defs';
import { Middleware } from './middleware.interface';

export const globalMiddlewares: Array<ClassType<Middleware>> = [];

export function GlobalMiddleware(): ClassDecorator {
  return (target: any) => {
    globalMiddlewares.push(target);
  };
}
