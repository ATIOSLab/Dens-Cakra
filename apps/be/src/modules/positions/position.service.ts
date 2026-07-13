import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import type {
  AssignmentListQueryDto,
  CreatePositionAssignmentDto,
  CreatePositionDto,
  PositionListQueryDto,
  ReplaceAssignmentScopesDto,
  UpdatePositionDto,
} from './dto/position.dto.js';
import { PositionMutationService } from './position-mutation.service.js';
import { PositionQueryService } from './position-query.service.js';

@Injectable()
export class PositionService {
  constructor(
    private readonly positionQuery: PositionQueryService,
    private readonly positionMutation: PositionMutationService,
  ) {}

  list(query: PositionListQueryDto, context?: AuthorizationContext) {
    return this.positionQuery.list(query, context);
  }

  async create(input: CreatePositionDto, actor: AuthorizationContext) {
    const id = await this.positionMutation.create(input, actor);
    return this.positionQuery.detail(id);
  }

  detail(id: string, context?: AuthorizationContext) {
    return this.positionQuery.detail(id, context);
  }

  async update(
    id: string,
    input: UpdatePositionDto,
    actor: AuthorizationContext,
  ) {
    await this.positionMutation.update(id, input, actor);
    return this.positionQuery.detail(id);
  }

  async changeReportingLine(
    id: string,
    supervisorId: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    await this.positionMutation.changeReportingLine(
      id,
      supervisorId,
      reason,
      actor,
    );
    return this.positionQuery.detail(id);
  }

  subordinates(
    id: string,
    recursive: boolean,
    depth?: number,
    context?: AuthorizationContext,
  ) {
    return this.positionQuery.subordinates(id, recursive, depth, context);
  }

  reportingChain(id: string) {
    return this.positionQuery.reportingChain(id);
  }

  commandNetwork(context: AuthorizationContext) {
    return this.positionQuery.commandNetwork(context);
  }

  assignments(query: AssignmentListQueryDto, context?: AuthorizationContext) {
    return this.positionQuery.assignments(query, context);
  }

  async createAssignment(
    input: CreatePositionAssignmentDto,
    actor: AuthorizationContext,
  ) {
    const id = await this.positionMutation.createAssignment(input, actor);
    return this.positionQuery.assignment(id);
  }

  assignment(id: string, context?: AuthorizationContext) {
    return this.positionQuery.assignment(id, context);
  }

  async closeAssignment(
    id: string,
    validUntil: Date,
    reason: string,
    actor: AuthorizationContext,
  ) {
    await this.positionMutation.closeAssignment(id, validUntil, reason, actor);
    return this.positionQuery.assignment(id);
  }

  async setPrimary(id: string, reason: string, actor: AuthorizationContext) {
    await this.positionMutation.setPrimary(id, reason, actor);
    return this.positionQuery.assignment(id);
  }

  scopes(id: string, activeOnly = true) {
    return this.positionQuery.scopes(id, activeOnly);
  }

  validateScopes(id: string, areaIds: string[]) {
    return this.positionMutation.validateScopes(id, areaIds);
  }

  async replaceScopes(
    id: string,
    input: ReplaceAssignmentScopesDto,
    actor: AuthorizationContext,
  ) {
    await this.positionMutation.replaceScopes(id, input, actor);
    return this.positionQuery.scopes(id);
  }
}
