export function sum<Item>(items: Item[], getter: (item: Item) => number) {
	return items.reduce((total, item) => total + getter(item), 0);
}

export function average(values: number[]) {
	const validValues = values.filter(Number.isFinite);

	if (validValues.length === 0) return 0;

	return sum(validValues, (value) => value) / validValues.length;
}

export function standardDeviation(values: number[]) {
	const validValues = values.filter(Number.isFinite);

	if (validValues.length === 0) return 0;

	const avg = average(validValues);
	const variance = average(validValues.map((value) => (value - avg) ** 2));

	return Math.sqrt(variance);
}
