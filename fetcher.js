const request  = require('request');
const cheerio  = require('cheerio');
const _        = require('lodash');
const moment   = require('moment');

const { db, Post } = require('./db');

process.on('unhandledRejection', (err) => {
    console.error(err);
    process.exit(1);
});

const headers = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Referer': 'https://9gag.com/fresh',
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/60.0.3112.78 Chrome/60.0.3112.78 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

const parseArticles = function (rawHTML) {
    let $ = cheerio.load(rawHTML);
    let posts = [];
    let nextUpdate = moment().minute(Math.ceil(moment().minute() / 20) * 20).second(0).millisecond(0).subtract(1, 'minutes').toDate();

    $('article.badge-entry-container').each(function () {
        let post = {
            id: $(this).attr('data-entry-id'),
            url: $(this).attr('data-entry-url'),
            votes: $(this).attr('data-entry-votes'),
            comments: $(this).attr('data-entry-comments'),
            title: $(this).children('header').text().trim(),
            fetched: new Date(),
            nextUpdate: nextUpdate,
            updateNumber: 1
        };

        posts.push(post);
    });

    return posts;
};

const persistPosts = async function (datas) {
    let persisted = 0;

    await db.connection();

    for (let data of datas) {
        let count = await Post.count({id: data.id});
        if (!count) {
            const post = new Post(data);
            await post.save();
            persisted++;
        }
    }

    console.log('%d posts persisted', persisted);

    return persisted;
};

const loadMore = function (url, times, max) {
    request.get({
        url: url,
        headers: headers
    }, async function (err, httpResponse, body) {
        let response = JSON.parse(body);
        let posts = [];

        _.forEach(response.items, function (item) {
            posts = posts.concat(parseArticles(item));
        });

        const persisted = await persistPosts(posts);

        if (persisted < 10 || times >= max) {
            process.exit();
        } else {
            console.log(response.loadMoreUrl);
            loadMore('https://9gag.com' + response.loadMoreUrl, ++times, max);
        }
    });
};

request.get({
    url: 'https://9gag.com/fresh'
}, async function (err, httpResponse, body) {
    let $ = cheerio.load(body);
    let posts = parseArticles(body);
    const persisted = await persistPosts(posts);

    if (persisted < 10) {
        process.exit();
    } else {
        console.log($('.badge-load-more-post').attr('href'));

        loadMore('https://9gag.com' + $('.badge-load-more-post').attr('href'), 0, 10);
    }
});
