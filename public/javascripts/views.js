var ChartView = Backbone.View.extend({

    _colorIdx: 0,
    _colors: [
        "#ff0000", "#00ffff", "#0000ff", "#0000a0", "#add8e6",
        "#800080", "#ffff00", "#00ff00", "#ff00ff", "#ffffff",
        "#c0c0c0", "#808080", "#000000", "#ffa500", "#a52a2a",
        "#800000", "#008000", "#808000"
    ],
    _series: {},

    initialize: function (opts) {
        this._delay = opts.delay;
        this._max = opts.max
        this._min = opts.min;
        this._field = opts.field;
        this._key = opts.key;
        this._model = opts.model;

        // On resize.
        this.$el.on("resize", function () {
            this.render();
        });

        this.render();
    },

    render: function () {
        this._canvas = $("<canvas></canvas>")
            .attr("height", this.$el.height())
            .attr("width", this.$el.width())
            .uniqueId()

        this.$el.append(this._canvas);

        this._smoothie = new SmoothieChart({
            millisPerPixel: 90,
            maxValue: this._max,
            minValue: this._min
        });

        this._smoothie.streamTo(this._canvas[0], this._delay);
    },

    serie: function (skey, field, m) {
        var self = this;

        if (!self._series[skey]) {
            self._series[skey] = new TimeSeries();
            self._smoothie.addTimeSeries(self._series[skey], {
                lineWidth: 2,
                strokeStyle: this._colors[this._colorIdx++]
            });

            m.on("change:" + field, function (m) {
                self._series[skey].append(new Date().getTime(), m.get(field));
            });

            //this._smoothie.streamTo(this._canvas.one(), this._delay);
        }
    }
});