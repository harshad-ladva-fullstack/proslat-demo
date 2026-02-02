export interface SceneModel {
	id?: number
	name: string
	blob: Blob
}

const dbName = 'GLBModelDB'
const dbVersion = 1
let db: IDBDatabase

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(dbName, dbVersion)

		request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
			const db = (event.target as IDBOpenDBRequest).result
			if (!db.objectStoreNames.contains('models')) {
				const store = db.createObjectStore('models', {
					keyPath: 'id',
					autoIncrement: true,
				})
				store.createIndex('name', 'name', { unique: false })
			}
		}

		request.onsuccess = () => {
			db = request.result
			resolve(db)
		}

		request.onerror = () => reject(request.error)
	})
}

export function getAllModels(): Promise<SceneModel[]> {
	return openDB().then(db => {
		return new Promise((resolve, reject) => {
			const tx = db.transaction('models', 'readonly')
			const store = tx.objectStore('models')
			const request = store.getAll()

			request.onsuccess = () => resolve(request.result as SceneModel[])
			request.onerror = () => reject(request.error)
		})
	})
}

export function getModelByName(name: string): Promise<SceneModel | undefined> {
	return openDB().then(db => {
		return new Promise((resolve, reject) => {
			const tx = db.transaction('models', 'readonly')
			const store = tx.objectStore('models')
			const index = store.index('name')

			const request = index.get(name)

			request.onsuccess = () => resolve(request.result as SceneModel | undefined)
			request.onerror = () => reject(request.error)
		})
	})
}

export function addModel(model: SceneModel): Promise<number> {
	return openDB().then(db => {
		return new Promise((resolve, reject) => {
			const tx = db.transaction('models', 'readwrite')
			const store = tx.objectStore('models')
			const request = store.add(model)

			request.onsuccess = () => resolve(request.result as number)
			request.onerror = () => reject(request.error)
		})
	})
}

export function deleteModel(id: number): Promise<void> {
	return openDB().then(db => {
		return new Promise((resolve, reject) => {
			const tx = db.transaction('models', 'readwrite')
			const store = tx.objectStore('models')
			const request = store.delete(id)

			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
	})
}
