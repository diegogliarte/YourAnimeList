export type AnimeStatus = 'finished_airing' | 'currently_airing' | 'not_yet_aired';

export type AnimeMediaType =
	| 'unknown'
	| 'tv'
	| 'ova'
	| 'movie'
	| 'special'
	| 'ona'
	| 'music';

export type AnimeListStatusName =
	| 'watching'
	| 'completed'
	| 'on_hold'
	| 'dropped'
	| 'plan_to_watch';

export type AnimeSeason = 'winter' | 'spring' | 'summer' | 'fall';

export type AnimeRating = 'g' | 'pg' | 'pg_13' | 'r' | 'r+' | 'rx';

export type AnimeSource =
	| 'other'
	| 'original'
	| 'manga'
	| '4_koma_manga'
	| 'web_manga'
	| 'digital_manga'
	| 'novel'
	| 'light_novel'
	| 'visual_novel'
	| 'game'
	| 'card_game'
	| 'book'
	| 'picture_book'
	| 'radio'
	| 'music';

export type AnimePicture = {
	medium: string;
	large?: string | null;
};

export type AnimeAlternativeTitles = {
	synonyms?: string[] | null;
	en?: string | null;
	ja?: string | null;
};

export type AnimeGenre = {
	id: number;
	name: string;
};

export type AnimeStudio = {
	id: number;
	name: string;
};

export type AnimeStartSeason = {
	year: number;
	season: AnimeSeason;
};

export type AnimeBroadcast = {
	day_of_the_week: string;
	start_time?: string | null;
};

export type AnimeListStatus = {
	status: AnimeListStatusName;
	score: number;
	display_score: string;
	sort_score: number;
	num_episodes_watched: number;
	is_rewatching: boolean;
	start_date?: string | null;
	finish_date?: string | null;
	priority: number;
	num_times_rewatched: number;
	rewatch_value: number;
	tags: string[];
	updated_at: string;
};

export type Anime = {
	id: number;
	title: string;

	main_picture?: AnimePicture | null;
	alternative_titles?: AnimeAlternativeTitles | null;

	start_date?: string | null;
	end_date?: string | null;
	synopsis?: string | null;

	mean?: number | null;
	rank?: number | null;
	popularity?: number | null;

	num_list_users: number;
	num_scoring_users: number;

	nsfw?: 'white' | 'gray' | 'black' | null;

	genres?: AnimeGenre[];

	media_type: AnimeMediaType;
	status: AnimeStatus;

	list_status?: AnimeListStatus | null;

	num_episodes: number;
	start_season?: AnimeStartSeason | null;
	broadcast?: AnimeBroadcast | null;

	source?: AnimeSource | null;
	average_episode_duration?: number | null;
	rating?: AnimeRating | null;

	studios?: AnimeStudio[];
};

export type AnimeEdge = {
	node: Anime;
};

export type UserAnimeListEdge = AnimeEdge & {
	list_status: AnimeListStatus;
};

export type UserAnimeListResponse = {
	username: string;
	count: number;
	data: UserAnimeListEdge[];
};

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

export type AnimeRankingInfo = {
	rank: number;
	previous_rank?: number | null;
};

export type AnimeRankingEdge = AnimeEdge & {
	ranking: AnimeRankingInfo;
};

export type AnimeRankingResponse = {
	rankingType: AnimeRankingType;
	count: number;
	nextOffset: number | null;
	data: AnimeRankingEdge[];
};

export type RelatedAnimeEdge = {
	node: Anime;
	relation_type: string;
	relation_type_formatted: string;
};

export type AnimeDetails = Anime & {
	pictures?: AnimePicture[];
	background?: string | null;
	related_anime?: RelatedAnimeEdge[];
};

export type AnimeDetailsResponse = {
	data: AnimeDetails;
};