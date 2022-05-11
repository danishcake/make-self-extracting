import { makeSelfExtractingScript } from '../dist/libshelf.js';
import * as fs from 'fs';

// Embeds a shell script that is executable
(async () => {
  const postExtraction = ['./i_am_executable.sh'];
  await makeSelfExtractingScript(
    {
      postExtraction: postExtraction.join('\n'),
      archiveFormat: 'tar',
      compressionLevel: 9
    },
    [
      {
        filename: 'i_am_executable.sh',
        content: Buffer.from('#!/bin/bash\necho Hello from a nested script', 'utf8'),
        // TBD: Why is eslint complaining about a loss of precision here?
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        mode: 0o755
      }
    ],
    fs.createWriteStream('embedded_shell_script.sh')
  );
})();
