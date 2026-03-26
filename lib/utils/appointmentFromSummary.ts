/**
 * Uses OpenAI to infer whether a stored conversation summary indicates
 * a meaningful appointment / meeting / booking intent with concrete details
 * (not only after explicit "confirmed" wording).
 */
export async function classifyAppointmentBooked(
  summary: string,
): Promise<boolean | null> {
  const trimmed = summary.trim();
  if (!trimmed) {
    return null;
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 120,
        messages: [
          {
            role: "system",
            content: `You classify a conversation SUMMARY for scheduling / appointments.

Return appointmentBooked TRUE if the summary shows a concrete meeting or appointment with BOTH a specific date (or unambiguous calendar day) AND a specific time (or clear time window) for it — including when:
- The user requested that slot and the assistant captured, repeated, or clarified those details (even if a final "please confirm" step is still pending).
- A reservation or booking was completed or explicitly confirmed.

Return appointmentBooked FALSE only when:
- Scheduling stays vague ("sometime", "later", "next week" with no agreed date+time).
- No date+time pair appears for a planned meeting.
- The user cancelled or refused to schedule.

Do NOT require words like "confirmed" or "booked" if the summary already states a definite requested or held date AND time (and optionally place) for an appointment.

Reply with ONLY JSON: {"appointmentBooked":true} or {"appointmentBooked":false}`,
          },
          {
            role: "user",
            content: `Summary:\n\n${trimmed.slice(0, 12000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    let text = data.choices?.[0]?.message?.content?.trim() ?? "";
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

    const parsed = JSON.parse(text) as { appointmentBooked?: unknown };
    if (typeof parsed.appointmentBooked === "boolean") {
      return parsed.appointmentBooked;
    }
    return null;
  } catch {
    return null;
  }
}
