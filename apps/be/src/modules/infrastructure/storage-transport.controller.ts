import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Put,
  StreamableFile,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LocalStorageService } from './local-storage.service.js';

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
  download(@Param('token') token: string): StreamableFile {
    const payload = this.storage.verifyToken(token, 'download');
    return new StreamableFile(this.storage.openReadStream(payload.storageKey));
  }
}
