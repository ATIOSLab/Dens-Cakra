-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN_SYSTEM', 'EXECUTIVE', 'REGIONAL_COMMANDER', 'OPERATIONAL_INTELLIGENCE_MANAGER', 'FIELD_COORDINATOR', 'FIELD_OFFICER');

-- CreateEnum
CREATE TYPE "PositionCode" AS ENUM ('ADMIN', 'DEPUTI_II', 'DIREKTUR_WILAYAH', 'KABINDA', 'KASUBDIT', 'KABAGOPS', 'STAF_SUBDIT', 'KORWIL', 'PETUGAS_ORGANIK');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('DEPUTI', 'DIRECTORATE', 'SUBDIRECTORATE', 'BINDA', 'BAGOPS', 'FIELD_COORDINATION_UNIT', 'OTHER');

-- CreateEnum
CREATE TYPE "AdministrativeLevel" AS ENUM ('COUNTRY', 'PROVINCE', 'REGENCY', 'CITY', 'DISTRICT', 'VILLAGE', 'URBAN_VILLAGE', 'RW', 'RT');

-- CreateEnum
CREATE TYPE "CoordinateSource" AS ENUM ('WHATSAPP_LOCATION', 'DEVICE_GPS', 'MANUAL_PIN', 'MANUAL_COORDINATE', 'CORRECTED_BY_FIELD_OFFICER', 'SYSTEM_DERIVED');

-- CreateEnum
CREATE TYPE "AreaResolutionMethod" AS ENUM ('POLYGON_MATCH', 'PARENT_POLYGON_MATCH', 'NEAREST_CENTROID', 'MANUAL_CONFIRMATION', 'UNRESOLVED');

-- CreateEnum
CREATE TYPE "CoverageValidationStatus" AS ENUM ('NOT_CHECKED', 'WITHIN_SCOPE', 'OUTSIDE_JARING_SCOPE', 'OUTSIDE_FIELD_OFFICER_SCOPE', 'OUTSIDE_FIELD_OPERATOR_SCOPE', 'OUTSIDE_UNIT_SCOPE', 'BORDER_AMBIGUOUS');

-- CreateEnum
CREATE TYPE "BoundaryQualityStatus" AS ENUM ('VERIFIED', 'PARTIAL', 'SIMPLIFIED', 'MISSING', 'INVALID');

-- CreateEnum
CREATE TYPE "AreaScopeMode" AS ENUM ('NATIONAL', 'INHERIT_UNIT', 'INHERIT_PARENT_POSITION', 'EXPLICIT');

-- CreateEnum
CREATE TYPE "Classification" AS ENUM ('SANGAT_RAHASIA', 'RAHASIA', 'TERBATAS', 'BIASA');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "DirectiveStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISTRIBUTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'ACKNOWLEDGED', 'FAILED');

-- CreateEnum
CREATE TYPE "UukStrStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'REVISED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UukStrSectionType" AS ENUM ('BASIS_BACKGROUND', 'INVESTIGATION_TARGETS', 'EEI_PIR', 'COLLECTION_PLAN', 'THREAT_RISK_ANALYSIS', 'IMPLEMENTATION_MECHANISM', 'COORDINATION_REPORTING', 'RECOMMENDATION', 'AUTHENTICATION');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskAssignmentStatus" AS ENUM ('SENT', 'READ', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'REASSIGNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JaringStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('RECEIVED', 'UNKNOWN_SENDER', 'ROUTED', 'UNDER_REVIEW', 'PROCESSED', 'DUPLICATE', 'SPAM', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppValidationStatus" AS ENUM ('NOT_CHECKED', 'COMPLETE', 'MISSING_TITLE', 'MISSING_PHOTO', 'MISSING_GPS', 'MISSING_CONTENT', 'INVALID_FORMAT');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "BaketStatus" AS ENUM ('DRAFT', 'READY_TO_SEND', 'SENT_TO_OIM', 'UNDER_VERIFICATION', 'NEEDS_DEVELOPMENT', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RevisionRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESUBMITTED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'VERIFIED', 'NEEDS_DEVELOPMENT', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationCheckStatus" AS ENUM ('PASS', 'FAIL', 'WARNING', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "SourceReliability" AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');

-- CreateEnum
CREATE TYPE "InformationCredibility" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'VALIDATED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntelEntityType" AS ENUM ('PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'ISSUE', 'ASSET', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'READY_FOR_SUBMISSION', 'UNDER_REGIONAL_REVIEW', 'NEEDS_REVISION', 'APPROVED_REGIONAL', 'UNDER_EXECUTIVE_REVIEW', 'APPROVED_EXECUTIVE', 'DISTRIBUTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('REGIONAL', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "ApprovalWorkflowStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'NEEDS_REVISION', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('WAITING', 'ACTIVE', 'APPROVED', 'NEEDS_REVISION', 'REJECTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'NEEDS_REVISION', 'REJECT', 'REQUEST_CLARIFICATION');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'REVOKED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DIRECTIVE', 'TASK', 'WHATSAPP_REPORT', 'BAKET', 'VERIFICATION', 'PRODUCT', 'APPROVAL', 'REVISION', 'ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ASSIGN', 'ACKNOWLEDGE', 'VERIFY', 'APPROVE', 'REJECT', 'DISTRIBUTE', 'EXPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "EmergencyStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'VERIFIED', 'IN_PROGRESS', 'CONTROLLED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'ATTENTION', 'WARNING', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEGRADED', 'ERROR');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'field_officer',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "authUserId" TEXT NOT NULL,
    "username" VARCHAR(100),
    "fullName" VARCHAR(180),
    "phone" VARCHAR(30),
    "clearanceLevel" "Classification" NOT NULL DEFAULT 'TERBATAS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lockedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "code" "PositionCode" NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "roleId" UUID NOT NULL,
    "organizationUnitId" UUID NOT NULL,
    "reportsToPositionId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAssignment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAreaPolicy" (
    "id" UUID NOT NULL,
    "positionCode" "PositionCode" NOT NULL,
    "administrativeLevel" "AdministrativeLevel" NOT NULL,
    "scopeMode" "AreaScopeMode" NOT NULL DEFAULT 'EXPLICIT',
    "minimumAreas" INTEGER NOT NULL DEFAULT 1,
    "maximumAreas" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PositionAreaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionAreaScope" (
    "id" UUID NOT NULL,
    "positionAssignmentId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionAreaScope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeArea" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "officialCode" VARCHAR(30),
    "name" VARCHAR(180) NOT NULL,
    "level" "AdministrativeLevel" NOT NULL,
    "parentId" UUID,
    "centroidLatitude" DECIMAL(10,7),
    "centroidLongitude" DECIMAL(10,7),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeAreaClosure" (
    "ancestorId" UUID NOT NULL,
    "descendantId" UUID NOT NULL,
    "depth" INTEGER NOT NULL,

    CONSTRAINT "AdministrativeAreaClosure_pkey" PRIMARY KEY ("ancestorId","descendantId")
);

-- CreateTable
CREATE TABLE "AdministrativeAreaDataSource" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sourceType" VARCHAR(80) NOT NULL,
    "referenceUrl" VARCHAR(500),
    "versionLabel" VARCHAR(100),
    "effectiveDate" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checksumSha256" VARCHAR(64),
    "notes" TEXT,

    CONSTRAINT "AdministrativeAreaDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministrativeAreaBoundary" (
    "id" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "dataSourceId" UUID,
    "versionNumber" INTEGER NOT NULL,
    "boundary" geometry(MultiPolygon,4326) NOT NULL,
    "centroid" geometry(Point,4326),
    "minLatitude" DECIMAL(10,7),
    "minLongitude" DECIMAL(10,7),
    "maxLatitude" DECIMAL(10,7),
    "maxLongitude" DECIMAL(10,7),
    "qualityStatus" "BoundaryQualityStatus" NOT NULL DEFAULT 'VERIFIED',
    "simplificationToleranceMeters" DECIMAL(12,2),
    "geometryHash" VARCHAR(64),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdministrativeAreaBoundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAreaCoverage" (
    "id" UUID NOT NULL,
    "organizationUnitId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAreaCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileAsset" (
    "id" UUID NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "originalName" VARCHAR(255),
    "mimeType" VARCHAR(120) NOT NULL,
    "fileType" "FileType" NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" VARCHAR(64) NOT NULL,
    "createdByAssignmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Directive" (
    "id" UUID NOT NULL,
    "ownerUnitId" UUID NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "status" "DirectiveStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Directive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectiveVersion" (
    "id" UUID NOT NULL,
    "directiveId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "commandNumber" VARCHAR(120) NOT NULL,
    "classification" "Classification" NOT NULL,
    "commandSource" VARCHAR(250) NOT NULL,
    "commandIssuer" VARCHAR(250) NOT NULL,
    "commandDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "strategicIssue" TEXT,
    "commandDescription" TEXT NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectiveVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectiveTargetArea" (
    "directiveVersionId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DirectiveTargetArea_pkey" PRIMARY KEY ("directiveVersionId","areaId")
);

-- CreateTable
CREATE TABLE "DirectiveRecipient" (
    "id" UUID NOT NULL,
    "directiveVersionId" UUID NOT NULL,
    "targetUnitId" UUID,
    "targetPositionId" UUID,
    "status" "RecipientStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "DirectiveRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UukStr" (
    "id" UUID NOT NULL,
    "directiveVersionId" UUID NOT NULL,
    "ownerUnitId" UUID NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "status" "UukStrStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UukStr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UukStrVersion" (
    "id" UUID NOT NULL,
    "uukStrId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UukStrVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UukStrSection" (
    "id" UUID NOT NULL,
    "uukStrVersionId" UUID NOT NULL,
    "sectionType" "UukStrSectionType" NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "orderNumber" INTEGER NOT NULL,

    CONSTRAINT "UukStrSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UukStrSectionItem" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "itemCode" VARCHAR(30) NOT NULL,
    "content" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,

    CONSTRAINT "UukStrSectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "parentTaskId" UUID,
    "directiveVersionId" UUID,
    "uukStrVersionId" UUID,
    "ownerUnitId" UUID NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "classification" "Classification" NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "dueDate" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTargetArea" (
    "taskId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TaskTargetArea_pkey" PRIMARY KEY ("taskId","areaId")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "assignerAssignmentId" UUID NOT NULL,
    "assigneeAssignmentId" UUID NOT NULL,
    "status" "TaskAssignmentStatus" NOT NULL DEFAULT 'SENT',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "assignmentNote" TEXT,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProgressLog" (
    "id" UUID NOT NULL,
    "taskAssignmentId" UUID NOT NULL,
    "status" "TaskAssignmentStatus" NOT NULL,
    "progressPercent" INTEGER,
    "note" TEXT,
    "createdByAssignmentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "taskId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("taskId","fileId")
);

-- CreateTable
CREATE TABLE "Jaring" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "aliasName" VARCHAR(150),
    "whatsappNumber" VARCHAR(30) NOT NULL,
    "status" "JaringStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByAssignmentId" UUID NOT NULL,
    "notes" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jaring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JaringCaretakerAssignment" (
    "id" UUID NOT NULL,
    "jaringId" UUID NOT NULL,
    "fieldOfficerAssignmentId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "transferReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JaringCaretakerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JaringAreaCoverage" (
    "id" UUID NOT NULL,
    "jaringId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "JaringAreaCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" UUID NOT NULL,
    "externalMessageId" VARCHAR(255) NOT NULL,
    "senderPhone" VARCHAR(30) NOT NULL,
    "jaringId" UUID,
    "routedToFieldOfficerAssignmentId" UUID,
    "title" VARCHAR(300),
    "content" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationPoint" geometry(Point,4326),
    "gpsAccuracyMeters" DECIMAL(10,2),
    "locationCapturedAt" TIMESTAMP(3),
    "coordinateSource" "CoordinateSource",
    "resolvedAreaId" UUID,
    "areaResolutionMethod" "AreaResolutionMethod" NOT NULL DEFAULT 'UNRESOLVED',
    "areaResolutionConfidence" DECIMAL(5,2),
    "areaResolvedAt" TIMESTAMP(3),
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "validationStatus" "WhatsAppValidationStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "rawPayload" JSONB NOT NULL,
    "contentChecksum" VARCHAR(64),
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageMedia" (
    "messageId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "caption" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WhatsAppMessageMedia_pkey" PRIMARY KEY ("messageId","fileId")
);

-- CreateTable
CREATE TABLE "WhatsAppRoutingLog" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "routedToAssignmentId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppRoutingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Baket" (
    "id" UUID NOT NULL,
    "createdByFieldOfficerAssignmentId" UUID NOT NULL,
    "taskAssignmentId" UUID,
    "primaryJaringId" UUID,
    "status" "BaketStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Baket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaketVersion" (
    "id" UUID NOT NULL,
    "baketId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "originalContent" TEXT NOT NULL,
    "normalizedContent" TEXT,
    "eventTime" TIMESTAMP(3),
    "eventAreaId" UUID,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationPoint" geometry(Point,4326),
    "gpsAccuracyMeters" DECIMAL(10,2),
    "locationCapturedAt" TIMESTAMP(3),
    "coordinateSource" "CoordinateSource",
    "areaResolutionMethod" "AreaResolutionMethod" NOT NULL DEFAULT 'UNRESOLVED',
    "areaResolutionConfidence" DECIMAL(5,2),
    "areaResolvedAt" TIMESTAMP(3),
    "manualAreaOverrideReason" TEXT,
    "coverageValidationStatus" "CoverageValidationStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "coverageValidationNote" TEXT,
    "coverageValidatedAt" TIMESTAMP(3),
    "urgency" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "fieldOfficerNote" TEXT,
    "createdByAssignmentId" UUID NOT NULL,
    "revisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaketVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaketSourceMessage" (
    "baketId" UUID NOT NULL,
    "messageId" UUID NOT NULL,

    CONSTRAINT "BaketSourceMessage_pkey" PRIMARY KEY ("baketId","messageId")
);

-- CreateTable
CREATE TABLE "BaketAttachment" (
    "baketId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "caption" TEXT,

    CONSTRAINT "BaketAttachment_pkey" PRIMARY KEY ("baketId","fileId")
);

-- CreateTable
CREATE TABLE "BaketRevisionRequest" (
    "id" UUID NOT NULL,
    "baketId" UUID NOT NULL,
    "requestedByAssignmentId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "requiredInformation" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "RevisionRequestStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaketRevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaketVerification" (
    "id" UUID NOT NULL,
    "baketVersionId" UUID NOT NULL,
    "verifiedByAssignmentId" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceReliability" "SourceReliability",
    "informationCredibility" "InformationCredibility",
    "summary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaketVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaketVerificationCheck" (
    "id" UUID NOT NULL,
    "verificationId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "status" "VerificationCheckStatus" NOT NULL,
    "note" TEXT,

    CONSTRAINT "BaketVerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaketVerificationCrossReference" (
    "id" UUID NOT NULL,
    "verificationId" UUID NOT NULL,
    "relatedBaketId" UUID,
    "externalRef" VARCHAR(500),
    "description" TEXT,

    CONSTRAINT "BaketVerificationCrossReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisCase" (
    "id" UUID NOT NULL,
    "ownerUnitId" UUID NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisSourceVerification" (
    "analysisCaseId" UUID NOT NULL,
    "verificationId" UUID NOT NULL,

    CONSTRAINT "AnalysisSourceVerification_pkey" PRIMARY KEY ("analysisCaseId","verificationId")
);

-- CreateTable
CREATE TABLE "AnalysisVersion" (
    "id" UUID NOT NULL,
    "analysisCaseId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "indications" TEXT,
    "analysis" TEXT,
    "impact" TEXT,
    "efforts" TEXT,
    "recommendations" TEXT,
    "aiDraft" JSONB,
    "createdByAssignmentId" UUID NOT NULL,
    "validatedByAssignmentId" UUID,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisEntity" (
    "id" UUID NOT NULL,
    "analysisVersionId" UUID NOT NULL,
    "entityType" "IntelEntityType" NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "normalizedName" VARCHAR(250),
    "metadata" JSONB,

    CONSTRAINT "AnalysisEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRelationship" (
    "id" UUID NOT NULL,
    "analysisVersionId" UUID NOT NULL,
    "fromEntityId" UUID NOT NULL,
    "toEntityId" UUID NOT NULL,
    "relationshipType" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "confidence" DECIMAL(5,2),

    CONSTRAINT "AnalysisRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTypeDefinition" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "formatNo" VARCHAR(30),
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTemplate" (
    "id" UUID NOT NULL,
    "productTypeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTemplateSection" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "isRepeatable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTemplateField" (
    "id" UUID NOT NULL,
    "sectionId" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "dataType" VARCHAR(50) NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "orderNumber" INTEGER NOT NULL,
    "validation" JSONB,

    CONSTRAINT "ProductTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceProduct" (
    "id" UUID NOT NULL,
    "productTypeId" UUID NOT NULL,
    "ownerUnitId" UUID NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "classification" "Classification" NOT NULL,
    "productNumber" VARCHAR(150) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersionNumber" INTEGER NOT NULL DEFAULT 1,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "IntelligenceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVersion" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "routingTo" TEXT,
    "routingFrom" TEXT,
    "routingCc" TEXT,
    "subject" VARCHAR(500),
    "sourceReliability" "SourceReliability",
    "informationCredibility" "InformationCredibility",
    "content" JSONB NOT NULL,
    "createdByAssignmentId" UUID NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSourceVerification" (
    "productVersionId" UUID NOT NULL,
    "verificationId" UUID NOT NULL,

    CONSTRAINT "ProductSourceVerification_pkey" PRIMARY KEY ("productVersionId","verificationId")
);

-- CreateTable
CREATE TABLE "ProductSourceAnalysis" (
    "productVersionId" UUID NOT NULL,
    "analysisVersionId" UUID NOT NULL,

    CONSTRAINT "ProductSourceAnalysis_pkey" PRIMARY KEY ("productVersionId","analysisVersionId")
);

-- CreateTable
CREATE TABLE "ProductAttachment" (
    "productVersionId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "caption" TEXT,

    CONSTRAINT "ProductAttachment_pkey" PRIMARY KEY ("productVersionId","fileId")
);

-- CreateTable
CREATE TABLE "ProductApprovalWorkflow" (
    "id" UUID NOT NULL,
    "productVersionId" UUID NOT NULL,
    "status" "ApprovalWorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "currentStepNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "ProductApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductApprovalStep" (
    "id" UUID NOT NULL,
    "workflowId" UUID NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stage" "ApprovalStage" NOT NULL,
    "targetPositionId" UUID NOT NULL,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'WAITING',
    "decision" "ApprovalDecision",
    "decisionNote" TEXT,
    "dueAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedByAssignmentId" UUID,

    CONSTRAINT "ProductApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductDistribution" (
    "id" UUID NOT NULL,
    "productVersionId" UUID NOT NULL,
    "sentByAssignmentId" UUID NOT NULL,
    "targetUnitId" UUID,
    "targetPositionId" UUID,
    "targetUserId" UUID,
    "classification" "Classification" NOT NULL,
    "status" "DistributionStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "failureReason" TEXT,

    CONSTRAINT "ProductDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyIncident" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "status" "EmergencyStatus" NOT NULL DEFAULT 'NEW',
    "severity" "AlertSeverity" NOT NULL,
    "areaId" UUID,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationPoint" geometry(Point,4326),
    "gpsAccuracyMeters" DECIMAL(10,2),
    "locationCapturedAt" TIMESTAMP(3),
    "coordinateSource" "CoordinateSource",
    "areaResolutionMethod" "AreaResolutionMethod" NOT NULL DEFAULT 'UNRESOLVED',
    "situation" TEXT NOT NULL,
    "actionTaken" TEXT,
    "needs" TEXT,
    "reportedByAssignmentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EmergencyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyAttachment" (
    "incidentId" UUID NOT NULL,
    "fileId" UUID NOT NULL,

    CONSTRAINT "EmergencyAttachment_pkey" PRIMARY KEY ("incidentId","fileId")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "areaId" UUID,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "locationPoint" geometry(Point,4326),
    "sourceBaketId" UUID,
    "sourceIncidentId" UUID,
    "assignedPositionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelLocationPing" (
    "id" UUID NOT NULL,
    "positionAssignmentId" UUID NOT NULL,
    "areaId" UUID,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "locationPoint" geometry(Point,4326) NOT NULL,
    "gpsAccuracyMeters" DECIMAL(10,2),
    "coordinateSource" "CoordinateSource" NOT NULL,
    "areaResolutionMethod" "AreaResolutionMethod" NOT NULL DEFAULT 'UNRESOLVED',
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStealth" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PersonnelLocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "actorAssignmentId" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entityType" VARCHAR(120) NOT NULL,
    "entityId" VARCHAR(100),
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "deviceInfo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationChannel" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "channelType" VARCHAR(80) NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'INACTIVE',
    "config" JSONB NOT NULL,
    "lastHealthAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationWebhookEvent" (
    "id" UUID NOT NULL,
    "channelId" UUID NOT NULL,
    "externalEventId" VARCHAR(255),
    "eventType" VARCHAR(120) NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "success" BOOLEAN,
    "errorMessage" TEXT,

    CONSTRAINT "IntegrationWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_identifier_value_key" ON "verification"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_authUserId_key" ON "user_profile"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_username_key" ON "user_profile"("username");

-- CreateIndex
CREATE INDEX "user_profile_isActive_deletedAt_idx" ON "user_profile"("isActive", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationUnit_code_key" ON "OrganizationUnit"("code");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parentId_idx" ON "OrganizationUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrganizationUnit_type_isActive_idx" ON "OrganizationUnit"("type", "isActive");

-- CreateIndex
CREATE INDEX "Position_organizationUnitId_code_idx" ON "Position"("organizationUnitId", "code");

-- CreateIndex
CREATE INDEX "Position_reportsToPositionId_idx" ON "Position"("reportsToPositionId");

-- CreateIndex
CREATE INDEX "PositionAssignment_userId_isActive_idx" ON "PositionAssignment"("userId", "isActive");

-- CreateIndex
CREATE INDEX "PositionAssignment_positionId_isActive_idx" ON "PositionAssignment"("positionId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PositionAreaPolicy_positionCode_administrativeLevel_key" ON "PositionAreaPolicy"("positionCode", "administrativeLevel");

-- CreateIndex
CREATE INDEX "PositionAreaScope_areaId_validUntil_idx" ON "PositionAreaScope"("areaId", "validUntil");

-- CreateIndex
CREATE INDEX "PositionAreaScope_positionAssignmentId_validUntil_idx" ON "PositionAreaScope"("positionAssignmentId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "PositionAreaScope_positionAssignmentId_areaId_validFrom_key" ON "PositionAreaScope"("positionAssignmentId", "areaId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeArea_officialCode_key" ON "AdministrativeArea"("officialCode");

-- CreateIndex
CREATE INDEX "AdministrativeArea_parentId_level_idx" ON "AdministrativeArea"("parentId", "level");

-- CreateIndex
CREATE INDEX "AdministrativeArea_name_idx" ON "AdministrativeArea"("name");

-- CreateIndex
CREATE INDEX "AdministrativeArea_level_isActive_idx" ON "AdministrativeArea"("level", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeArea_parentId_level_code_key" ON "AdministrativeArea"("parentId", "level", "code");

-- CreateIndex
CREATE INDEX "AdministrativeAreaClosure_descendantId_depth_idx" ON "AdministrativeAreaClosure"("descendantId", "depth");

-- CreateIndex
CREATE INDEX "AdministrativeAreaClosure_ancestorId_depth_idx" ON "AdministrativeAreaClosure"("ancestorId", "depth");

-- CreateIndex
CREATE INDEX "AdministrativeAreaDataSource_name_versionLabel_idx" ON "AdministrativeAreaDataSource"("name", "versionLabel");

-- CreateIndex
CREATE INDEX "AdministrativeAreaBoundary_areaId_isActive_effectiveFrom_idx" ON "AdministrativeAreaBoundary"("areaId", "isActive", "effectiveFrom");

-- CreateIndex
CREATE INDEX "AdministrativeAreaBoundary_dataSourceId_idx" ON "AdministrativeAreaBoundary"("dataSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AdministrativeAreaBoundary_areaId_versionNumber_key" ON "AdministrativeAreaBoundary"("areaId", "versionNumber");

-- CreateIndex
CREATE INDEX "OrganizationAreaCoverage_areaId_validUntil_idx" ON "OrganizationAreaCoverage"("areaId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationAreaCoverage_organizationUnitId_areaId_validFro_key" ON "OrganizationAreaCoverage"("organizationUnitId", "areaId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");

-- CreateIndex
CREATE INDEX "FileAsset_createdAt_idx" ON "FileAsset"("createdAt");

-- CreateIndex
CREATE INDEX "Directive_ownerUnitId_status_idx" ON "Directive"("ownerUnitId", "status");

-- CreateIndex
CREATE INDEX "DirectiveVersion_classification_commandDate_idx" ON "DirectiveVersion"("classification", "commandDate");

-- CreateIndex
CREATE UNIQUE INDEX "DirectiveVersion_directiveId_versionNumber_key" ON "DirectiveVersion"("directiveId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DirectiveVersion_commandNumber_versionNumber_key" ON "DirectiveVersion"("commandNumber", "versionNumber");

-- CreateIndex
CREATE INDEX "DirectiveTargetArea_areaId_idx" ON "DirectiveTargetArea"("areaId");

-- CreateIndex
CREATE INDEX "DirectiveRecipient_targetUnitId_status_idx" ON "DirectiveRecipient"("targetUnitId", "status");

-- CreateIndex
CREATE INDEX "DirectiveRecipient_targetPositionId_status_idx" ON "DirectiveRecipient"("targetPositionId", "status");

-- CreateIndex
CREATE INDEX "UukStr_ownerUnitId_status_idx" ON "UukStr"("ownerUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UukStrVersion_uukStrId_versionNumber_key" ON "UukStrVersion"("uukStrId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UukStrSection_uukStrVersionId_sectionType_key" ON "UukStrSection"("uukStrVersionId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "UukStrSection_uukStrVersionId_orderNumber_key" ON "UukStrSection"("uukStrVersionId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UukStrSectionItem_sectionId_orderNumber_key" ON "UukStrSectionItem"("sectionId", "orderNumber");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Task_ownerUnitId_status_idx" ON "Task"("ownerUnitId", "status");

-- CreateIndex
CREATE INDEX "Task_dueDate_status_idx" ON "Task"("dueDate", "status");

-- CreateIndex
CREATE INDEX "TaskTargetArea_areaId_idx" ON "TaskTargetArea"("areaId");

-- CreateIndex
CREATE INDEX "TaskAssignment_assigneeAssignmentId_status_idx" ON "TaskAssignment"("assigneeAssignmentId", "status");

-- CreateIndex
CREATE INDEX "TaskAssignment_taskId_status_idx" ON "TaskAssignment"("taskId", "status");

-- CreateIndex
CREATE INDEX "TaskProgressLog_taskAssignmentId_createdAt_idx" ON "TaskProgressLog"("taskAssignmentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Jaring_code_key" ON "Jaring"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Jaring_whatsappNumber_key" ON "Jaring"("whatsappNumber");

-- CreateIndex
CREATE INDEX "Jaring_status_deletedAt_idx" ON "Jaring"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "JaringCaretakerAssignment_jaringId_isActive_idx" ON "JaringCaretakerAssignment"("jaringId", "isActive");

-- CreateIndex
CREATE INDEX "JaringCaretakerAssignment_fieldOfficerAssignmentId_isActive_idx" ON "JaringCaretakerAssignment"("fieldOfficerAssignmentId", "isActive");

-- CreateIndex
CREATE INDEX "JaringAreaCoverage_areaId_validUntil_idx" ON "JaringAreaCoverage"("areaId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "JaringAreaCoverage_jaringId_areaId_validFrom_key" ON "JaringAreaCoverage"("jaringId", "areaId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_externalMessageId_key" ON "WhatsAppMessage"("externalMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_senderPhone_receivedAt_idx" ON "WhatsAppMessage"("senderPhone", "receivedAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_routedToFieldOfficerAssignmentId_status_idx" ON "WhatsAppMessage"("routedToFieldOfficerAssignmentId", "status");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_jaringId_receivedAt_idx" ON "WhatsAppMessage"("jaringId", "receivedAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_resolvedAreaId_receivedAt_idx" ON "WhatsAppMessage"("resolvedAreaId", "receivedAt");

-- CreateIndex
CREATE INDEX "WhatsAppRoutingLog_messageId_createdAt_idx" ON "WhatsAppRoutingLog"("messageId", "createdAt");

-- CreateIndex
CREATE INDEX "Baket_createdByFieldOfficerAssignmentId_status_idx" ON "Baket"("createdByFieldOfficerAssignmentId", "status");

-- CreateIndex
CREATE INDEX "Baket_taskAssignmentId_idx" ON "Baket"("taskAssignmentId");

-- CreateIndex
CREATE INDEX "BaketVersion_eventAreaId_eventTime_idx" ON "BaketVersion"("eventAreaId", "eventTime");

-- CreateIndex
CREATE INDEX "BaketVersion_coverageValidationStatus_createdAt_idx" ON "BaketVersion"("coverageValidationStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaketVersion_baketId_versionNumber_key" ON "BaketVersion"("baketId", "versionNumber");

-- CreateIndex
CREATE INDEX "BaketRevisionRequest_baketId_status_idx" ON "BaketRevisionRequest"("baketId", "status");

-- CreateIndex
CREATE INDEX "BaketVerification_verifiedByAssignmentId_status_idx" ON "BaketVerification"("verifiedByAssignmentId", "status");

-- CreateIndex
CREATE INDEX "BaketVerification_baketVersionId_createdAt_idx" ON "BaketVerification"("baketVersionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaketVerificationCheck_verificationId_code_key" ON "BaketVerificationCheck"("verificationId", "code");

-- CreateIndex
CREATE INDEX "BaketVerificationCrossReference_relatedBaketId_idx" ON "BaketVerificationCrossReference"("relatedBaketId");

-- CreateIndex
CREATE INDEX "AnalysisCase_ownerUnitId_status_idx" ON "AnalysisCase"("ownerUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisVersion_analysisCaseId_versionNumber_key" ON "AnalysisVersion"("analysisCaseId", "versionNumber");

-- CreateIndex
CREATE INDEX "AnalysisEntity_analysisVersionId_entityType_idx" ON "AnalysisEntity"("analysisVersionId", "entityType");

-- CreateIndex
CREATE INDEX "AnalysisRelationship_analysisVersionId_idx" ON "AnalysisRelationship"("analysisVersionId");

-- CreateIndex
CREATE INDEX "AnalysisRelationship_fromEntityId_toEntityId_idx" ON "AnalysisRelationship"("fromEntityId", "toEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTypeDefinition_code_key" ON "ProductTypeDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplate_productTypeId_versionNumber_key" ON "ProductTemplate"("productTypeId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplateSection_templateId_code_key" ON "ProductTemplateSection"("templateId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplateSection_templateId_orderNumber_key" ON "ProductTemplateSection"("templateId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplateField_sectionId_code_key" ON "ProductTemplateField"("sectionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTemplateField_sectionId_orderNumber_key" ON "ProductTemplateField"("sectionId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceProduct_productNumber_key" ON "IntelligenceProduct"("productNumber");

-- CreateIndex
CREATE INDEX "IntelligenceProduct_ownerUnitId_status_idx" ON "IntelligenceProduct"("ownerUnitId", "status");

-- CreateIndex
CREATE INDEX "IntelligenceProduct_productTypeId_createdAt_idx" ON "IntelligenceProduct"("productTypeId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_productId_versionNumber_key" ON "ProductVersion"("productId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProductApprovalWorkflow_productVersionId_key" ON "ProductApprovalWorkflow"("productVersionId");

-- CreateIndex
CREATE INDEX "ProductApprovalStep_targetPositionId_status_idx" ON "ProductApprovalStep"("targetPositionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductApprovalStep_workflowId_stepNumber_key" ON "ProductApprovalStep"("workflowId", "stepNumber");

-- CreateIndex
CREATE INDEX "ProductDistribution_productVersionId_status_idx" ON "ProductDistribution"("productVersionId", "status");

-- CreateIndex
CREATE INDEX "ProductDistribution_targetUserId_status_idx" ON "ProductDistribution"("targetUserId", "status");

-- CreateIndex
CREATE INDEX "EmergencyIncident_status_severity_idx" ON "EmergencyIncident"("status", "severity");

-- CreateIndex
CREATE INDEX "EmergencyIncident_areaId_createdAt_idx" ON "EmergencyIncident"("areaId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_status_severity_idx" ON "Alert"("status", "severity");

-- CreateIndex
CREATE INDEX "Alert_areaId_createdAt_idx" ON "Alert"("areaId", "createdAt");

-- CreateIndex
CREATE INDEX "PersonnelLocationPing_positionAssignmentId_capturedAt_idx" ON "PersonnelLocationPing"("positionAssignmentId", "capturedAt");

-- CreateIndex
CREATE INDEX "PersonnelLocationPing_areaId_capturedAt_idx" ON "PersonnelLocationPing"("areaId", "capturedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationChannel_code_key" ON "IntegrationChannel"("code");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEvent_channelId_receivedAt_idx" ON "IntegrationWebhookEvent"("channelId", "receivedAt");

-- CreateIndex
CREATE INDEX "IntegrationWebhookEvent_success_processedAt_idx" ON "IntegrationWebhookEvent"("success", "processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_authUserId_fkey" FOREIGN KEY ("authUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_reportsToPositionId_fkey" FOREIGN KEY ("reportsToPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAssignment" ADD CONSTRAINT "PositionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAssignment" ADD CONSTRAINT "PositionAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAreaScope" ADD CONSTRAINT "PositionAreaScope_positionAssignmentId_fkey" FOREIGN KEY ("positionAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionAreaScope" ADD CONSTRAINT "PositionAreaScope_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeArea" ADD CONSTRAINT "AdministrativeArea_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAreaClosure" ADD CONSTRAINT "AdministrativeAreaClosure_ancestorId_fkey" FOREIGN KEY ("ancestorId") REFERENCES "AdministrativeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAreaClosure" ADD CONSTRAINT "AdministrativeAreaClosure_descendantId_fkey" FOREIGN KEY ("descendantId") REFERENCES "AdministrativeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAreaBoundary" ADD CONSTRAINT "AdministrativeAreaBoundary_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministrativeAreaBoundary" ADD CONSTRAINT "AdministrativeAreaBoundary_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "AdministrativeAreaDataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAreaCoverage" ADD CONSTRAINT "OrganizationAreaCoverage_organizationUnitId_fkey" FOREIGN KEY ("organizationUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAreaCoverage" ADD CONSTRAINT "OrganizationAreaCoverage_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Directive" ADD CONSTRAINT "Directive_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Directive" ADD CONSTRAINT "Directive_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveVersion" ADD CONSTRAINT "DirectiveVersion_directiveId_fkey" FOREIGN KEY ("directiveId") REFERENCES "Directive"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveVersion" ADD CONSTRAINT "DirectiveVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveTargetArea" ADD CONSTRAINT "DirectiveTargetArea_directiveVersionId_fkey" FOREIGN KEY ("directiveVersionId") REFERENCES "DirectiveVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveTargetArea" ADD CONSTRAINT "DirectiveTargetArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveRecipient" ADD CONSTRAINT "DirectiveRecipient_directiveVersionId_fkey" FOREIGN KEY ("directiveVersionId") REFERENCES "DirectiveVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveRecipient" ADD CONSTRAINT "DirectiveRecipient_targetUnitId_fkey" FOREIGN KEY ("targetUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectiveRecipient" ADD CONSTRAINT "DirectiveRecipient_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_directiveVersionId_fkey" FOREIGN KEY ("directiveVersionId") REFERENCES "DirectiveVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStr" ADD CONSTRAINT "UukStr_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStrVersion" ADD CONSTRAINT "UukStrVersion_uukStrId_fkey" FOREIGN KEY ("uukStrId") REFERENCES "UukStr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStrVersion" ADD CONSTRAINT "UukStrVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStrSection" ADD CONSTRAINT "UukStrSection_uukStrVersionId_fkey" FOREIGN KEY ("uukStrVersionId") REFERENCES "UukStrVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UukStrSectionItem" ADD CONSTRAINT "UukStrSectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "UukStrSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_directiveVersionId_fkey" FOREIGN KEY ("directiveVersionId") REFERENCES "DirectiveVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_uukStrVersionId_fkey" FOREIGN KEY ("uukStrVersionId") REFERENCES "UukStrVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTargetArea" ADD CONSTRAINT "TaskTargetArea_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTargetArea" ADD CONSTRAINT "TaskTargetArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assignerAssignmentId_fkey" FOREIGN KEY ("assignerAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assigneeAssignmentId_fkey" FOREIGN KEY ("assigneeAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgressLog" ADD CONSTRAINT "TaskProgressLog_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "TaskAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgressLog" ADD CONSTRAINT "TaskProgressLog_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jaring" ADD CONSTRAINT "Jaring_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringCaretakerAssignment" ADD CONSTRAINT "JaringCaretakerAssignment_jaringId_fkey" FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringCaretakerAssignment" ADD CONSTRAINT "JaringCaretakerAssignment_fieldOfficerAssignmentId_fkey" FOREIGN KEY ("fieldOfficerAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringAreaCoverage" ADD CONSTRAINT "JaringAreaCoverage_jaringId_fkey" FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JaringAreaCoverage" ADD CONSTRAINT "JaringAreaCoverage_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_jaringId_fkey" FOREIGN KEY ("jaringId") REFERENCES "Jaring"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_routedToFieldOfficerAssignmentId_fkey" FOREIGN KEY ("routedToFieldOfficerAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_resolvedAreaId_fkey" FOREIGN KEY ("resolvedAreaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageMedia" ADD CONSTRAINT "WhatsAppMessageMedia_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageMedia" ADD CONSTRAINT "WhatsAppMessageMedia_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppRoutingLog" ADD CONSTRAINT "WhatsAppRoutingLog_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppRoutingLog" ADD CONSTRAINT "WhatsAppRoutingLog_routedToAssignmentId_fkey" FOREIGN KEY ("routedToAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baket" ADD CONSTRAINT "Baket_createdByFieldOfficerAssignmentId_fkey" FOREIGN KEY ("createdByFieldOfficerAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baket" ADD CONSTRAINT "Baket_taskAssignmentId_fkey" FOREIGN KEY ("taskAssignmentId") REFERENCES "TaskAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baket" ADD CONSTRAINT "Baket_primaryJaringId_fkey" FOREIGN KEY ("primaryJaringId") REFERENCES "Jaring"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVersion" ADD CONSTRAINT "BaketVersion_baketId_fkey" FOREIGN KEY ("baketId") REFERENCES "Baket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVersion" ADD CONSTRAINT "BaketVersion_eventAreaId_fkey" FOREIGN KEY ("eventAreaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVersion" ADD CONSTRAINT "BaketVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketSourceMessage" ADD CONSTRAINT "BaketSourceMessage_baketId_fkey" FOREIGN KEY ("baketId") REFERENCES "Baket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketSourceMessage" ADD CONSTRAINT "BaketSourceMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketAttachment" ADD CONSTRAINT "BaketAttachment_baketId_fkey" FOREIGN KEY ("baketId") REFERENCES "Baket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketAttachment" ADD CONSTRAINT "BaketAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketRevisionRequest" ADD CONSTRAINT "BaketRevisionRequest_baketId_fkey" FOREIGN KEY ("baketId") REFERENCES "Baket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketRevisionRequest" ADD CONSTRAINT "BaketRevisionRequest_requestedByAssignmentId_fkey" FOREIGN KEY ("requestedByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerification" ADD CONSTRAINT "BaketVerification_baketVersionId_fkey" FOREIGN KEY ("baketVersionId") REFERENCES "BaketVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerification" ADD CONSTRAINT "BaketVerification_verifiedByAssignmentId_fkey" FOREIGN KEY ("verifiedByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerificationCheck" ADD CONSTRAINT "BaketVerificationCheck_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BaketVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerificationCrossReference" ADD CONSTRAINT "BaketVerificationCrossReference_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BaketVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaketVerificationCrossReference" ADD CONSTRAINT "BaketVerificationCrossReference_relatedBaketId_fkey" FOREIGN KEY ("relatedBaketId") REFERENCES "Baket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisCase" ADD CONSTRAINT "AnalysisCase_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisCase" ADD CONSTRAINT "AnalysisCase_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSourceVerification" ADD CONSTRAINT "AnalysisSourceVerification_analysisCaseId_fkey" FOREIGN KEY ("analysisCaseId") REFERENCES "AnalysisCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisSourceVerification" ADD CONSTRAINT "AnalysisSourceVerification_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BaketVerification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_analysisCaseId_fkey" FOREIGN KEY ("analysisCaseId") REFERENCES "AnalysisCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisVersion" ADD CONSTRAINT "AnalysisVersion_validatedByAssignmentId_fkey" FOREIGN KEY ("validatedByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisEntity" ADD CONSTRAINT "AnalysisEntity_analysisVersionId_fkey" FOREIGN KEY ("analysisVersionId") REFERENCES "AnalysisVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRelationship" ADD CONSTRAINT "AnalysisRelationship_analysisVersionId_fkey" FOREIGN KEY ("analysisVersionId") REFERENCES "AnalysisVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRelationship" ADD CONSTRAINT "AnalysisRelationship_fromEntityId_fkey" FOREIGN KEY ("fromEntityId") REFERENCES "AnalysisEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRelationship" ADD CONSTRAINT "AnalysisRelationship_toEntityId_fkey" FOREIGN KEY ("toEntityId") REFERENCES "AnalysisEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplate" ADD CONSTRAINT "ProductTemplate_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductTypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplateSection" ADD CONSTRAINT "ProductTemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTemplateField" ADD CONSTRAINT "ProductTemplateField_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProductTemplateSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductTypeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelligenceProduct" ADD CONSTRAINT "IntelligenceProduct_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "IntelligenceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_createdByAssignmentId_fkey" FOREIGN KEY ("createdByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceVerification" ADD CONSTRAINT "ProductSourceVerification_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceVerification" ADD CONSTRAINT "ProductSourceVerification_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "BaketVerification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceAnalysis" ADD CONSTRAINT "ProductSourceAnalysis_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSourceAnalysis" ADD CONSTRAINT "ProductSourceAnalysis_analysisVersionId_fkey" FOREIGN KEY ("analysisVersionId") REFERENCES "AnalysisVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttachment" ADD CONSTRAINT "ProductAttachment_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttachment" ADD CONSTRAINT "ProductAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalWorkflow" ADD CONSTRAINT "ProductApprovalWorkflow_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ProductApprovalWorkflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductApprovalStep" ADD CONSTRAINT "ProductApprovalStep_decidedByAssignmentId_fkey" FOREIGN KEY ("decidedByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_productVersionId_fkey" FOREIGN KEY ("productVersionId") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_sentByAssignmentId_fkey" FOREIGN KEY ("sentByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetUnitId_fkey" FOREIGN KEY ("targetUnitId") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetPositionId_fkey" FOREIGN KEY ("targetPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductDistribution" ADD CONSTRAINT "ProductDistribution_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyIncident" ADD CONSTRAINT "EmergencyIncident_reportedByAssignmentId_fkey" FOREIGN KEY ("reportedByAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAttachment" ADD CONSTRAINT "EmergencyAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "EmergencyIncident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyAttachment" ADD CONSTRAINT "EmergencyAttachment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_sourceBaketId_fkey" FOREIGN KEY ("sourceBaketId") REFERENCES "Baket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_sourceIncidentId_fkey" FOREIGN KEY ("sourceIncidentId") REFERENCES "EmergencyIncident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedPositionId_fkey" FOREIGN KEY ("assignedPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelLocationPing" ADD CONSTRAINT "PersonnelLocationPing_positionAssignmentId_fkey" FOREIGN KEY ("positionAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelLocationPing" ADD CONSTRAINT "PersonnelLocationPing_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AdministrativeArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorAssignmentId_fkey" FOREIGN KEY ("actorAssignmentId") REFERENCES "PositionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationWebhookEvent" ADD CONSTRAINT "IntegrationWebhookEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "IntegrationChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
