import { type NextRequest, NextResponse } from "next/server";

import { apiRouteErrorResponse } from "@/server/api-route-error";
import { createFieldOfficerJaring } from "@/server/field-ops/repository";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      aliasName?: string;
      whatsappNumber: string;
      fullName: string;
      nationalIdNumber?: string;
      address: string;
      birthPlace: string;
      birthDate: string;
      gender: "MALE" | "FEMALE";
      occupationId: string;
      profilePhotoFileId: string;
      workplace?: string;
      jobTitle?: string;
      joinedAt: string;
      organizationName?: string;
      politicalAffiliation?: string;
      notes: string;
      areaIds: string[];
      fieldOfficerAssignmentId: string;
    };

    return NextResponse.json(await createFieldOfficerJaring(request.headers.get("cookie") ?? "", body), {
      status: 201,
    });
  } catch (error) {
    return apiRouteErrorResponse(error, "Gagal membuat Jaring.");
  }
}
