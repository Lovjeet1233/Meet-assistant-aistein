import { readFile } from "fs/promises";
import { join } from "path";

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/middleware";
import type { HeyGenAvatarCatalogItem } from "@/lib/avatars/types";

export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    const filePath = join(process.cwd(), "avatars", "data.json");
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { success: false, message: "Invalid avatar catalog" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      success: true,
      avatars: data as HeyGenAvatarCatalogItem[],
    });
  } catch (error) {
    console.error("Get avatars catalog error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to load avatar catalog" },
      { status: 500 },
    );
  }
}
