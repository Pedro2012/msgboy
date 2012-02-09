var $ = jQuery = require('jquery');
var Feediscovery = require('../feediscovery.js').Feediscovery;
var Maths = require("../maths.js").Maths;

var History = function () {
    this.name = 'Browsing History';
    this.visits_to_be_popular = 3;
    this.deviation = 1;
    this.elapsed = 1000 * 60 * 60 * 3;
    this.onSubscriptionPage = function () {
        // This method returns true if the plugin needs to be applied on this page.
        return true;
    };
    this.hijack = function (follow, unfollow) {
        // Hum. Nothing to do as we can't use the chrome.* apis from content scripts
    };
    this.listSubscriptions = function (callback, done) {
        var seen = [];
        var pending = 0;
        var totalFeeds = 0;

        chrome.history.search({
            'text': '',
            // Return every history item....
            'startTime': ((new Date()).getTime() - 1000 * 60 * 60 * 24 * 31),
            // that was accessed less than one month ago.
            'maxResults': 10000
        }, function (historyItems) {
            if (historyItems.length === 0) {
                done(0);
            }
            var doneOne = _.after(historyItems.length, function () {
                done(totalFeeds);
            });

            _.each(historyItems, function (item) {
                if (item.visitCount > this.visits_to_be_popular) {
                    this.visitsRegularly(item.url, function (result) {
                        if (result) {
                            pending++;
                            Feediscovery.get(item.url, function (links) {
                                var feeds = [];
                                _.each(links, function (link) {
                                    totalFeeds++;
                                    if (seen.indexOf(link.href) === -1) {
                                        feeds.push({title: link.title, url: link.href});
                                        seen.push(link.href);
                                    }
                                });
                                pending--;
                                doneOne();
                                if (feeds.length > 0) {
                                    callback(feeds);
                                }
                            });
                        }
                        else {
                            // Not visited regularly.
                            doneOne();
                        }
                    });
                }
                else {
                    doneOne();
                    // Not visited often enough
                }
            }.bind(this));
        }.bind(this));
    };
    this.visitsRegularly = function (url, callback) {
        chrome.history.getVisits({url: url}, function (visits) {
            times = $.map(visits, function (visit) {
                return visit.visitTime;
                }).slice(-10); // We check the last 10 visits.
                var diffs = [];
                for (var i = 0; i < times.length - 1; i++) {
                    diffs[i] =  times[i + 1] - times[i];
                }
                // Check the regularity and if it is regular + within a certain timeframe, then, we validate.
                if (Maths.normalizedDeviation(diffs) < this.deviation && (times.slice(-1)[0] -  times[0] > this.elapsed)) {
                    callback(true);
                }
                else {
                    callback(false);
                }
            }.bind(this));
        };
        this.subscribeInBackground = function (callback) {
            chrome.history.onVisited.addListener(function (historyItem) {
                if (historyItem.visitCount > this.visits_to_be_popular) {
                    this.visitsRegularly(historyItem.url, function (result) {
                        Feediscovery.get(historyItem.url, function (links) {
                            _.each(links, function (link) {
                                callback(link);
                            });
                        });
                    });
                }
            }.bind(this));
        };
    };

    exports.History = History;