var request = require('request');
var cheerio = require('cheerio');
var _       = require('lodash');

var headers = {
	'Accept'           : 'application/json, text/javascript, */*; q=0.01',
	'Referer'          : 'http://9gag.com/fresh',
	'User-Agent'       : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/53.0.2785.143 Chrome/53.0.2785.143 Safari/537.36',
	'X-Requested-With' : 'XMLHttpRequest'
};

var parseArticles = function(rawHTML){
	let $ = cheerio.load(rawHTML);
	$('article.badge-entry-container').each(function(i, article) {
		// console.log($(this).attr('data-entry-id'));
		// console.log($(this).attr('data-entry-url'));
		// console.log($(this).attr('data-entry-votes'));
		// console.log($(this).attr('data-entry-comments'));
		console.log($(this).children('header').text().trim());
	});
};

var syncFetch = function(url, times, max) {
	request.get({
		url     : url,
		headers : headers
	}, function(err, httpResponse, body) {
		let response = JSON.parse(body);

		_.forEach(response.items, function(item, id) {
			let $ = cheerio.load(item);
			console.log($('article.badge-entry-container').children('header').text().trim());
		});

		console.log(response.loadMoreUrl);

		if (times >= max){
			process.exit();
		} else {
			asyncFetch('http://9gag.com' + response.loadMoreUrl, ++times, max);
		}
	});
};

request.get({
	url: 'http://9gag.com/fresh'
}, function(err, httpResponse, body) {
	let $ = cheerio.load(body);
	$('article.badge-entry-container').each(function(i, article) {
		// console.log($(this).attr('data-entry-id'));
		// console.log($(this).attr('data-entry-url'));
		// console.log($(this).attr('data-entry-votes'));
		// console.log($(this).attr('data-entry-comments'));
		console.log($(this).children('header').text().trim());
	});
	console.log($('.badge-load-more-post').attr('href'));

	asyncFetch('http://9gag.com' + $('.badge-load-more-post').attr('href'), 0, 3);
});
