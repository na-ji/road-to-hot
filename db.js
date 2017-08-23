const { Database, Model } = require('mongorito');

const db = new Database('localhost:27017/roadtohot');

class Post extends Model {}
class Update extends Model {}

db.connect().then(() => {
    db.register(Post);
    db.register(Update);
});

module.exports = db;
module.exports.db = db;
module.exports.Post = Post;
module.exports.Update = Update;
