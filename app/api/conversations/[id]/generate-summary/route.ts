import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import { findConversationWithAccess } from "@/lib/conversations/accessConversation";
import { classifyAppointmentBooked } from "@/lib/utils/appointmentFromSummary";
import { generateConversationSummary } from "@/lib/utils/summaryGenerator";

// POST — generate AI summary and persist on conversation (requires OPENAI_API_KEY on server)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: "AI summaries are not configured" },
        { status: 503 },
      );
    }

    await connectDB();
    const { id } = await params;

    const access = await findConversationWithAccess(request, id);
    if (!access) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const messages = await Message.find({ conversationId: id }).sort({
      timestamp: 1,
    });
    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, message: "No messages to summarize" },
        { status: 400 },
      );
    }

    const summary = await generateConversationSummary(
      messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
      })),
    );

    const booked = await classifyAppointmentBooked(summary);
    const patch: Record<string, unknown> = { conversationSummary: summary };
    if (booked !== null) {
      patch.appointmentBooked = booked;
      patch.appointmentCheckedAt = new Date();
    }
    await Conversation.findByIdAndUpdate(id, { $set: patch });

    return NextResponse.json({
      success: true,
      summary,
      appointmentBooked: booked,
    });
  } catch (error) {
    console.error("Generate summary error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
