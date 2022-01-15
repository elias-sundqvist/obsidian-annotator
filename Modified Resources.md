The following resources have been modified in the (`resources`) folder, and will need to be reapplied when updating hypothesis version. 

* `cdn.hypothes.is\demos\epub\epub.js\js\reader.js`
    > This is needed for switching EPUB pages 
    ```js
    window.rendition = rendition; // expose the rendered epub object. 
    ```
* `via.hypothes.is\https.html`
    > The `event.source` check has to be disabled for the loading progress bar to dissappear. 
    ```js
    window.addEventListener('message', event => {
        const contentFrame = document.querySelector('.js-content-frame');
        const loadingIndicator = document.querySelector('.js-loading-indicator');

        if (event.source !== contentFrame.contentWindow) {
        //  return; //(comment out this check)
        }
        ...
    ```
* `cdn.hypothes.is\hypothesis\1.853.0\build\scripts\annotator.bundle.js`
    > This is needed for reliable navigation and focusing of highlights. 
    ```js
    /*expose the guest object for annotation navigation.*//*START EDIT HERE*/window.guests=[...(window.guests??[]),this]/*END EDIT HERE*/
    ```
    > This fixes an issue with highlights not working:
      Replace `if(l||(l=new Set,this._sentChannels.set(i,l)),l.has(a))return;` from annotator.bundle.js
      with `if(l||(l=new Set,this._sentChannels.set(i,l)),l.has(a)){};`

