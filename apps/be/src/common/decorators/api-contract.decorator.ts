import { applyDecorators, SetMetadata } from '@nestjs/common';
import {
  ApiExtension,
  ApiOperation,
  ApiResponse,
  type ApiResponseOptions,
} from '@nestjs/swagger';
import { Idempotent } from './idempotent.decorator.js';
import { Roles } from './roles.decorator.js';
import type { SystemRole } from '../constants/system-role.js';

export const API_OPERATION_ID_KEY = 'dens-cakra:operation-id';

type ApiContractOptions = {
  operationId: string;
  contractId: string;
  summary: string;
  access?: 'authenticated' | 'public-internal' | 'public-signed';
  roles?: readonly SystemRole[];
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
    ApiExtension('x-access', options.access ?? 'authenticated'),
    ApiExtension('x-roles', options.roles ?? []),
    ApiResponse({
      status: options.successStatus ?? 200,
      description: 'Operation completed successfully.',
      ...(options.response ?? {}),
    }),
  ];

  if (options.roles?.length) {
    decorators.push(Roles(...options.roles));
  }

  if (options.idempotent) {
    decorators.push(Idempotent(options.contractId));
  }

  return applyDecorators(...decorators);
}
