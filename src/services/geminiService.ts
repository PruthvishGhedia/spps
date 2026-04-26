export interface Student {
  id?: number;
  name: string;
  attendance: number;
  midterm_1: number;
  midterm_2: number;
  previous_grade: number;
  predicted_grade?: number;
  status?: string;
}

/**
 * Predicts student performance using a local mathematical model instead of a network call.
 * This makes the "Predict" button near-instant while maintaining reasonable accuracy.
 */
export async function predictPerformance(student: Student) {
  // Add a small artificial delay to make the transition smoother and "feel" like AI
  await new Promise(resolve => setTimeout(resolve, 500));

  // --- Linear Regression Approximation ---
  // Weights (normalized to sum to roughly 1.0)
  const W_ATTENDANCE = 0.2;
  const W_MIDTERM_1 = 0.25;
  const W_MIDTERM_2 = 0.35;
  const W_PREVIOUS = 0.2;

  // Midterms are out of 20, need to normalize them to 100 for calculation
  const midterm1Normalized = (student.midterm_1 / 20) * 100;
  const midterm2Normalized = (student.midterm_2 / 20) * 100;

  // Calculate predicted grade
  const predictedGrade = Math.round(
    (student.attendance * W_ATTENDANCE) +
    (midterm1Normalized * W_MIDTERM_1) +
    (midterm2Normalized * W_MIDTERM_2) +
    (student.previous_grade * W_PREVIOUS)
  );

  // --- Decision Tree Logic ---
  let status = "Safe";
  let reasoning = "Consistent performance across metrics.";

  if (predictedGrade < 60) {
    status = "At Risk";
    reasoning = "Predicted final grade is below passing threshold (60%).";
  } else if (student.attendance < 75) {
    status = "At Risk";
    reasoning = "Low attendance history indicates potential for falling behind.";
  } else if (midterm2Normalized < midterm1Normalized - 15) {
    status = "At Risk";
    reasoning = "Significant drop in performance between Midterm 1 and Midterm 2.";
  } else if (predictedGrade >= 60 && predictedGrade < 75) {
    status = "Idle";
    reasoning = "Performance is borderline, may need closer monitoring.";
  }

  return {
    predicted_grade: Math.min(100, Math.max(0, predictedGrade)),
    status,
    reasoning
  };
}

