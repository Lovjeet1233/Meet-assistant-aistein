import connectDB from "@/lib/db/mongodb";
import Conversation from "@/lib/db/models/Conversation";
import Meeting from "@/lib/db/models/Meeting";
import Message from "@/lib/db/models/Message";
import { classifyAppointmentBooked } from "@/lib/utils/appointmentFromSummary";
import { generateConversationSummary } from "@/lib/utils/summaryGenerator";

/**
 * Mark a conversation completed with summary + optional single-use meeting closure.
 * Server-only; caller must enforce auth when invoked from user-facing routes.
 */
export async function finalizeConversationEndById(
  conversationId: string,
): Promise<boolean> {
  await connectDB();

  const existing = await Conversation.findById(conversationId);
  if (!existing || existing.status !== "active") {
    return false;
  }

  const messages = await Message.find({ conversationId }).sort({
    timestamp: 1,
  });

  const conversationSummary = await generateConversationSummary(
    messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
    })),
  );

  const booked = await classifyAppointmentBooked(conversationSummary);
  const update: Record<string, unknown> = {
    status: "completed",
    conversationSummary,
    lastMessageAt: new Date(),
  };
  if (booked !== null) {
    update.appointmentBooked = booked;
    update.appointmentCheckedAt = new Date();
  }

  await Conversation.findByIdAndUpdate(conversationId, { $set: update });

  const meetingId = existing.meetingId;
  if (meetingId) {
    const meeting = await Meeting.findById(meetingId);
    if (meeting && !meeting.isReusable) {
      await Meeting.findByIdAndUpdate(meetingId, {
        $set: { status: "completed", isActive: false },
      });
    }
  }

  return true;
}
