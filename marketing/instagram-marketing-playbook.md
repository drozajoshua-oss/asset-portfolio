# Trovault — Instagram Marketing Playbook
*Researched July 2026 (sources in the two research briefs; key ones cited inline).*

## The one-line strategy
Trovault's product moment — point phone at object, price appears — is exactly the
format the collectibles niche already goes viral on ("what's it worth" reveals).
Post that moment relentlessly as short Reels. Grow organic first; turn on paid
ads only after the funnel math works (see Part 3 — it doesn't yet).

---

# Part 1 — Organic content system

## How the algorithm works now (2026)
- Instagram is an **interest graph**: Reels/Explore/Feed recommend to non-followers,
  so a 0-follower account can reach thousands. **Ratios beat totals** — engagement
  per view is what's ranked, not absolute numbers.
- Ranking signals (Mosseri-confirmed): **watch time, sends-per-reach (DM shares),
  likes-per-reach**. Sends weigh ~3–5× likes. Make content people forward to the
  friend who collects.
- Original content only — reposts get heavily down-ranked.
- Hashtags barely matter: use **3–5 niche tags** (#coincollecting #errorcoins
  #watchcollector), never broad spam. Write **searchable captions** instead —
  Instagram SEO indexes them ("how much is a 1921 Morgan dollar worth").

## The flagship format: the Scan Reveal (post 3–5×/week)
7–15 second Reel, faceless (hands + item + voiceover or captions):
1. **0–1.5s hook**: item fills frame + text overlay — "Grandpa left me this drawer"
   / "Found at a garage sale for $2" / "Is this $5 or $5,000?"
2. **1.5–8s**: phone enters frame, scans it in the app
3. **8–15s payoff**: value card pops on screen. Hold on the number.
Caption first line = second hook + searchable phrase. End screen: "Would you
have kept it? 👇" (comments) or "Send this to a collector" (sends).

**Proof this works:** CoinHub (@coinhubs) hit 20K followers + 2M views in its
FIRST month on "check your pocket change — this penny is worth $10,000" content.
Sports Card Investor, CardsHQ, and thrift-flip accounts (@selectthreads) all run
stakes-based reveal formats. Trovault produces the payoff moment automatically.

## Content mix (weekly template)
| Day | Format | Content |
|---|---|---|
| Mon | Reel (Scan Reveal) | Coin/change theme — biggest niche |
| Tue | Carousel | Educational: "5 error coins worth checking for" (carousels get 2–3× saves — conversion content) |
| Wed | Reel (Scan Reveal) | Watches / sneakers / cards — rotate |
| Thu | Story only | Poll/quiz: "Guess what this sold for" |
| Fri | Reel (Scan Reveal) | Attic find / thrift-flip math ("bought $6 → worth $750") |
| Sat | Reel or founder clip | Build-in-public / behind the scenes (occasional face = trust) |
| Sun | Rest / engage | Reply to every comment; comment meaningfully on 5 big niche accounts |

- Reel lengths: 7–15s for reach plays, 15–35s for education.
- Design sound-off: kinetic captions/text overlays always.
- Max 1 post/day. Consistency for months > any burst.
- At 1,000+ followers, use **Trial Reels** to test hooks on non-followers first.

## Realistic growth + weekly scorecard
Expectations from zero: **Month 1: 50–150 followers. Months 2–3: +200–500/month.**
~1K by month 3–4 is a *good* outcome. Plan for compounding, not virality.

Track weekly (native Insights; "Views" is the primary metric now):
| Metric | What "working" looks like |
|---|---|
| Views + % from non-followers | non-follower share rising toward 50%+ |
| Sends per reach | the north star — any send is gold; compare across your own Reels |
| 3-sec hold rate | >60% = strong hook; <40% = redo the first 1.5s |
| Saves (carousels) | rising = your educational content has keep-value |
| Follows per reach | are strangers converting? |
| Profile visits → link taps → waitlist/App Store | the only line that pays rent |

---

# Part 2 — Ads: the math says NOT YET

## Unit economics (why waiting is correct)
Net revenue after Apple's 15% (Small Business Program):
- Annual $39.99 → **$34.00** · Monthly $4.99 → **$4.24**

**Max profitable CPI = (install→trial rate) × (trial→paid rate) × $34**

Benchmarks (RevenueCat State of Subscription Apps 2026):
- Median install→trial across trial apps: **~3.7%**
- Freemium download→paid by day 35: **2.1% median**
- 7-day trial → paid: **~30–40%**

At today's funnel: 3.7% × 35% × $34 ≈ **$0.44 max CPI**.
Actual US iOS CPI for utility apps: **$3–9**. Ads would lose ~10× their cost.

**What flips the math:** an onboarding paywall shown to ad-driven installs
(trial offer during first-launch flow). Ad traffic hitting an onboarding
paywall reaches 15–25% trial rates → max CPI $1.79–3.00 → viable, especially
on cheap Reels inventory and Tier-2 geos. **Build this before spending $1.**

## Pre-spend checklist (do in this order)
1. App Store page converting well organically (screenshots ✅, need ratings — ask
   happy users in-app after a good scan, post-launch)
2. **Meta SDK** added to the app (required even with RevenueCat integration)
3. **RevenueCat → Meta Ads integration** ON (sends StartTrial/Subscribe server-side;
   no MMP needed at this scale — skip AppsFlyer/Adjust for now)
4. SKAdNetwork configured in Meta Events Manager
5. Onboarding trial paywall for new installs (the math-flipper)
6. 3–5 vertical (9:16) creatives cut from your best-performing ORGANIC Reels —
   proven hooks only; UGC-style screen-recordings beat polished ads

## When you do spend: the setup
- **One Advantage+ App Campaign** (App Promotion objective). NOT boosted posts —
  the Boost button can't optimize for installs at all.
- **Broad targeting. No interest stacks** — collector/watch/sneaker interest
  audiences fragment a small budget and hurt AAC performance.
- Optimize for **installs** (trial-event optimization needs ~50 events/week —
  you won't have the volume yet).
- Budget: **$20–30/day**. Don't touch budget/creative mid-learning (restarts it).
- Cheap lab: run creatives on worldwide/Tier-2 English geos first (CPM $1.50–7 vs
  US $23), port winners to US/UK.

## Ad benchmarks & kill/scale rules
| Metric | Benchmark / target | Rule |
|---|---|---|
| CPM | US ~$23 · UK ~$11 · T2 $6.50–12 · WW $1.50–4.20 · Reels cheapest | context, not a lever |
| CTR | ~1%+ healthy | <0.5% = creative problem |
| CPC | IG $0.40–1.80 | context |
| **IPM** (installs/1K impressions) | **≥5 promising · <2 kill** (Tier 1) | primary creative verdict |
| CPI | vs YOUR max ($1.79–3 with onboarding paywall) | >1.5× target after ~$100 spend → pause |
| Trial starts | from RevenueCat, not Meta (SKAN is delayed/coarse) | judge blended over 7–30 days |
| Judging window | 3–7 days per creative | "nothing in 2–3 days → nothing later" (Adapty) |
| Scaling | +20% every few days | expect CPI +15–30% as you scale |

## Money-wasting traps (beginners burn ~$2,800/90 days on these)
Wrong objective (traffic ≠ installs) · spending before SDK/SKAN setup (invisible
results) · editing mid-learning · interest-audience overlap · trial-optimization
without event volume · weak App Store page · the Boost button for installs.

---

# Part 3 — This month's plan
1. **Now → launch:** 6-post countdown (see instagram-launch-posts.md) + start
   the weekly content system above. Film 5–10 Scan Reveals in one batch session.
2. **Launch week:** post daily, cross-post every Reel to TikTok + YouTube Shorts
   (same file, 3× surface area), reply to everything.
3. **Weeks 2–4:** double down on whichever Reveal theme (coins/watches/thrift)
   shows the best sends-per-reach. Ask happy users for App Store ratings.
4. **Month 2+:** if organic shows product-market pull, build the onboarding trial
   paywall + Meta SDK + RevenueCat integration, then test $20–30/day per the
   checklist. Never before.
