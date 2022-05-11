/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { PassThrough, Readable } from 'stream';
import makeSelfExtractingScript from '../src/libshelf';
import gunzip from 'gunzip-maybe';
import tar from 'tar-stream';

/**
 * Given a Readable stream, returns the contents as a single buffer
 * @param stream Input stream
 * @returns The contents of the stream as a buffer
 */
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const buffers: Buffer[] = [];

  stream.on('data', (chunk: Buffer) => {
    buffers.push(chunk);
  });

  return new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    stream.on('error', () => {
      reject();
    });
  });
}

/**
 * Calls makeSelfExtractingScript and returns the output as a buffer
 * @param options See makeSelfExtractingScript
 * @param files See makeSelfExtractingScript
 * @returns Output of makeSelfExtractingScript, utf-8 decoded
 */
export async function makeSelfExtractingScriptAsBuffer(
  options: Parameters<typeof makeSelfExtractingScript>[0],
  files: Parameters<typeof makeSelfExtractingScript>[1]
): Promise<Buffer> {
  const dest = new PassThrough();
  await makeSelfExtractingScript(options, files, dest);
  return streamToBuffer(dest);
}

/**
 * Calls makeSelfExtractingScript and returns the output as a string
 * @param options See makeSelfExtractingScript
 * @param files See makeSelfExtractingScript
 * @returns Output of makeSelfExtractingScript, utf-8 decoded
 */
export async function makeSelfExtractingScriptAsString(
  options: Parameters<typeof makeSelfExtractingScript>[0],
  files: Parameters<typeof makeSelfExtractingScript>[1]
): Promise<string> {
  return (await makeSelfExtractingScriptAsBuffer(options, files)).toString('utf-8');
}

interface ArchiveEntry {
  name: string;
  mode: number;
  size: number;
}
/**
 * Reads the list of entries from a tar/tar.gz file
 * @param archive Buffer containing the archive
 * @returns List of EntryData
 */
export async function getEntries(archive: Buffer): Promise<ArchiveEntry[]> {
  // Skip the script.
  const asString = archive.toString('utf-8');
  const match = /readonly PAYLOAD_START=([0-9]+)/.exec(asString) as any;
  const payloadStart = Number.parseInt(match[1]);

  // To skip, we consume '\n' bytes
  let byteOffset = 0;
  for (let i = 0; i < payloadStart - 1; i++) {
    byteOffset = archive.indexOf('\n'.charCodeAt(0), byteOffset + 1);
  }
  byteOffset += 1;

  archive = archive.slice(byteOffset);

  // Parse as tar/tar.gz. Zip not supported for now
  const extract = tar.extract();
  const results: ArchiveEntry[] = [];

  extract.on('entry', (headers, stream, next) => {
    results.push({
      name: headers.name!,
      mode: headers.mode!,
      size: headers.size!
    });
    stream.on('end', next);
    stream.resume(); // Skip the data
  });

  const returnPromise = new Promise<ArchiveEntry[]>((resolve, reject) => {
    extract.on('finish', () => {
      resolve(results);
    });

    extract.on('error', (err) => {
      reject(err);
    });
  });

  Readable.from(archive).pipe(gunzip()).pipe(extract);
  return returnPromise;
}
