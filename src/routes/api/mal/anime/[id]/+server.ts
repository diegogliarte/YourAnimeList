import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchAnimeDetails } from '$lib/server/mal';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const animeId = Number(params.id);

	if (!Number.isInteger(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const data = await fetchAnimeDetails(fetch, animeId);

	return json({
		data,
		source: 'mal'
	});
};
