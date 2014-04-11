var ChartView = Backbone.View.extend({

    _colorIdx: 0,
    _colors: [
        "#ff0000", "#00ffff", "#0000ff", "#0000a0", "#add8e6",
        "#800080", "#ffff00", "#00ff00", "#ff00ff", "#ffffff",
        "#c0c0c0", "#808080", "#000000", "#ffa500", "#a52a2a",
        "#800000", "#008000", "#808000"
    ],

    initialize: function (opts) {
        this._delay = opts.delay;
        this._max = opts.max;
        this._min = opts.min;
        this._field = opts.field;
        this._key = opts.key;
        this._model = opts.model;
        this._caption = opts.caption;
        this._width = opts.width;
        this._height = opts.height;
        this._series = {};

        this.$el.css("display", "inline-block");
        //this.$el.width(opts.width);
        //this.$el.height(opts.height);

        this.render();
    },

    setRange: function (range) {
        this._min = range.min;
        this._max = range.max;
    },

    getRange: function () {
        return {
            min: this._min,
            max: this._max
        }
    },

    resetDelay: function (newDelay) {
        var self = this;

        if (this._delay == newDelay)
            return;

        this._delay = newDelay;

        this._smoothie.stop();
        this._smoothie = new SmoothieChart({
            millisPerPixel: 90,
            grid: {
                verticalSections: 5
            },
            yRangeFunction: function (range) {
                return {min: self._min, max: self._max};
            }
        });
        this._smoothie.streamTo(this._canvas[0], this._delay);

        _.each(_.keys(this._series), function (skey) {
            self._series[skey].serie.data = [];
            self._smoothie.addTimeSeries(self._series[skey].serie, self._series[skey].options);
        });
    },

    render: function () {
        var self = this;

        this._wrapper = $("<div></div>")
            .addClass("chartView")
            .width(this._width)
            .height(this._height);
        this._caption = $("<span>" + this._caption + "</span>");
        this._canvas = $("<canvas></canvas>");

        this.$el.append(this._wrapper
            .append(this._caption)
            .append(this._canvas));

        this._canvas
            .attr("height", this._wrapper.height() - this._caption.height())
            .attr("width", this._wrapper.width());

        this._smoothie = new SmoothieChart({
            millisPerPixel: 90,
            grid: {
                verticalSections: 5
            },
            yRangeFunction: function (range) {
                return {min: self._min, max: self._max};
            }
        });

        this._smoothie.streamTo(this._canvas[0], this._delay);
    },

    addSerieData: function (skey, val) {
        if (this.hasSerie(skey))
            this._series[skey].serie.append(new Date().getTime(), val);
    },

    hasSerie: function (skey) {
        return _.has(this._series, skey);
    },

    serie: function (skey) {
        var serOpts = {};

        serOpts["lineWidth"] = 2;
        serOpts["strokeStyle"] = this._colors[this._colorIdx++];

        this._series[skey] = {
            serie: new TimeSeries(),
            options: serOpts
        };

        this._smoothie.addTimeSeries(this._series[skey].serie, this._series[skey].options);
    }
});