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

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: `You are a Primary 5 math teacher. Create a math word problem with these specifications:

				PROBLEM CONTEXT: ${randomScenario}
				PROBLEM TYPE: ${problemTypePrompt}
				DIFFICULTY LEVEL: ${body.difficulty}
				${difficultyPrompt}

				CRITICAL REQUIREMENTS:
				1. FIRST, create a clear, engaging word problem that has exactly ONE question and ONE numerical answer
				2. THEN, calculate the correct answer step-by-step to ensure accuracy
				3. FINALLY, provide ONLY the JSON output below

				IMPORTANT CONSTRAINTS:
				- The problem must be solvable with the information provided
				- Use age-appropriate language for 10-11 year olds
				- The final answer must be a single number
				- No multiple-choice options
				- No follow-up questions or multiple questions (a, b, c, etc.)

				OUTPUT FORMAT (JSON only, no other text):
				{
					"problem_text": "The math word problem text here...",
					"final_answer": 123
				}`,
		});

		const responseText = response.text;

		const jsonMatch = responseText.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Invalid response format from AI");
		}

		const problemData = JSON.parse(jsonMatch[0]);

		if (
			!problemData.problem_text ||
			typeof problemData.final_answer !== "number"
		) {
			throw new Error("Invalid problem data from AI");
		}

		const { data: session, error } = await supabase
			.from("math_problem_sessions")
			.insert({
				problem_text: problemData.problem_text,
				correct_answer: problemData.final_answer,
			})
			.select()
			.single();

		if (error) {
			throw error;
		}

		return NextResponse.json({
			problem: {
				problem_text: problemData.problem_text,
				final_answer: problemData.final_answer,
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
