  window.epubReader = function (readerSettings) {
    var readingMode = ({
      'scroll': { manager: "continuous", flow: "scrolled" },
      'pagination': { manager: "default", flow: "paginated" }
    });

    var params = URLSearchParams && new URLSearchParams(document.location.search.substring(1));
    var url = params && params.get("url") && decodeURIComponent(params.get("url"));

    // Load the opf
    var book = ePub(url || "https://cdn.hypothes.is/demos/epub/content/moby-dick/book.epub", {
      canonical: function(path) {
        return window.location.origin + window.location.pathname + "?loc=" + path;
      }
    });
    var rendition = book.renderTo("viewer", {
      ...readingMode[readerSettings.readingMode],
      ignoreClass: "annotator-hl",
      width: "100%",
      height: "100%"
    });
    rendition.themes.fontSize(`${readerSettings.fontSize}%`);
    window.rendition = rendition; 

    // var hash = window.location.hash.slice(2);
    var loc = window.location.href.indexOf("?loc=");
    if (loc > -1) {
      var href =  window.location.href.slice(loc + 5);
      var hash = decodeURIComponent(href);
    }

    rendition.display(hash || undefined);

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

    var nav = document.getElementById("navigation");
    var opener = document.getElementById("opener");
    opener.addEventListener("click", function(e){
      nav.classList.add("open");
    }, false);

    var closer = document.getElementById("closer");
    closer.addEventListener("click", function(e){
      nav.classList.remove("open");
    }, false);

    // Hidden
    var hiddenTitle = document.getElementById("hiddenTitle");

    rendition.on("rendered", function(section){
      var current = book.navigation && book.navigation.get(section.href);

      if (current) {
        document.title = current.label;
      }

      // TODO: this is needed to trigger the hypothesis client
      // to inject into the iframe
      requestAnimationFrame(function () {
        hiddenTitle.textContent = section.href;
      })

      var old = document.querySelectorAll('.active');
      Array.prototype.slice.call(old, 0).forEach(function (link) {
        link.classList.remove("active");
      })

      var active = document.querySelector('a[href="'+section.href+'"]');
      if (active) {
        active.classList.add("active");
      }
      // Add CFI fragment to the history
      history.pushState({}, '', "?loc=" + encodeURIComponent(section.href));
      // window.location.hash = "#/"+section.href
    });

    var keyListener = function(e){

      // Left Key
      if ((e.keyCode || e.which) == 37) {
        rendition.prev();
      }

      // Right Key
      if ((e.keyCode || e.which) == 39) {
        rendition.next();
      }

    };

    rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener, false);

    book.ready.then(function () {
      var $viewer = document.getElementById("viewer");
      $viewer.classList.remove("loading");
    });

    book.loaded.navigation.then(function(toc){
      var $nav = document.getElementById("toc"),
          docfrag = document.createDocumentFragment();

      toc.forEach(function(chapter, index) {
        var item = document.createElement("li");
        var link = document.createElement("a");
        link.id = "chap-" + chapter.id;
        link.textContent = chapter.label;
        link.href = chapter.href;
        item.appendChild(link);
        docfrag.appendChild(item);

        link.onclick = function(){
          var url = link.getAttribute("href");
          rendition.display(url);
          return false;
        };

      });

      $nav.appendChild(docfrag);


    });

    book.loaded.metadata.then(function(meta){
      var $title = document.getElementById("title");
      var $author = document.getElementById("author");
      var $cover = document.getElementById("cover");
      var $nav = document.getElementById('navigation');

      $title.textContent = meta.title;
      $author.textContent = meta.creator;
      if (book.archive) {
        book.archive.createUrl(book.cover)
          .then(function (url) {
            $cover.src = url;
          })
      } else {
        $cover.src = book.cover;
      }

    });

    book.rendition.hooks.content.register(function(contents, view) {

      contents.window.addEventListener('scrolltorange', function (e) {
        var range = e.detail;
        var cfi = new ePub.CFI(range, contents.cfiBase).toString();
        if (cfi) {
          book.rendition.display(cfi);
        }
        e.preventDefault();
      });

    });
  }