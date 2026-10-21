import json
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not API_KEY or API_KEY == "paste-your-key-here":
    raise SystemExit("GEMINI_API_KEY is missing. Put your key in the .env file.")

client = genai.Client(api_key=API_KEY)
app = FastAPI()

PROMPT = """You are a recycling assistant for Ottawa, Ontario, Canada.
Look at the photo and identify the main item in it.

Ottawa sorting rules:
- "blue bin": glass bottles and jars, metal cans, foil, plastic bottles/tubs/jugs, cartons, drink boxes
- "black bin": paper, newspaper, flattened cardboard, boxboard, paper bags
- "green bin": food scraps, soiled paper towels/napkins, pizza boxes with grease, coffee grounds
- "garbage": chip bags, styrofoam, plastic film/wrap, diapers, broken ceramics
- "e-waste depot": electronics, cables, phones, chargers, small appliances
- "hazardous waste depot": batteries, paint, propane tanks, light bulbs, chemicals

Reply ONLY with JSON in exactly this shape:
{
  "item": "short name of the item",
  "material": "main material",
  "recyclable": true or false,
  "bin": "blue bin" | "black bin" | "green bin" | "garbage" | "e-waste depot" | "hazardous waste depot",
  "instructions": "one or two sentences on how to prepare and dispose of it",
  "confidence": "high" | "medium" | "low"
}
If you can't see an item clearly, set item to "unknown" and confidence to "low"."""


@app.get("/")
def index():
    return FileResponse("static/index.html")


@app.post("/classify")
async def classify(image: UploadFile = File(...)):
    data = await image.read()
    if not data:
        raise HTTPException(400, "Empty image")

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=data, mime_type=image.content_type or "image/jpeg"),
                PROMPT,
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        result = json.loads(response.text)
    except Exception as e:
        print(f"\n[Sortify] Gemini error: {e}\n")
        raise HTTPException(502, f"Gemini error: {e}")

    print("\n===== Sortify scan =====")
    print(f"Item:        {result.get('item')}")
    print(f"Material:    {result.get('material')}")
    print(f"Recyclable:  {'YES' if result.get('recyclable') else 'NO'}")
    print(f"Bin:         {result.get('bin')}")
    print(f"How:         {result.get('instructions')}")
    print(f"Confidence:  {result.get('confidence')}")
    print("========================\n")

    return result


app.mount("/static", StaticFiles(directory="static"), name="static")
