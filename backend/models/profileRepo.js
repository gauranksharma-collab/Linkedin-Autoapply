const Profile = require("./Profile");

function get(userId) {
  return Profile.findOne({ userId });
}

function upsert(userId, fields) {
  return Profile.findOneAndUpdate(
    { userId },
    { $set: { ...fields, userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

module.exports = { get, upsert };
