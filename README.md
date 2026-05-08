# Your Anime List

A compact MyAnimeList viewer built with SvelteKit.

Live site: [anime.diegogliarte.com](https://anime.diegogliarte.com)

## About

Your Anime List is a small web app for browsing a MyAnimeList profile with a cleaner, faster, table-focused interface.

It lets you search a MAL username, inspect their anime list, filter by list status, sort entries, and discover new anime through MyAnimeList rankings while hiding entries already present in the user's list.

## Features

- Search any public MyAnimeList profile.
- View anime in a compact table layout.
- Filter by status:
    - all
    - completed
    - watching
    - on hold
    - dropped
    - plan to watch
- Sort by:
    - score
    - title
    - year
    - episodes
- View useful anime metadata:
    - title
    - cover image
    - score
    - watched episodes
    - total episodes
    - season and year
- Recommendations tab powered by MAL rankings.
- Filter recommendations by ranking type:
    - top
    - airing
    - upcoming
    - TV
    - movies
    - OVA
    - specials
    - popularity
    - favorites
- Hide recommendations already present in the user's list.
- Infinite scrolling for ranking results.
- URL state for filters, sorting, search, and username.

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit)
- [Svelte 5](https://svelte.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [MyAnimeList API](https://myanimelist.net/apiconfig/references/api/v2)

## Environment variables

Create a `.env` file with:

```env
MAL_CLIENT_ID=your_mal_client_id
MAL_USERNAME=your_private_mal_username