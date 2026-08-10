import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { updateFieldOfficerJaring } from "@/server/field-ops/repository";

type Params = {
  params: Promise<{
    jaringId: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { jaringId } = await params;
    const body = (await request.json()) as {
      aliasName?: string;
      whatsappNumber?: string;
      fullName?: string;
      nationalIdNumber?: string;
      address?: string;
      birthPlace?: string;
      birthDate?: string;
      gender?: string;
      occupationId?: string;
      profilePhotoFileId?: string;
      workplace?: string;
      jobTitle?: string;
      joinedAt?: string;
      organizationName?: string;
      politicalAffiliation?: string;
      areaIds?: string[];
      notes?: string;
    };

    return NextResponse.json(await updateFieldOfficerJaring(request.headers.get("cookie") ?? "", jaringId, body));
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal memperbarui Jaring.");
  }
}
