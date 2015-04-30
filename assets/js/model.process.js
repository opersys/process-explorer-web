/*
 * Copyright (C) 2014-2015, Opersys inc.
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

var Process = Backbone.Model.extend({
    idAttribute: "pid",

    initialize: function () {
        // Properties specific to the view.
        this.attributes["ui-children"] = {};
        this.attributes["ui-indent"] = 0;
        this.attributes["ui-row"] = 0;
        this.attributes["ui-collapsed"] = false;
        this.attributes["ui-dead"] = false;

        // Calculated.
        this.attributes["cpuPct"] = 0;
        this.attributes["memPct"] = 0;
        //this.attributes["timestr"] = "00:00";
    },

    set: function (n, v) {
        var o = this.attributes;

        if (n == "utime" && o.utime)
            n.deltaUtime = v - o.utime;
        if (n.hasOwnProperty("utime") && o.utime)
            n.deltaUtime = n.utime - o.utime;

        if (n == "stime" && o.stime)
            n.deltaStime = v - o.stime;
        if (n.hasOwnProperty("stime") && o.stime)
            n.deltaStime = n.stime - o.stime;

        if (!n.deltaStime) n.deltaStime = 0;
        if (!n.deltaUtime) n.deltaUtime = 0;

        if (n.deltaUtime >= 0 && n.deltaStime >= 0)
            n.deltaTime = n.deltaUtime + n.deltaStime;

        // Hide the hours if the time is under 0, keeping the time compact.
        if (n.time) {
            var m = moment.utc(n.time, "X");
            if (m.hours() == 0)
                n.timestr = m.format("mm:ss");
            else
                n.timestr = m.format("hh[h]mm");
        }

        Backbone.Model.prototype.set.apply(this, arguments);
    },

    updateCpuPct: function (cpuPeriod) {
        if (this.get("deltaTime"))
            this.set("cpuPct", this.get("deltaTime") / cpuPeriod * 100);
        else
            this.set("cpuPct", 0);
    },

    updateMemPct: function (totalMem) {
        if (this.get("rss"))
            this.set("memPct", this.get("rss") / totalMem * 100);
        else
            this.set("memPct", 0);
    }
});

var ProcessCollection = Backbone.Collection.extend({
    model: Process,
    url: "/sysinfo", // NOT USED
    comparator: "ui-row",
    _rows: [],

    set: function () {
        var self = this;

        Backbone.Collection.prototype.set.apply(this, arguments);

        setTimeout(function () {
            self.reindex.call(self);
        }, 200);
    },

    _uirow_getItem: function (n) {
        return this._rows[n];
    },

    _uirow_getLength: function () {
        return this._rows.length;
    },

    _comparator_reindex: function () {},

    _uirow_reindex: function () {
        this._rows = [];

        // Iterate through the collection depth first to attribute row numbers
        var e, r = 0, iin = [this.get(0)];

        while ((e = iin.shift())) {
            if (!e.get("ui-collapsed"))
                iin = _.values(e.get("ui-children")).concat(iin);

            e.set("ui-row", r++);
            this._rows.push(e);
        }
    },

    sortPs: function (stype, isAsc) {
        if (stype == "ui-row") {
            this.reindex = this._uirow_reindex;
            this.getItem = this._uirow_getItem;
            this.getLength = this._uirow_getLength;
            this.treeView = true;
        }
        else {
            this.comparator = function (m) {
                return (isAsc ? 1 : -1) * m.get(stype);
            };
            this.sort();

            this.reindex = this._comparator_reindex;
            this.getItem = function (i) {
                return this.models[i];
            };
            this.getLength = function () {
                return this.models.length;
            };
            this.treeView = false;
         }
    },

    constructor: function () {
        Backbone.Collection.apply(this, arguments);

        this.reindex = this._uirow_reindex;
        this.getItem = this._uirow_getItem;
        this.getLength = this._uirow_getLength;
        this.treeView = true;

        this.on("change:ui-collapsed", function (m) {
            this.reindex();

            if (m && !m.get("ui-collapsed"))
                this.trigger("add");
            else
                this.trigger("remove");
        });
    }
});
