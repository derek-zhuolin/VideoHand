import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export function withDirectorGallery(html) {
  const snippet=readFileSync(new URL('../templates/director-gallery.html',import.meta.url),'utf8');
  const clean=html.replace(/<!-- VIDEOHAND_DIRECTOR_START -->[\s\S]*?<!-- VIDEOHAND_DIRECTOR_END -->\s*/,'');
  if(!/<body(?:\s[^>]*)?>/i.test(clean))throw new Error('Gallery has no body');
  return clean.replace(/<body(?:\s[^>]*)?>/i,open=>open+'\n'+snippet);
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=resolve(process.argv[2]||'docs/index.html');
  writeFileSync(file,withDirectorGallery(readFileSync(file,'utf8')));
  console.log('Director examples added to '+file);
}
