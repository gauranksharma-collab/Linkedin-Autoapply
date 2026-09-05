const Settings = require("./Settings");

async function getOrCreate(userId) {
  let doc = await Settings.findOne({ userId });
  if (!doc) doc = await Settings.create({ userId });
  return doc;
}

async function getAll(userId) {
  const doc = await getOrCreate(userId);
  return doc.toObject();
}

async function get(userId, key) {
  const doc = await getOrCreate(userId);
  return doc[key];
}

async function set(userId, key, value) {
  const doc = await Settings.findOneAndUpdate(
    { userId },
    { $set: { [key]: value } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc;
}

async function setMany(userId, updates) {
  const doc = await Settings.findOneAndUpdate(
    { userId },
    { $set: updates },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc.toObject();
}

module.exports = { getAll, get, set, setMany };
