# What the contract tests are checked against

These files are copies, frozen so the tests do not need the code they came
from. `lock.json` names where each one came from and its checksum; the first
contract test fails if a copy has changed.

- `client-*.js`: three files of the Hypothesis client at the commit the old
  plugin shipped: its annotation fixtures, the function that strips its
  internal fields before a request, and its API types.
- `fake-service-api.json`, `defineGenericAnnotation.tsx`: the routes the old
  plugin answered and the code that answered them.
- `../testfile.md`, `../testfile2.md`: the old plugin's own stored-annotation
  test notes.
- `../legacy-annotationUtils.tsx`: the old plugin's reader and writer of
  annotation blocks, run as the independent oracle.

Do not edit them. They say what the old plugin did; that is the point.
