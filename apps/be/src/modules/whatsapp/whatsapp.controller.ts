import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service.js';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('bot/status')
  getBotStatus() {
    return this.whatsappService.getBotStatus();
  }

  @Post('bot/request-qr')
  requestNewQr() {
    return this.whatsappService.requestNewQr();
  }

  @Post('tasks/broadcast')
  broadcastTask(
    @Headers('x-field-officer-id') fieldOfficerId: string | undefined,
    @Body() body: { taskId: string; title: string; instruction: string },
  ) {
    if (!fieldOfficerId) throw new BadRequestException('Header x-field-officer-id wajib diisi');
    return this.whatsappService.broadcastTask(fieldOfficerId, body);
  }

  @Get('users')
  listUsers(@Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.listUsers(fieldOfficerId);
  }

  @Post('users')
  createUser(
    @Body() body: Parameters<WhatsappService['createUser']>[0],
    @Headers('x-field-officer-id') fieldOfficerId?: string,
  ) {
    return this.whatsappService.createUser(body, fieldOfficerId);
  }

  @Patch('users/:id/field-officer-credentials')
  updateFieldOfficerCredentials(
    @Param('id') id: string,
    @Body() body: Parameters<WhatsappService['updateFieldOfficerCredentials']>[1],
  ) {
    return this.whatsappService.updateFieldOfficerCredentials(Number(id), body);
  }

  @Patch('users/:id/jaring')
  updateJaring(
    @Param('id') id: string,
    @Body() body: Parameters<WhatsappService['updateJaring']>[1],
    @Headers('x-field-officer-id') fieldOfficerId?: string,
  ) {
    return this.whatsappService.updateJaring(Number(id), body, fieldOfficerId);
  }

  @Post('users/:id/regenerate-pin')
  regeneratePin(@Param('id') id: string, @Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.regeneratePin(Number(id), fieldOfficerId);
  }

  @Delete('users/:id')
  removeUser(@Param('id') id: string, @Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.removeUser(Number(id), fieldOfficerId);
  }

  @Get('reports')
  listReports(@Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.listReports(fieldOfficerId);
  }

  @Post('reports')
  createReport(@Body() body: Parameters<WhatsappService['createReport']>[0]) {
    return this.whatsappService.createReport(body);
  }

  @Get('reports/stats')
  getReportStats(@Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.getReportStats(fieldOfficerId);
  }

  @Patch('reports/:id/status')
  updateReportStatus(
    @Param('id') id: string,
    @Body() body: { status?: 'PENDING' | 'VERIFIED' | 'INVALID' },
    @Headers('x-field-officer-id') fieldOfficerId?: string,
  ) {
    return this.whatsappService.updateReportStatus(Number(id), body.status || 'PENDING', fieldOfficerId);
  }

  @Delete('reports/:id')
  removeReport(@Param('id') id: string, @Headers('x-field-officer-id') fieldOfficerId?: string) {
    return this.whatsappService.removeReport(Number(id), fieldOfficerId);
  }
}
