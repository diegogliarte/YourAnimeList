import { error, json } from '@sveltejs/kit';
import type { AnimeDetailsResponse } from '$lib/types/anime';
import { fetchAnimeDetails } from '$lib/server/mal';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const animeId = Number(params.id);

	if (!Number.isFinite(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const data = await fetchAnimeDetails(fetch, animeId);

	return json({
		data
	} satisfies AnimeDetailsResponse);
};
