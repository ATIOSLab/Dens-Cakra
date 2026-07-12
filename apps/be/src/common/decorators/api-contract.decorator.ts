import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiExtension,
  ApiOperation,
  ApiResponse,
  type ApiResponseOptions,
} from '@nestjs/swagger';
import { RequirePermissions } from './permission.decorator.js';
import { Idempotent } from './idempotent.decorator.js';

export const API_OPERATION_ID_KEY = 'dens-cakra:operation-id';

type ApiContractOptions = {
  operationId: string;
  contractId: string;
  summary: string;
  permission?: string;
  successStatus?: number;
  response?: ApiResponseOptions;
  idempotent?: boolean;
};

export function ApiContract(options: ApiContractOptions) {
  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [
    SetMetadata(API_OPERATION_ID_KEY, options.contractId),
    ApiOperation({
      operationId: options.operationId,
      summary: options.summary,
    }),
    ApiExtension('x-operation-id', options.contractId),
    ApiExtension('x-permission', options.permission ?? 'authenticated'),
    ApiResponse({
      status: options.successStatus ?? 200,
      description: 'Operation completed successfully.',
      ...(options.response ?? {}),
    }),
  ];

  if (
    options.permission &&
    !['authenticated', 'public-internal', 'public-signed'].includes(
      options.permission,
    )
  ) {
    decorators.push(RequirePermissions(options.permission));
  }

  if (options.idempotent) {
    decorators.push(Idempotent(options.contractId));
  }

  return applyDecorators(...decorators);
}
