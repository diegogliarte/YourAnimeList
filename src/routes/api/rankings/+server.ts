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

const parseInteger = ({
												value,
												fallback,
												min,
												max
											}: {
	value: string | null;
	fallback: number;
	min: number;
	max: number;
}) => {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) return fallback;

	return Math.max(min, Math.min(Math.trunc(parsed), max));
};

export const GET = async ({ url }) => {
	try {
		const username = url.searchParams.get('username')?.trim() || undefined;

		const requestedRankingType = url.searchParams.get('rankingType');
		const rankingType = isAnimeRankingType(requestedRankingType)
			? requestedRankingType
			: 'all';

		const excludedStatuses = parseExcludedStatuses(url.searchParams.get('exclude'));

		const limit = parseInteger({
			value: url.searchParams.get('limit'),
			fallback: 100,
			min: 1,
			max: 500
		});

		const offset = parseInteger({
			value: url.searchParams.get('offset'),
			fallback: 0,
			min: 0,
			max: 100_000
		});

		const result = await fetchAnimeRanking({
			username,
			rankingType,
			excludedStatuses,
			limit,
			offset
		});

		return json(result);
	} catch (err) {
		return json(
			{
				error: 'Failed to fetch rankings.',
				detail: err instanceof Error ? err.message : 'Unknown error.'
			},
			{
				status: 500
			}
		);
	}
};