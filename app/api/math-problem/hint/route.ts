import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function POST(request: NextRequest) {
	try {
		const { sessionId } = await request.json();

		if (!sessionId) {
			return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
		}

		const { data: session, error: sessionError } = await supabase
			.from("math_problem_sessions")
			.select("*")
			.eq("id", sessionId)
			.single();

		if (sessionError || !session) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		const hintResponse = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `Generate a helpful hint for this Primary 5 math problem. The hint should guide the student toward the solution without giving away the answer.

      Problem: "${session.problem_text}"
      Correct Answer: ${session.correct_answer}

      Requirements for the hint:
      - Generate ONLY ONE hint message (no multiple options)
      - Be encouraging and supportive
      - Guide the student's thinking process
      - Suggest a strategy or first step
      - Do not reveal the final answer
      - Keep it brief (1-2 sentences)
      - Use age-appropriate language for Primary 5 students
      - Focus on the mathematical concept being tested`,
		});

		const hintText = hintResponse.text.trim();

		return NextResponse.json({
			hint: hintText,
		});
	} catch (error) {
		console.error("Error generating hint:", error);
		return NextResponse.json(
			{ error: "Failed to generate hint" },
			{ status: 500 }
		);
	}
}
