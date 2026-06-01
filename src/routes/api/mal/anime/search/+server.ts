import { error, json } from '@sveltejs/kit';
import type { AnimeSearchResponse } from '$lib/types/anime';
import { clampNumber, fetchAnimeSearch } from '$lib/server/mal';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const limit = clampNumber(Number(url.searchParams.get('limit') ?? 20), 1, 100);
	const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

	if (!query) {
		error(400, 'Query is required');
	}

	const result = await fetchAnimeSearch(fetch, query, limit, offset);

	return json({
		query,
		count: result.data.length,
		nextOffset: result.nextOffset,
		data: result.data
	} satisfies AnimeSearchResponse);
};