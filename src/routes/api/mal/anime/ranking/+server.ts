import { error, json } from '@sveltejs/kit';
import type { AnimeRankingResponse } from '$lib/types/anime';
import { clampNumber, fetchAnimeRanking, isRankingType } from '$lib/server/mal';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
	const rankingType = url.searchParams.get('ranking_type') ?? 'all';
	const limit = clampNumber(Number(url.searchParams.get('limit') ?? 500), 1, 500);
	const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

	if (!isRankingType(rankingType)) {
		error(400, 'Invalid ranking_type');
	}

	const result = await fetchAnimeRanking(fetch, rankingType, limit, offset);

	return json({
		rankingType,
		count: result.data.length,
		nextOffset: result.nextOffset,
		data: result.data
	} satisfies AnimeRankingResponse);
};
