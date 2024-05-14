import {dbWorker, idbStores} from "@/indexeddb";

export const isFileSystemApiSupported = typeof window !== "undefined" && Object.prototype.hasOwnProperty.call(window, "showOpenFilePicker");

export class LocalFileSystemAccessHelper {
    static getFileSystemFileHandle = async (id: string) => {
        if(!isFileSystemApiSupported) return Promise.resolve(null);
        return dbWorker.getItem<FileSystemFileHandle>(idbStores.FILE_HANDLES_STORE, id);
    };

    static saveFileSystemFileHandle = async (id: string, fileHandle: FileSystemFileHandle) => {
        if(!isFileSystemApiSupported) return;
        await dbWorker.putItem(idbStores.FILE_HANDLES_STORE, fileHandle, id);
        console.log("File Handle Saved", fileHandle);
    };

    static verifyPermission = async (fileHandle: FileSystemFileHandle, mode: "read" | "readwrite") => {
        const options = { mode };

        // Check if permission was already granted. If so, return true.
        console.log("queryPermission");
        if((await fileHandle.queryPermission(options)) === "granted") {
            return true;
        }
        try {
            const status = await fileHandle.requestPermission(options);
            console.log("requestPermission", status);
            return status === "granted";
        } catch(e) {
            return false;
        }
    };

}