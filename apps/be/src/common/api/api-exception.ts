import { HttpException } from '@nestjs/common';

export type ApiFieldError = {
  field: string;
  code: string;
  message: string;
};

export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: number,
    public readonly fields?: ApiFieldError[],
    public readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }
}
