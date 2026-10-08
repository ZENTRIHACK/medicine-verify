const extractPackFields = async () => ({
  dummyField: "dummyData",
  confidence: 1
});

const comparePack = async () => ({
  match: "match",
  differences: []
});

module.exports = {
  extractPackFields,
  comparePack
};
