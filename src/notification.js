var $ = jQuery = require('jquery');
var Msgboy = require('./msgboy.js').Msgboy;
var browser = require('./browsers.js').browser;
var Message = require('./models/message.js').Message;
var NotificationView = require('./views/notification-view.js').NotificationView;


Msgboy.bind("loaded:notification", function () {
    
    var notificationView = new NotificationView({});

    $("body").mouseover(function () {
        notificationView.mouseOver = true;
    });

    $("body").mouseout(function () {
        notificationView.mouseOver = false;
    });

    browser.listen(function (request, sender, sendResponse) {
        if (request.signature == "notify" && request.params) {
            notificationView.showOrBuffer(new Message(request.params));
        }
    });
    
    // Tell everyone we're ready.
    browser.emit({
        signature: "notificationReady",
        params: {}
    }, function () {
        // Nothing to do.
    });
});



