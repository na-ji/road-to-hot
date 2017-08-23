const moment   = require('moment');
const cheerio  = require('cheerio');

module.exports = {};

module.exports.parseArticles = function (rawHTML) {
    let $ = cheerio.load(rawHTML);
    let posts = [];
    let nextUpdate = moment().minute(Math.ceil(moment().minute() / 20) * 20).second(0).millisecond(0).subtract(1, 'minutes').toDate();

    $('article.badge-entry-container').each(function () {
        let post = {
            id: $(this).attr('data-entry-id'),
            url: $(this).attr('data-entry-url'),
            votes: parseInt($(this).attr('data-entry-votes')),
            comments: parseInt($(this).attr('data-entry-comments')),
            title: $(this).find('header h2').text().trim(),
            fetched: new Date(),
            nextUpdate: nextUpdate,
            updateNumber: 1
        };

        posts.push(post);
    });

    return posts;
};
