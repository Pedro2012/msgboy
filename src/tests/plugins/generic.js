var assert = require('assert');
var Plugins = require('../../plugins.js').Plugins;
var Generic = require('../../plugins/generic.js').Generic;

describe('Generic', function(){
    before(function(ready) {
        ready();
    });

    beforeEach(function(ready) {
        ready();
    });

    describe('onSubscriptionPage', function() {
        it('should return true', function() {
            var docStub = {};
            var b = new Generic(Plugins);
            assert(b.onSubscriptionPage(docStub));
        });
    });
    describe('hijack', function() {
        // Hum. How can we test that?
    });
    describe('listSubscriptions', function() {
        it('should list all feeds to which the user is subscribed', function(done) {
            var d = new Generic(Plugins);
            d.listSubscriptions(function(feed) {
                // This is the susbcribe function. We should check that each feed has a url and a title that are not empty.
                assert(false); // Generic plugin does not have a way to list subscriptions
            }, function(count) {
                // Called when subscribed to many feeds.
                assert(count === 0);
                done();
            });
        });
    });

});
