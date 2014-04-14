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

    applyFilter: function (items) {
        var self = this;

        return _.filter(items, function (m) {
            var r = true;

            _.each(_.keys(self._filterData), function (k) {
                if (_.isArray(self._filterData[k]))
                    r = _.contains(self._filterData[k], m.get(k)) && r;
                else
                    r = (self._filterData[k] == m.get(k)) && r;
            });

            return r;
        });
    },

    addRaw: function (models) {
        var newItems = [];

        for (var i = 0; i < models.length; i++)
            newItems.push(new LogCat(models[i], {parse: true}));

        this._rawItems = this._rawItems.concat(newItems);
        this.add(this.applyFilter(newItems));
    },

    setFilterItem: function (filterItem, filterItemValue) {
        this._filterData[filterItem] = filterItemValue;

        this.reset();
        this.add(this.applyFilter(this._rawItems));
    },

    clearFilterItem: function (filterItem) {
        delete this._filterData[filterItem];

        this.reset();
        this.add(this.applyFilter(this._rawItems));
    },

    getFilterItem: function (filterItem) {
        return this._filterData[filterItem];
    },

    getItem: function (i) {
        return this.at(i);
    },

    getLength: function () {
        return this.length;
    },

    constructor: function () {
        Backbone.Collection.apply(this, arguments);

        var self = this;
        var socket = io.connect("http://" + window.location.host + "/logcat");

        self.no = 0;
        self._rows = [];
        self._filterData = {};
        self._rawItems = [];

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
            self.addRaw(lcModels, {parse: true});
        });
    }
});
