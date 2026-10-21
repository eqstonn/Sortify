# Sortify scan demo

Point your camera at an item, tap **Scan item**, and Gemini tells you whether it's recyclable in Ottawa and which bin it goes in. The result shows on the page and prints in the terminal.

## Files

```
sortify-demo/
├── main.py            # FastAPI server, sends the photo to Gemini
├── static/index.html  # camera page
├── requirements.txt
└── .env               # your GEMINI_API_KEY (copy of env.example.txt)
```

If `.env` didn't download (dotfiles are sometimes hidden), copy `env.example.txt` and rename it to `.env`.

## 1. Get a Gemini key

Go to https://aistudio.google.com/apikey, create a free key, and paste it into `.env`:

```
GEMINI_API_KEY=your-key-here
```

Don't commit `.env` to GitHub.

## 2. Install and run

```bash
cd sortify-demo
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Open http://localhost:8000 on your laptop. The webcam works on localhost without https.

## 3. Test on your phone (ngrok)

Phones only allow the camera on https pages, so use ngrok to get an https link:

1. Install ngrok from https://ngrok.com/download and sign up (free).
2. Run `ngrok config add-authtoken <your-token>` once.
3. Keep uvicorn running, and in a second terminal run `ngrok http 8000`.
4. Open the `https://....ngrok-free.app` link it prints on your phone. Click through the ngrok warning page and allow camera access.

If the live camera won't start, the "upload a photo" button opens the phone's camera app instead.

## Troubleshooting

- **"GEMINI_API_KEY is missing"**: the key isn't in `.env`, or you started uvicorn from a different folder. Run it from inside `sortify-demo`.
- **Model not found**: Google renames models now and then. Add `GEMINI_MODEL=<model name>` to `.env` using a current Flash model from https://ai.google.dev/gemini-api/docs/models.
- **429 / quota error**: you hit the free-tier rate limit. Wait a minute.
