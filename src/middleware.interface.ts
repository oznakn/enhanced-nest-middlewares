import { Observable } from 'rxjs';
import { ExecutionContext } from '@nestjs/common';

export interface Middleware {
  use(context: ExecutionContext, next: ()=> Promise<void>): Promise<void> | Observable<void>;
}
