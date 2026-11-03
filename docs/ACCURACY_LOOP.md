# Sortify classifier feedback loop

## What the new endpoint actually measures

`GET /stats/accuracy` aggregates **confirmed** scan rows. A changed `final_category_id`
counts as a correction. An unchanged scan is **not verified accurate**. `observed_uncorrected_pct`
is the fraction of confirmed scans with no recorded category change, not independently measured
accuracy. `reviewed_accuracy_pct` uses only explicit user labels (including low-confidence
choices that match the original prediction). It can be biased by which users review images.

Per-category stats group by the **original predicted** category, not the corrected category.
The separate `per_reported_actual_category` groups only explicitly reviewed scans
by the category the player selected. Top mix-ups show `(model prediction, user label, count)`. Confidence buckets show whether
low confidence is associated with more recorded corrections; different prompting/review
rates can affect the comparison. The endpoint returns aggregates only, not user IDs/photos.
It requires authentication, like other user-facing app endpoints.

## Low-confidence review

Gemini returns one `category_id`, `confidence`, and up to 3 ranked distinct suggested
category IDs. The model's first pick remains in `scans.category_id` **even if uncertain**.
At confidence < 0.70 (or for `unknown`), users must choose a category before confirming;
the backend enforces this too. The selection is recorded in `final_category_id` through
the existing correction endpoint. Even selecting the original prediction is treated as
an explicit review and subject to the **10-point corrected-scan maximum**. If Gemini
returns fewer than 3 valid suggestions, the manual full category picker remains available.
Gemini never decides the actual bin; `rules.py` does.

## Prompt improvement, without user-sourced prompt injection

1. Review top misclassifications on `/stats/accuracy`. Do **not** copy arbitrary user text
   into the prompt automatically; a correction is unverified and may be malicious.
2. Check the correct disposal category against Ottawa rules, then edit
   `data/classifier_hints.json` with a short human-reviewed disambiguation.
3. Assemble a **fixed, labelled** holdout set in `tests/eval_images/<category_id>/`.
   Aim for ~100 real photos representing both easy and tricky items, without private
   information in the frame. Keep the same photos between baseline and new prompt runs.
4. Run `python -m scripts.eval_classifier --json baseline.json`, change prompt hints,
   then `python -m scripts.eval_classifier --json after.json` with the same model/settings.
   Compare category and bin accuracy, and especially prior failure categories. Review
   confidence, sample size, and regressions, not just the overall number.

The dataset is intentionally **not manufactured or claimed to exist**; photos need human
labelling. Real Gemini eval calls use API credit. Unit/API tests mock Gemini and Supabase.
