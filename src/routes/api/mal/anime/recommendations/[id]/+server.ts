import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tryFetchAnimeDbRecommendations } from '$lib/server/anime-db';

export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const animeId = Number(params.id);

	if (!Number.isInteger(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const result = await tryFetchAnimeDbRecommendations(fetch, animeId, url.searchParams);

	if (!result) {
		error(503, 'Anime DB recommendations unavailable');
	}

	return json({
		...result,
		source: 'db'
	});
};