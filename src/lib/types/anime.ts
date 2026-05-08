export type ApiAnimeStatus =
	| 'watching'
	| 'completed'
	| 'on_hold'
	| 'dropped'
	| 'plan_to_watch';

export type AnimeViewStatus =
	| 'completed'
	| 'watching'
	| 'on_hold'
	| 'dropped'
	| 'plan_to_watch';

export type AnimeSortMetric =
	| 'score'
	| 'title'
	| 'year'
	| 'totalEpisodes'
	| 'episodesWatched';

export type SortDirection = 'asc' | 'desc';

export type AnimeRankingType =
	| 'all'
	| 'airing'
	| 'upcoming'
	| 'tv'
	| 'ova'
	| 'movie'
	| 'special'
	| 'bypopularity'
	| 'favorite';

export type Anime = {
	id: number;
	title: string;
	image: string | null;
	score: number;
	displayScore: string;
	customScore: number;
	status: ApiAnimeStatus;
	episodesWatched: number;
	totalEpisodes: number | null;
	mean: number | null;
	mediaType: string | null;
	animeStatus: string | null;
	startSeason: {
		year?: number;
		season?: string;
	} | null;
	tags: string[];
};

export type AnimeApiResponse = {
	username: string;
	status: ApiAnimeStatus | 'all';
	count: number;
	animes: Anime[];
};

export type RankedAnime = {
	id: number;
	title: string;
	image: string | null;
	rank: number | null;
	mean: number | null;
	popularity: number | null;
	totalEpisodes: number | null;
	mediaType: string | null;
	animeStatus: string | null;
	startSeason: {
		year?: number;
		season?: string;
	} | null;
	userStatus: ApiAnimeStatus | null;
};

export type AnimeRankingApiResponse = {
	username: string | null;
	rankingType: AnimeRankingType;
	excludedStatuses: ApiAnimeStatus[];
	count: number;
	animes: RankedAnime[];
};