import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getFieldOfficerId, jsonError } from "@/app/api/field-officer/_utils";
import { forwardFieldTask, handleRepositoryError } from "@/server/field-officer/repository";

const backendPublicUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const fieldOfficerId = getFieldOfficerId(request);
    const result = forwardFieldTask(fieldOfficerId, taskId);

    const task = result.task;
    const instruction = `Laksanakan tugas ${task.id} pada area ${task.area}. Fokus pada target "${task.title}", dokumentasikan hasil lapangan, dan jadikan temuan relevan sebagai bahan validasi Incoming Information sebelum pembentukan BAKET.`;

    try {
      await fetch(`${backendPublicUrl}/v1/whatsapp/tasks/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-field-officer-id": fieldOfficerId,
        },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          instruction,
        }),
      });
    } catch (err) {
      console.error("Gagal membroadcast tugas WA:", err);
    }

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(handleRepositoryError(error));
  }
}
