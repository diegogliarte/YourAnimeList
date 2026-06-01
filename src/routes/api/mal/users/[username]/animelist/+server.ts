import { json } from '@sveltejs/kit';
import type { UserAnimeListResponse } from '$lib/types/anime';
import { fetchUserAnimeList } from '$lib/server/mal';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	const username = params.username;
	const data = await fetchUserAnimeList(fetch, username);

	return json({
		username,
		count: data.length,
		data
	} satisfies UserAnimeListResponse);
};
