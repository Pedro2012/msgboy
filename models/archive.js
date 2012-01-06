var Archive = Backbone.Collection.extend({
    storeName: "messages",
    database: msgboyDatabase,
    model: Message,

    initialize: function () {
    },
    comparator: function (message) {
        return - (message.attributes.created_at);
    },
    all: function (condition, done) {
        this.fetch({
            conditions: condition,
            success: function () {
                if (typeof(done) !== "undefined" && done) {
                    done();
                }
            }.bind(this),
            error: function (object, error) {
                if (typeof(done) !== "undefined" && done) {
                    done(error);
                }
            }
        });
    },
    each: function (condition) {
        this.fetch({
            conditions: condition,
            addIndividually: true
        });
    },
    next: function (number, condition) {
        options = {
            conditions: condition,
            limit: number,
            addIndividually: true
        };
        this.fetch(options);
    },


    forFeed: function (_feed, done) {
        this.all({feed: _feed}, done);
    }


});
