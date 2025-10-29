import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";
import { Difficulty } from "@lib/types/difficulty";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const scenarios = [
	"school classroom setting",
	"sports competition",
	"science experiment",
	"art project",
	"gardening activity",
	"shopping trip",
	"travel planning",
	"game scoring",
	"library book organization",
	"pet care",
	"weather tracking",
	"music practice",
	"construction project",
	"fitness challenge",
];

const problemTypePrompts = {
	addition: `Create an ADDITION word problem where the main operation is adding numbers together.`,
	subtraction: `Create a SUBTRACTION word problem where the main operation is taking away or finding the difference.`,
	multiplication: `Create a MULTIPLICATION word problem involving equal groups, arrays, or repeated addition.`,
	division: `Create a DIVISION word problem involving sharing equally or grouping into equal parts.`,
};

const difficultyPrompts = {
	[Difficulty.EASY]: `Use basic operations with whole numbers under 100. The problem should be solvable in 1-2 steps.`,
	[Difficulty.MEDIUM]: `Use numbers up to 1000. May involve fractions, decimals, percentages, or multi-step reasoning (2-3 steps).`,
	[Difficulty.HARD]: `Use complex operations, multi-step reasoning (3+ steps), and may involve combinations of operations with fractions, decimals, percentages, or ratios.`,
};

const MAX_RETRIES = 2;

function extractJsonObject(text: string) {
	const match = text.match(/\{[\s\S]*\}/);
	if (!match) return null;
	try {
		return JSON.parse(match[0]);
	} catch (err) {
		return null;
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		const randomScenario =
			scenarios[Math.floor(Math.random() * scenarios.length)];

		const problemTypePrompt =
			problemTypePrompts[body.problemType as keyof typeof problemTypePrompts] ||
			problemTypePrompts.addition;

		const difficultyPrompt =
			difficultyPrompts[body.difficulty as Difficulty] ||
			difficultyPrompts[Difficulty.MEDIUM];

		const problemPrompt = `You are a Primary 5 math teacher. Create a math word problem with these specifications:

			PROBLEM CONTEXT: ${randomScenario}
			PROBLEM TYPE: ${problemTypePrompt}
			DIFFICULTY LEVEL: ${body.difficulty}
			${difficultyPrompt}

			CRITICAL REQUIREMENTS:
			1. Return ONLY JSON (no extra text)
			2. The JSON must contain exactly one key: "problem_text"
			3. The problem_text must be a single clear word problem with exactly ONE question and solvable from the given info
			4. Do NOT include the answer or any calculation

			OUTPUT FORMAT (JSON only, no other text):
			{
				"problem_text": "The math word problem text here..."
			}
		`;

		const problemResponse = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: problemPrompt,
		});

		const problemResponseText = problemResponse.text;
		const problemJson = extractJsonObject(problemResponseText);

		if (!problemJson || typeof problemJson.problem_text !== "string") {
			throw new Error("Invalid problem JSON returned from AI (first call)");
		}

		const problemText: string = problemJson.problem_text;

		const answerPromptBase = (
			problem: string
		) => `You are a careful Primary 5 math teacher and calculator.

			Here is a single math word problem (for ages 10-11). Compute the correct numerical final answer.

			Problem: "${problem}"

			REQUIREMENTS:
			1) Show your step-by-step calculation to make sure arithmetic is correct.
			2) Then output ONLY JSON (no additional text) in this exact format:
			{
				"final_answer": 123
			}

			Make sure final_answer is a single number (no units, no commas). The JSON must be the only content in your response.
		`;

		let finalAnswerNumber: number | null = null;
		let lastAnswerResponseText: string | null = null;

		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			const answerResponse = await ai.models.generateContent({
				model: "gemini-2.0-flash",
				contents: answerPromptBase(problemText),
			});

			lastAnswerResponseText = answerResponse.text;
			const answerJson = extractJsonObject(lastAnswerResponseText);

			if (!answerJson) {
				if (attempt === MAX_RETRIES) {
					throw new Error(
						"AI failed to return valid JSON answer after retries"
					);
				}
				continue;
			}

			const maybeNum = answerJson.final_answer;
			const parsedNum = Number(maybeNum);

			if (typeof maybeNum === "number" && Number.isFinite(maybeNum)) {
				finalAnswerNumber = maybeNum;
				break;
			}

			if (!Number.isNaN(parsedNum) && Number.isFinite(parsedNum)) {
				finalAnswerNumber = parsedNum;
				break;
			}

			if (attempt === MAX_RETRIES) {
				throw new Error("AI returned non-numeric final_answer");
			}
			continue;
		}

		if (finalAnswerNumber === null) {
			throw new Error("Failed to obtain a numeric final_answer");
		}

		const { data: session, error } = await supabase
			.from("math_problem_sessions")
			.insert({
				problem_text: problemText,
				correct_answer: finalAnswerNumber,
			})
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json({
			problem: {
				problem_text: problemText,
				final_answer: finalAnswerNumber,
			},
			sessionId: session.id,
		});
	} catch (error) {
		console.error("Error generating problem:", error);
		return NextResponse.json(
			{ error: "Failed to generate math problem" },
			{ status: 500 }
		);
	}
}
