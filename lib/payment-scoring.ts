import { sigmoid } from "./utils";

export type LrModelParams = {
  coefficients: Record<string, number>;
  intercept: number;
  scaler_mean: Record<string, number>;
  scaler_scale: Record<string, number>;
};

/**
 * Client-side Logistic Regression scoring using exported coefficients.
 * Works for Kaggle credit-card features (Amount + V*) or any named feature map.
 *
 *   z_i = (x_i - mean_i) / scale_i
 *   logit = intercept + Σ coef_i * z_i
 *   p = sigmoid(logit)
 *   contribution_i = coef_i * z_i
 */
export function scorePaymentShield(
  features: Record<string, number>,
  model: LrModelParams,
  featureOrder?: string[]
): {
  probability: number;
  riskScore: number;
  logit: number;
  contributions: { feature: string; value: number; z: number; coef: number; contribution: number }[];
} {
  const keys = featureOrder ?? Object.keys(features);
  const contributions: {
    feature: string;
    value: number;
    z: number;
    coef: number;
    contribution: number;
  }[] = [];

  let logit = model.intercept;
  for (const feature of keys) {
    if (!(feature in features)) continue;
    const value = features[feature];
    const mean = model.scaler_mean[feature] ?? 0;
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

export function blendRiskScores(mlScore: number, linguisticScore: number) {
  const final = 0.6 * mlScore + 0.4 * linguisticScore;
  return {
    final: Math.round(final),
    formula: "final = 0.6 × ML_score + 0.4 × linguistic_score",
    mlWeight: 0.6,
    linguisticWeight: 0.4,
  };
}
