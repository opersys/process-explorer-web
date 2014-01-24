var ChartView = Backbone.View.extend({
    render: function () {
        this.$el.append($("<canvas id='graphCanvas'></canvas>")
            .attr("height", 50)
            .attr("width", 200));

        this._smoothie = new SmoothieChart({
            millisPerPixel: 90,
            maxValue: 100,
            minValue: 0
        });
        this._smoothie.streamTo(document.getElementById("graphCanvas"), 5000);
    },

    _series: {},

    initialize: function () {
        this.render();
    },

    setCpu: function (ci) {
        var self = this;

        if (!self._series[ci.get("no")]) {
            self._series[ci.get("no")] = new TimeSeries();
            self._smoothie.addTimeSeries(self._series[ci.get("no")],
                { lineWidth: 2, strokeStyle:'#00ff00'});

            cpuInfo.on("change:userPct", function (m) {
                self._series[m.get("no")].append(new Date().getTime(), m.get("userPct"));
            });
            this._smoothie.streamTo(document.getElementById("graphCanvas"), 5000);
        }
    }
});