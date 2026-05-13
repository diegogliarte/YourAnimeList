export type ApiAnimeStatus =
	| 'watching'
	| 'completed'
	| 'on_hold'
	| 'dropped'
	| 'plan_to_watch';

export type AnimeSortMetric = 'score' | 'title' | 'year' | 'totalEpisodes';

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

export type AnimeGenre = {
	id: number;
	name: string;
};

export type AnimeSeason = {
	year?: number;
	season?: string;
};

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
	averageEpisodeDuration: number | null;
	mean: number | null;
	mediaType: string | null;
	animeStatus: string | null;
	startSeason: AnimeSeason | null;
	genres: AnimeGenre[];
	tags: string[];
	numberOfTimesRewatched: number;
};

export type RankedAnime = {
	id: number;
	title: string;
	image: string | null;
	rank: number | null;
	popularity: number | null;
	mean: number | null;
	totalEpisodes: number | null;
	averageEpisodeDuration: number | null;
	mediaType: string | null;
	animeStatus: string | null;
	startSeason: AnimeSeason | null;
	genres: AnimeGenre[];
	userStatus: ApiAnimeStatus | null;
};

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
	animes: RankedAnime[];
};