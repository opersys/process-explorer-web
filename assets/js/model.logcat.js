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
        this.refilter();

        //setTimeout(function () {
        //    self.refilter.call(self);
        //}, 200);
    },

    setFilterItem: function (filterItem, filterItemValue) {
        this._filterData[filterItem] = filterItemValue;
        this.refilter();
    },

    clearFilterItem: function (filterItem) {
        delete this._filterData[filterItem];
        this.refilter();
    },

    getFilterItem: function (filterItem) {
        return this._filterData[filterItem];
    },

    refilter: function () {
        var self = this;

        this._rows = _.filter(this.models, function (m) {
            var r = true;

            _.each(_.keys(self._filterData), function (k) {
                if (_.isArray(self._filterData[k]))
                    r = _.contains(self._filterData[k], m.get(k)) && r;
                else
                    r = (self._filterData[k] == m.get(k)) && r
            });

            return r;
        });

        this.onRowCountChanged.notify();
        this.onRowsChanged.notify();
    },

    getItem: function (i) {
        return this._rows[i];
    },

    getLength: function () {
        return this._rows.length;
    },

    constructor: function () {
        Backbone.Collection.apply(this, arguments);

        var self = this;
        var socket = io.connect("http://localhost:3000/logcat");

        self.no = 0;
        self._rows = [];
        self._filterData = {};

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
