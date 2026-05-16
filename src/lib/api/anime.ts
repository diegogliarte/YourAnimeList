import type {
	AnimeApiResponse,
	AnimeFranchiseApiResponse,
	AnimeRankingApiResponse,
	AnimeRankingType,
	ApiAnimeStatus
} from '$lib/types/anime';

const readError = async (response: Response) => {
	const payload = (await response.json().catch(() => null)) as {
		message?: string;
	} | null;

	return payload?.message ?? `Request failed with ${response.status}.`;
};

export const fetchAnimeList = async (username: string): Promise<AnimeApiResponse> => {
	const params = new URLSearchParams();

	params.set('username', username);

	const response = await fetch(`/api/list?${params.toString()}`);

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return response.json() as Promise<AnimeApiResponse>;
};

export const fetchAnimeRankings = async ({
																					 username,
																					 rankingType,
																					 excludedStatuses,
																					 limit,
																					 offset
																				 }: {
	username?: string;
	rankingType: AnimeRankingType;
	excludedStatuses: ApiAnimeStatus[];
	limit: number;
	offset: number;
}): Promise<AnimeRankingApiResponse> => {
	const params = new URLSearchParams();

	if (username?.trim()) {
		params.set('username', username.trim());
	}

	params.set('rankingType', rankingType);
	params.set('limit', String(limit));
	params.set('offset', String(offset));

	if (excludedStatuses.length === 0) {
		params.set('exclude', 'none');
	} else {
		params.set('exclude', excludedStatuses.join(','));
	}

	const response = await fetch(`/api/rankings?${params.toString()}`);

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return response.json() as Promise<AnimeRankingApiResponse>;
};

export const searchAnimeFranchise = async (query: string): Promise<AnimeFranchiseApiResponse> => {
	const params = new URLSearchParams();

	params.set('q', query.trim());

	const response = await fetch(`/api/franchise?${params.toString()}`);

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return response.json() as Promise<AnimeFranchiseApiResponse>;
};

export const fetchAnimeFranchise = async (animeId: number): Promise<AnimeFranchiseApiResponse> => {
	const params = new URLSearchParams();

	params.set('id', String(animeId));

	const response = await fetch(`/api/franchise?${params.toString()}`);

	if (!response.ok) {
		throw new Error(await readError(response));
	}

	return response.json() as Promise<AnimeFranchiseApiResponse>;
};