import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function POST(request: NextRequest) {
	try {
		const { sessionId, userAnswer } = await request.json();

		if (!sessionId || userAnswer === undefined || userAnswer === null) {
			return NextResponse.json(
				{ error: "Missing sessionId or userAnswer" },
				{ status: 400 }
			);
		}

		const { data: session, error: sessionError } = await supabase
			.from("math_problem_sessions")
			.select("*")
			.eq("id", sessionId)
			.single();

		if (sessionError || !session) {
			return NextResponse.json({ error: "Session not found" }, { status: 404 });
		}

		const isCorrect =
			Math.abs(Number(userAnswer) - session.correct_answer) < 0.01;

		const feedbackResponse = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `Generate personalized feedback for a Primary 5 student who ${
				isCorrect ? "solved" : "attempted"
			} this math problem. 

      Problem: "${session.problem_text}"
      Correct Answer: ${session.correct_answer}
      Student's Answer: ${userAnswer}
      Student was ${isCorrect ? "correct" : "incorrect"}

			Requirements for feedback:	
			- Generate ONLY ONE feedback message (no multiple options)
			- Be encouraging and supportive
			- If incorrect, gently explain the mistake and how to approach similar problems
			- If correct, provide positive reinforcement and acknowledge their problem-solving strategy
			- Keep it brief and age-appropriate (Primary 5 level)
			- Maximum 1-2 sentences
			- Focus on the learning process, not just the answer
			- Use natural, conversational language`,
		});

		const feedbackText = feedbackResponse.text.trim();

		const { data: submission, error: submissionError } = await supabase
			.from("math_problem_submissions")
			.insert({
				session_id: sessionId,
				user_answer: Number(userAnswer),
				is_correct: isCorrect,
				feedback_text: feedbackText,
			})
			.select()
			.single();

		if (submissionError) {
			throw submissionError;
		}

		return NextResponse.json({
			isCorrect,
			feedback: feedbackText,
			correctAnswer: session.correct_answer,
		});
	} catch (error) {
		console.error("Error submitting answer:", error);
		return NextResponse.json(
			{ error: "Failed to submit answer" },
			{ status: 500 }
		);
	}
}
