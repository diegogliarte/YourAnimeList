import { json } from '@sveltejs/kit';

import {
	fetchAnimeRanking,
	isAnimeRankingType,
	isApiAnimeStatus
} from '$lib/server/mal';

import type { ApiAnimeStatus } from '$lib/types/anime';

const parseExcludedStatuses = (value: string | null): ApiAnimeStatus[] => {
	if (!value) return ['completed'];
	if (value === 'none') return [];

	const statuses: ApiAnimeStatus[] = [];

	for (const rawStatus of value.split(',')) {
		const status = rawStatus.trim();

		if (isApiAnimeStatus(status) && !statuses.includes(status)) {
			statuses.push(status);
		}
	}

	return statuses;
};

const parseLimit = (value: string | null) => {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) return 100;

	return Math.max(1, Math.min(Math.trunc(parsed), 200));
};

export const GET = async ({ url }) => {
	try {
		const username = url.searchParams.get('username')?.trim() || undefined;
		const requestedRankingType = url.searchParams.get('rankingType');
		const rankingType = isAnimeRankingType(requestedRankingType)
			? requestedRankingType
			: 'all';

		const excludedStatuses = parseExcludedStatuses(url.searchParams.get('exclude'));
		const limit = parseLimit(url.searchParams.get('limit'));

		const result = await fetchAnimeRanking({
			username,
			rankingType,
			excludedStatuses,
			limit
		});

		return json(result);
	} catch (err) {
		return json(
			{
				error: 'Failed to fetch recommendations.',
				detail: err instanceof Error ? err.message : 'Unknown error.'
			},
			{
				status: 500
			}
		);
	}
};