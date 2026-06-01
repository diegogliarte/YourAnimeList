import { browser } from '$app/environment';
import type {
	AnimeDetails,
	AnimeDetailsResponse,
	AnimeRankingEdge,
	AnimeRankingResponse,
	AnimeRankingType,
	AnimeSearchEdge,
	AnimeSearchResponse,
	FranchiseCandidate,
	FranchiseRelation,
	RelatedAnimeEdge,
	UserAnimeListEdge,
	UserAnimeListResponse
} from '$lib/types/anime';
import {
	compareAnimeRelease,
	EXCLUDED_FRANCHISE_RELATIONS,
	INCLUDED_FRANCHISE_RELATIONS
} from '$lib/utils/anime.utils';
import {
	getIndexedCache,
	removeIndexedCache,
	setIndexedCache
} from '$lib/utils/indexed-db.utils';

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

	franchiseQuery = $state('');
	franchiseSearchResults = $state<AnimeSearchEdge[]>([]);
	franchiseSearchLoading = $state(false);
	franchiseSearchError = $state<string | null>(null);

	franchiseSeedId = $state<number | null>(null);
	franchiseAnimeById = $state<Record<number, AnimeDetails>>({});
	franchiseAcceptedIds = $state<number[]>([]);
	franchiseRejectedIds = $state<number[]>([]);
	franchiseVisitedIds = $state<number[]>([]);
	franchiseQueue = $state<number[]>([]);
	franchiseRelations = $state<FranchiseRelation[]>([]);
	franchisePendingCandidates = $state<FranchiseCandidate[]>([]);
	franchiseCrawling = $state(false);
	franchiseError = $state<string | null>(null);

	private rankingRequestId = 0;
	private franchiseSearchRequestId = 0;
	private franchiseRunId = 0;
	private franchiseStopRequested = false;

	constructor() {
		void this.restore();
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

	get franchiseAnimeList() {
		return this.franchiseAcceptedIds
			.map((id) => this.franchiseAnimeById[id])
			.filter(Boolean)
			.sort((a, b) => compareAnimeRelease({ node: a }, { node: b }));
	}

	get franchisePendingList() {
		return [...this.franchisePendingCandidates].sort((a, b) => a.title.localeCompare(b.title));
	}

	get hasFranchise() {
		return this.franchiseAcceptedIds.length > 0;
	}

	get franchiseVisitedCount() {
		return this.franchiseVisitedIds.length;
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
			const response = await fetch(`/api/mal/users/${encodeURIComponent(cleanUsername)}/animelist`);

			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Failed to load anime list');
			}

			const result = (await response.json()) as UserAnimeListResponse;

			this.loadedUsername = result.username;
			this.userList = result.data;

			void this.persist();
		} catch (error) {
			this.loadedUsername = '';
			this.userList = [];
			this.userListError = error instanceof Error ? error.message : 'Failed to load anime list';

			void this.persist();
		} finally {
			this.userListLoading = false;
		}
	}

	async loadAnimeRanking(type = this.rankingType, offset = 0, append = false, force = false) {
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

			this.rankingError = error instanceof Error ? error.message : 'Failed to load anime ranking';
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

	async searchFranchiseAnime(query = this.franchiseQuery) {
		const cleanQuery = query.trim();

		if (!cleanQuery) {
			this.franchiseSearchError = 'Search is required';
			return;
		}

		const currentRequestId = ++this.franchiseSearchRequestId;

		this.franchiseQuery = cleanQuery;
		this.franchiseSearchLoading = true;
		this.franchiseSearchError = null;

		try {
			const params = new URLSearchParams({
				q: cleanQuery,
				limit: '20'
			});

			const response = await fetch(`/api/mal/anime/search?${params.toString()}`);

			if (!response.ok) {
				const message = await response.text();
				throw new Error(message || 'Failed to search anime');
			}

			const result = (await response.json()) as AnimeSearchResponse;

			if (currentRequestId !== this.franchiseSearchRequestId) return;

			this.franchiseSearchResults = result.data;
		} catch (error) {
			if (currentRequestId !== this.franchiseSearchRequestId) return;

			this.franchiseSearchResults = [];
			this.franchiseSearchError = error instanceof Error ? error.message : 'Failed to search anime';
		} finally {
			if (currentRequestId === this.franchiseSearchRequestId) {
				this.franchiseSearchLoading = false;
			}
		}
	}

	async startFranchise(seedId: number) {
		this.clearFranchise();

		const runId = ++this.franchiseRunId;

		this.franchiseSeedId = seedId;
		this.addAcceptedId(seedId);
		this.enqueueFranchiseAnime(seedId);

		await this.crawlFranchiseQueue(runId);
	}

	async addAnimeToFranchise(animeId: number) {
		if (!this.hasFranchise) {
			await this.startFranchise(animeId);
			return;
		}

		const runId = this.franchiseRunId;

		this.franchiseRejectedIds = this.franchiseRejectedIds.filter((id) => id !== animeId);
		this.removePendingCandidate(animeId);
		this.addAcceptedId(animeId);
		this.enqueueFranchiseAnime(animeId);

		await this.crawlFranchiseQueue(runId);
	}

	async acceptFranchiseCandidate(animeId: number) {
		const candidate = this.franchisePendingCandidates.find((item) => item.animeId === animeId);

		if (!candidate) return;

		const runId = this.franchiseRunId;

		this.removePendingCandidate(animeId);
		this.franchiseRejectedIds = this.franchiseRejectedIds.filter((id) => id !== animeId);

		this.addAcceptedId(animeId);
		this.addFranchiseRelation({
			fromId: candidate.fromId,
			toId: candidate.animeId,
			relationType: candidate.relationType,
			relationLabel: candidate.relationLabel
		});
		this.enqueueFranchiseAnime(animeId);

		await this.crawlFranchiseQueue(runId);
	}

	rejectFranchiseCandidate(animeId: number) {
		this.removePendingCandidate(animeId);
		this.addRejectedId(animeId);

		this.franchiseRelations = this.franchiseRelations.filter((relation) => {
			return relation.toId !== animeId && relation.fromId !== animeId;
		});

		this.franchiseAcceptedIds = this.franchiseAcceptedIds.filter((id) => id !== animeId);
		this.franchiseQueue = this.franchiseQueue.filter((id) => id !== animeId);
	}

	stopFranchiseCrawl() {
		this.franchiseStopRequested = true;
		this.franchiseRunId += 1;
		this.franchiseQueue = [];
		this.franchiseCrawling = false;
	}

	clearUserList() {
		this.username = '';
		this.loadedUsername = '';
		this.savedAt = null;
		this.userList = [];
		this.userListError = null;

		if (browser) {
			void removeIndexedCache(STORAGE_KEY);
		}
	}

	clearRankingData() {
		this.rankingDataByType = {};
		this.rankingNextOffsetByType = {};
		this.rankingError = null;
	}

	clearFranchise() {
		this.franchiseRunId += 1;
		this.franchiseStopRequested = true;

		this.franchiseSeedId = null;
		this.franchiseAnimeById = {};
		this.franchiseAcceptedIds = [];
		this.franchiseRejectedIds = [];
		this.franchiseVisitedIds = [];
		this.franchiseQueue = [];
		this.franchiseRelations = [];
		this.franchisePendingCandidates = [];
		this.franchiseCrawling = false;
		this.franchiseError = null;
	}

	private async crawlFranchiseQueue(runId: number) {
		if (this.franchiseCrawling) return;

		this.franchiseCrawling = true;
		this.franchiseError = null;
		this.franchiseStopRequested = false;

		try {
			while (
				this.franchiseQueue.length > 0 &&
				!this.franchiseStopRequested &&
				runId === this.franchiseRunId
				) {
				const animeId = this.franchiseQueue[0];

				this.franchiseQueue = this.franchiseQueue.slice(1);

				await this.crawlFranchiseAnime(animeId, runId);
			}
		} catch (error) {
			if (runId === this.franchiseRunId) {
				this.franchiseError = error instanceof Error ? error.message : 'Failed to crawl franchise';
			}
		} finally {
			if (runId === this.franchiseRunId) {
				this.franchiseCrawling = false;
			}
		}
	}

	private async crawlFranchiseAnime(animeId: number, runId: number) {
		if (runId !== this.franchiseRunId) return;
		if (this.franchiseVisitedIds.includes(animeId)) return;

		const details = await this.fetchFranchiseAnimeDetails(animeId);

		if (runId !== this.franchiseRunId || this.franchiseStopRequested) return;

		this.addVisitedId(animeId);

		this.franchiseAnimeById = {
			...this.franchiseAnimeById,
			[details.id]: details
		};

		this.addAcceptedId(details.id);

		for (const relation of details.related_anime ?? []) {
			if (runId !== this.franchiseRunId || this.franchiseStopRequested) return;

			this.processFranchiseRelation(details.id, relation);
		}
	}

	private processFranchiseRelation(fromId: number, relation: RelatedAnimeEdge) {
		const toId = relation.node.id;
		const relationType = relation.relation_type;
		const relationLabel = relation.relation_type_formatted || relationType;

		if (this.franchiseRejectedIds.includes(toId)) return;

		if (INCLUDED_FRANCHISE_RELATIONS.has(relationType)) {
			this.removePendingCandidate(toId);
			this.addFranchiseRelation({
				fromId,
				toId,
				relationType,
				relationLabel
			});
			this.addAcceptedId(toId);
			this.enqueueFranchiseAnime(toId);
			return;
		}

		if (this.franchiseAcceptedIds.includes(toId)) {
			this.addFranchiseRelation({
				fromId,
				toId,
				relationType,
				relationLabel
			});
			this.enqueueFranchiseAnime(toId);
			return;
		}

		if (
			EXCLUDED_FRANCHISE_RELATIONS.has(relationType) ||
			!INCLUDED_FRANCHISE_RELATIONS.has(relationType)
		) {
			this.addPendingCandidate({
				animeId: toId,
				fromId,
				title: relation.node.title,
				imageUrl: relation.node.main_picture?.medium ?? relation.node.main_picture?.large ?? null,
				relationType,
				relationLabel
			});
		}
	}

	private async fetchFranchiseAnimeDetails(animeId: number) {
		const cached = this.franchiseAnimeById[animeId];

		if (cached) return cached;

		const response = await fetch(`/api/mal/anime/${animeId}`);

		if (!response.ok) {
			const message = await response.text();
			throw new Error(message || `Failed to fetch anime ${animeId}`);
		}

		const result = (await response.json()) as AnimeDetailsResponse;

		return result.data;
	}

	private enqueueFranchiseAnime(animeId: number) {
		if (this.franchiseVisitedIds.includes(animeId)) return;
		if (this.franchiseQueue.includes(animeId)) return;

		this.franchiseQueue = [...this.franchiseQueue, animeId];
	}

	private addAcceptedId(animeId: number) {
		if (!this.franchiseAcceptedIds.includes(animeId)) {
			this.franchiseAcceptedIds = [...this.franchiseAcceptedIds, animeId];
		}

		this.removePendingCandidate(animeId);
	}

	private addRejectedId(animeId: number) {
		if (this.franchiseRejectedIds.includes(animeId)) return;

		this.franchiseRejectedIds = [...this.franchiseRejectedIds, animeId];
	}

	private addVisitedId(animeId: number) {
		if (this.franchiseVisitedIds.includes(animeId)) return;

		this.franchiseVisitedIds = [...this.franchiseVisitedIds, animeId];
	}

	private addFranchiseRelation(relation: FranchiseRelation) {
		const exists = this.franchiseRelations.some((current) => {
			return (
				current.fromId === relation.fromId &&
				current.toId === relation.toId &&
				current.relationType === relation.relationType
			);
		});

		if (exists) return;

		this.franchiseRelations = [...this.franchiseRelations, relation];
	}

	private addPendingCandidate(candidate: FranchiseCandidate) {
		if (this.franchiseAcceptedIds.includes(candidate.animeId)) return;
		if (this.franchiseRejectedIds.includes(candidate.animeId)) return;
		if (this.franchisePendingCandidates.some((item) => item.animeId === candidate.animeId)) {
			return;
		}

		this.franchisePendingCandidates = [...this.franchisePendingCandidates, candidate];
	}

	private removePendingCandidate(animeId: number) {
		this.franchisePendingCandidates = this.franchisePendingCandidates.filter((candidate) => {
			return candidate.animeId !== animeId;
		});
	}

	private async restore() {
		if (!browser) return;

		try {
			const cached = await getIndexedCache<CachedAnimeData>(STORAGE_KEY);

			if (!cached) return;

			this.username = cached.username ?? '';
			this.loadedUsername = cached.loadedUsername ?? '';
			this.userList = cached.userList ?? [];
			this.savedAt = cached.savedAt ?? null;
		} catch (error) {
			console.warn('Failed to restore anime data cache.', error);

			try {
				await removeIndexedCache(STORAGE_KEY);
			} catch {
				// Nothing else to do.
			}
		}
	}

	private async persist() {
		if (!browser) return;

		const savedAt = new Date().toISOString();

		this.savedAt = savedAt;

		const cached: CachedAnimeData = {
			username: this.username,
			loadedUsername: this.loadedUsername,
			userList: $state.snapshot(this.userList) as UserAnimeListEdge[],
			savedAt
		};

		try {
			await setIndexedCache(STORAGE_KEY, cached);
		} catch (error) {
			console.warn('Failed to persist anime data cache.', error);
		}
	}
}

function mergeRankingData(currentData: AnimeRankingEdge[], newData: AnimeRankingEdge[]) {
	const existingIds = new Set(currentData.map((entry) => entry.node.id));
	const uniqueNewData = newData.filter((entry) => !existingIds.has(entry.node.id));

	return [...currentData, ...uniqueNewData];
}

export const animeData = new AnimeDataStore();