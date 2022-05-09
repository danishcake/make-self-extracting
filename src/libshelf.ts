import archiver from 'archiver';
import fs from 'fs';

/** A individual file to place in the archive. The name should include the full path */
interface EmbedableFileFromPath {
  filename: string;
  path: string;
}
interface EmbeddableFileFromBuffer {
  filename: string;
  content: Buffer;
}
interface EmbeddableFileFromStream {
  filename: string;
  content: NodeJS.ReadableStream;
}

type EmbeddableFile = EmbedableFileFromPath | EmbeddableFileFromBuffer | EmbeddableFileFromStream;

/** Options passed to makeSelfExtractingScript */
type SelfExtractingScriptOptions = {
  // Script to execute pre-extraction. This does not need a shebang
  preExtraction?: string;
  // Script content to execute post-extraction
  postExtraction?: string;
  // If the 'Generated using' header should be omitted. Defaults to false
  omitLibraryHeader?: boolean;
};

// Simple type guards for the EmbeddableFile types
function isEmbeddableFileFromPath(value: Readonly<EmbeddableFile>): value is EmbedableFileFromPath {
  return typeof (value as any).path === 'string';
}
function isEmbeddableFileFromBuffer(value: Readonly<EmbeddableFile>): value is EmbeddableFileFromBuffer {
  return Buffer.isBuffer((value as any).content);
}

/**
 * Builds a self extracting script
 * @param options Options about how the script should be geneated
 * @param files
 * @returns A ReadableStream that can be directed to disk or similar
 * TODO: Check this interface is sensible - will it block?
 */
export default async function makeSelfExtractingScript(
  options: SelfExtractingScriptOptions,
  files: ReadonlyArray<EmbeddableFile>
): Promise<ReadableStream> {
  const buffers: Buffer[] = [];
  buffers.push(Buffer.from('#!/bin/sh\n', 'utf8'));

  if (!options.omitLibraryHeader) {
    // TODO: Improve self promotion string
    buffers.push(Buffer.from("# Self extracting self script created with 'shelf'", 'utf8'));
  }

  if (options.preExtraction != null) {
    buffers.push(Buffer.from(options.preExtraction + '\n', 'utf-8'));
  }

  // TODO: Add magic extraction code

  if (options.postExtraction != null) {
    buffers.push(Buffer.from(options.postExtraction + '\n', 'utf-8'));
  }

  // Create the tar stream
  const archive = archiver('tar', {
    gzip: true,
    gzipOptions: {
      level: 9 // TODO: Make this an option
    }
  });
  for (const file of files) {
    if (isEmbeddableFileFromPath(file)) {
      archive.append(fs.createReadStream(file.path), { file.filename, );
    } else if (isEmbeddableFileFromBuffer(file)) {
    } else {
    }
  }

  // TODO: Store tar file in buffers

  return null;
}
