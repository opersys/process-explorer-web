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

// Static color index.
var _colorIdx = 0;

var ChartView = Backbone.View.extend({

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

        if (this._caption)
            this._caption = $("<span>" + this._caption + "</span>");

        this._canvas = $("<canvas></canvas>");

        if (this._caption) {
            this.$el.append(this._wrapper
                .append(this._caption)
                .append(this._canvas));
            this._canvas
                .attr("height", this._wrapper.height() - this._caption.height())
                .attr("width", this._wrapper.width());
        } else {
            this.$el.append(this._wrapper
                .append(this._canvas));
            this._canvas
                .attr("height", this._wrapper.height())
                .attr("width", this._wrapper.width());
        }

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

    start: function () {
        this._smoothie.start();
    },

    stop: function () {
        this._smoothie.stop();
    },

    serie: function (skey) {
        var serOpts = {};

        serOpts["lineWidth"] = 2;
        serOpts["strokeStyle"] = this._colors[_colorIdx++ % this._colors.length];

        this._series[skey] = {
            serie: new TimeSeries(),
            options: serOpts
        };

        this._smoothie.addTimeSeries(this._series[skey].serie, this._series[skey].options);
    }
});