import { browser } from '$app/environment';
import type {
	AnimeRankingEdge,
	AnimeRankingResponse,
	AnimeRankingType,
	UserAnimeListEdge,
	UserAnimeListResponse
} from '$lib/types/anime';

const STORAGE_KEY = 'your-anime-list:data';

type CachedAnimeData = {
	username: string;
	loadedUsername: string;
	userList: UserAnimeListEdge[];
	savedAt: string;
};

class AnimeDataStore {
	username = $state('');
	loadedUsername = $state('');
	savedAt = $state<string | null>(null);

	userList = $state<UserAnimeListEdge[]>([]);
	userListLoading = $state(false);
	userListError = $state<string | null>(null);

	rankingType = $state<AnimeRankingType>('all');
	rankingDataByType = $state<Partial<Record<AnimeRankingType, AnimeRankingEdge[]>>>({});
	rankingNextOffsetByType = $state<Partial<Record<AnimeRankingType, number | null>>>({});
	rankingLoading = $state(false);
	rankingLoadingMore = $state(false);
	rankingError = $state<string | null>(null);

	private rankingRequestId = 0;

	constructor() {
		this.restore();
	}

	get userListCount() {
		return this.userList.length;
	}

	get hasUserList() {
		return this.userList.length > 0;
	}

	get rankingData() {
		return this.rankingDataByType[this.rankingType] ?? [];
	}

	get rankingNextOffset() {
		return this.rankingNextOffsetByType[this.rankingType] ?? null;
	}

	get hasRankingData() {
		return this.rankingData.length > 0;
	}

	async loadUserList(username = this.username) {
		const cleanUsername = username.trim();

		if (!cleanUsername) {
			this.userListError = 'Username is required';
			return;
		}

		this.username = cleanUsername;
		this.userListLoading = true;
		this.userListError = null;

		try {
			const response = await fetch(
				`/api/mal/users/${encodeURIComponent(cleanUsername)}/animelist`
			);

			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Failed to load anime list');
			}

			const result = (await response.json()) as UserAnimeListResponse;

			this.loadedUsername = result.username;
			this.userList = result.data;

			this.persist();
		} catch (error) {
			this.loadedUsername = '';
			this.userList = [];
			this.userListError =
				error instanceof Error ? error.message : 'Failed to load anime list';

			this.persist();
		} finally {
			this.userListLoading = false;
		}
	}

	async loadAnimeRanking(
		type = this.rankingType,
		offset = 0,
		append = false,
		force = false
	) {
		this.rankingType = type;

		const currentData = this.rankingDataByType[type] ?? [];

		if (!append && !force && currentData.length > 0) {
			return;
		}

		const currentRequestId = ++this.rankingRequestId;

		if (append) {
			this.rankingLoadingMore = true;
		} else {
			this.rankingLoading = true;
			this.rankingError = null;
		}

		try {
			const params = new URLSearchParams({
				ranking_type: type,
				limit: '500',
				offset: String(offset)
			});

			const response = await fetch(`/api/mal/anime/ranking?${params.toString()}`);

			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Failed to load anime ranking');
			}

			const result = (await response.json()) as AnimeRankingResponse;

			if (currentRequestId !== this.rankingRequestId) return;

			const previousData = this.rankingDataByType[type] ?? [];

			this.rankingDataByType = {
				...this.rankingDataByType,
				[type]: append ? mergeRankingData(previousData, result.data) : result.data
			};

			this.rankingNextOffsetByType = {
				...this.rankingNextOffsetByType,
				[type]: result.nextOffset
			};
		} catch (error) {
			if (currentRequestId !== this.rankingRequestId) return;

			if (!append) {
				this.rankingDataByType = {
					...this.rankingDataByType,
					[type]: []
				};
			}

			this.rankingError =
				error instanceof Error ? error.message : 'Failed to load anime ranking';
		} finally {
			if (currentRequestId === this.rankingRequestId) {
				this.rankingLoading = false;
				this.rankingLoadingMore = false;
			}
		}
	}

	async loadMoreAnimeRanking() {
		const nextOffset = this.rankingNextOffset;

		if (nextOffset === null) return;
		if (this.rankingLoading || this.rankingLoadingMore) return;

		await this.loadAnimeRanking(this.rankingType, nextOffset, true);
	}

	async refreshAnimeRanking() {
		await this.loadAnimeRanking(this.rankingType, 0, false, true);
	}

	clearUserList() {
		this.username = '';
		this.loadedUsername = '';
		this.savedAt = null;
		this.userList = [];
		this.userListError = null;

		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	clearRankingData() {
		this.rankingDataByType = {};
		this.rankingNextOffsetByType = {};
		this.rankingError = null;
	}

	private restore() {
		if (!browser) return;

		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			if (!raw) return;

			const cached = JSON.parse(raw) as CachedAnimeData;

			this.username = cached.username;
			this.loadedUsername = cached.loadedUsername;
			this.userList = cached.userList ?? [];
			this.savedAt = cached.savedAt ?? null;
		} catch {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	private persist() {
		if (!browser) return;

		const savedAt = new Date().toISOString();

		this.savedAt = savedAt;

		const cached: CachedAnimeData = {
			username: this.username,
			loadedUsername: this.loadedUsername,
			userList: this.userList,
			savedAt
		};

		localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
	}
}

function mergeRankingData(currentData: AnimeRankingEdge[], newData: AnimeRankingEdge[]) {
	const existingIds = new Set(currentData.map((entry) => entry.node.id));
	const uniqueNewData = newData.filter((entry) => !existingIds.has(entry.node.id));

	return [...currentData, ...uniqueNewData];
}

export const animeData = new AnimeDataStore();