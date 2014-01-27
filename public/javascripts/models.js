var Process = Backbone.Model.extend({
    initialize: function () {
        // Properties specific to the view.
        this.set("ui-children", {});
        this.set("ui-indent", 0);
        this.set("ui-row", 0);
        this.set("ui-collapsed", false);

        // Calculated property.
        this.set("pct", 0);
    },
    idAttribute: "pid",
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

        Backbone.Model.prototype.set.apply(this, arguments);
    },
    updatePct: function (cpuPeriod) {
        if (this.get("deltaTime"))
            this.set("pct", this.get("deltaTime") / cpuPeriod * 100);
        else
            this.set("pct", 0);
    }
});

var CpuInfo = Backbone.Model.extend({
    idAttribute: "no",

    set: function (n, options) {
        var o = this.attributes;
        n.totalDeltaTime =
            (n.utime + n.ntime + n.stime + n.itime + n.iowtime + n.irqtime + n.sirqtime) -
            (o.utime + o.ntime + o.stime + o.itime + o.iowtime + o.irqtime + o.sirqtime);

        n.userPct = ((n.utime + n.ntime) - (o.utime + o.ntime)) * 100  / n.totalDeltaTime;
        n.sysPct = (n.stime - n.stime) * 100 / n.totalDeltaTime;
        n.iowPct = (n.iowtime - o.iowtime) * 100 / n.totalDeltaTime;
        n.irqPct = ((n.irqtime + n.sirqtime) - (o.irqtime + o.sirqtime)) * 100 / n.totalDeltaTime;

        Backbone.Model.prototype.set.apply(this, arguments);
    }
});

var CpuInfoCollection = Backbone.Collection.extend({
    model: CpuInfo,
    url: "/sysinfo" // NOT USED
});

var ProcessCollection = Slickback.Collection.extend({
    model: Process,
    url: "/sysinfo", // NOT USED
    comparator: "ui-row",

    getItem: function (n) {
        return this._rows[n];
    },
    getLength: function () {
        return this._rows.length;
    },
    reindex: function () {
        this._rows = [];

        // Iterate through the collection depth first to attribute row numbers
        var e, r = 0, iin = [this.get(0)];

        while ((e = iin.shift())) {
            if (!e.get("ui-collapsed"))
                iin = _.values(e.get("ui-children")).concat(iin);

            e.set("ui-row", r++);
            this._rows.push(e);
        }

        this.onRowCountChanged.notify();
        this.onRowsChanged.notify();
    },
    constructor: function () {
        Backbone.Collection.apply(this, arguments);

        this.reindex();

        this.on("add", this.reindex);
        this.on("remove", this.reindex);
        this.on("change:ui-collapsed", this.reindex);
    }
});