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

		const solutionResponse = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `Provide a clear, step-by-step solution for this Primary 5 math problem. 

      Problem: "${session.problem_text}"
      Correct Answer: ${session.correct_answer}

      Requirements for the solution:
      - Break down the solution into 3-5 clear steps
      - Explain each step in simple, age-appropriate language
      - Show the reasoning behind each step
      - Include any necessary calculations
      - End with the final answer
      - Use markdown formatting with numbered steps and line breaks
      - Make it concise, educational and easy to follow for a 10-11 year old student

      Format the response as follows:

      Step 1: [Explanation of first step]

      Step 2: [Explanation of second step]

      Step 3: [Explanation of third step]

      Final Answer: [The final answer]`,
		});

		const solutionText = solutionResponse.text.trim();

		return NextResponse.json({
			solution: solutionText,
		});
	} catch (error) {
		console.error("Error generating solution:", error);
		return NextResponse.json(
			{ error: "Failed to generate solution" },
			{ status: 500 }
		);
	}
}
