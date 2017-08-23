let request = require('request-promise-native');
const moment  = require('moment');

const { db, Post, Update } = require('./db');
const { parseArticles } = require('./utils');

request = request.defaults({
    timeout: 5000,
    gzip: true
});

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});

async function updatePosts() {
    await db.connection();

    let posts = await Post.where({nextUpdate: {$lte: new Date()}}).sort('nextUpdate', 'asc').find();

    for (let post of posts) {
        console.log(post.get('url'));
        let response;
        try {
            response = await request(post.get('url'));
        } catch (err) {
            if (err.statusCode) {
                console.error('Http error', err.statusCode);
                if (err.statusCode === 404) {
                    // if the post is deleted, we no longer update it
                    post.set('nextUpdate', new Date(2099, 1, 1));
                    post.save();
                }
            } else {
                console.log(err);
                console.error('Http error', err.message);
            }
            continue;
        }

        let updatedPost = parseArticles(response)[0];
        console.log(updatedPost);
        const update = new Update({
            id: updatedPost.id,
            votes: updatedPost.votes,
            comments: updatedPost.comments,
            updatedAt: new Date()
        });
        update.save();

        let nextUpdate = moment(post.get('nextUpdate'));
        let minutesToAdd = 20;
        if (post.get('votes') === updatedPost.votes && post.get('comments') === updatedPost.comments) {
            // if the post have not been updated, we will post-pone the next update
            post.increment('updateNumber');
            minutesToAdd = post.get('updateNumber') * 20;
        } else {
            post.set('updateNumber', 1);
        }
        console.log(minutesToAdd);
        nextUpdate.add(minutesToAdd, 'minutes');
        post.set('nextUpdate', nextUpdate.toDate());
        post.save();
    }

    await db.disconnect();

    process.exit();
}

updatePosts();
