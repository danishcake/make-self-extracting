import { makeSelfExtractingScript } from '../dist/libshelf.js';
import * as fs from 'fs';

// Creates a self extracting shell script where the content is provided using buffers
(async () => {
  await makeSelfExtractingScript(
    {
      preExtraction: 'echo This section runs in `pwd`',
      postExtraction: 'cat header.txt\necho This section runs in `pwd`\nls -l\ncat footer.txt'
    },
    [
      {
        filename: 'header.txt',
        content: Buffer.from('This text comes from an embedded file\n', 'utf-8')
      },
      {
        filename: 'footer.txt',
        content: Buffer.from('Thanks for using shelf!\n', 'utf-8')
      }
    ],
    fs.createWriteStream('simple.sh')
  );
})();
