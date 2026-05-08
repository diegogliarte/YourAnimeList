import { json } from '@sveltejs/kit';

import { fetchUserAnimeList } from '$lib/server/mal';

import type { RequestHandler } from './$types';
import type { ApiAnimeStatus } from '$lib/types/anime';

const VALID_STATUSES = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'] as const;

const isValidStatus = (status: string): status is ApiAnimeStatus => {
	return VALID_STATUSES.includes(status as ApiAnimeStatus);
};

export const GET: RequestHandler = async ({ url }) => {
	const username = url.searchParams.get('username')?.trim();
	const requestedStatus = url.searchParams.get('status');

	if (!username) {
		return json(
			{
				error: 'Missing username query parameter'
			},
			{ status: 400 }
		);
	}

	if (requestedStatus && !isValidStatus(requestedStatus)) {
		return json(
			{
				error: 'Invalid status query parameter',
				validStatuses: VALID_STATUSES
			},
			{ status: 400 }
		);
	}

	try {
		const result = await fetchUserAnimeList({
			username,
			status: requestedStatus as ApiAnimeStatus
		});

		return json(result, {
			headers: {
				'Cache-Control': 'public, max-age=300, s-maxage=3600'
			}
		});
	} catch (error) {
		return json(
			{
				error: 'Failed to fetch anime list from MyAnimeList',
				detail: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 502 }
		);
	}
};
