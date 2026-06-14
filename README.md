# YourAnimeList

MAL's flow sucks.

This is a small anime dashboard tailored for how I actually use my list, so I do not lose my data every reload and I can mix normal anime discovery with my own MAL data.

Hosted at:

https://anime.diegogliarte.com

## What it does

Load a MyAnimeList username.

Then you get:

- List
- Stats
- Top Anime
- Franchises
- All Anime

## List

Your MAL list, but nicer.

Filter by status, sort the table, hide/show MAL scores, and keep the loaded user cached locally.

Very advanced technology: not making me reload everything every time.

## Stats

Personal stats from the loaded MAL user.

Also has small showcases like:

- Hidden gems
- Hot takes
- Most obscure
- Popular misses

Anime homework, but with cards.

## Top Anime

Uses MAL rankings.

Supports:

- Top
- Airing
- Upcoming
- TV
- Movies
- OVA
- Specials
- Popular
- Favorites

You can also exclude anime already in your own list.

Because yes, I know Fullmetal Alchemist exists.

## Franchises

Search an anime, pick a seed, and crawl related anime.

Included relations are accepted automatically. Weird/optional relations can be accepted or rejected manually.

Useful for franchise watch orders, especially when MAL relations are... MAL relations.

You can also manually add another anime into the current franchise when MAL refuses to connect obvious things.

## All Anime

This uses my own scraped MAL SQLite database, served from a tiny API on my Raspberry Pi.

Frontend is still on Netlify.

DB API is not.

Flow:

```txt
Netlify frontend
-> Cloudflare
-> Caddy
-> Raspberry Pi API
-> SQLite
```

This page supports filtering/sorting the full anime database with infinite scroll.

Examples:

- oldest anime
- lowest MAL mean
- most obscure
- most popular
- by media type
- by genre
- by studio
- by year
- by episodes
- by score range

If the Pi is down, the page just says the DB is down.

## Environment

Frontend:

```env
PUBLIC_ANIME_DB_API_URL=https://api-anime.diegogliarte.com
MAL_CLIENT_ID=your_mal_client_id
```

The MAL client ID is used by the SvelteKit server routes.

The anime DB API URL is public and used directly by the browser.

## Local dev

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```
