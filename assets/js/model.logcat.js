/*
 * Copyright (C) 2014 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var LogCat = Backbone.Model.extend({
    url: "/sysinfo", // NOT USED
    idAttribute: "no",

    // Parse the time logcat format.
    parse: function (input) {
        var ls, tag, spid, pid, msg, tim;

        if (!input || input.length == 0)
            return null;

        ls = input.line.split(":");
        sc = input.line.split(" ");

        // Prevent bad lines.
        if (!ls || ls.length == 1)
            return null;
        if (!sc || sc.length == 1)
            return null;

        tim = sc[1];
        tag = sc[2][0];
        ls.shift(); ls.shift();
        spid = /\(\s*([0-9]*)\s*\)/.exec(ls.shift());
        if (!spid) return null;
        pid = spid[1];
        msg = ls.join(":").trim();

        return {
            no: input.no,
            tim: tim,
            tag: tag,
            pid: pid,
            msg: msg
        };
    }
});

var LogCatLines = Backbone.Collection.extend({
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
        var newItems = [], fnewItems;

        for (var i = 0; i < models.length; i++)
            newItems.push(new LogCat(models[i], {parse: true}));

        this._rawItems = this._rawItems.concat(newItems);
        fnewItems = this.applyFilter(newItems);
        this.add(fnewItems);
        this.trigger("append");
    },

    setFilterItem: function (filterItem, filterItemValue) {
        var fitems;

        this._filterData[filterItem] = filterItemValue;

        if (this.models)
            this.reset();

        fitems = this.applyFilter(this._rawItems);

        if (fitems && fitems.length > 0) {
            this.add(fitems);
            this.trigger("append");
        }
    },

    clearFilterItem: function (filterItem) {
        delete this._filterData[filterItem];

        this.reset();

        this.add(this.applyFilter(this._rawItems));
        this.trigger("append");
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

    clearAll: function () {
        this._rawItems = [];
        this.reset();
    },

    constructor: function () {
        var self = this, socket;

        Backbone.Collection.apply(this, arguments);

        socket = io.connect("http://" + window.location.host + "/logcat");
        self.no = 0;
        self._rows = [];
        self._filterData = {};
        self._rawItems = [];

        this.on("reset", function () {
            this.trigger("empty");
        });

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
