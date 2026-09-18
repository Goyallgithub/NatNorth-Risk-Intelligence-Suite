export type CurvePoint = { x: number; y: number };
export type FeatureImportance = { feature: string; importance: number };

export type BinaryMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  confusion_matrix: number[][];
  roc_curve: CurvePoint[];
  pr_curve: CurvePoint[];
  feature_importances: FeatureImportance[];
};

export type PaymentShieldData = {
  meta: {
    task: string;
    n_samples: number;
    n_features: number;
    fraud_rate: number;
    train_test_split: number;
    test_size: number;
    class_imbalance_handling: Record<string, string>;
    feature_names: string[];
    why_models: string;
  };
  logistic_regression: BinaryMetrics & {
    coefficients: Record<string, number>;
    intercept: number;
    scaler_mean: Record<string, number>;
    scaler_scale: Record<string, number>;
  };
  xgboost: BinaryMetrics;
  samples: Array<{
    transaction_amount: number;
    recipient_is_new_payee: number;
    hours_since_last_login: number;
    time_of_day: number;
    is_first_payment_to_recipient: number;
    deviation_from_avg_transaction_zscore: number;
    num_payments_today: number;
    account_age_days: number;
    is_international: number;
    true_label: number;
    lr_probability: number;
    xgb_probability: number;
  }>;
};

export type CategorizerData = {
  meta: {
    task: string;
    n_samples: number;
    n_categories: number;
    categories: string[];
    train_test_split: number;
    test_size: number;
    vectorizer: string;
    why_models: string;
  };
  logistic_regression: {
    model: string;
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    per_category: Array<{
      category: string;
      precision: number;
      recall: number;
      f1: number;
      support: number;
    }>;
    confusion_matrix: number[][];
    confusion_matrix_labels: string[];
  };
  random_forest: {
    model: string;
    accuracy: number;
    macro_f1: number;
    weighted_f1: number;
    per_category: Array<{
      category: string;
      precision: number;
      recall: number;
      f1: number;
      support: number;
    }>;
    confusion_matrix: number[][];
    confusion_matrix_labels: string[];
  };
  keyword_rules: Record<string, string[]>;
  vocabulary_weights: Array<{
    token: string;
    mean_abs_coef: number;
    class_coefficients: Record<string, number>;
  }>;
  class_priors: Record<string, number>;
  lr_intercept: Record<string, number>;
  samples: Array<{
    description: string;
    true_category: string;
    lr_predicted: string;
    lr_confidence: number;
    rf_predicted: string;
    rf_confidence: number;
  }>;
  per_category_f1_comparison: Array<{
    category: string;
    lr_f1: number;
    rf_f1: number;
  }>;
};

export type SmePulseData = {
  meta: {
    task: string;
    n_smes: number;
    n_months: number;
    n_panel_rows: number;
    n_train_accounts: number;
    distress_rate: number;
    train_test_split: number;
    test_size: number;
    training_row: string;
    feature_names: string[];
    class_imbalance_handling: Record<string, string>;
    why_models: string;
  };
  logistic_regression: BinaryMetrics & {
    coefficients: Record<string, number>;
    intercept: number;
    scaler_mean: Record<string, number>;
    scaler_scale: Record<string, number>;
  };
  random_forest: BinaryMetrics;
  trajectories: Array<{
    sme_id: string;
    true_distressed: number;
    high_risk_threshold: number;
    crossed_high_risk_month: number | null;
    months: Array<{
      month: number;
      distress_score_lr: number;
      distress_score_rf: number;
      monthly_inflow: number;
      monthly_outflow: number;
      cash_runway_months: number;
      overdraft_days_used: number;
    }>;
  }>;
  high_risk_threshold: number;
};
