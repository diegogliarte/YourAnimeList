const DATABASE_NAME = 'your-anime-list';
const DATABASE_VERSION = 1;
const STORE_NAME = 'cache';

type CacheRecord<T> = {
	key: string;
	value: T;
};

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase() {
	if (databasePromise) return databasePromise;

	databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

		request.onerror = () => reject(request.error);

		request.onupgradeneeded = () => {
			const database = request.result;

			if (!database.objectStoreNames.contains(STORE_NAME)) {
				database.createObjectStore(STORE_NAME, {
					keyPath: 'key'
				});
			}
		};

		request.onsuccess = () => resolve(request.result);
	});

	return databasePromise;
}

export async function getIndexedCache<T>(key: string): Promise<T | null> {
	const database = await openDatabase();

	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(key);

		request.onerror = () => reject(request.error);

		request.onsuccess = () => {
			const result = request.result as CacheRecord<T> | undefined;

			resolve(result?.value ?? null);
		};
	});
}

export async function setIndexedCache<T>(key: string, value: T): Promise<void> {
	const database = await openDatabase();

	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		const request = store.put({
			key,
			value
		} satisfies CacheRecord<T>);

		request.onerror = () => reject(request.error);
		transaction.onerror = () => reject(transaction.error);
		transaction.oncomplete = () => resolve();
	});
}

export async function removeIndexedCache(key: string): Promise<void> {
	const database = await openDatabase();

	return new Promise((resolve, reject) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(key);

		request.onerror = () => reject(request.error);
		transaction.onerror = () => reject(transaction.error);
		transaction.oncomplete = () => resolve();
	});
}
