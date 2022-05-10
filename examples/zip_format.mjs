import { makeSelfExtractingScript } from '../dist/libshelf.js';
import * as fs from 'fs';

// Creates a self extracting shell script where the content is provided using streams
// and the archiving uses gzip. It's a sort of half-baked quine
(async () => {
  await makeSelfExtractingScript(
    {
      postExtraction: 'cat zip_format.mjs',
      archiveFormat: 'zip'
    },
    [
      {
        filename: 'zip_format.mjs',
        content: fs.createReadStream('examples/zip_format.mjs')
      }
    ],
    fs.createWriteStream('zip_format.sh')
  );
})();
