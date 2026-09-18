import { sigmoid } from "./utils";

export type PaymentFeatures = {
  transaction_amount: number;
  recipient_is_new_payee: number;
  hours_since_last_login: number;
  time_of_day: number;
  is_first_payment_to_recipient: number;
  deviation_from_avg_transaction_zscore: number;
  num_payments_today: number;
  account_age_days: number;
  is_international: number;
};

export type LrModelParams = {
  coefficients: Record<string, number>;
  intercept: number;
  scaler_mean: Record<string, number>;
  scaler_scale: Record<string, number>;
};

/**
 * Client-side Logistic Regression scoring using exported coefficients.
 *
 * Math:
 *   1. Standardize each feature: z_i = (x_i - mean_i) / scale_i
 *   2. Linear predictor: logit = intercept + sum(coef_i * z_i)
 *   3. Probability: p = sigmoid(logit) = 1 / (1 + e^(-logit))
 *   4. Risk score 0-100: round(p * 100)
 *
 * Feature contribution for explainability bar chart:
 *   contribution_i = coef_i * z_i
 *   (positive pushes toward fraud; negative toward legitimate)
 */
export function scorePaymentShield(
  features: PaymentFeatures,
  model: LrModelParams
): {
  probability: number;
  riskScore: number;
  logit: number;
  contributions: { feature: string; value: number; z: number; coef: number; contribution: number }[];
} {
  const contributions: {
    feature: string;
    value: number;
    z: number;
    coef: number;
    contribution: number;
  }[] = [];

  let logit = model.intercept;
  for (const [feature, value] of Object.entries(features) as [keyof PaymentFeatures, number][]) {
    const mean = model.scaler_mean[feature];
    const scale = model.scaler_scale[feature] || 1;
    const coef = model.coefficients[feature] ?? 0;
    const z = (value - mean) / scale;
    const contribution = coef * z;
    logit += contribution;
    contributions.push({ feature, value, z, coef, contribution });
  }

  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  const probability = sigmoid(logit);
  return {
    probability,
    riskScore: Math.round(probability * 100),
    logit,
    contributions,
  };
}

/**
 * Blend structural ML risk with linguistic voice risk.
 * Formula shown in UI: final = 0.6 * ml_score + 0.4 * linguistic_score
 */
export function blendRiskScores(mlScore: number, linguisticScore: number) {
  const final = 0.6 * mlScore + 0.4 * linguisticScore;
  return {
    final: Math.round(final),
    formula: "final = 0.6 × ML_score + 0.4 × linguistic_score",
    mlWeight: 0.6,
    linguisticWeight: 0.4,
  };
}
