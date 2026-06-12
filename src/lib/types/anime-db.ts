export type AnimeDbPicture = {
	medium: string | null;
	large: string | null;
};

export type AnimeDbAlternativeTitles = {
	en: string | null;
	ja: string | null;
};

export type AnimeDbStartSeason = {
	year: number | null;
	season: string | null;
};

export type AnimeDbEntry = {
	id: number;
	title: string;

	mainPicture: AnimeDbPicture;
	alternativeTitles: AnimeDbAlternativeTitles;

	startDate: string | null;
	endDate: string | null;

	mean: number | null;
	rank: number | null;
	popularity: number | null;
	numListUsers: number | null;
	numScoringUsers: number | null;
	numFavorites: number | null;

	nsfw: string | null;
	mediaType: string | null;
	status: string | null;
	numEpisodes: number | null;

	startSeason: AnimeDbStartSeason;

	source: string | null;
	averageEpisodeDuration: number | null;
	totalDuration: number | null;
	rating: string | null;

	createdAt: string | null;
	updatedAt: string | null;
	fetchedAt: string | null;

	malUrl: string;
};

export type AnimeDbFacetItem = {
	value: string;
	count: number;
};

export type AnimeDbNamedFacetItem = {
	id: number;
	name: string;
	count: number;
};

export type AnimeDbRanges = {
	minYear: number | null;
	maxYear: number | null;
	minMean: number | null;
	maxMean: number | null;
	minRank: number | null;
	maxRank: number | null;
	minPopularity: number | null;
	maxPopularity: number | null;
	minEpisodes: number | null;
	maxEpisodes: number | null;
	minEpisodeDuration: number | null;
	maxEpisodeDuration: number | null;
	minFavorites: number | null;
	maxFavorites: number | null;
	minUsers: number | null;
	maxUsers: number | null;
};

export type AnimeDbFacetsResponse = {
	sorts: string[];
	genres: AnimeDbNamedFacetItem[];
	studios: AnimeDbNamedFacetItem[];
	mediaTypes: AnimeDbFacetItem[];
	statuses: AnimeDbFacetItem[];
	sources: AnimeDbFacetItem[];
	ratings: AnimeDbFacetItem[];
	nsfw: AnimeDbFacetItem[];
	ranges: AnimeDbRanges;
};

export type AnimeDbAnimeResponse = {
	data: AnimeDbEntry[];
	total: number;
	limit: number;
	offset: number;
	nextOffset: number | null;
	sort: string;
	filters: Record<string, string | number | null | undefined>;
};

export type AnimeDbFilters = {
	q?: string;
	sort?: string;
	limit?: number;
	offset?: number;

	media_type?: string;
	status?: string;
	source?: string;
	rating?: string;
	nsfw?: string;

	genre_ids?: string;
	genre_mode?: string;
	studio_ids?: string;
	studio_mode?: string;

	season?: string;

	year_min?: string;
	year_max?: string;

	mal_score_min?: string;
	mal_score_max?: string;

	rank_min?: string;
	rank_max?: string;

	popularity_min?: string;
	popularity_max?: string;

	episodes_min?: string;
	episodes_max?: string;

	duration_min?: string;
	duration_max?: string;

	favorites_min?: string;
	favorites_max?: string;

	users_min?: string;
	users_max?: string;
};