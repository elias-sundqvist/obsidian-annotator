// .generated/published-client/src/sidebar/util/search-filter.js
function splitTerm(term) {
  const filter = term.slice(0, term.indexOf(":"));
  if (!filter) {
    return [null, term];
  }
  if (["group", "quote", "since", "tag", "text", "uri", "user"].includes(filter)) {
    const data = term.slice(filter.length + 1);
    return [filter, data];
  } else {
    return [null, term];
  }
}
function tokenize(searchText) {
  if (!searchText) {
    return [];
  }
  const removeQuoteCharacter = (text) => {
    const start = text.slice(0, 1);
    const end = text.slice(-1);
    if ((start === '"' || start === "'") && start === end) {
      text = text.slice(1, text.length - 1);
    }
    return text;
  };
  let tokens = searchText.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  tokens = tokens.map(removeQuoteCharacter);
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const [filter, data] = splitTerm(token);
    if (filter) {
      tokens[index] = filter + ":" + removeQuoteCharacter(data);
    }
  }
  return tokens;
}
function toObject(searchText) {
  const obj = {};
  const backendFilter = (field) => field === "tag" ? "tags" : field;
  if (searchText) {
    const terms = tokenize(searchText);
    for (const term of terms) {
      let [field, data] = splitTerm(term);
      if (!field) {
        field = "any";
        data = term;
      }
      const backendField = backendFilter(field);
      if (obj[backendField]) {
        obj[backendField].push(data);
      } else {
        obj[backendField] = [data];
      }
    }
  }
  return obj;
}
function generateFacetedFilter(searchText, focusFilters = {}) {
  let terms;
  const any = [];
  const quote = [];
  const since = [];
  const tag = [];
  const text = [];
  const uri = [];
  const user = focusFilters.user ? [focusFilters.user] : [];
  if (searchText) {
    terms = tokenize(searchText);
    for (const term of terms) {
      const filter = term.slice(0, term.indexOf(":"));
      const fieldValue = term.slice(filter.length + 1);
      switch (filter) {
        case "quote":
          quote.push(fieldValue);
          break;
        case "since":
          {
            const time = term.slice(6).toLowerCase();
            const secondsPerDay = 24 * 60 * 60;
            const secondsPerUnit = {
              sec: 1,
              min: 60,
              hour: 60 * 60,
              day: secondsPerDay,
              week: 7 * secondsPerDay,
              month: 30 * secondsPerDay,
              year: 365 * secondsPerDay
            };
            const match = time.match(
              /^(\d+)(sec|min|hour|day|week|month|year)?$/
            );
            if (match) {
              const value = parseFloat(match[1]);
              const unit = (
                /** @type {keyof secondsPerUnit} */
                match[2] || "sec"
              );
              since.push(value * secondsPerUnit[unit]);
            }
          }
          break;
        case "tag":
          tag.push(fieldValue);
          break;
        case "text":
          text.push(fieldValue);
          break;
        case "uri":
          uri.push(fieldValue);
          break;
        case "user":
          user.push(fieldValue);
          break;
        default:
          any.push(term);
      }
    }
  }
  return {
    any: {
      terms: any,
      operator: "and"
    },
    quote: {
      terms: quote,
      operator: "and"
    },
    since: {
      terms: since,
      operator: "and"
    },
    tag: {
      terms: tag,
      operator: "and"
    },
    text: {
      terms: text,
      operator: "and"
    },
    uri: {
      terms: uri,
      operator: "or"
    },
    user: {
      terms: user,
      operator: "or"
    }
  };
}
export {
  generateFacetedFilter,
  toObject
};
