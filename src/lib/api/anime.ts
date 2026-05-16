import type {
	AnimeApiResponse,
	AnimeRankingApiResponse,
	AnimeRankingType,
	ApiAnimeStatus
} from '$lib/types/anime';

type ApiErrorPayload = {
	error?: string;
	detail?: string;
};

type FetchAnimeRankingsParams = {
	username: string;
	rankingType: AnimeRankingType;
	excludedStatuses: ApiAnimeStatus[];
	limit: number;
	offset: number;
};

const readJson = async <T>(response: Response): Promise<T | null> => {
	try {
		return (await response.json()) as T;
	} catch {
		return null;
	}
};

const getResponseError = (response: Response, payload: ApiErrorPayload | null) => {
	return payload?.detail || payload?.error || `Request failed with ${response.status}`;
};

const fetchJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url);
	const payload = await readJson<T & ApiErrorPayload>(response);

	if (!response.ok) {
		throw new Error(getResponseError(response, payload));
	}

	if (!payload) {
		throw new Error('Empty response from server.');
	}

	return payload;
};

export const fetchAnimeList = async (username: string) => {
	const params = new URLSearchParams({
		username
	});

	return fetchJson<AnimeApiResponse>(`/api/animes?${params.toString()}`);
};

export const fetchAnimeRankings = async ({
	username,
	rankingType,
	excludedStatuses,
	limit,
	offset
}: FetchAnimeRankingsParams) => {
	const params = new URLSearchParams({
		username,
		rankingType,
		limit: String(limit),
		offset: String(offset),
		exclude: excludedStatuses.length === 0 ? 'none' : excludedStatuses.join(',')
	});

	return fetchJson<AnimeRankingApiResponse>(`/api/rankings?${params.toString()}`);
};
