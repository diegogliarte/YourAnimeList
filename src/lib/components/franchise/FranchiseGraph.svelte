<script lang="ts">
	import { graphlib, layout } from '@dagrejs/dagre';

	import {
		Background,
		ConnectionLineType,
		Controls,
		MarkerType,
		Position,
		SvelteFlow,
		type Edge,
		type Node
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import FranchiseAnimeNode from '$lib/components/franchise/FranchiseAnimeNode.svelte';
	import type { AnimeDetails, AnimeListStatusName, FranchiseRelation } from '$lib/types/anime';

	type Props = {
		animes: AnimeDetails[];
		relations: FranchiseRelation[];
		seedId?: number | null;
		pendingIds?: number[];
		getUserStatus?: (animeId: number) => AnimeListStatusName | null;
		getSubtitle?: (anime: AnimeDetails) => string;
		class?: string;
	};

	type ViewEdge = {
		sourceId: number;
		targetId: number;
		relationLabel: string;
		relationType: string;
	};

	let {
		animes,
		relations,
		seedId = null,
		pendingIds = [],
		getUserStatus = () => null,
		getSubtitle = () => '',
		class: className = ''
	}: Props = $props();

	const NODE_WIDTH = 256;
	const NODE_HEIGHT = 100;

	const nodeTypes = {
		anime: FranchiseAnimeNode
	};

	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	const pendingIdSet = $derived.by(() => new Set(pendingIds));
	const animeById = $derived.by(() => new Map(animes.map((anime) => [anime.id, anime])));

	$effect(() => {
		const built = buildFlow();

		nodes = built.nodes;
		edges = built.edges;
	});

	function buildFlow() {
		const viewEdges = getTreeEdges();

		const nextNodes: Node[] = animes.map((anime) => {
			return {
				id: String(anime.id),
				type: 'anime',
				position: {
					x: 0,
					y: 0
				},
				sourcePosition: Position.Right,
				targetPosition: Position.Left,
				data: {
					anime,
					subtitle: getSubtitle(anime),
					status: getUserStatus(anime.id),
					isSeed: anime.id === seedId,
					isPending: pendingIdSet.has(anime.id)
				},
				draggable: false
			};
		});

		const nextEdges: Edge[] = viewEdges.map((edge, index) => {
			return {
				id: `tree-${edge.sourceId}-${edge.targetId}-${edge.relationType}-${index}`,
				source: String(edge.sourceId),
				target: String(edge.targetId),
				type: 'smoothstep',
				markerEnd: {
					type: MarkerType.ArrowClosed
				}
			};
		});

		return getLayoutedElements(nextNodes, nextEdges);
	}

	function getTreeEdges(): ViewEdge[] {
		const rootId = seedId ?? animes[0]?.id;

		if (!rootId) return [];

		const availableIds = new Set(animes.map((anime) => anime.id));
		const adjacency = new Map<number, ViewEdge[]>();

		for (const relation of relations) {
			if (!availableIds.has(relation.fromId) || !availableIds.has(relation.toId)) continue;

			addAdjacentEdge(adjacency, relation.fromId, {
				sourceId: relation.fromId,
				targetId: relation.toId,
				relationLabel: relation.relationLabel,
				relationType: relation.relationType
			});

			addAdjacentEdge(adjacency, relation.toId, {
				sourceId: relation.toId,
				targetId: relation.fromId,
				relationLabel: relation.relationLabel,
				relationType: relation.relationType
			});
		}

		for (const edgeList of adjacency.values()) {
			edgeList.sort(compareViewEdges);
		}

		const visitedIds = new Set<number>([rootId]);
		const queue = [rootId];
		const treeEdges: ViewEdge[] = [];

		while (queue.length > 0) {
			const currentId = queue.shift();

			if (!currentId) continue;

			const edgeList = adjacency.get(currentId) ?? [];

			for (const edge of edgeList) {
				if (visitedIds.has(edge.targetId)) continue;

				visitedIds.add(edge.targetId);
				queue.push(edge.targetId);
				treeEdges.push(edge);
			}
		}

		const disconnectedIds = animes
			.map((anime) => anime.id)
			.filter((animeId) => animeId !== rootId && !visitedIds.has(animeId));

		for (const disconnectedId of disconnectedIds) {
			treeEdges.push({
				sourceId: rootId,
				targetId: disconnectedId,
				relationLabel: 'Mixed in',
				relationType: 'mixed_in'
			});
		}

		return treeEdges;
	}

	function addAdjacentEdge(adjacency: Map<number, ViewEdge[]>, animeId: number, edge: ViewEdge) {
		const edgeList = adjacency.get(animeId) ?? [];

		edgeList.push(edge);
		adjacency.set(animeId, edgeList);
	}

	function compareViewEdges(a: ViewEdge, b: ViewEdge) {
		const aTarget = animeById.get(a.targetId);
		const bTarget = animeById.get(b.targetId);

		const pendingDiff = Number(pendingIdSet.has(a.targetId)) - Number(pendingIdSet.has(b.targetId));

		if (pendingDiff !== 0) return pendingDiff;

		const typeDiff = getRelationWeight(a.relationType) - getRelationWeight(b.relationType);

		if (typeDiff !== 0) return typeDiff;

		return (aTarget?.title ?? '').localeCompare(bTarget?.title ?? '');
	}

	function getRelationWeight(relationType: string) {
		if (relationType === 'prequel') return 0;
		if (relationType === 'sequel') return 1;
		if (relationType === 'parent_story') return 2;
		if (relationType === 'full_story') return 3;
		if (relationType === 'side_story') return 4;
		if (relationType === 'alternative_setting') return 5;
		if (relationType === 'alternative_version') return 6;
		if (relationType === 'characters' || relationType === 'character') return 7;
		if (relationType === 'other' || relationType === 'others') return 8;
		if (relationType === 'mixed_in') return 98;

		return 99;
	}

	function getLayoutedElements(rawNodes: Node[], rawEdges: Edge[]) {
		const graph = new graphlib.Graph();

		graph.setDefaultEdgeLabel(() => ({}));
		graph.setGraph({
			rankdir: 'LR',
			align: 'UL',
			nodesep: 42,
			ranksep: 160,
			marginx: 40,
			marginy: 40
		});

		for (const node of rawNodes) {
			graph.setNode(node.id, {
				width: NODE_WIDTH,
				height: NODE_HEIGHT
			});
		}

		for (const edge of rawEdges) {
			graph.setEdge(edge.source, edge.target);
		}

		layout(graph);

		const layoutedNodes = rawNodes.map((node) => {
			const graphNode = graph.node(node.id);

			return {
				...node,
				position: {
					x: graphNode.x - NODE_WIDTH / 2,
					y: graphNode.y - NODE_HEIGHT / 2
				},
				sourcePosition: Position.Right,
				targetPosition: Position.Left
			};
		});

		return {
			nodes: layoutedNodes,
			edges: rawEdges
		};
	}
</script>

<div class={className}>
	<div class="h-[42rem] overflow-hidden rounded-md border border-border bg-surface">
		{#key `${animes.length}-${relations.length}-${seedId}`}
			<SvelteFlow
				bind:nodes
				bind:edges
				{nodeTypes}
				fitView
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable
				connectionLineType={ConnectionLineType.SmoothStep}
				defaultEdgeOptions={{
					type: 'smoothstep',
					markerEnd: {
						type: MarkerType.ArrowClosed
					}
				}}
				minZoom={0.12}
				maxZoom={1.5}
				panOnScroll
				onlyRenderVisibleElements
			>
				<Background />
				<Controls />
			</SvelteFlow>
		{/key}
	</div>
</div>
