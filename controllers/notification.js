if (typeof Msgboy === "undefined") {
    var Msgboy = {};
}

// The Notification class
Msgboy.Notification = function () {
};

Msgboy.Notification.prototype = {
    messages: [],
    started: false,
    mouseOver: false,
    period: 8000,
    rotate: function () {
        setTimeout(function () {
            if (!this.mouseOver) {
                if (this.messages[0]) {
                    this.messages[0].view.remove();
                }
                this.messages.shift();
                this.showNextMessage();
            }
            this.rotate();
        }.bind(this), this.period);
    },
    showNextMessage: function () {
        var message = this.messages[0];
        if (!this.messages[0]) {
            chrome.extension.sendRequest({
                signature: "close",
                params: null
            }, function (response) {
                window.close();
            });
        } else {
            window.focus(); // Put this alert in front!
            this.messages[0].view = new MessageView({
                model: this.messages[0]
            });
            $("body").append(this.messages[0].view.el); // Adds the view in the document.
            
            this.messages[0].bind("up-ed", function () {
                this.messages[0].view.remove();
                this.go_to_message(this.messages[0]);
                this.messages.shift();
                this.showNextMessage();
            }.bind(this));

            this.messages[0].bind("down-ed", function () {
                this.messages[0].view.remove();
                this.messages.shift();
                this.showNextMessage();
            }.bind(this));

            this.messages[0].view.bind("clicked", function () {
                this.messages[0].view.remove();
                this.messages.shift();
                this.showNextMessage();
            }.bind(this));

            this.messages[0].view.bind("rendered", function () {
                $(this.messages[0].view.el).appendTo($("body"));
            }.bind(this));

            this.messages[0].view.render(); // builds the HTML
        }
    },
    go_to_message: function (model) {
        chrome.extension.sendRequest({
            signature: "tab",
            params: {
                url: this.messages[0].main_link(),
                selected: true
            }
        });
    }
};