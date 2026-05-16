import { json } from '@sveltejs/kit';

import { fetchAnimeFranchise, searchAnimeFranchise } from '$lib/server/mal';

const getAnimeId = (value: string | null) => {
	if (!value) return null;

	const animeId = Number(value);

	if (!Number.isFinite(animeId)) return null;

	const normalizedAnimeId = Math.trunc(animeId);

	return normalizedAnimeId > 0 ? normalizedAnimeId : null;
};

export const GET = async ({ url }) => {
	try {
		const animeId = getAnimeId(url.searchParams.get('id'));
		const query = url.searchParams.get('q') ?? '';

		if (animeId) {
			return json(
				await fetchAnimeFranchise({
					animeId
				})
			);
		}

		return json(
			await searchAnimeFranchise({
				query
			})
		);
	} catch (err) {
		return json(
			{
				message: err instanceof Error ? err.message : 'Unknown error.'
			},
			{
				status: 500
			}
		);
	}
};