import { json } from '@sveltejs/kit';

import { streamAnimeFranchise } from '$lib/server/mal';

const getAnimeId = (value: string | null) => {
	if (!value) return null;

	const animeId = Number(value);

	if (!Number.isFinite(animeId)) return null;

	const normalizedAnimeId = Math.trunc(animeId);

	return normalizedAnimeId > 0 ? normalizedAnimeId : null;
};

export const GET = ({ url }) => {
	const animeId = getAnimeId(url.searchParams.get('id'));

	if (!animeId) {
		return json(
			{
				message: 'Missing anime id.'
			},
			{
				status: 400
			}
		);
	}

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const send = (event: string, data: unknown) => {
				controller.enqueue(encoder.encode(`event: ${event}\n`));
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			try {
				for await (const item of streamAnimeFranchise({ animeId })) {
					send(item.type, item);
				}
			} catch (err) {
				send('error', {
					message: err instanceof Error ? err.message : 'Unknown error.'
				});
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};