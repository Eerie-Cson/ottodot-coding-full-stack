"use client";

import { useState } from "react";

interface MathProblem {
	problem_text: string;
	final_answer: number;
}

export default function Home() {
	const [problem, setProblem] = useState<MathProblem | null>(null);
	const [userAnswer, setUserAnswer] = useState("");
	const [feedback, setFeedback] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
	const [error, setError] = useState<string | null>(null);

	const generateProblem = async () => {
		// TODO: Implement problem generation logic
		// This should call your API route to generate a new problem
		// and save it to the database
		setIsLoading(true);
		setError(null);
		setFeedback("");
		setIsCorrect(null);
		setUserAnswer("");
		setProblem(null);

		try {
			const response = await fetch("/api/math-problem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to generate problem");
			}

			const data = await response.json();
			setProblem(data.problem);
			setSessionId(data.sessionId);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to generate a new problem. Please try again."
			);
			console.error("Error generating problem:", err);
		} finally {
			setIsLoading(false);
		}
	};

	const submitAnswer = async (e: React.FormEvent) => {
		e.preventDefault();
		// TODO: Implement answer submission logic
		// This should call your API route to check the answer,
		// save the submission, and generate feedback

		if (!sessionId || !userAnswer) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch("/api/math-problem/submit", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
					userAnswer: parseFloat(userAnswer),
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to submit answer");
			}

			const data = await response.json();
			setFeedback(data.feedback);
			setIsCorrect(data.isCorrect);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to submit your answer. Please try again."
			);
			console.error("Error submitting answer:", err);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
			<main className="container mx-auto px-4 py-8 max-w-2xl">
				<h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
					Math Problem Generator
				</h1>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
						<p className="text-red-800">{error}</p>
					</div>
				)}

				<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
					<button
						onClick={generateProblem}
						disabled={isLoading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
					>
						{isLoading ? "Generating..." : "Generate New Problem"}
					</button>
				</div>

				{problem && (
					<div className="bg-white rounded-lg shadow-lg p-6 mb-6">
						<h2 className="text-xl font-semibold mb-4 text-gray-700">
							Problem:
						</h2>
						<p className="text-lg text-gray-800 leading-relaxed mb-6">
							{problem.problem_text}
						</p>

						<form onSubmit={submitAnswer} className="space-y-4">
							<div>
								<label
									htmlFor="answer"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Your Answer:
								</label>
								<input
									type="number"
									id="answer"
									value={userAnswer}
									onChange={(e) => setUserAnswer(e.target.value)}
									className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									placeholder="Enter your answer"
									required
								/>
							</div>

							<button
								type="submit"
								disabled={!userAnswer || isLoading}
								className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105"
							>
								Submit Answer
							</button>
						</form>
					</div>
				)}

				{feedback && (
					<div
						className={`rounded-lg shadow-lg p-6 ${
							isCorrect
								? "bg-green-50 border-2 border-green-200"
								: "bg-yellow-50 border-2 border-yellow-200"
						}`}
					>
						<h2 className="text-xl font-semibold mb-4 text-gray-700">
							{isCorrect ? "✅ Correct!" : "❌ Not quite right"}
						</h2>
						<p className="text-gray-800 leading-relaxed">{feedback}</p>
					</div>
				)}
			</main>
		</div>
	);
}
