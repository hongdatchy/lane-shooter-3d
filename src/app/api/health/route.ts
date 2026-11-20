import { NextResponse } from "next/server";
import { HealthCheckDTO } from "@/dto/CommonDTO";

export const dynamic = "force-static";

export async function GET() {
  const payload: HealthCheckDTO = {
    status: "ok",
    app: "3d_lane_shooter",
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload);
}
