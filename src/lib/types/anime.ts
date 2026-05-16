export type ApiAnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export type AnimeStatusSelection = ApiAnimeStatus | 'all';

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

export type AnimeSortMetric = 'score' | 'title' | 'year' | 'totalEpisodes';

export type SortDirection = 'asc' | 'desc';

export type AnimeGenre = {
	id: number;
	name: string;
};

export type Anime = {
	id: number;
	title: string;
	image: string | null;
	href: string;

	rank: number | null;

	score: number;
	displayScore: string;
	customScore: number;

	status: ApiAnimeStatus;
	userStatus: ApiAnimeStatus | null;

	relationType: string | null;
	relationTypeFormatted: string | null;

	startDate: string | null;
	endDate: string | null;

	episodesWatched: number;
	totalEpisodes: number | null;
	averageEpisodeDuration: number | null;

	mean: number | null;
	popularity: number | null;
	mediaType: string | null;
	animeStatus: string | null;

	startSeason: {
		year?: number;
		season?: string;
	} | null;

	genres: AnimeGenre[];
	tags: string[];
	numberOfTimesRewatched: number;
};

export type RankedAnime = Anime;

export type AnimeApiResponse = {
	username: string;
	status: ApiAnimeStatus | 'all';
	count: number;
	animes: Anime[];
};

export type AnimeRankingApiResponse = {
	username: string | null;
	rankingType: AnimeRankingType;
	excludedStatuses: ApiAnimeStatus[];
	offset: number;
	nextOffset: number | null;
	count: number;
	animes: Anime[];
};

export type AnimeFranchiseApiResponse = {
	query: string;
	selectedAnime: Anime | null;
	searchResults: Anime[];
	franchiseAnimes: Anime[];
	relatedAnimes: Anime[];
	count: number;
	limited: boolean;
};