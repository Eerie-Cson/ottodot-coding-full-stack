import { NextResponse } from "next/server";
import { supabase } from "@lib/supabaseClient";

export async function GET() {
	try {
		const { data: sessions, error } = await supabase
			.from("math_problem_sessions")
			.select(
				`
        *,
        math_problem_submissions (
          user_answer,
          is_correct,
          feedback_text,
          created_at
        )
      `
			)
			.order("created_at", { ascending: false })
			.limit(10);

		if (error) {
			throw error;
		}

		return NextResponse.json({
			history: sessions || [],
		});
	} catch (error) {
		console.error("Error fetching history:", error);
		return NextResponse.json(
			{ error: "Failed to fetch problem history" },
			{ status: 500 }
		);
	}
}
