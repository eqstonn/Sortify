# Eval photos

Photos for `python -m scripts.eval_classifier`. One folder per category id from
`data/categories.json` (or `unknown`), with photos of that item inside:

```
aluminum_can/coke.jpg
battery/aa_pair.jpg
greasy_pizza_box/box.jpg
```

Take real photos on a phone, like a user would. Aim for ~100 independently
labelled photos spread across categories, including tricky ones (a coffee cup,
a greasy vs. clean pizza box). Blur or exclude faces and private information.
Do not use the model's prediction as the label.

Run `python -m scripts.eval_classifier --json baseline.json --min-images 100` for
an honest baseline, then run again on the same photos after revising vetted
prompt hints. Baseline/after JSON reports should be compared by category and bin.
The dataset must be collected by the team; no fabricated photos are included.
