# Sortify demo (3 minutes)

One person talks, one person holds the phone. The phone is mirrored to the screen (QuickTime on a Mac with a cable, or the projector's phone input), so practise holding items in good light.

## The day before

- [ ] Backend deployed on Render and `python -m scripts.smoke_test https://<your-render-url>` prints two PASS lines.
- [ ] All four migrations run in Supabase (001 to 004).
- [ ] `python -m scripts.seed` so the Board is full and "This week" is fresh. Run it again the morning of the demo.
- [ ] The demo phone has its own account (not one used for rehearsal), with a name the judges will notice, e.g. "Team Sortify". Give it Wrapped data: copy its id from `GET /me` and run `python -m scripts.dev_seed_month <id>`.
- [ ] Check this week's **Discover weekly** item on Home and bring a real one (week of Oct 26 it's a greasy pizza box; it changes every Monday).
- [ ] Pack the items below in a bag, in scanning order.
- [ ] Record a 3-minute screen recording of a good run-through (see Backup plan).

## Five minutes before

- [ ] Open `https://<your-render-url>/health` on the laptop. The free plan sleeps, and waking up takes about a minute. Keep the tab open.
- [ ] Phone: charged, brightness up, Do Not Disturb on, Expo Go open with Sortify on Home. Pull down to refresh once.
- [ ] Phone and laptop on the same hotspot (Expo Go loads the app from the laptop).

## Items to scan, in order

| # | Item | Expected result | Why it's in the demo |
| --- | --- | --- | --- |
| 1 | Empty pop can | **Blue bin**, +points, "rinse it" tip, first-time bonus | The basic flow: scan, answer, "I recycled it", points toast |
| 2 | This week's Discover item (greasy pizza box) | **Green bin**, Discover bonus | The tricky one most people get wrong; Home card flips to "Found ✓" |
| 3 | Chip bag | **Garbage**, 2 points | Honesty: not everything is recyclable, and we say so |
| 4 | AA battery | **Drop-off**, the most points (rare item) | Hazardous items never go in a bin; rarer finds earn more |
| spare | Glass jar, cardboard box | Blue bin / Black bin | If one of the above misfires |

Take every photo live. A photo that already earned points (even from the camera roll, even on another account) earns nothing the second time; that's the anti-cheat working.

## Script

**0:00 to 0:20, the problem** (speaker, phone on Home)
"Is a greasy pizza box blue bin, black bin or green bin? Most of us guess, and wrong guesses contaminate the recycling. Ottawa has five places things can go, and the rules are on a web page nobody reads. Sortify answers that in one photo."

**0:20 to 0:40, Home**
"This is my garden. The plant grows as I sort. Here's my points, my streak, my rank in Ottawa, and which bins go out at my next pickup." (Set the demo account's pickup day beforehand so the banner shows a real date.)

**0:40 to 1:50, four scans** (about 15 seconds each)
1. Can: tap Scan, photo, "Blue bin. Rinse it first." Tap **I recycled it**, points pop up.
2. Pizza box: "This week's Discover item. Green bin, because the grease ruins paper recycling." Confirm, bonus.
3. Chip bag: "Garbage. We'd rather tell you the truth than let you wish-cycle."
4. Battery: "Never in a bin. It goes to a drop-off, and because it's a rare find it's worth the most."

**1:50 to 2:15, Board and Me**
Board: "That just moved me up the Ottawa leaderboard. This week and all time." Me: "My stats: kilograms kept out of landfill, what I sort most, and badges."

**2:15 to 2:40, Wrapped**
Wrapped tab, tap through the five cards quickly: "Every month you get your Sortify Wrapped: your top material, your rarest find, your rank in the city. Made to share."

**2:40 to 3:00, how it works + close**
"Gemini looks at the photo but can only pick from our fixed list of item types; the bin always comes from Ottawa's rules, never from the AI. Points can't be farmed: they're capped per day and the same photo never pays twice. Sortify: know your bin."

## Backup plan

| If this happens | Do this |
| --- | --- |
| A scan is slow (Render waking up) | Keep talking: "the first scan wakes the server". Never let the app sit silent; narrate. |
| "The scanner is having trouble right now" | Gemini is busy (we saw 503 and 504 errors from Google during testing). Wait 5 seconds and scan again. If it fails twice, skip to the next item and move on. |
| Gemini fails for everything (quota used up) | Swap in a teammate's Gemini key: Render → sortify-api → **Environment** → `GEMINI_API_KEY` → Save (redeploys in about 2 minutes). On the day itself, go straight to the recording. |
| Wrong answer | Use it: tap **Not right?**, pick the right category. "When it's wrong, you correct it, and that's how we measure accuracy." |
| Render is down | Run the backend on the laptop (`uvicorn app.main:app --host 0.0.0.0 --port 8000` + `cloudflared tunnel --url http://localhost:8000`), put the tunnel URL in `mobile/.env`, restart Expo with `--clear`. Takes 2 minutes; only if there's time. |
| No Wi-Fi | Phone hotspot for both the laptop and the phone. |
| Camera won't work / bad light | Use the gallery button with photos taken that morning (not used in rehearsal). |
| Points stop going up | The daily cap (200) was hit. Say so: "and that's the daily cap, so nobody can farm points." |
| Everything is broken | Play the screen recording and narrate over it. Have the mockups in `docs/mockups/` open in another tab as a last resort. |

## Likely judge questions

- **How accurate is it?** Run `python -m scripts.eval_classifier` on real photos before the demo and quote the number honestly.
- **What stops cheating?** Points only on confirm, a daily cap, no points twice for the same photo (perceptual hash), all inside one database transaction.
- **Why can't the AI send me to the wrong bin?** Gemini only picks an item type from a fixed list; the bin comes from `data/categories.json`, which follows the city's rules.
- **Privacy?** Photos are shrunk and location data (EXIF) is stripped before anything leaves our server.
- **What's next?** Nearest drop-off on the map, more cities, school and office team leaderboards.
