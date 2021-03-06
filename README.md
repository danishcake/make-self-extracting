# make-self-extracting

A library for the creation of self extracting shell scripts supporting Node 12 and newer.

![Unit tests](https://github.com/danishcake/make-self-extracting/actions/workflows/run-tests.yml/badge.svg)

Github: https://github.com/danishcake/make-self-extracting \
NPM: https://www.npmjs.com/package/make-self-extracting

The shell scripts are designed to run under bash.

## Why?

It's easier for your users if you distribute a single file, and it's called `install.sh`.

## Installation

Run

```Bash
npm install make-self-extracting --save
```

## Usage

The script runs in two stages:

1. A 'pre-extraction' section. This runs before the embedded files have been extracted to a temporary directory,
   and is a good place to display a banner, gather input etc.
2. A 'post-extraction' section'. This runs after the embedded files have been extracted. The working directory
   will have been changed to a temporary directory containing the extracted files for the duration of this section

```Typescript
await makeSelfExtractingScript(
  {
    preExtraction: 'echo This section runs in `pwd`',
    postExtraction: 'cat header.txt\necho This section runs in `pwd`\nls -l'
  },
  [
    {
      filename: 'header.txt',
      content: Buffer.from('This text comes from an embedded file\n', 'utf-8')
    },
    {
      filename: 'example_zip.mjs',
      content: fs.createReadStream('examples/zip_format.mjs')
    },
    {
      filename: 'example_docker.mjs',
      content: fs.createReadStream('examples/docker.mjs')
    }
  ],
  fs.createWriteStream('simple.sh')
);
```

This generates output that looks like this:

```Bash
#!/bin/bash
# Self extracting self script created with 'make-self-extracting
# https://www.npmjs.com/package/make-self-extracting
# https://github.com/danishcake/make-self-extracting
echo This section runs in `pwd`
readonly TMPDIR=`mktemp -d`
readonly PAYLOAD_START=16
tail -n+$PAYLOAD_START $0 | tar -xz -C $TMPDIR
pushd $TMPDIR > /dev/null
cat header.txt
echo This section runs in `pwd`
ls -l
popd > /dev/null
rm -rf $TMPDIR
exit 0
# ... Compressed data
```

You can control how the payload files are stored using the `SelfExtractingScriptOptions` argument.

```Typescript
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
}
```

Additional examples are in the examples folder. They expect to be run from the project root.

You can add files for `Buffers`, `Readables` and paths to local files. The file mode defaults to 644 but can be set on a per file basis is required.

```Typescript
// Embedded shell script must be executable
{
  filename: 'setup.sh',
  path: 'setup.sh',
  mode: 0o755
}
```

## How it works

The embedded files are stored in an archive and appended to the shell script. The script then uses `tail` on itself to extract the
archive to a temporary directory when run.

## Remarks

The code herein will probably work fine under older versions of Node. The limiting factor is the jest unit test library.

## Refences

[linuxjournal](https://www.linuxjournal.com/node/1005818)
