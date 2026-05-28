import type { CrudRow } from "../../../crud/data";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL = /\u0640/g;

export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[\u0623\u0625\u0622\u0671]/g, "\u0627")
    .replace(/\u0624/g, "\u0648")
    .replace(/\u0626/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\s+/g, " ");
}

function getEditDistanceWithinLimit(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      const distance = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );

      current[rightIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previous = current;
  }

  return previous[right.length];
}

function getAllowedFuzzyDistance(term: string) {
  if (term.length <= 2) {
    return 0;
  }

  if (term.length <= 5) {
    return 1;
  }

  return 2;
}

function searchTermMatchesText(term: string, text: string) {
  if (text.includes(term)) {
    return true;
  }

  const maxDistance = getAllowedFuzzyDistance(term);
  if (maxDistance === 0) {
    return false;
  }

  return text
    .split(" ")
    .some(
      (word) =>
        Math.abs(word.length - term.length) <= maxDistance &&
        getEditDistanceWithinLimit(term, word, maxDistance) <= maxDistance,
    );
}

export function searchRows<T extends CrudRow>(rows: T[], term: string, getText: (row: T) => string) {
  const normalizedSearch = normalizeSearchText(term);
  if (!normalizedSearch) {
    return rows;
  }

  const terms = normalizedSearch.split(" ");
  return rows.filter((row) => {
    const searchableText = normalizeSearchText(getText(row));
    return terms.every((searchTerm) => searchTermMatchesText(searchTerm, searchableText));
  });
}
