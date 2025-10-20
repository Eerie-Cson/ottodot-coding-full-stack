import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";
import { Difficulty } from "@lib/type/difficulty";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function POST(request: NextRequest) {
	try {
		const { difficulty } = await request.json();

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

		const problemTypes = [
			"Arithmetic word problem",
			"Pattern or sequence word problem",
			"Logical puzzle word problem",
			"Geometry word problem",
			"Measurement word problem",
		];

		const randomScenario =
			scenarios[Math.floor(Math.random() * scenarios.length)];
		const randomProblemType =
			problemTypes[Math.floor(Math.random() * problemTypes.length)];

		const difficultyPrompts = {
			[Difficulty.EASY]: `Create a simple arithmetic problem using basic operations (+, -, ×, ÷) with whole numbers under 100. The problem should be solvable in 1-2 steps.`,

			[Difficulty.MEDIUM]: `Create a problem that may involve fractions, decimals, percentages, or multi-step reasoning with numbers up to 1000. The problem should require 2-3 logical steps to solve.`,

			[Difficulty.HARD]: `Create a challenging problem that requires multiple steps, logical reasoning, and may involve combinations of fractions, decimals, percentages, ratios, or basic algebraic thinking.`,
		};

		const difficultyPrompt =
			difficultyPrompts[difficulty as Difficulty] ||
			difficultyPrompts[Difficulty.MEDIUM];

		const response = await ai.models.generateContent({
			model: "gemini-2.5-flash",
			contents: `You are a Primary 5 math teacher. Create a math word problem with these specifications:

				PROBLEM CONTEXT: ${randomScenario}
				PROBLEM TYPE: ${randomProblemType}
				DIFFICULTY LEVEL: ${difficulty}
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
