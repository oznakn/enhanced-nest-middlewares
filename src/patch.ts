import { GuardsConsumer } from '@nestjs/core/guards/guards-consumer';

GuardsConsumer.prototype.tryActivate = async () => true;
