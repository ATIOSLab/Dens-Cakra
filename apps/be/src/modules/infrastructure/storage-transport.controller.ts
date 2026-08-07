import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Put,
  Req,
  Res,
  StreamableFile,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { LocalStorageService } from './local-storage.service.js';

export function parseStorageByteRange(value: string | undefined, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return undefined;

  const requestedStart = match[1] ? Number(match[1]) : null;
  const requestedEnd = match[2] ? Number(match[2]) : null;
  const start = requestedStart ?? Math.max(0, size - (requestedEnd ?? 0));
  const end =
    requestedStart === null
      ? size - 1
      : Math.min(requestedEnd ?? size - 1, size - 1);

  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= size
  ) {
    return undefined;
  }
  return { start, end };
}

@ApiExcludeController()
@Controller({ path: 'storage', version: VERSION_NEUTRAL })
export class StorageTransportController {
  constructor(private readonly storage: LocalStorageService) {}

  @Put('uploads/:token')
  @HttpCode(204)
  async upload(
    @Param('token') token: string,
    @Body() body: Buffer,
  ): Promise<void> {
    const payload = this.storage.verifyToken(token, 'upload');
    await this.storage.write(payload.storageKey, body);
  }

  @Get('files/:token')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('token') token: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile | undefined> {
    const payload = this.storage.verifyToken(token, 'download');
    const size = await this.storage.size(payload.storageKey);
    const range = parseStorageByteRange(request.headers.range, size);
    response.setHeader('Accept-Ranges', 'bytes');

    if (range === undefined) {
      response.status(416);
      response.setHeader('Content-Range', `bytes */${size}`);
      return undefined;
    }

    if (range) {
      response.status(206);
      response.setHeader(
        'Content-Range',
        `bytes ${range.start}-${range.end}/${size}`,
      );
      response.setHeader('Content-Length', String(range.end - range.start + 1));
      return new StreamableFile(
        this.storage.openReadRange(payload.storageKey, range.start, range.end),
      );
    }

    response.setHeader('Content-Length', String(size));
    return new StreamableFile(this.storage.openReadStream(payload.storageKey));
  }
}
