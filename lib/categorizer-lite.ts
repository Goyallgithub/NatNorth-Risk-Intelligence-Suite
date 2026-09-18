/**
 * Client-side keyword / TF-IDF-lite categorizer.
 *
 * Uses exported keyword_rules + vocabulary_weights from categorizer.json:
 *   score(category) = intercept_c + sum(matched_token_coef_c)
 * then softmax-ish normalize via max-margin confidence.
 *
 * This approximates the trained LR without shipping the full sparse matrix.
 */

export type CategorizerLiteData = {
  keyword_rules: Record<string, string[]>;
  vocabulary_weights: {
    token: string;
    mean_abs_coef: number;
    class_coefficients: Record<string, number>;
  }[];
  lr_intercept: Record<string, number>;
  class_priors: Record<string, number>;
  meta: { categories: string[] };
};

export function categorizeDescription(
  raw: string,
  data: CategorizerLiteData
): {
  category: string;
  confidence: number;
  scores: { category: string; score: number }[];
  matchedTokens: string[];
} {
  const text = raw.toLowerCase().trim();
  if (!text) {
    return { category: "—", confidence: 0, scores: [], matchedTokens: [] };
  }

  const categories = data.meta.categories;
  const scores: Record<string, number> = {};
  for (const c of categories) {
    scores[c] = data.lr_intercept[c] ?? Math.log((data.class_priors[c] ?? 0.1) + 1e-6);
  }

  const matchedTokens: string[] = [];

  // Keyword rule boosts (strong priors from merchant templates)
  for (const [cat, keywords] of Object.entries(data.keyword_rules)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        scores[cat] = (scores[cat] ?? 0) + 2.5;
        matchedTokens.push(kw);
      }
    }
  }

  // Vocabulary coefficient contributions for tokens present in text
  for (const vw of data.vocabulary_weights) {
    const tok = vw.token.toLowerCase();
    if (tok.length < 2) continue;
    if (text.includes(tok) || text.split(/\s+/).includes(tok)) {
      matchedTokens.push(vw.token);
      for (const [cat, coef] of Object.entries(vw.class_coefficients)) {
        scores[cat] = (scores[cat] ?? 0) + coef;
      }
    }
  }

  const ranked = Object.entries(scores)
    .map(([category, score]) => ({ category, score }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const second = ranked[1]?.score ?? best.score - 1;
  // Softmax-style confidence from top-2 margin
  const margin = best.score - second;
  const confidence = Math.min(0.99, Math.max(0.35, 1 / (1 + Math.exp(-margin))));

  return {
    category: best.category,
    confidence,
    scores: ranked,
    matchedTokens: Array.from(new Set(matchedTokens)).slice(0, 12),
  };
}
