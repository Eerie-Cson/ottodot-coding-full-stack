"use client";

import { useEffect, useState } from "react";
import { Difficulty, ProblemType } from "@lib/types";

interface MathProblem {
	problem_text: string;
	final_answer: number;
}

interface ProblemHistory {
	id: string;
	problem_text: string;
	correct_answer: number;
	created_at: string;
	submissions?: {
		user_answer: number;
		is_correct: boolean;
		feedback_text: string;
		created_at: string;
	}[];
}

interface Score {
	total: number;
	correct: number;
	streak: number;
	bestStreak: number;
}

export default function Home() {
	const [problem, setProblem] = useState<MathProblem | null>(null);
	const [userAnswer, setUserAnswer] = useState("");
	const [feedback, setFeedback] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [problemHistory, setProblemHistory] = useState<ProblemHistory[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [hint, setHint] = useState<string | null>(null);
	const [isLoadingHint, setIsLoadingHint] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [solution, setSolution] = useState<string | null>(null);
	const [isLoadingSolution, setIsLoadingSolution] = useState(false);
	const [score, setScore] = useState<Score>({
		total: 0,
		correct: 0,
		streak: 0,
		bestStreak: 0,
	});
	const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
	const [problemType, setProblemType] = useState<ProblemType>(
		ProblemType.ADDITION
	);

	useEffect(() => {
		loadProblemHistory();
		loadScore();
	}, []);

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
		setHasSubmitted(false);
		setHint(null);
		setSolution(null);

		try {
			const response = await fetch("/api/math-problem", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ difficulty, problemType }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to generate problem");
			}

			const data = await response.json();
			console.log(data);
			setProblem(data.problem);
			setSessionId(data.sessionId);

			await loadProblemHistory();
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
		setHasSubmitted(true);

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
			updateScore(data.isCorrect);

			await loadProblemHistory();
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

	const loadProblemHistory = async () => {
		try {
			const response = await fetch("/api/math-problem/history");
			if (response.ok) {
				const data = await response.json();

				const history: ProblemHistory[] = data.history.map((problem) => {
					return {
						id: problem.id,
						problem_text: problem.problem_text,
						correct_answer: problem.correct_answer,
						created_at: problem.created_at,
						submissions: problem.math_problem_submissions,
					};
				});
				setProblemHistory(history);
			}
		} catch (err) {
			console.error("Error loading history:", err);
		}
	};

	const getHint = async () => {
		if (!sessionId) return;

		setIsLoadingHint(true);
		setError(null);

		try {
			const response = await fetch("/api/math-problem/hint", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to get hint");
			}

			const data = await response.json();
			setHint(data.hint);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to get a hint. Please try again."
			);
			console.error("Error getting hint:", err);
		} finally {
			setIsLoadingHint(false);
		}
	};

	const getSolution = async () => {
		if (!sessionId) return;

		setIsLoadingSolution(true);
		setError(null);

		try {
			const response = await fetch("/api/math-problem/solution", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to get solution");
			}

			const data = await response.json();
			setSolution(data.solution);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Failed to get the solution. Please try again."
			);
			console.error("Error getting solution:", err);
		} finally {
			setIsLoadingSolution(false);
		}
	};

	const saveScore = (newScore: Score) => {
		setScore(newScore);
		if (typeof window !== "undefined") {
			localStorage.setItem("mathProblemScore", JSON.stringify(newScore));
		}
	};

	const updateScore = (wasCorrect: boolean) => {
		setScore((prevScore) => {
			const newStreak = wasCorrect ? prevScore.streak + 1 : 0;
			const newScore = {
				total: prevScore.total + 1,
				correct: wasCorrect ? prevScore.correct + 1 : prevScore.correct,
				streak: newStreak,
				bestStreak: Math.max(prevScore.bestStreak, newStreak),
			};

			// Save to localStorage
			if (typeof window !== "undefined") {
				localStorage.setItem("mathProblemScore", JSON.stringify(newScore));
			}

			return newScore;
		});
	};

	const resetScore = () => {
		const newScore = {
			total: 0,
			correct: 0,
			streak: 0,
			bestStreak: 0,
		};
		saveScore(newScore);
	};

	const loadScore = () => {
		if (typeof window !== "undefined") {
			const storedScore = localStorage.getItem("mathProblemScore");
			if (storedScore) {
				setScore(JSON.parse(storedScore));
			}
		}
	};

	const accuracy =
		score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
			<main className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="flex flex-row justify-between items-center gap-4 mb-8">
					<h1 className="text-4xl sm:text-4xl font-bold text-gray-800">
						Math Problem Generator
					</h1>
					<div className="flex flex-row items-center gap-3">
						{/* Score Display */}
						<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 shrink-0">
							<div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm flex-nowrap">
								<div className="text-center">
									<div className="font-bold text-gray-800">
										{score.correct}/{score.total}
									</div>
									<div className="text-xs text-gray-600">Score</div>
								</div>
								<div className="text-center">
									<div className="font-bold text-gray-800">{accuracy}%</div>
									<div className="text-xs text-gray-600">Accuracy</div>
								</div>
								<div className="text-center">
									<div className="font-bold text-green-600">
										{score.streak}🔥
									</div>
									<div className="text-xs text-gray-600">Streak</div>
								</div>
								{score.bestStreak > 0 && (
									<div className="text-center">
										<div className="font-bold text-purple-600">
											Best: {score.bestStreak}
										</div>
										<div className="text-xs text-gray-600">Streak</div>
									</div>
								)}
								<button
									onClick={resetScore}
									className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition duration-200"
									title="Reset Score"
								>
									Reset
								</button>
							</div>
						</div>

						<button
							onClick={() => setShowHistory(!showHistory)}
							className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm whitespace-nowrap shrink-0"
						>
							{showHistory ? "Back to Problem" : "View History"}
						</button>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
						<p className="text-red-800 text-sm sm:text-base">{error}</p>
					</div>
				)}

				{!showHistory ? (
					<>
						{/* Difficulty Selection */}
						<div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
							<div className="mb-6">
								<label className="block text-base sm:text-lg font-semibold text-gray-700 mb-4">
									Select Difficulty:
								</label>
								<div className="flex flex-col sm:flex-row gap-3">
									<label
										className={`flex-1 cursor-pointer transition duration-200 ${
											difficulty === Difficulty.EASY
												? "bg-green-100 border-2 border-green-500"
												: "bg-gray-50 border-2 border-gray-300 hover:border-green-400"
										} rounded-lg p-3 sm:p-4 text-center`}
									>
										<input
											type="radio"
											name="difficulty"
											value={Difficulty.EASY}
											checked={difficulty === Difficulty.EASY}
											onChange={(e) =>
												setDifficulty(e.target.value as Difficulty)
											}
											className="sr-only"
										/>
										<div
											className={`font-semibold text-sm sm:text-base ${
												difficulty === Difficulty.EASY
													? "text-green-700"
													: "text-gray-700"
											}`}
										>
											Easy
										</div>
									</label>
									<label
										className={`flex-1 cursor-pointer transition duration-200 ${
											difficulty === Difficulty.MEDIUM
												? "bg-yellow-100 border-2 border-yellow-500"
												: "bg-gray-50 border-2 border-gray-300 hover:border-yellow-400"
										} rounded-lg p-3 sm:p-4 text-center`}
									>
										<input
											type="radio"
											name="difficulty"
											value={Difficulty.MEDIUM}
											checked={difficulty === Difficulty.MEDIUM}
											onChange={(e) =>
												setDifficulty(e.target.value as Difficulty)
											}
											className="sr-only"
										/>
										<div
											className={`font-semibold text-sm sm:text-base ${
												difficulty === Difficulty.MEDIUM
													? "text-yellow-700"
													: "text-gray-700"
											}`}
										>
											Medium
										</div>
									</label>
									<label
										className={`flex-1 cursor-pointer transition duration-200 ${
											difficulty === Difficulty.HARD
												? "bg-red-100 border-2 border-red-500"
												: "bg-gray-50 border-2 border-gray-300 hover:border-red-400"
										} rounded-lg p-3 sm:p-4 text-center`}
									>
										<input
											type="radio"
											name="difficulty"
											value={Difficulty.HARD}
											checked={difficulty === Difficulty.HARD}
											onChange={(e) =>
												setDifficulty(e.target.value as Difficulty)
											}
											className="sr-only"
										/>
										<div
											className={`font-semibold text-sm sm:text-base ${
												difficulty === Difficulty.HARD
													? "text-red-700"
													: "text-gray-700"
											}`}
										>
											Hard
										</div>
									</label>
								</div>
							</div>

							<button
								onClick={generateProblem}
								disabled={isLoading}
								className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 text-sm sm:text-base"
							>
								{isLoading && !problem && !difficulty
									? "Generating..."
									: "Generate New Problem"}
							</button>
						</div>

						<div className="mb-6">
							<label className="block text-base sm:text-lg font-semibold text-gray-700 mb-4">
								Select Problem Type:
							</label>
							<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
								<label
									className={`cursor-pointer transition duration-200 ${
										problemType === ProblemType.ADDITION
											? "bg-blue-100 border-2 border-blue-500"
											: "bg-gray-50 border-2 border-gray-300 hover:border-blue-400"
									} rounded-lg p-3 sm:p-4 text-center`}
								>
									<input
										type="radio"
										name="problemType"
										value={ProblemType.ADDITION}
										checked={problemType === ProblemType.ADDITION}
										onChange={(e) =>
											setProblemType(e.target.value as ProblemType)
										}
										className="sr-only"
									/>
									<div
										className={`font-semibold text-sm sm:text-base ${
											problemType === ProblemType.ADDITION
												? "text-blue-700"
												: "text-gray-700"
										}`}
									>
										Addition
									</div>
								</label>
								<label
									className={`cursor-pointer transition duration-200 ${
										problemType === ProblemType.SUBTRACTION
											? "bg-blue-100 border-2 border-blue-500"
											: "bg-gray-50 border-2 border-gray-300 hover:border-blue-400"
									} rounded-lg p-3 sm:p-4 text-center`}
								>
									<input
										type="radio"
										name="problemType"
										value={ProblemType.SUBTRACTION}
										checked={problemType === ProblemType.SUBTRACTION}
										onChange={(e) =>
											setProblemType(e.target.value as ProblemType)
										}
										className="sr-only"
									/>
									<div
										className={`font-semibold text-sm sm:text-base ${
											problemType === ProblemType.SUBTRACTION
												? "text-blue-700"
												: "text-gray-700"
										}`}
									>
										Subtraction
									</div>
								</label>
								<label
									className={`cursor-pointer transition duration-200 ${
										problemType === ProblemType.MULTIPLICATION
											? "bg-blue-100 border-2 border-blue-500"
											: "bg-gray-50 border-2 border-gray-300 hover:border-blue-400"
									} rounded-lg p-3 sm:p-4 text-center`}
								>
									<input
										type="radio"
										name="problemType"
										value={ProblemType.MULTIPLICATION}
										checked={problemType === ProblemType.MULTIPLICATION}
										onChange={(e) =>
											setProblemType(e.target.value as ProblemType)
										}
										className="sr-only"
									/>
									<div
										className={`font-semibold text-sm sm:text-base ${
											problemType === ProblemType.MULTIPLICATION
												? "text-blue-700"
												: "text-gray-700"
										}`}
									>
										Multiplication
									</div>
								</label>
								<label
									className={`cursor-pointer transition duration-200 ${
										problemType === ProblemType.DIVISION
											? "bg-blue-100 border-2 border-blue-500"
											: "bg-gray-50 border-2 border-gray-300 hover:border-blue-400"
									} rounded-lg p-3 sm:p-4 text-center`}
								>
									<input
										type="radio"
										name="problemType"
										value={ProblemType.DIVISION}
										checked={problemType === ProblemType.DIVISION}
										onChange={(e) =>
											setProblemType(e.target.value as ProblemType)
										}
										className="sr-only"
									/>
									<div
										className={`font-semibold text-sm sm:text-base ${
											problemType === ProblemType.DIVISION
												? "text-blue-700"
												: "text-gray-700"
										}`}
									>
										Division
									</div>
								</label>
							</div>
						</div>

						{problem && (
							<div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6">
								<h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">
									Problem:
								</h2>
								<p className="text-base sm:text-lg text-gray-800 leading-relaxed mb-6 break-words">
									{problem.problem_text}
								</p>

								{/* Hint Section - Only show before submission */}
								{!hasSubmitted && (
									<>
										{hint ? (
											<div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
												<h3 className="text-base sm:text-lg font-semibold text-purple-800 mb-2">
													💡 Hint
												</h3>
												<p className="text-purple-700 text-sm sm:text-base break-words">
													{hint}
												</p>
											</div>
										) : (
											<div className="mb-4">
												<button
													onClick={getHint}
													disabled={isLoadingHint}
													className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm sm:text-base w-full sm:w-auto"
												>
													{isLoadingHint ? "Getting Hint..." : "Get Hint"}
												</button>
											</div>
										)}
									</>
								)}

								{/* Solution Section - Only show after submission */}
								{hasSubmitted && (
									<>
										{solution ? (
											<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
												<h3 className="text-base sm:text-lg font-semibold text-blue-800 mb-2">
													📚 Step-by-Step Solution
												</h3>
												<div className="text-blue-700 whitespace-pre-line text-sm sm:text-base break-words">
													{solution}
												</div>
											</div>
										) : (
											<div className="mb-4">
												<button
													onClick={getSolution}
													disabled={isLoadingSolution}
													className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm sm:text-base w-full sm:w-auto"
												>
													{isLoadingSolution
														? "Loading Solution..."
														: "Show Step-by-Step Solution"}
												</button>
											</div>
										)}
									</>
								)}

								{/* Submission Form - Disabled after submission */}
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
											step="any"
											className="text-gray-700 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm sm:text-base"
											placeholder="Enter your answer"
											required
											disabled={isLoading || hasSubmitted}
										/>
									</div>

									<button
										type="submit"
										disabled={!userAnswer || isLoading || hasSubmitted}
										className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
									>
										{hasSubmitted
											? "Already Submitted"
											: isLoading
											? "Checking..."
											: "Submit Answer"}
									</button>
								</form>
							</div>
						)}

						{feedback && (
							<div
								className={`rounded-lg shadow-lg p-4 sm:p-6 ${
									isCorrect
										? "bg-green-50 border-2 border-green-200"
										: "bg-yellow-50 border-2 border-yellow-200"
								}`}
							>
								<h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">
									{isCorrect ? "✅ Correct!" : "❌ Not quite right"}
								</h2>
								<p className="text-gray-800 leading-relaxed text-sm sm:text-base break-words">
									{feedback}
								</p>
							</div>
						)}
					</>
				) : (
					<div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
						<h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">
							Problem History
						</h2>

						{problemHistory.length === 0 ? (
							<p className="text-gray-600 text-center py-8 text-sm sm:text-base">
								No problems generated yet.
							</p>
						) : (
							<div className="space-y-6">
								{problemHistory.map((session) => (
									<div
										key={session.id}
										className="border border-gray-200 rounded-lg p-3 sm:p-4"
									>
										<div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
											<h3 className="font-semibold text-gray-800 text-sm sm:text-base">
												Problem
											</h3>
											<span className="text-xs sm:text-sm text-gray-500">
												{new Date(session.created_at).toLocaleDateString()}
											</span>
										</div>
										<p className="text-gray-700 mb-4 text-sm sm:text-base break-words">
											{session.problem_text}
										</p>

										{session.submissions && session.submissions.length > 0 ? (
											session.submissions.map((submission, index) => (
												<div
													key={index}
													className={`p-3 rounded-lg ${
														submission.is_correct
															? "bg-green-50 border border-green-200"
															: "bg-red-50 border border-red-200"
													}`}
												>
													<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
														<span
															className={`font-medium text-sm sm:text-base ${
																submission.is_correct
																	? "text-green-800"
																	: "text-red-800"
															}`}
														>
															{submission.is_correct
																? "✅ Correct"
																: "❌ Incorrect"}
														</span>
														<span className="text-xs sm:text-sm text-gray-600 break-words">
															Your answer: {submission.user_answer}
															{!submission.is_correct &&
																` (Correct: ${session.correct_answer})`}
														</span>
													</div>
													<p className="text-gray-700 text-xs sm:text-sm break-words">
														{submission.feedback_text}
													</p>
												</div>
											))
										) : (
											<p className="text-gray-500 text-xs sm:text-sm italic">
												No submission yet
											</p>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</main>
		</div>
	);
}
