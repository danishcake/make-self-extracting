import { Readable } from 'stream';
import { getEntries, makeSelfExtractingScriptAsBuffer, makeSelfExtractingScriptAsString } from './helpers';
import 'jest-extended';

describe('Archive creation', () => {
  test('Can create empty archive', async () => {
    const output = await makeSelfExtractingScriptAsString({}, []);

    // Output should start with a shebang
    expect(output).toStartWith('#!/bin/sh');

    // Output should have a PAYLOAD_START of 12
    expect(output).toMatch('readonly PAYLOAD_START=12');
  });

  test('Can create archive with streams', async () => {
    const output = await makeSelfExtractingScriptAsBuffer({}, [
      {
        filename: 'file',
        content: Readable.from(Buffer.from('Hello world', 'utf-8'))
      }
    ]);
    const entries = await getEntries(output);

    // Should contain the file
    expect(entries).toContainEqual({
      name: 'file',
      mode: 0o644,
      size: 11
    });
  });

  test('Can create archive with files', async () => {
    const output = await makeSelfExtractingScriptAsBuffer({}, [
      {
        filename: 'file',
        path: __filename
      }
    ]);

    const entries = await getEntries(output);

    // Should contain the file. The size varies, so is not checked
    expect(entries).toContainEqual(
      expect.objectContaining({
        name: 'file',
        mode: 0o644,
        size: expect.any(Number)
      })
    );
  });

  test('Can create archive with buffers', async () => {
    const output = await makeSelfExtractingScriptAsBuffer({}, [
      {
        filename: 'file',
        content: Buffer.from('Hello World', 'utf-8')
      }
    ]);

    const entries = await getEntries(output);

    // Should contain the file. The size varies, so is not checked
    expect(entries).toContainEqual({
      name: 'file',
      mode: 0o644,
      size: 11
    });
  });

  test('Can create archive with mix', async () => {
    const output = await makeSelfExtractingScriptAsBuffer({}, [
      {
        filename: 'file1',
        content: Readable.from(Buffer.from('Hello world', 'utf-8'))
      },
      {
        filename: 'file2',
        path: __filename
      },
      {
        filename: 'file3',
        content: Buffer.from('Hello World', 'utf-8')
      }
    ]);

    const entries = await getEntries(output);

    // Should contain the file. The size varies, so is not checked
    expect(entries).toContainEqual({
      name: 'file1',
      mode: 0o644,
      size: 11
    });
    expect(entries).toContainEqual(
      expect.objectContaining({
        name: 'file2',
        mode: 0o644,
        size: expect.any(Number)
      })
    );
    expect(entries).toContainEqual({
      name: 'file3',
      mode: 0o644,
      size: 11
    });
  });

  test('Can create uncompressed tar archives', async () => {
    function* tenKbOfZero() {
      for (let i = 0; i < 10 * 1024; i++) {
        yield 0;
      }
    }

    const output = await makeSelfExtractingScriptAsBuffer(
      {
        compressionLevel: 0
      },
      [{ filename: 'file', content: Buffer.from([...tenKbOfZero()]) }]
    );

    // Output is > 10kb, which is not true if compressed!
    expect(output.length).toBeGreaterThan(10 * 1024);
  });

  test('Can create zip backed archives', async () => {
    const output = await makeSelfExtractingScriptAsString(
      {
        archiveFormat: 'zip'
      },
      []
    );

    // Output should start with a shebang
    expect(output).toStartWith('#!/bin/sh');

    // Output should have a PAYLOAD_START of 14
    expect(output).toMatch('readonly PAYLOAD_START=14');
  });

  test('Can set file mode', async () => {
    const output = await makeSelfExtractingScriptAsBuffer({}, [
      {
        filename: 'file',
        content: Buffer.from('Hello World', 'utf-8'),
        mode: 0o777
      }
    ]);

    const entries = await getEntries(output);

    // Should contain the file. The size varies, so is not checked
    expect(entries).toContainEqual({
      name: 'file',
      mode: 0o777,
      size: 11
    });
  });

  test('Can set extraction scripts', async () => {
    const output = await makeSelfExtractingScriptAsString(
      {
        preExtraction: 'echo preextraction',
        postExtraction: 'echo postextraction'
      },
      []
    );

    expect(output).toInclude('echo preextraction');
    expect(output).toInclude('echo postextraction');
  });

  test('Can omit library header', async () => {
    const output = await makeSelfExtractingScriptAsString(
      {
        omitLibraryHeader: true
      },
      []
    );

    // Output should have a PAYLOAD_START of 9
    expect(output).toMatch('readonly PAYLOAD_START=9');
  });
});
