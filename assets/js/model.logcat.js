var LogCat = Backbone.Model.extend({
    url: "/sysinfo", // NOT USED
    idAttribute: "no",

    // Parse the brief logcat format.
    parse: function (input) {
        var ls, tag, pid, msg;

        tag = input.line[0];
        ls = input.line.split(":");
        pid = /\(\s*([0-9]*)\s*\)/.exec(ls.shift())[1];
        msg = ls.join(":");

        return {
            no: input.no,
            tag: tag,
            pid: pid,
            msg: msg
        };
    }
});

var LogCatLines = Slickback.Collection.extend({
    model: LogCat,
    url: "/sysinfo", // NOT USED

    set: function () {
        var self = this;

        Backbone.Collection.prototype.set.apply(this, arguments);

        setTimeout(function () {
            self.reindex.call(self);
        }, 200);
    },

    setPid: function (pid) {
        this.getItem = this._pid_getItem;
        this.getLength = this._pid_getLength;
        this._pid = pid;

        this.reindex();
    },

    clearPid: function () {
        this.getItem = function (i) { return this.models[i]; };
        this.getLength = function () { return this.models.length; }

        this._pid = null;

        this.reindex();
    },

    reindex: function () {
        var self = this;

        this._rows = _.filter(this.models, function (m) {
            return m.get("pid") == self._pid;
        });

        this.onRowCountChanged.notify();
        this.onRowsChanged.notify();
    },

    _pid_getItem: function (i) {
        return this._rows[i];
    },

    _pid_getLength: function () {
        return this._rows.length;
    },

    constructor: function () {
        Backbone.Collection.apply(this, arguments);

        var self = this;
        var socket = io.connect("http://localhost:3000/logcat");

        self.no = 0;

        socket.on("logcat", function (lcData) {
            // Split into lines
            var lcLine, lcLines = lcData.split(/\n/);
            var lcModels = [];

            // Gather all the logcat lines so that they can be added
            // to the collection in a single bunch hopefully reducing
            // the processing time and lowering the number of events
            // raised.
            while (lcLine = lcLines.shift()) {
                if (lcLine != "") {
                    lcModels.push({
                        no: self.no++,
                        line: lcLine
                    });
                }
            }

            // Add all the models in a single call.
            self.add(lcModels, {parse: true});
        });
    }
});
