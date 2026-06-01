import type { UserAnimeListEdge } from '$lib/types/anime';
import { formatLabel } from './format.utils';
import { getDuration, getUserScore, getWatchedEpisodes, getYear } from './anime.utils';
import { average, sum } from './math.utils';

export type AnimeGroupDatum = {
	key: string;
	label: string;
	value: number;
	items: UserAnimeListEdge[];
};

export type AnimeBucket = {
	key: string;
	label: string;
	order: number;
};

export type AnimeBreakdownRow = {
	name: string;
	count: number;
	avgScore: number;
	avgRuntimeSeconds: number;
	items: UserAnimeListEdge[];
};

export function groupBy(
	entries: UserAnimeListEdge[],
	getKey: (entry: UserAnimeListEdge) => string
): AnimeGroupDatum[] {
	const groups = new Map<string, UserAnimeListEdge[]>();

	for (const entry of entries) {
		const key = getKey(entry);
		const current = groups.get(key) ?? [];

		current.push(entry);
		groups.set(key, current);
	}

	return [...groups.entries()]
		.map(([key, items]) => ({
			key,
			label: formatLabel(key),
			value: items.length,
			items: sortByTitle(items)
		}))
		.sort((a, b) => b.value - a.value);
}

export function groupByMany(
	entries: UserAnimeListEdge[],
	getKeys: (entry: UserAnimeListEdge) => string[]
): AnimeGroupDatum[] {
	const groups = new Map<string, UserAnimeListEdge[]>();

	for (const entry of entries) {
		for (const key of getKeys(entry)) {
			const current = groups.get(key) ?? [];

			current.push(entry);
			groups.set(key, current);
		}
	}

	return [...groups.entries()]
		.map(([key, items]) => ({
			key,
			label: formatLabel(key),
			value: items.length,
			items: sortByTitle(items)
		}))
		.sort((a, b) => b.value - a.value);
}

export function bucketBy(
	entries: UserAnimeListEdge[],
	getBucket: (entry: UserAnimeListEdge) => AnimeBucket
): AnimeGroupDatum[] {
	const groups = new Map<string, { label: string; order: number; items: UserAnimeListEdge[] }>();

	for (const entry of entries) {
		const bucket = getBucket(entry);

		const current = groups.get(bucket.key) ?? {
			label: bucket.label,
			order: bucket.order,
			items: []
		};

		current.items.push(entry);
		groups.set(bucket.key, current);
	}

	return [...groups.entries()]
		.map(([key, group]) => ({
			key,
			label: group.label,
			value: group.items.length,
			items: sortByTitle(group.items),
			order: group.order
		}))
		.sort((a, b) => a.order - b.order);
}

export function makeBreakdown(
	entries: UserAnimeListEdge[],
	getNames: (entry: UserAnimeListEdge) => string[]
): AnimeBreakdownRow[] {
	const groups = new Map<string, UserAnimeListEdge[]>();

	for (const entry of entries) {
		for (const name of getNames(entry)) {
			const current = groups.get(name) ?? [];

			current.push(entry);
			groups.set(name, current);
		}
	}

	return [...groups.entries()]
		.map(([name, items]) => {
			const ratedItems = items.filter((entry) => (entry.list_status?.score ?? 0) > 0);
			const runtimeItems = items.filter((entry) => getDuration(entry) > 0);

			return {
				name,
				count: items.length,
				avgScore: average(ratedItems.map(getUserScore)),
				avgRuntimeSeconds: average(
					runtimeItems.map((entry) => getWatchedEpisodes(entry) * getDuration(entry))
				),
				items: sortByTitle(items)
			};
		})
		.sort((a, b) => b.count - a.count);
}

export function getEpisodeBucket(entry: UserAnimeListEdge): AnimeBucket {
	const episodes = entry.node.num_episodes ?? 0;

	if (episodes === 0) return { key: 'unknown', label: 'Unknown', order: 99 };
	if (episodes === 1) return { key: '1', label: '1 ep', order: 1 };
	if (episodes <= 6) return { key: '2-6', label: '2-6 eps', order: 2 };
	if (episodes <= 13) return { key: '7-13', label: '7-13 eps', order: 3 };
	if (episodes <= 26) return { key: '14-26', label: '14-26 eps', order: 4 };
	if (episodes <= 52) return { key: '27-52', label: '27-52 eps', order: 5 };
	if (episodes <= 99) return { key: '53-99', label: '53-99 eps', order: 6 };

	return { key: '100+', label: '100+ eps', order: 7 };
}

export function getRuntimeBucket(entry: UserAnimeListEdge): AnimeBucket {
	const seconds = getWatchedEpisodes(entry) * getDuration(entry);
	const hours = seconds / 60 / 60;

	if (seconds <= 0) return { key: 'unknown', label: 'Unknown', order: 99 };
	if (hours <= 1) return { key: '0-1h', label: '0-1h', order: 1 };
	if (hours <= 3) return { key: '1-3h', label: '1-3h', order: 2 };
	if (hours <= 6) return { key: '3-6h', label: '3-6h', order: 3 };
	if (hours <= 12) return { key: '6-12h', label: '6-12h', order: 4 };
	if (hours <= 24) return { key: '12-24h', label: '12-24h', order: 5 };
	if (hours <= 48) return { key: '1-2d', label: '1-2d', order: 6 };

	return { key: '2d+', label: '2d+', order: 7 };
}

export function getDecadeBucket(entry: UserAnimeListEdge): AnimeBucket {
	const year = getYear(entry);

	if (!year) return { key: 'unknown', label: 'Unknown', order: 99 };

	const decade = Math.floor(year / 10) * 10;

	return {
		key: String(decade),
		label: `${decade}s`,
		order: decade
	};
}

export function getMalScoreBucket(entry: UserAnimeListEdge): AnimeBucket {
	const mean = entry.node.mean ?? 0;

	if (mean <= 0) return { key: 'unknown', label: 'Unknown', order: 99 };
	if (mean < 5) return { key: '<5', label: '< 5', order: 1 };
	if (mean < 6) return { key: '5-6', label: '5.0-5.9', order: 2 };
	if (mean < 7) return { key: '6-7', label: '6.0-6.9', order: 3 };
	if (mean < 8) return { key: '7-8', label: '7.0-7.9', order: 4 };
	if (mean < 9) return { key: '8-9', label: '8.0-8.9', order: 5 };

	return { key: '9+', label: '9+', order: 6 };
}

export function sortYearGroupsByCount(data: AnimeGroupDatum[]) {
	return [...data].sort((a, b) => {
		const countDiff = b.value - a.value;

		if (countDiff !== 0) return countDiff;

		return Number(b.key) - Number(a.key);
	});
}

export function sortByTitle(entries: UserAnimeListEdge[]) {
	return [...entries].sort((a, b) => a.node.title.localeCompare(b.node.title));
}

export function totalRuntime(entries: UserAnimeListEdge[]) {
	return sum(entries, (entry) => getWatchedEpisodes(entry) * getDuration(entry));
}
