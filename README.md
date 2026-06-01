# YourAnimeList

MAL flow sucks.

This is a small anime dashboard tailored for my own needs, mainly so I do not lose my data every time I refresh the page, change tabs, or look at something else for two seconds.

It uses normal MAL data, but makes it useful with the user's own list.

Live: https://anime.diegogliarte.com

## Problem

MAL has the data.

But using it is annoying.

You want to check:

```txt
What did I complete?
What am I missing?
How much time did this franchise take?
What top anime are already in my list?
What related anime should I watch next?
```

MAL says:

```txt
good luck
```

## What it does

Loads a user's MAL anime list.

Then lets you use it properly.

## Pages

```txt
/list
/stats
/top-anime
/franchises
```

## List

A better anime list.

Sort by:

```txt
score
MAL score
progress
episodes
season
```

Filter by:

```txt
all
watching
completed
on hold
dropped
planned
```

Also supports my very scientific scoring tags:

```txt
8+
8
8-
```

Yes, this matters.

## Stats

Numbers.

Runtime, episodes, averages, score spread, rewatches, completion, charts, showcases.

Basically:

```txt
MAL profile stats, but less sad.
```

## Top Anime

MAL rankings, but with your list mixed in.

You can exclude:

```txt
completed
watching
on hold
dropped
planned
```

So the top list becomes useful instead of showing you 400 things you already know exist.

## Franchises

Search an anime.

Pick one.

It crawls related anime and builds a release-order-ish franchise list.

Useful for things like:

```txt
Fate
Monogatari
Gundam
Dragon Ball
whatever mess MAL relations allow
```

Some relations are accepted automatically.

Some suspicious relations ask first.

Because anime databases are chaos.

## Stack

```txt
SvelteKit
Svelte 5
Tailwind CSS
MyAnimeList API
Netlify
```

## Setup

Create `.env`:

```env
MAL_CLIENT_ID=your_mal_client_id
```

Install:

```bash
pnpm install
```

Run:

```bash
pnpm run dev
```

Build:

```bash
pnpm run build
```

## Deploy

Hosted on Netlify.

Required environment variable:

```env
MAL_CLIENT_ID=your_mal_client_id
```

## Notes

This uses the official MyAnimeList API.

It is built for me.

If it also works for you, suspiciously good.