import { error, json } from '@sveltejs/kit';
import type { AnimeDetailsResponse } from '$lib/types/anime';
import { fetchAnimeDetails } from '$lib/server/mal';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, fetch }) => {
	const animeId = Number(params.id);
	const debug = url.searchParams.get('debug') === 'true';

	if (!Number.isFinite(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const data = await fetchAnimeDetails(fetch, animeId);

	if (debug) {
		console.log('MAL anime details:', data.title);
		console.dir(
			{
				id: data.id,
				title: data.title,
				related_anime: data.related_anime
			},
			{ depth: null }
		);
	}

	return json({
		data
	} satisfies AnimeDetailsResponse);
};