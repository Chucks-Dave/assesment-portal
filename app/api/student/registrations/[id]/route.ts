import { type NextRequest, NextResponse } from "next/server";
import { assertNoQuery, assertSameOrigin } from "@/server/auth/request";
import { errorResponse, success } from "@/server/http";
import { requireStudent } from "@/server/student/request";
import { withdrawRegistration } from "@/server/student/service";

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    assertNoQuery(request);
    const user = await requireStudent(request);
    const { id } = await context.params;
    return success("Course withdrawn successfully.", await withdrawRegistration(user, id));
  } catch (error) {
    return errorResponse(error);
  }
}
