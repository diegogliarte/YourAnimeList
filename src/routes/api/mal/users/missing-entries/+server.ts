import { error, json } from '@sveltejs/kit';
import { tryFetchAnimeDbMissingEntries } from '$lib/server/anime-db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
	const body = (await request.json()) as { animeIds?: unknown };
	const animeIds = Array.isArray(body.animeIds)
		? [...new Set(body.animeIds)].filter(
				(id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0
			)
		: [];

	if (animeIds.length === 0) {
		error(400, 'animeIds is required');
	}

	const result = await tryFetchAnimeDbMissingEntries(fetch, animeIds);

	if (!result) {
		error(503, 'Anime DB unavailable');
	}

	return json(result);
};
