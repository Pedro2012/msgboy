// Blogger
var $ = jQuery = require('jquery');

Blogger = function () {

    this.name = 'Blogger'; // Name for this plugin. The user will be asked which plugins he wants to use.
    this.onSubscriptionPage = function () {
        return (window.location.host === "www.blogger.com" && window.location.pathname === '/navbar.g');
    };

    this.hijack = function (follow, unfollow) {
        $('a#b-follow-this').click(function (event) {
            follow({
                title: "",
                url: $("#searchthis").attr("action").replace("search", "feeds/posts/default")
            }, function () {
                // Done
            });
        });
    };

    this.listSubscriptions = function (callback, done) {
        var subscriptions = [];
        $.get("http://www.blogger.com/manage-blogs-following.g", function (data) {
            var rex = /createSubscriptionInUi\(([\s\S]*?),[\s\S]*?,([\s\S]*?),[\s\S]*?,[\s\S]*?,[\s\S]*?,[\s\S]*?,[\s\S]*?\);/g;
            var match = rex.exec(data);
            while (match) {
                subscriptions.push({
                    url: match[2].replace(/"/g, '').trim() + "feeds/posts/default",
                    title: match[1].replace(/"/g, '').trim()
                });
                match = rex.exec(data);
            }
            callback(subscriptions);
            done(subscriptions.length);
        }.bind(this));
    };
};

exports.Blogger = Blogger;
