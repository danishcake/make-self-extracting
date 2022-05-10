import { makeSelfExtractingScript } from '../dist/libshelf.js';
import { execSync } from 'child_process';
import * as fs from 'fs';

// Creates a shell script that installs the Alpine Docker
(async () => {
  // Download alpine. This should be roughly 10MB
  execSync('docker pull alpine');

  // Export the docker image
  execSync('docker save -o alpine.tar alpine');

  const preExtraction = ['echo Self extracting Alpine Linux'];
  const postExtraction = [
    'echo Importing Alpine Linux image to Docker',
    'docker load -i alpine.tar',
    'docker run --rm -it alpine sh'
  ];

  // Create a tar.gz based self extracting shell script that installs and starts the image
  await makeSelfExtractingScript(
    {
      preExtraction: preExtraction.join('\n'),
      postExtraction: postExtraction.join('\n'),
      archiveFormat: 'tar',
      compressionLevel: 9
    },
    [
      {
        filename: 'alpine.tar',
        path: 'alpine.tar'
      }
    ],
    fs.createWriteStream('run_alpine_linux.sh')
  );

  // Clean up alpine.tar
  await fs.promises.unlink('alpine.tar');
})();
