# Fixtures for the citation tests

Each PDF here has a `.json` beside it: what Obsidian's PDF library reports
for it (every page's text runs with their places, and its links inside the
document with where they lead), frozen by
`test/support/capture-citations-fixture.mjs`. The tests read the `.json`
files; the PDFs are kept so that they can be frozen again, and compared
(`--check`) when the PDF library changes. Each `.json` names the version of
the library it was frozen with.

## Written for the tests

`numbered`, `author-year` and `raised` are three small papers set with
[Typst](https://typst.app) 0.15.1 from the `.typ` files here and the
references in `refs.yml`:

```bash
typst compile numbered.typ
```

They are part of this repository and under its licence. The works they cite
are invented, except "Attention is all you need", which is cited by its real
title.

## Published papers

Three papers published under the Creative Commons Attribution 4.0
International licence (<https://creativecommons.org/licenses/by/4.0/>), kept
unchanged:

| File | Paper |
| --- | --- |
| `acl-2020-main-1.pdf` | Lieke Gelderloos, Grzegorz Chrupała and Afra Alishahi. 2020. Learning to Understand Child-directed and Adult-directed Speech. In *Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics*, pages 1–6. © 2020 Association for Computational Linguistics. From <https://aclanthology.org/2020.acl-main.1/>; the ACL Anthology licenses what it has published since 2016 under CC BY 4.0. |
| `plos-one-0276433.pdf` | Sungura R, Shirima G, Spitsbergen J, Mpolya E, Vianney JM. 2022. A case-control study on the driving factors of childhood brain volume loss: What pediatricians must explore. *PLoS ONE* 17(12): e0276433. <https://doi.org/10.1371/journal.pone.0276433>. © 2022 Sungura et al.; the article says it is distributed under the Creative Commons Attribution License. |
| `nat-commun-35648.pdf` | Anza-Ramirez C, Lazo M, Zafra-Tanaka JH, et al. 2022. The urban built environment and adult BMI, obesity, and diabetes in Latin American cities. *Nature Communications* 13: 7977. <https://doi.org/10.1038/s41467-022-35648-w>. © The Author(s) 2022; the article says it is licensed under a Creative Commons Attribution 4.0 International License. |

They were chosen for how they are made, not for what they say: an
author–year paper set with LaTeX whose citations are linked, in two columns;
a numbered paper from a publisher's own system, whose links lead to boxes
and not to points; and a paper with raised citation numbers.
