export type ApiAnimeStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

export type AnimeViewStatus = 'watching' | 'completed' | 'dropped' | 'plan_to_watch';

export type AnimeSortMetric = 'score' | 'title' | 'year' | 'totalEpisodes' | 'episodesWatched';

export type SortDirection = 'asc' | 'desc';

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
	count: number;
	status: ApiAnimeStatus | 'all';
	username: string;
	animes: Anime[];
};
