import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { tryFetchAnimeDbFranchise } from '$lib/server/anime-db';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const animeId = Number(params.id);

	if (!Number.isInteger(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const result = await tryFetchAnimeDbFranchise(fetch, animeId);

	if (!result) {
		error(503, 'Anime DB franchise unavailable');
	}

	return json({
		...result,
		source: 'db'
	});
};
