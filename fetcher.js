const request = require('request');
const cheerio = require('cheerio');
const _       = require('lodash');

const headers = {
	'Accept'           : 'application/json, text/javascript, */*; q=0.01',
	'Referer'          : 'http://9gag.com/fresh',
	'User-Agent'       : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/60.0.3112.78 Chrome/60.0.3112.78 Safari/537.36',
	'X-Requested-With' : 'XMLHttpRequest'
};

const parseArticles = function(rawHTML){
	let $ = cheerio.load(rawHTML);

	$('article.badge-entry-container').each(function() {
		let post = {
			id: $(this).attr('data-entry-id'),
			url: $(this).attr('data-entry-url'),
			votes: $(this).attr('data-entry-votes'),
			comments: $(this).attr('data-entry-comments'),
			title: $(this).children('header').text().trim()
		};

		console.log(post);
	});
};

const syncFetch = function(url, times, max) {
	request.get({
		url     : url,
		headers : headers
	}, function(err, httpResponse, body) {
		let response = JSON.parse(body);

		_.forEach(response.items, function(item) {
            parseArticles(item);
		});

		console.log(response.loadMoreUrl);

		if (times >= max){
			process.exit();
		} else {
			syncFetch('http://9gag.com' + response.loadMoreUrl, ++times, max);
		}
	});
};

request.get({
	url: 'http://9gag.com/fresh'
}, function(err, httpResponse, body) {
    let $ = cheerio.load(body);
    parseArticles(body);
	console.log($('.badge-load-smore-post').attr('href'));

	syncFetch('http://9gag.com' + $('.badge-load-more-post').attr('href'), 0, 3);
});
