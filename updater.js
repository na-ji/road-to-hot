let request = require('request-promise-native');
const moment  = require('moment');
const blessed = require('blessed');
const contrib = require('blessed-contrib');

const { db, Post, Update } = require('./db');
const { parseArticles } = require('./utils');

const screen = blessed.screen();
const grid = new contrib.grid({rows: 2, cols: 2, screen: screen});
const gauge = grid.set(1, 1, 1, 1, contrib.gauge, {label: 'Progress'});
const map = grid.set(1, 0, 1, 1, contrib.map, {label: 'Nukes launched'});
const log = grid.set(0, 0, 1, 1, contrib.log, { fg: 'green', selectedFg: 'green', label: 'Logs'});
const logError = grid.set(0, 1, 1, 1, contrib.log, { fg: 'red', selectedFg: 'red', label: 'Errors'});

request = request.defaults({
    timeout: 5000,
    gzip: true
});

process.on('unhandledRejection', (err) => {
    screen.destroy();
    console.error(err);
    process.exit(1);
});

async function updatePosts() {
    await db.connection();

    let posts = await Post.where({nextUpdate: {$lte: new Date()}}).sort('nextUpdate', 'asc').find();
    const total = posts.length;
    let i = 0;

    for (let post of posts) {
        gauge.setPercent((i) / total * 100);
        gauge.setLabel(`Progress: ${i} / ${total}`);
        log.log(post.get('url'));
        screen.render();
        i++;

        let response;
        try {
            response = await request(post.get('url'));
        } catch (err) {
            if (err.statusCode) {
                logError.log(`Http error ${err.statusCode}`);
                if (err.statusCode === 404) {
                    // if the post is deleted, we no longer update it
                    post.set('nextUpdate', new Date(2099, 1, 1));
                    post.save();
                }
            } else {
                logError.log('Http error' + err.message);
            }
            screen.render();
            continue;
        }

        let updatedPost = parseArticles(response)[0];
        // log.log(JSON.stringify(updatedPost));
        // screen.render();
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
        log.log(`Next update in ${minutesToAdd} minutes`);
        screen.render();
        nextUpdate.add(minutesToAdd, 'minutes');
        post.set('nextUpdate', nextUpdate.toDate());
        post.save();
    }

    await db.disconnect();

    process.exit();
}

//set map dummy markers
let marker = true;
setInterval(function() {
    if (marker) {
        map.addMarker({'lon' : '-79.0000', 'lat' : '37.5000', color: 'yellow', char: 'X' });
        map.addMarker({'lon' : '-122.6819', 'lat' : '45.5200' });
        map.addMarker({'lon' : '-6.2597', 'lat' : '53.3478' });
        map.addMarker({'lon' : '103.8000', 'lat' : '1.3000' });
    } else {
        map.clearMarkers();
    }
    marker = !marker;
    screen.render();
}, 1000);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

screen.on('resize', function() {
    gauge.emit('attach');
    map.emit('attach');
    log.emit('attach');
    logError.emit('attach');
});

screen.render();

updatePosts();
