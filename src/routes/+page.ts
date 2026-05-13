import { redirect } from '@sveltejs/kit';

export const load = ({ url }) => {
	throw redirect(307, `/list${url.search}`);
};