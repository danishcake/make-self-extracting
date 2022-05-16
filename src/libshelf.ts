import archiver from 'archiver';
import fs from 'fs';
import { Readable } from 'stream';

/** A file to embed specified as a path */
interface EmbedableFileFromPath {
  // The filename to create within the archive
  filename: string;
  // The path to the file to embed
  path: string;
  // The mode flags to set. If omitted this defaults to 0644
  mode?: number;
}

/** A file to embed specified as a buffer */
interface EmbeddableFileFromBuffer {
  // The filename to create within the archive
  filename: string;
  // The content to embed
  content: Buffer;
  // The mode flags to set. If omitted this defaults to 0644
  mode?: number;
}

/** A file to embed specified as a readable stream */
interface EmbeddableFileFromStream {
  // The filename to create within the archive
  filename: string;
  // The stream to embed
  content: Readable;
  // The mode flags to set. If omitted this defaults to 0644
  mode?: number;
}

/** A individual file to place in the archive. The name should include the full path */
type EmbeddableFile = EmbedableFileFromPath | EmbeddableFileFromBuffer | EmbeddableFileFromStream;

/** Options passed to makeSelfExtractingScript */
type SelfExtractingScriptOptions = {
  // Script to execute pre-extraction. This does not need a shebang
  preExtraction?: string;
  // Script content to execute post-extraction. This will be executed in a temporary directory
  // containing the extracted payload
  postExtraction?: string;
  // If the 'Generated using' header should be omitted. Defaults to false
  omitLibraryHeader?: boolean;
  // Archive format. Zip has lower memory consumption during generation, but is less likely be available
  // Zip uses more disk space during extraction, as it must extract the zip to a temporary directory first
  // Defaults to 'tar'
  archiveFormat?: 'zip' | 'tar';
  // If the archive should be compressed. If the input files are already compressed it's usually better
  // to just store the files instead
  // Defaults to 5
  compressionLevel?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
};

/**
 * Type guard to narrow an EmbedableFile to EmbedableFileFromPath
 * @param value An EmbedableFile
 * @returns True if value is an EmbedableFileFromPath
 */
function isEmbeddableFileFromPath(value: Readonly<EmbeddableFile>): value is EmbedableFileFromPath {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (value as any).path === 'string';
}

/**
 * Type guard to narrow an EmbedableFile to EmbeddableFileFromBuffer
 * @param value An EmbedableFile
 * @returns True if value is an EmbeddableFileFromBuffer
 */
function isEmbeddableFileFromBuffer(value: Readonly<EmbeddableFile>): value is EmbeddableFileFromBuffer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Buffer.isBuffer((value as any).content);
}

/**
 * Builds a self extracting script
 * @param options Options about how the script should be geneated
 * @param files Input files to add to the self extracting script
 * @param destination A location to write the output
 */
export async function makeSelfExtractingScript(
  options: SelfExtractingScriptOptions,
  files: ReadonlyArray<EmbeddableFile>,
  destination: NodeJS.WritableStream
): Promise<void> {
  const {
    archiveFormat = 'tar',
    omitLibraryHeader = false,
    compressionLevel = 5,
    preExtraction,
    postExtraction
  } = options;

  const scriptSections: string[] = [];
  scriptSections.push('#!/bin/sh\n');

  if (!omitLibraryHeader) {
    scriptSections.push(
      "# Self extracting self script created with 'make-self-extracting'\n" +
        '# https://www.npmjs.com/package/make-self-extracting\n' +
        '# https://github.com/danishcake/make-self-extracting\n'
    );
  }

  if (preExtraction != null) {
    scriptSections.push(preExtraction + '\n');
  }

  // Add extraction code. This relies on knowing the line on which the payload starts
  const payloadStartLine =
    1 + // Leading shbang
    (omitLibraryHeader ? 0 : 3) +
    (preExtraction != null ? (preExtraction.match(/\n/g) || []).length + 1 : 0) +
    (postExtraction != null ? (postExtraction.match(/\n/g) || []).length + 1 : 0) +
    3 + // Cleanup trailer
    1; // Start of the next line

  if (archiveFormat === 'tar') {
    scriptSections.push(
      'readonly TMPDIR=`mktemp -d`\n' +
        `readonly PAYLOAD_START=${payloadStartLine + 4}\n` +
        (compressionLevel === 0
          ? 'tail -n+$PAYLOAD_START $0 | tar -x -C $TMPDIR\n'
          : 'tail -n+$PAYLOAD_START $0 | tar -xz -C $TMPDIR\n') +
        'pushd $TMPDIR > /dev/null\n'
    );
  } else {
    // archiveFormat === 'zip'
    scriptSections.push(
      'readonly TMPDIR=`mktemp -d`\n' +
        `readonly PAYLOAD_START=${payloadStartLine + 6}\n` +
        'tail -n+$PAYLOAD_START $0 > ${TMPDIR}/self_extractor_payload.zip\n' +
        'unzip -qq ${TMPDIR}/self_extractor_payload.zip -d $TMPDIR\n' +
        'rm ${TMPDIR}/self_extractor_payload.zip\n' +
        'pushd $TMPDIR > /dev/null\n'
    );
  }

  if (postExtraction != null) {
    scriptSections.push(postExtraction + '\n');
  }

  // Add an 'exit 0' before the payload
  scriptSections.push('popd > /dev/null\nrm -rf $TMPDIR\nexit 0\n');

  // Write the script to the output stream
  destination.write(Buffer.concat(scriptSections.map((p) => Buffer.from(p, 'utf-8'))));

  // Create the archive stream. Tar would be nicer here, but it incurs /massive/ memory usage
  // roughly proportional to the output size
  // We configure both archive formats, as archive ignores unrelating settings
  const archive = archiver(archiveFormat, {
    store: compressionLevel === 0,
    zlib: {
      level: compressionLevel
    },
    gzip: compressionLevel !== 0,
    gzipOptions: {
      level: compressionLevel
    }
  });
  archive.pipe(destination);

  for (const file of files) {
    if (isEmbeddableFileFromPath(file)) {
      // Generate a nice exception if the file doesn't exist by opening the file
      // in a slightly weird fashion, as createReadStream is lazy, resulting in a delay
      // in the generation of the exception to when archiver first attempts to read from the file
      const readStream = fs.createReadStream('', { fd: await fs.promises.open(file.path, 'r') });
      archive.append(readStream, { name: file.filename, mode: file.mode });
    } else if (isEmbeddableFileFromBuffer(file)) {
      archive.append(Readable.from(file.content), { name: file.filename, mode: file.mode });
    } else {
      archive.append(file.content, { name: file.filename, mode: file.mode });
    }
  }

  await archive.finalize();
}

export default makeSelfExtractingScript;
