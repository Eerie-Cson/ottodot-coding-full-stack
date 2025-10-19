import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";
import { Difficulty } from "../../page";

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
			"Arithmetic word problem (involving addition, subtraction, multiplication, division, fractions, decimals, or percentages)",
			"Pattern or sequence word problem (recognizing number patterns or completing a sequence)",
			"Logical puzzle word problem (requiring deduction or reasoning to find the answer)",
			"Geometry word problem (area, perimeter, properties of 2D/3D shapes)",
			"Measurement word problem (involving time, weight, length, volume, or temperature)",
		];

		const randomScenario =
			scenarios[Math.floor(Math.random() * scenarios.length)];
		const randomProblemType =
			problemTypes[Math.floor(Math.random() * problemTypes.length)];

		const difficultyPrompts = {
			[Difficulty.EASY]: `Generate an EASY Primary 5 level ${randomProblemType} set in a ${randomScenario} scenario. 
      Requirements:
      - Use simple arithmetic (addition, subtraction, basic multiplication/division)
      - Numbers should be small and easy to work with (under 100)
      - One or two steps to solve
      - Clear and straightforward language`,

			[Difficulty.MEDIUM]: `Generate a MEDIUM difficulty Primary 5 level ${randomProblemType}  in a ${randomScenario} scenario.
      Requirements:
      - Can include fractions, decimals, percentages, or multi-step problems
      - Numbers can be larger (up to 1000)
      - 2-3 steps to solve
      - May require some reasoning or conversion`,

			[Difficulty.HARD]: `Generate a CHALLENGING Primary 5 level ${randomProblemType} in a ${randomScenario} scenario.
      Requirements:
      - Can include complex fractions, decimals, percentages, ratios, or basic algebra
      - Multi-step problems (3+ steps)
      - May require logical reasoning, pattern recognition, or problem-solving strategies
      - Real-world applications and more complex scenarios`,
		};

		const difficultyPrompt =
			difficultyPrompts[difficulty as Difficulty] ||
			difficultyPrompts[Difficulty.MEDIUM];

		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `${difficultyPrompt}
      
      The response must be a valid JSON object with exactly this structure:
      {
        "problem_text": "The math word problem text here...",
        "final_answer": 123
      }

			Additional requirements:
			- Ensure the language is age-appropriate, clear, and engaging.
      - Ensure the math is solvable with the given information
			- Ensure the answer is correct based on the problem text
			- Ensure the problem contains only one question with a single final answer`,
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
