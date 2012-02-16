var $ = jQuery = require('jquery');

Generic = function () {
    this.name = 'Generic Plugin which will listen for any page';

    this.onSubscriptionPage = function () {
        return true;
    };

    this.listSubscriptions = function (callback, done) {
        callback([]);
        done(0);
    };

    this.hijack = function (follow, unfollow) {
        // Adds a listen event on all elements
        $(".msgboy-follow").click(function (element) {
            follow({
                title: $(element.currentTarget).attr("data-msgboy-title"),
                url: $(element.currentTarget).attr("data-msgboy-url")
            }, function () {
                // Done
            });
            return false;
        });
    };
};

exports.Generic = Generic;