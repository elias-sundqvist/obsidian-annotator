
> Note: 
> 
>   If you are on windows, you must make the following small changes 
>   1. Go to .\submodules\hypothesis-client-annotator-fork\node_modules\@hypothesis\frontend-build\lib\rollup.js
>   2. Add `import { pathToFileURL } from 'url'` to the top of the file. 
>   3. Replace `import(resolve(path))` with `import(pathToFileURL(resolve(path)))`