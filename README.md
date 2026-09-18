# NatNorth Risk Intelligence Suite

Explainable banking risk OS: fraud scoring, merchant categorisation, SME early-warning, and voice intent checks.

Classical ML trains offline → static JSON → Next.js live scoring UI.

## Products

1. **Payment Shield**: credit-card fraud (LogReg + XGBoost) with live client-side scoring + Voice Intent Guard
2. **Smart Categorizer**: TF-IDF + LR / RF on noisy merchant strings
3. **SME Pulse**: cash-flow early-warning trajectories
4. **Model Lab** (`/lab`): held-out metrics and model rationale

## Run

```bash
npm install
cp .env.example .env.local   # OPENAI_API_KEY for voice
npm run dev
```

Optional retrain:

```bash
pip install -r ml/requirements.txt
npm run train
```

## Architecture

- `/ml/*.py` trains offline → `/public/data/*.json` + `/public/datasets/*.csv`
- Next.js 14 App Router reads static JSON (no DB, no live Python)
- Serverless routes: `voice-chat`, `voice-speak` (OpenAI)

## Author

Bhavya Goyal · [ML Colab](https://colab.research.google.com/drive/1IHuuetR6fhth8NbpHAeumj3QKwmqQeA5?usp=sharing) · [GitHub](https://github.com/Goyallgithub)
