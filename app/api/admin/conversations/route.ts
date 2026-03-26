import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Conversation from "@/lib/db/models/Conversation";
import "@/lib/db/models/KnowledgeBase";
import "@/lib/db/models/Meeting";
import Message from "@/lib/db/models/Message";
import { requireAdmin } from "@/lib/auth/adminMiddleware";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET — admin list with meeting guest conversations, filters, search
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const scope = searchParams.get("scope") || (userId ? "all" : "meetings");
    const appointment = searchParams.get("appointment") || "all";
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(
      300,
      Math.max(1, parseInt(searchParams.get("limit") || "150", 10) || 150),
    );

    const andParts: Record<string, unknown>[] = [];

    if (userId) {
      andParts.push({ userId });
    }

    if (scope === "meetings") {
      andParts.push({ meetingId: { $exists: true, $ne: null } });
    }

    if (appointment === "booked") {
      andParts.push({ appointmentBooked: true });
    } else if (appointment === "not_booked") {
      andParts.push({ appointmentBooked: false });
    } else if (appointment === "pending") {
      andParts.push(
        { conversationSummary: { $exists: true, $nin: [null, ""] } },
        {
          $or: [
            { appointmentCheckedAt: { $exists: false } },
            { appointmentCheckedAt: null },
          ],
        },
      );
    } else if (appointment === "no_summary") {
      andParts.push({
        $or: [
          { conversationSummary: { $exists: false } },
          { conversationSummary: null },
          { conversationSummary: "" },
        ],
      });
    }

    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      andParts.push({
        $or: [{ title: rx }, { guestName: rx }, { conversationSummary: rx }],
      });
    }

    const filter: Record<string, unknown> =
      andParts.length > 0 ? { $and: andParts } : {};

    const conversations = await Conversation.find(filter)
      .populate("knowledgeBaseId", "name")
      .populate("userId", "username email")
      .populate("meetingId", "title meetingId")
      .sort({ lastMessageAt: -1 })
      .limit(limit);

    const conversationsWithStats = await Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await Message.countDocuments({
          conversationId: conv._id,
        });

        const knowledgeBase = conv.knowledgeBaseId
          ? {
              id: String((conv.knowledgeBaseId as { _id: unknown })._id),
              name: (conv.knowledgeBaseId as { name?: string }).name,
            }
          : null;

        const user = conv.userId
          ? {
              id: String((conv.userId as { _id: unknown })._id),
              username: (conv.userId as { username?: string }).username,
              email: (conv.userId as { email?: string }).email,
            }
          : null;

        const meeting = conv.meetingId
          ? {
              id: String((conv.meetingId as { _id: unknown })._id),
              title: (conv.meetingId as { title?: string }).title,
              meetingId: (conv.meetingId as { meetingId?: string }).meetingId,
            }
          : null;

        return {
          id: String(conv._id),
          title: conv.title,
          guestName: conv.guestName ?? null,
          avatarId: conv.avatarId,
          status: conv.status,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          messageCount,
          conversationSummary: conv.conversationSummary ?? "",
          appointmentBooked:
            typeof conv.appointmentBooked === "boolean"
              ? conv.appointmentBooked
              : null,
          appointmentCheckedAt: conv.appointmentCheckedAt ?? null,
          knowledgeBase,
          user,
          meeting,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      conversations: conversationsWithStats,
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    });
  } catch (error) {
    console.error("Get conversations error:", error);

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
