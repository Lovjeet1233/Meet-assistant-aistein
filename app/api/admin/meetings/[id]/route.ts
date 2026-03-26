import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db/mongodb";
import Meeting from "@/lib/db/models/Meeting";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import { requireAdmin } from "@/lib/auth/adminMiddleware";

function adminErrorResponse(error: unknown) {
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

// GET meeting + all guest sessions and message transcripts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid meeting id" },
        { status: 400 },
      );
    }

    const meeting = await Meeting.findById(id)
      .populate("createdBy", "username email")
      .lean();
    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    type LeanSession = {
      _id: mongoose.Types.ObjectId;
      title: string;
      guestName?: string;
      status: string;
      createdAt: Date;
      lastMessageAt: Date;
      conversationSummary?: string;
      appointmentBooked?: boolean;
      appointmentCheckedAt?: Date;
    };
    const sessions = (await Conversation.find({ meetingId: id })
      .sort({ createdAt: -1 })
      .select("-guestAccessToken")
      .lean()) as unknown as LeanSession[];

    const convIds = sessions.map((s) => s._id);
    type LeanMessage = {
      _id: mongoose.Types.ObjectId;
      conversationId: mongoose.Types.ObjectId;
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    };
    const messages: LeanMessage[] =
      convIds.length === 0
        ? []
        : ((await Message.find({ conversationId: { $in: convIds } })
            .sort({ timestamp: 1 })
            .lean()) as unknown as LeanMessage[]);

    const messagesByConv = new Map<string, LeanMessage[]>();
    for (const msg of messages) {
      const key = String(msg.conversationId);
      const arr = messagesByConv.get(key) ?? [];
      arr.push(msg);
      messagesByConv.set(key, arr);
    }

    const owner = meeting.createdBy as {
      _id: mongoose.Types.ObjectId;
      username?: string;
      email?: string;
    } | null;

    return NextResponse.json({
      success: true,
      meeting: {
        id: String(meeting._id),
        meetingId: meeting.meetingId,
        title: meeting.title,
        status: meeting.status,
        isActive: meeting.isActive,
        isReusable: meeting.isReusable,
        sessionCount: meeting.sessionCount,
        maxSessions: meeting.maxSessions ?? null,
        expiresAt: meeting.expiresAt ?? null,
        avatarId: meeting.avatarId,
        voiceId: meeting.voiceId ?? null,
        language: meeting.language,
        knowledgeBaseId: String(meeting.knowledgeBaseId),
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        owner: owner
          ? {
              id: String(owner._id),
              username: owner.username,
              email: owner.email,
            }
          : null,
      },
      sessions: sessions.map((s) => ({
        id: String(s._id),
        title: s.title,
        guestName: s.guestName ?? null,
        status: s.status,
        createdAt: s.createdAt,
        lastMessageAt: s.lastMessageAt,
        conversationSummary: s.conversationSummary ?? "",
        appointmentBooked:
          typeof s.appointmentBooked === "boolean" ? s.appointmentBooked : null,
        appointmentCheckedAt: s.appointmentCheckedAt ?? null,
        messages: (messagesByConv.get(String(s._id)) ?? []).map((m) => ({
          id: String(m._id),
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      })),
    });
  } catch (error) {
    console.error("Admin meeting get error:", error);
    return adminErrorResponse(error);
  }
}

// PATCH — deactivate or reactivate meeting link
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid meeting id" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { success: false, message: "Body must include isActive (boolean)" },
        { status: 400 },
      );
    }

    const meeting = await Meeting.findByIdAndUpdate(
      id,
      { $set: { isActive: body.isActive } },
      { new: true },
    ).lean();

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: body.isActive
        ? "Meeting link activated"
        : "Meeting link deactivated",
      meeting: {
        id: String(meeting._id),
        meetingId: meeting.meetingId,
        isActive: meeting.isActive,
        status: meeting.status,
      },
    });
  } catch (error) {
    console.error("Admin meeting patch error:", error);
    return adminErrorResponse(error);
  }
}

// DELETE — remove meeting record (detaches conversations)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid meeting id" },
        { status: 400 },
      );
    }

    const meeting = await Meeting.findByIdAndDelete(id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 },
      );
    }

    await Conversation.updateMany(
      { meetingId: id },
      { $unset: { meetingId: 1 } },
    );

    return NextResponse.json({ success: true, message: "Meeting deleted" });
  } catch (error) {
    console.error("Admin meeting delete error:", error);
    return adminErrorResponse(error);
  }
}
