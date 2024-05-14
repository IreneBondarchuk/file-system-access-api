interface IndexedDbCreator {
    name?: string;
    stores: IndexedDbStore[]
    version?: number;
}

interface IndexedDbStore {
    name: string;
    keyOptions?: IndexedDbKeyOptions;
    indexes?: IndexedDbIndex[];
}

interface IndexedDbIndex {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
}

interface IndexedDbKeyOptions {
    keyPath: string;
    autoIncrement?: boolean
}

export interface IndexedDbWorkerInterface {
    getItem: (tableName: string, key: number | string) => Promise<any>,
    putItem: (tableName: string, value: any, key?: string | number | undefined) => Promise<void>,
    deleteItem: (tableName: string, key: number | string) => Promise<void>
}

export class IndexedDbWorker {
    private dbCreator: IndexedDbCreator;

    constructor(dbCreator: IndexedDbCreator) {
        this.dbCreator = dbCreator;
    }

    private getConnection = (retry = true): Promise<IDBDatabase> => new Promise((resolve, reject) => {
        const openRequest = indexedDB.open(this.dbCreator.name ?? "test-db", this.dbCreator.version);

        openRequest.onerror = async (e) => {
            console.error("IndexedDb error:", openRequest.error);
            console.log(e);
            // if the version is downgraded or the database is deleted, we need to delete the database and retry
            if(openRequest.error instanceof DOMException && openRequest.error.name === "VersionError") {
                indexedDB.deleteDatabase(this.dbCreator.name ?? "test-db");
                if(retry) {
                    try {
                        const conn = await this.getConnection(false);
                        resolve(conn);
                    } catch(err) {
                        reject(err);
                    }
                }
            }
            reject(openRequest.error);
        };
        // it will be called only when the database is created for the first time or the version is updated
        openRequest.onupgradeneeded = () => {
            const db = openRequest.result;
            this.dbCreator.stores.forEach(store => {
                if(!db.objectStoreNames.contains(store.name)) {
                    db.createObjectStore(store.name, store.keyOptions);
                }
                store.indexes?.forEach(index => {
                    const objStore = openRequest.transaction?.objectStore(store.name);
                    if(objStore) {
                        if(objStore.indexNames.contains(index.name)) {
                            objStore.deleteIndex(index.name);
                        }
                        objStore.createIndex(index.name, index.keyPath, index.options);
                    }
                });
            });
        };
        openRequest.onsuccess = () => {
            const db = openRequest.result;
            db.onversionchange = ev => {
                console.debug(`IndexedDb version changed to V${ev.newVersion}`);
                db.close();
            };
            resolve(db);
        };
        openRequest.onblocked = async ev => {
            reject(new Error("IndexedDb upgrading blocked by another connection"));
        };
    });

    private withStore = async (tableName: string, type: IDBTransactionMode, callback: (objStore: IDBObjectStore) => void) => {
        const connection = await this.getConnection();

        return new Promise<void>((resolve, reject) => {
            const tx = connection.transaction(tableName, type);
            tx.oncomplete = () => {
                connection.close();
                resolve(undefined);
            };
            tx.onabort = () => {
                connection.close();
                reject(tx.error);
            };
            tx.onerror = () => {
                connection.close();
                reject(tx.error);
            };
            callback(tx.objectStore(tableName));
        });
    };

    async getItem<T>(tableName: string, key: number | string) : Promise<T> {
        let req: IDBRequest<T> = {} as IDBRequest<T>;
        await this.withStore(tableName, "readonly", store => {
            req = store.get(key);
        });
        return req.result;
    }

    async getItemsWithIndex<T>(tableName: string, index: string, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<T[]> {
        let req: IDBRequest<T[]> = {} as IDBRequest<T[]>;
        await this.withStore(tableName, "readonly", store => {
            const dbIndex = store.index(index);
            req = dbIndex.getAll(query, count);
        });
        return req.result;
    }

    putItem<T>(tableName: string, value: T, key?: number | string) {
        return this.withStore(tableName, "readwrite", store => {
            store.put(value, key);
        });
    }

    deleteItem(tableName: string, key: number | string) {
        return this.withStore(tableName, "readwrite", store => {
            store.delete(key);
        });
    }

    clear = (tableName: string) => this.withStore(tableName, "readwrite", store => {
        store.clear();
    });
}

const FILE_HANDLES_STORE = "file-handles";

export const idbStores = {
    FILE_HANDLES_STORE
};

export const dbWorker = new IndexedDbWorker({
    stores: [
        { name: FILE_HANDLES_STORE }
    ],
    version: 7 // update version when you change the schema
});
