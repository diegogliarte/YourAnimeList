import { env } from '$env/dynamic/private';

import type { Anime, AnimeApiResponse, ApiAnimeStatus } from '$lib/types/anime';

type MalAnimeNode = {
	id: number;
	title: string;
	main_picture?: {
		medium?: string;
		large?: string;
	};
	mean?: number;
	num_episodes?: number;
	media_type?: string;
	status?: string;
	start_season?: {
		year?: number;
		season?: string;
	};
};

type MalListStatus = {
	status: ApiAnimeStatus;
	score: number;
	num_episodes_watched: number;
	tags?: string[] | string;
};

type MalAnimeEntry = {
	node: MalAnimeNode;
	list_status: MalListStatus;
};

type MalAnimeListResponse = {
	data: MalAnimeEntry[];
	paging?: {
		next?: string;
	};
};

const MAL_API_BASE_URL = 'https://api.myanimelist.net/v2';

const normalizeTags = (rawTags?: string[] | string): string[] => {
	if (!rawTags) return [];

	if (Array.isArray(rawTags)) {
		return rawTags.map((tag) => tag.trim()).filter(Boolean);
	}

	return rawTags
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
};

const getScoreModifier = (tags: string[]): number => {
	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return 0.25;
	if (normalizedTags.includes('minus')) return -0.25;

	return 0;
};

const getDisplayScore = (score: number, tags: string[]): string => {
	if (score === 0) return '-';

	const normalizedTags = tags.map((tag) => tag.toLowerCase());

	if (normalizedTags.includes('plus')) return `${score}+`;
	if (normalizedTags.includes('minus')) return `${score}-`;

	return String(score);
};

const fetchAnimePage = async (url: string, clientId: string): Promise<MalAnimeListResponse> => {
	const response = await fetch(url, {
		headers: {
			'X-MAL-CLIENT-ID': clientId
		}
	});

	if (!response.ok) {
		const errorText = await response.text();

		throw new Error(`MAL request failed with ${response.status}: ${errorText}`);
	}

	return response.json() as Promise<MalAnimeListResponse>;
};

export const fetchUserAnimeList = async ({
	username,
	status
}: {
	username: string;
	status?: ApiAnimeStatus;
}): Promise<AnimeApiResponse> => {
	const clientId = env.MAL_CLIENT_ID;

	if (!clientId) {
		throw new Error('Missing MAL_CLIENT_ID environment variable');
	}

	const firstUrl = new URL(`${MAL_API_BASE_URL}/users/${encodeURIComponent(username)}/animelist`);

	firstUrl.searchParams.set('limit', '1000');
	firstUrl.searchParams.set('sort', 'list_score');
	firstUrl.searchParams.set('nsfw', 'true');

	if (status) {
		firstUrl.searchParams.set('status', status);
	}

	firstUrl.searchParams.set(
		'fields',
		[
			'main_picture',
			'list_status{status,score,num_episodes_watched,tags}',
			'mean',
			'num_episodes',
			'media_type',
			'status',
			'start_season'
		].join(',')
	);

	const animes: Anime[] = [];
	let nextUrl: string | undefined = firstUrl.toString();

	while (nextUrl) {
		const page = await fetchAnimePage(nextUrl, clientId);

		for (const entry of page.data) {
			const score = entry.list_status.score;
			const tags = normalizeTags(entry.list_status.tags);
			const customScore = score === 0 ? 0 : score + getScoreModifier(tags);

			animes.push({
				id: entry.node.id,
				title: entry.node.title,
				image: entry.node.main_picture?.large ?? entry.node.main_picture?.medium ?? null,
				score,
				displayScore: getDisplayScore(score, tags),
				customScore,
				status: entry.list_status.status,
				episodesWatched: entry.list_status.num_episodes_watched,
				totalEpisodes: entry.node.num_episodes ?? null,
				mean: entry.node.mean ?? null,
				mediaType: entry.node.media_type ?? null,
				animeStatus: entry.node.status ?? null,
				startSeason: entry.node.start_season ?? null,
				tags
			});
		}

		nextUrl = page.paging?.next;
	}

	animes.sort((a, b) => {
		const scoreDifference = b.customScore - a.customScore;

		if (scoreDifference !== 0) return scoreDifference;

		return a.title.localeCompare(b.title);
	});

	return {
		username,
		status: status ?? 'all',
		count: animes.length,
		animes
	};
};
