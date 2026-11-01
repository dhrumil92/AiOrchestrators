import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Keeps photo handling independent of where files live, so object storage can replace disk. */
export interface FileStorage {
  /** Saves under a generated name and returns its storage key. */
  save(data: Buffer, extension: string): Promise<string>;
  read(key: string): Promise<Buffer>;
  path(key: string): string;
}

export const UPLOADS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'uploads',
);

export function createLocalStorage(root: string): FileStorage {
  const resolve = (key: string): string => {
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) throw new Error('Storage key is outside the root');
    return target;
  };

  return {
    async save(data, extension) {
      await mkdir(root, { recursive: true });
      const key = `${randomUUID()}.${extension}`;
      await writeFile(resolve(key), data);
      return key;
    },
    read: (key) => readFile(resolve(key)),
    path: resolve,
  };
}

export const storage = createLocalStorage(UPLOADS_DIR);

export function publicUrl(key: string): string {
  return `http://localhost:${process.env.PORT ?? 4000}/uploads/${key}`;
}
