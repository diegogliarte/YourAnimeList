import { error, json } from '@sveltejs/kit';
import type { AnimeDetailsResponse } from '$lib/types/anime';
import { fetchAnimeDetails } from '$lib/server/mal';
import type { RequestHandler } from './$types';

const ONE_DAY = 60 * 60 * 24;
const ONE_WEEK = ONE_DAY * 7;

export const GET: RequestHandler = async ({ params, fetch }) => {
	const animeId = Number(params.id);

	if (!Number.isFinite(animeId) || animeId <= 0) {
		error(400, 'Invalid anime id');
	}

	const data = await fetchAnimeDetails(fetch, animeId);

	return json(
		{
			data
		} satisfies AnimeDetailsResponse,
		{
			headers: {
				'Cache-Control': 'public, max-age=0, must-revalidate',
				'Netlify-CDN-Cache-Control': [
					'public',
					'durable',
					`s-maxage=${ONE_DAY * 7}`,
					`stale-while-revalidate=${ONE_WEEK * 4}`
				].join(', '),
				'Netlify-Cache-Tag': `anime-details, anime-${animeId}`
			}
		}
	);
};
