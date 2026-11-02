# Clock Change Checker

When does the time change? The next clock change for any place, whether you gain or lose an hour, every daylight saving date to 2030, and a check for scheduled jobs that land in the skipped or repeated hour. Powered by [ipgeolocation.io](https://ipgeolocation.io).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000?logo=nextdotjs)](https://nextjs.org/)
[![Powered by ipgeolocation.io](https://img.shields.io/badge/Powered%20by-ipgeolocation.io-d42a20)](https://ipgeolocation.io)

<!-- Add a screenshot of the tool running locally at ./public/tool.png and reference it here -->

---

## What It Does

- **The next clock change** for your location (from your IP), a city you search for, coordinates or a time zone name: the date, the time, which way the clocks go and whether you lose or gain sleep, with a countdown.
- **Two station clocks** showing the jump, 2:00 AM to 3:00 AM, with the abbreviations and UTC offsets either side.
- **Just changed?** For two weeks after a change, the page says so first.
- **Places that don't change**: Phoenix, Tokyo or Mexico City say so, with the date their clocks last changed.
- **Two years at a glance**: standard time and daylight saving time as a strip for this year and next, with each change marked.
- **Every change from last year to 2030**, as a timetable.
- **Will my scheduled job run?** Enter a daily job time and see whether it is skipped on the spring change, runs twice on the autumn one, or runs normally.
- **A world departures board**: the next change in 19 cities, soonest first, and which places have stopped changing.
- **The API call behind the page**, with the real `dst_start` and `dst_end` reply for the place you looked up.

---

## Design notes

**Two sources, one answer.** The headline change comes from the Timezone API's `dst_start` and `dst_end`. The timetable, the strip and the world board need many years and many zones, so they come from the IANA time zone database built into the JavaScript runtime. The tests check that the two agree.

**Changes are found, not assumed.** Rather than encode rules like "second Sunday in March", the tool watches each zone's UTC offset day by day and narrows every jump down to the exact minute. That handles half-hour shifts (Lord Howe Island), changes at midnight (Chile), Morocco's Ramadan change, and countries that have stopped changing.

**Every time is a wall-clock time.** Dates and times are worked out in the place's own time zone, never the server's.

**Scheduled jobs.** In spring the clock skips from the change time to the next hour, so those times never happen. In autumn it repeats an hour, so those times happen twice. The checker says which applies, and how cron on most Linux systems (cronie, Vixie cron) treats each case.

---

## Why ipgeolocation.io

- **[Timezone API](https://ipgeolocation.io/documentation/timezone-api.html)** turns an IP address, a place name, coordinates or a zone name into a time zone, with the current abbreviation, whether DST is in effect, and the exact start and end of DST, including the gap and overlap.
- **Free tier**: everything here works on the free plan.

**[Get your free API key →](https://ipgeolocation.io/signup)**

---

## Features

- **Next clock change** with countdown, direction and "gain or lose an hour"
- **Station clocks** that sweep from the old time to the new
- **No-DST places**, with when they last changed
- **Two-year strip** of standard and daylight saving time
- **Timetable** of every change to 2030
- **Scheduled job checker** for the skipped and repeated hour
- **World departures board**
- **12-hour or 24-hour** clock
- **Works without JavaScript**: everything is server-rendered
- **SEO-ready**: Open Graph tags, meta description, `robots.txt`, `sitemap.xml` and favicon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org/) (App Router) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Language | TypeScript |
| Fonts | Inter Tight and Martian Mono via `next/font` |
| Icons | [lucide-react](https://lucide.dev/) |
| Data | [ipgeolocation.io](https://ipgeolocation.io) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [ipgeolocation.io](https://ipgeolocation.io/signup) API key (the free tier is enough)

### Run It Locally

1. Clone the repo:

```bash
git clone https://github.com/Abdullah-Afzal178/dst-checker.git
cd dst-checker
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root:

```env
IPGEOLOCATION_API_KEY=your_api_key_here
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

> On `localhost` there is no public IP to locate you by, so the page starts from New York and says so. Search for your own city.

---

## Tests

Reading the API's DST fields, finding changes in the time zone database (US, EU, half-hour, midnight and Ramadan changes, and places that stopped), the job checker and the URL parameters are all tested:

```bash
npm test
```

---

## URL Parameters

| Parameter | Example | Meaning |
|---|---|---|
| `place` | `London` | A place name, coordinates such as `51.5, -0.12`, or a zone name |
| `tz` | `Australia/Lord_Howe` | A time zone name |
| `lat`, `lon` | `51.5`, `-0.12` | Coordinates |
| `job` | `02:30` | A daily job time to check against the changes |
| `clock` | `24` | 24-hour clock; 12-hour if left out |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `IPGEOLOCATION_API_KEY` | Yes | Your [ipgeolocation.io](https://ipgeolocation.io/signup) API key |
| `NEXT_PUBLIC_SITE_URL` | No | Your production URL if you deploy (used for the sitemap and robots.txt) |

---

## Project Structure

```
clock-change-checker/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # Search, answer, strip, timetable, job check, board, FAQ
│   ├── opengraph-image.tsx
│   ├── robots.ts
│   └── sitemap.ts
├── components/
│   ├── station-clock.tsx        # Railway clock face (SVG)
│   ├── year-ribbon.tsx          # Standard and daylight time strip
│   └── powered-by-badge.tsx
├── lib/
│   ├── zones.ts                 # Clock changes from the time zone database (pure)
│   ├── dst.ts                   # The API's DST fields, answers, job check (pure)
│   ├── world.ts                 # The departures board (pure)
│   ├── clock.ts                 # Times and dates (pure)
│   ├── query.ts                 # URL parameters (pure)
│   ├── names.ts                 # Place names (pure)
│   ├── timezone.ts              # API calls (server only)
│   └── session-cache.ts
├── .env                         # API key (not committed)
└── README.md
```

---

## Want to Deploy It?

Works out of the box on any platform that supports Next.js:

- **Vercel**: import the repo, add `IPGEOLOCATION_API_KEY`, deploy.
- **Netlify**, **Cloudflare Pages**, **Railway**: a similar process.
- **Self-hosted**: `npm run build && npm start`.

Behind a proxy or CDN, make sure it forwards the visitor's address (`X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`), or every visitor will be located at the proxy.

---

## License

MIT. See [LICENSE](LICENSE) for details.
