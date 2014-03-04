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