# The website

What is served at `https://annotator.esh.sh/`: static files, no build step.

- `index.html`, `style.css`: the landing page. No script, no webfonts,
  nothing requested from another host.
- `og.jpg`: the first frame of `docs/annotator.gif`, for link previews.
- `demo/lighthouse-lens/`: the sample article that the web recording in the
  main README annotates. Its text, pictures and layout are fixed: a recording
  made on it has to look the same next time.
- `media/`: **not in git.** The pictures and recordings are the ones in
  `docs/`; they are copied in when the site is published.

## Publish

```sh
mkdir -p site/media
cp docs/*.gif docs/*.jpg site/media/
```

then upload the contents of `site/` (without `README.md` and `.gitignore`).
The page uses twelve of the files in `docs/`; `drawing.jpg` is not shown.

## Preview

```sh
mkdir -p site/media && cp docs/*.gif docs/*.jpg site/media/
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

and open `http://127.0.0.1:8765/`. The links to the demo and back are
written from the root (`/demo/lighthouse-lens/`, `/`), so open it through a
server, not as a file.

## When a recording changes

If `docs/annotator.gif` was recorded again, make `og.jpg` again:

```sh
ffmpeg -y -i docs/annotator.gif -frames:v 1 -q:v 8 site/og.jpg
```

The links to files on GitHub (the guide, the changelog, the proofs, the
security notes, the measurements) point at `master`.
