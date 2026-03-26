import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import Meeting from "@/lib/db/models/Meeting";
import Conversation from "@/lib/db/models/Conversation";
import { requireAdmin } from "@/lib/auth/adminMiddleware";

// GET all meetings (all users)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await connectDB();

    const meetings = (await Meeting.find()
      .populate("createdBy", "username email")
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean()) as unknown as Array<{
      _id: mongoose.Types.ObjectId;
      [key: string]: unknown;
    }>;

    const ids = meetings.map((m) => m._id);
    const countByMeeting = new Map<string, number>();
    const appointmentCountByMeeting = new Map<string, number>();
    if (ids.length > 0) {
      const grouped = await Conversation.aggregate([
        { $match: { meetingId: { $in: ids } } },
        { $group: { _id: "$meetingId", n: { $sum: 1 } } },
      ]);
      for (const row of grouped as {
        _id: mongoose.Types.ObjectId;
        n: number;
      }[]) {
        countByMeeting.set(String(row._id), row.n);
      }

      const booked = await Conversation.aggregate([
        { $match: { meetingId: { $in: ids }, appointmentBooked: true } },
        { $group: { _id: "$meetingId", n: { $sum: 1 } } },
      ]);
      for (const row of booked as {
        _id: mongoose.Types.ObjectId;
        n: number;
      }[]) {
        appointmentCountByMeeting.set(String(row._id), row.n);
      }
    }

    const payload = meetings.map((m) => {
      const owner = m.createdBy as {
        _id: mongoose.Types.ObjectId;
        username?: string;
        email?: string;
      } | null;
      return {
        id: String(m._id),
        meetingId: m.meetingId,
        title: m.title,
        status: m.status,
        isActive: m.isActive,
        isReusable: m.isReusable,
        sessionCount: m.sessionCount,
        guestSessionCount: countByMeeting.get(String(m._id)) ?? 0,
        appointmentBookedSessionCount:
          appointmentCountByMeeting.get(String(m._id)) ?? 0,
        maxSessions: m.maxSessions ?? null,
        expiresAt: m.expiresAt ?? null,
        avatarId: m.avatarId,
        language: m.language,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        owner: owner
          ? {
              id: String(owner._id),
              username: owner.username,
              email: owner.email,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, meetings: payload });
  } catch (error) {
    console.error("Admin meetings list error:", error);

    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
