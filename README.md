# RedactLens
Local-first browser extension that detects PII, bank info, names and secret keys in ChatGPT / Claude prompts and offers one-click redaction. Nothing leaves the browser.

## Try the MVP (Tier 1, works now)
1. Chrome -> `chrome://extensions` -> Developer mode -> Load unpacked -> select `extension/`
2. Open claude.ai or chatgpt.com, paste a fake key like `AKIAIOSFODNN7EXAMPLE` or card `4242 4242 4242 4242`
3. Banner appears -> click **Redact**

## Architecture
Tier 1: regex + Luhn checksum + entropy (secrets, cards, IBAN, SSN, email)
Tier 2: fine-tuned DistilBERT NER (names, financial, contact) -> ONNX int8 -> Transformers.js

## Roadmap
- [ ] Run `training/train.py` on Colab; record precision/recall/F1 per class
- [ ] Export: `optimum-cli export onnx --model pii-distilbert onnx/` then quantize to int8
- [ ] Benchmark latency (ms/prompt) and size, fp32 vs int8 (table in this README)
- [ ] Tier 2 in an offscreen document with Transformers.js; merge with Tier 1 detections
- [ ] SHAP notebook: token-level explanations for model detections, plus error analysis
- [ ] Demo GIF + results table
# RedactLens
