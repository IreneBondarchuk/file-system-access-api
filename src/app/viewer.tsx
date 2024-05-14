"use client"

import {LocalFileSystemAccessHelper} from "@/app/localFileSystemAccessHelper";
import {useEffect, useState} from "react";
type MimeType = `${string}/${string}`;
type FileExtension = `.${string}`;
type AcceptableType = { [x: MimeType]: FileExtension; };
export function Viewer() {
const [fileNames, setFileNames] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("fileId");
        const ids = stored ? JSON.parse(stored) : [];
        setFileNames(ids);
    }, []);

const openFile = async (fileName: string) => {
    let fileHandle: FileSystemFileHandle | null = null;
    fileHandle = await LocalFileSystemAccessHelper.getFileSystemFileHandle(fileName);
    if (fileHandle) {
        const granted = await LocalFileSystemAccessHelper.verifyPermission(fileHandle, "read");
        const file = await fileHandle.getFile();
        alert(file.name);
    }
}
  return (
    <div>
        <button onClick={async () => {
            const types: { accept: AcceptableType; }[] = [];
            ["application/pdf"].forEach(type => {
                const mime = type.split("/");
                types.push({
                    accept: {
                        [`${mime[0]}/${mime[1]}`]: `.${mime[1]}`
                    } as AcceptableType
                });
            });

            const options = {
                types: types.length > 0 ? types : undefined,
                excludeAcceptAllOption: true,
                multiple: false
            };

            const fileHandles = await window.showOpenFilePicker(options);
            const fileHandle = fileHandles[0];
            const stored = localStorage.getItem("fileId");
            const ids = stored ? JSON.parse(stored) : [];
            ids.push(fileHandle.name);
            localStorage.setItem("fileId", JSON.stringify(ids));
            setFileNames(ids);
            await LocalFileSystemAccessHelper.saveFileSystemFileHandle(fileHandle.name, fileHandle);
        }}>
            Open Picker
        </button>
        <ul>
            {fileNames.map((name, index) => <li key={index} onClick={() => openFile(name)}>{name}</li>)}
        </ul>
    </div>
  )
}