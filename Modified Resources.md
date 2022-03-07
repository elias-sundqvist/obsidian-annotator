The following resources have been modified in the (`resources`) folder, and will need to be reapplied when updating hypothesis version. 

* `hypothes.is\app.html` and `hypothes.is\app.html` 
    > remove "dsn" from the sentry object. This prevents crash logs from being sent to the hypothes.is team.  (See issue #97)

* `cdn.hypothes.is\demos\epub\epub.js\js\reader.js`
    > Expose `start()` function as `window.epubReader(readerSettings)`. It allows to pass settings to reader from `annotatorView`
    ```js
    window.epubReader = function (readerSettings) {
        var readingMode = ({
        'scroll': { manager: "continuous", flow: "scrolled" },
        'pagination': { manager: "default", flow: "paginated" }
    });
    ```
    > Pass reading mode settings to rendition. This is required for changing EPUB reader mode.
    ```js
    var rendition = book.renderTo("viewer", {
      ...readingMode[readerSettings.readingMode],
      ...
      ...
    ```

    > REMOVE `document.addEventListener('DOMContentLoaded', start, false);` because `epubReader` function runs from `annotatorView` with params.

    > Add this to change fontSize from plugin settings
    ```js
    rendition.themes.fontSize(`${readerSettings.fontSize}%`);
    ```

    > This is needed for switching EPUB pages 
    ```js
    window.rendition = rendition; // expose the rendered epub object. 
    ```

    > Add addEventListener for arrows only it's Pagination mdoe. Remove arrows if it's Scoll mode
    ```js
    switch (readerSettings.readingMode) {
      case "scroll":
        document.querySelectorAll("a.arrow").forEach((e) => e.remove());
        document.querySelector("#viewer").classList.add("hide-after");
        break;

      case "pagination":
        var next = document.getElementById("next");
        next.addEventListener("click", function(e){
          rendition.next();
          e.preventDefault();
        }, false);

        var prev = document.getElementById("prev");
        prev.addEventListener("click", function(e){
          rendition.prev();
          e.preventDefault();
        }, false);

        break;
    }
    ```
* `cdn.hypothes.is\demos\epub\epub.js\css\reader.css`
    > Add `.hide-after` class. This is needed to hide page separator in Scroll view
    ```css
    .hide-after:after {
        display: none;
    };
    ```

    > Move reader closer to the top
    ```css
    #main {
      margin-top: 20px;
    }
    ```

    > REMOVE #prev and #next styles
    ```css
    #prev {
      left: 0;
    }
    #next {
      right: 0;
    }
    ```

    > REMOVE width margin from #viewer.spreads
    ```css
    #viewer.spreads {
      width: 85vh;
      margin: 10vh auto;
      ...
    }
    ```

    > Increase reader height
    ```css
    #viewer.spreads {
      height: 95vh;
    }
    ```

    > Increase reader view for large screen
    ```css
    @media (min-width: 1000px) {
      ...

      #viewer.spreads {
        width: 92vw;
        margin: 0 0 0 3.5vw;
      }
      #prev {
        left: -5px;
      }
      #next {
        right: 10px;
      }
    }
    ```

    > Increase reader view for small screen
    ```css
    @media (max-width: 1000px) {
      #viewer.spreads {
        width: 87vw;
        margin: 0 0 0 5vw;
      }
      #prev {
        left: -5px;
      }
      #next {
        right: 10px;
      }
    }
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