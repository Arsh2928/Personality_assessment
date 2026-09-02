// Item groupings straight from the Big Five handbook (1-indexed statement numbers)
const DIMENSION_ITEMS = {
  extraversion: [1, 6, 11, 16, 21],
  agreeableness: [2, 7, 12, 17, 22],
  adjustment: [3, 8, 13, 18, 23],
  conscientiousness: [4, 9, 14, 19, 24],
  openness: [5, 10, 15, 20, 25],
};

/**
 * @param {number[]} answers - array of 25 scores (1-7), answers[0] = statement 1
 * @returns {{extraversion:number, agreeableness:number, adjustment:number, conscientiousness:number, openness:number}}
 * Each dimension totals between 5 and 35.
 */
function computeScores(answers) {
  const scores = {};
  for (const [dimension, items] of Object.entries(DIMENSION_ITEMS)) {
    scores[dimension] = items.reduce((sum, itemNumber) => sum + answers[itemNumber - 1], 0);
  }
  return scores;
}

module.exports = { computeScores, DIMENSION_ITEMS };
