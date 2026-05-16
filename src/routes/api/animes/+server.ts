import { json } from '@sveltejs/kit';

import { fetchUserAnimeList, isApiAnimeStatus } from '$lib/server/mal';

export const GET = async ({ url }) => {
	try {
		const username = url.searchParams.get('username')?.trim();

		if (!username) {
			return json(
				{
					error: 'Missing username.',
					detail: 'The username query parameter is required.'
				},
				{
					status: 400
				}
			);
		}

		const rawStatus = url.searchParams.get('status');
		const status = isApiAnimeStatus(rawStatus) ? rawStatus : undefined;

		const result = await fetchUserAnimeList({
			username,
			status
		});

		return json(result);
	} catch (err) {
		return json(
			{
				error: 'Failed to fetch anime list.',
				detail: err instanceof Error ? err.message : 'Unknown error.'
			},
			{
				status: 500
			}
		);
	}
};
