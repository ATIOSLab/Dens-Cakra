import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_OPERATION_KEY = 'dens-cakra:idempotency-operation';

export const Idempotent = (operationId: string) =>
  SetMetadata(IDEMPOTENCY_OPERATION_KEY, operationId);
