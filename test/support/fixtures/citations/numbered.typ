// A numbered paper for the citation tests: labels in brackets, a list of two columns' worth, and things that only look like citations.
#set page(paper: "a4", margin: 2.2cm)
#set text(size: 10pt)
#set par(justify: true)
= Numbered citations

Attention replaced recurrence @vaswani2017. Earlier measurements @smith2019a @smith2019b disagreed with each other, and
a map of points @maaten2008 made that visible. Reading lists are divided by their labels @okafor2021, as was shown
before @vaswani2017.

An interval is not a citation: for $t in [1, 2]$ the loss falls, and the array `a[1]` holds the first value; nor is an
exponent, $x^2$. A note at the foot is not one either.#footnote[Only a remark.]

#pagebreak()
On the second page one work is cited again @okafor2021, and nothing else.

#bibliography("refs.yml", style: "ieee", full: true)
