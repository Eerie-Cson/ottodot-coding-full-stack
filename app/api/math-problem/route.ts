import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@lib/supabaseClient";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export async function POST(request: NextRequest) {
	try {
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

		const randomScenario =
			scenarios[Math.floor(Math.random() * scenarios.length)];

		const response = await ai.models.generateContent({
			model: "gemini-2.0-flash",
			contents: `Generate a Primary 5 level math word problem set in a ${randomScenario}. The response must be a valid JSON object with exactly this structure:
      {
        "problem_text": "The math word problem text here...",
        "final_answer": 123
      }

      Requirements:
      - Primary 5 level (ages 10-11)
      - Final answer should be a number
			- Choose randomly from the following problem types:
				- Arithmetic word problem (involving addition, subtraction, multiplication, division, fractions, decimals, or percentages)
				- Pattern or sequence (recognizing number patterns or completing a sequence)
				- Logical puzzle (requiring deduction or reasoning to find the answer)
				- Geometry (area, perimeter, properties of 2D/3D shapes)
				- Measurement (involving time, weight, length, volume, or temperature)
			- Ensure the language is age-appropriate, clear, and engaging.
			- Use real-world or relatable scenarios where possible (e.g., school, shopping, sports, food).
      - Ensure the math is solvable with the given information`,
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
