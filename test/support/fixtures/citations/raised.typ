// A paper with raised citation numbers for the citation tests, with other raised and small numbers beside them.
#set page(paper: "a4", margin: 2.2cm)
#set text(size: 10pt)
#set par(justify: true)
= Raised numbers

Jane Smith#super[1], Wei Zhang#super[2]

Attention replaced recurrence @vaswani2017. Measurements differ @smith2019a @smith2019b, and a map of points
@maaten2008 shows it. A volume of 10#super[6] litres and an area in m#super[2] are not citations, nor is the remark
at the foot.#footnote[Only a remark.] Reading lists are divided by their labels @okafor2021.

#pagebreak()
#bibliography("refs.yml", style: "nature", full: true)
