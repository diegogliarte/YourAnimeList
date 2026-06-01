export function formatNumber(value: number) {
	return Math.round(value).toLocaleString();
}

export function formatDecimal(value: number, decimals = 1) {
	return value.toFixed(decimals);
}

export function formatMinutes(seconds: number) {
	return `${formatDecimal(seconds / 60, 1)}m`;
}

export function formatPercent(value: number, total: number) {
	if (total <= 0) return '0.0%';

	return `${formatDecimal((value / total) * 100)}%`;
}

export function formatDuration(seconds: number) {
	if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
	if (seconds < 60) return `${formatDecimal(seconds)}s`;
	if (seconds < 60 * 60) return `${formatDecimal(seconds / 60)}m`;
	if (seconds < 60 * 60 * 24) return `${formatDecimal(seconds / 60 / 60)}h`;

	return `${formatDecimal(seconds / 60 / 60 / 24)}d`;
}

export function formatSigned(value: number) {
	if (value > 0) return `+${formatDecimal(value, 2)}`;

	return formatDecimal(value, 2);
}

export function formatLabel(value: string) {
	return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
