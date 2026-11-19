import { NextResponse } from "next/server";
import { HealthCheckDTO } from "@/dto/CommonDTO";

export async function GET() {
  const payload: HealthCheckDTO = {
    status: "ok",
    app: "3d_demo",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload);
}
