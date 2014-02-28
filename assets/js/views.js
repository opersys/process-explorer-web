"use strict";

var LogCatView = Backbone.View.extend({

    doApplyColors: false,

    _columns: [
        { id: "tag", name: "T", field: "tag", minWidth: 20, maxWidth: 20 },
        { id: "pid", name: "PID", field: "pid", minWidth: 50, maxWidth: 50 },
        { id: "msg", name: "Message", field: "msg", minWidth: 300 }
    ],

    _options: {
        enableColumnReorder: false,
        formatterFactory: Slickback.BackboneModelFormatterFactory,
        enableCellNavigation: true,
        forceFitColumns: true
    },

    clearColors: function () {
        this._grid.removeCellCssStyles("warnings");
        this._grid.removeCellCssStyles("errors");

        this.doApplyColors = false
    },

    applyColors: function () {
        var errorRows = [], warningRows = [];
        var errorCss = {
            "tag": "error", "pid": "error", "msg": "error"
        };
        var warningCss = {
            "tag": "warning", "pid": "warning", "msg": "warning"
        };

        //
        for (var i = 0; i < this._grid.getDataLength(); i++) {
            var row = this._grid.getDataItem(i);
            if (row.get("tag") == "E")
                errorRows[i] = errorCss;
            else if (row.get("tag") == "W")
                warningRows[i] = warningCss;
        }

        this._grid.setCellCssStyles("warnings", warningRows);
        this._grid.setCellCssStyles("errors", errorRows);

        this.doApplyColors = true;
    },

    _onPsRowCountChanged: function () {
        var self = this;

        this._grid.updateRowCount();

        $.debounce(500, function () {
        //    self.autoResize();
        //   self._grid.render();
            if (self.doApplyColors)
                self.applyColors();
        })();
    },

    _onPsRowsChanged: function () {
        var self = this;

        this._grid.invalidate();

        //$.debounce(500, function () {
        //    self.autoResize();
        //    //self._grid.render();
        //})();
    },

    autoResize: function () {
        if ($(this._grid.getCanvasNode()).width() == this.$el.width() &&
            $(this._grid.getCanvasNode()).height() == this.$el.height())
            return;

        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        var self = this;
        var errorCss = {
            "tag": "error", "pid": "error", "msg": "error"
        };
        var warningCss = {
            "tag": "warning", "pid": "warning", "msg": "warning"
        };

        this._grid = new Slick.Grid(this.$el, opts.logcat, this._columns, this._options);
        this._logcat = opts.logcat;

        this._logcat.on("add", $.debounce(250,
            function (m) {
                self._grid.scrollRowToTop(m.get("no"));
            }
        ));

        // FIXME: SlickBack style events, we don't really need that.
        this._logcat.onRowCountChanged.subscribe(function () {
            self._onPsRowCountChanged.apply(self);
        });
        this._logcat.onRowsChanged.subscribe(function () {
            self._onPsRowsChanged.apply(self)
        });

        this._grid.setSelectionModel(new Slick.RowSelectionModel());

        this.render();
    },

    render: function () {
        this._grid.resizeCanvas();
    }
});

var ProcessView = Backbone.View.extend({

    _nameFormatter: function (row, cell, value, columnDef, proc) {
        var v = proc.get(columnDef.field);

        if (!ps.treeView)
            return this._grid.getOptions().defaultFormatter(row, cell, v, columnDef, proc);

        var spacer = "<span style='display: inline-block; height: 1px; width: "
            + (15 * proc.get("ui-indent")) + "px'></span>";

        if (_.size(proc.get("ui-children")) > 0) {
            if (proc.get("ui-collapsed"))
                return spacer + " <span class='toggle expand'></span>&nbsp;" + v;
            else
                return spacer + " <span class='toggle collapse'></span>&nbsp;" + v;
        } else
            return spacer + " <span class='toggle'></span>&nbsp;" + v;
    },

    _memoryFormatter: function (row, cell, value, columnDef, proc) {
        return Humanize.filesizeformat(proc.get(columnDef.field));
    },

    _percentFormatter: function (row, cell, value, columnDef, proc) {
        return proc.get(columnDef.field).toFixed(1) + "%";
    },

    _timeFormatter: function (row, cell, value, columnDef, proc) {
        var v = proc.get(columnDef.field);

        if (!v || v == 0) return "00:00";

        var m = moment.utc(v, "X");
        if (m.hours() == 0)
            return m.format("mm:ss");
        else
            return m.format("hh[h]mm");
    },

    _columns: [
        { id: "name", name: "Name", field: "name" },
        { id: "pid", name: "PID", field: "pid", minWidth: 30, maxWidth: 50 },
        { id: "state", name: "S", field: "state", minWidth: 15, maxWidth: 20 },
        { id: "prio", name: "PRI", field: "prio", minWidth: 20, maxWidth: 30 },
        { id: "cpuPct", name: "%CPU", field: "cpuPct", minWidth: 40, maxWidth: 60, sortable: true },
        { id: "memPct", name: "%Mem", field: "memPct", minWidth: 40, maxWidth: 60, sortable: true },
        { id: "vss", name: "VSS", field: "vss", minWidth: 60, maxWidth: 80, sortable: true },
        { id: "rss", name: "RSS", field: "rss", minWidth: 60, maxWidth: 80, sortable: true },
        { id: "shm", name: "SHM", field: "shm", minwidth: 60, maxWidth: 80, sortable: true },
        { id: "time", name: "Time", field: "time", minWidth: 60, maxWidth: 80, sortable: true },
        { id: "cmdline", name: "Command line", field: "cmdline", minWidth: 80 }
    ],

    _options: {
        enableColumnReorder: false,
        formatterFactory: Slickback.BackboneModelFormatterFactory,
        enableCellNavigation: true,
        forceFitColumns: true
    },

    _updateProcess: function (fname, proc, v, opts) {
        var colIdx, rowIdx;

        colIdx = this._grid.getColumnIndex(fname);
        rowIdx = proc.get("ui-row");

        this._grid.flashCell(rowIdx, colIdx, 750);
    },

    _onGridClick: function (e, args) {
        var proc = this._grid.getDataItem(args.row);

        if ($(e.target).hasClass("toggle")) {
            if (!proc.get("ui-collapsed"))
                proc.set({"ui-collapsed": true});
            else
                proc.set({"ui-collapsed": false});
        }
    },

    _onGridSelectedRowsChange: function (e, args) {
        var sel = this._grid.getActiveCell();

        if (sel)
            this.trigger("onProcessSelected", this._grid.getDataItem(sel.row));
    },

    _onGridSort: function (e, args) {
        this._ps.sortPs(args.sortCol.field, args.sortAsc);
        this._grid.invalidate();
        this._grid.render();
    },

    _onPsRowCountChanged: function () {
        var self = this;

        this._grid.updateRowCount();

        /*$.debounce(500, function () {
            self.autoResize();
            self._grid.render();
        })();(*/
    },

    _onPsRowsChanged: function () {
        var self = this;

        this._grid.invalidate();

        /*$.debounce(500, function () {
            self.autoResize();
            self._grid.render();
        })();*/
    },

    autoResize: function () {
        if ($(this._grid.getCanvasNode()).width() == this.$el.innerWidth() &&
            $(this._grid.getCanvasNode()).height() == this.$el.innerHeight())
            return;

        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        var self = this;

        // Create and initialize the grid as per:
        // https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example-explicit-initialization.html
        this._grid = new Slick.Grid(this.$el, ps, this._columns, this._options);

        // Initialize the column formatters and call the formatters
        // in the context of the view.

        this._columns[this._grid.getColumnIndex("name")].formatter = function () {
            return self._nameFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("cpuPct")].formatter = function () {
            return self._percentFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("memPct")].formatter = function () {
            return self._percentFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("rss")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("vss")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("shm")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._columns[this._grid.getColumnIndex("time")].formatter = function () {
            return self._timeFormatter.apply(self, arguments);
        };

        this._grid.onClick.subscribe(function (e, args) {
            self._onGridClick.apply(self, [e, args]);
        });
        this._grid.onSort.subscribe(function (e, args) {
            self._onGridSort.apply(self, [e, args]);
        });
        this._grid.onSelectedRowsChanged.subscribe(function (e, args) {
            self._onGridSelectedRowsChange(self, [e, args]);
        });

        this._ps = opts.ps;

        //this._cont.on("resize", this._onResize());

        this._ps.on("change:cpuPct", function (m, v, opts) {
            self._updateProcess("cpuPct", m, v, opts);
        });
        this._ps.on("change:memPct", function (m, v, opts) {
            self._updateProcess("memPct", m, v, opts);
        });
        this._ps.on("change:vss", function (m, v, opts) {
            self._updateProcess("vss", m, v, opts)
        });
        this._ps.on("change:rss", function (m, v, opts) { 
            self._updateProcess("rss", m, v, opts)
        });

        // FIXME: SlickBack style events, we don't really need that.
        this._ps.onRowCountChanged.subscribe(function () {
            self._onPsRowCountChanged.apply(self);
        });
        this._ps.onRowsChanged.subscribe(function () {
            self._onPsRowsChanged.apply(self)
        });

        this._grid.setSelectionModel(new Slick.RowSelectionModel());

        this.render();
    },

    render: function () {
        this._grid.resizeCanvas();
    }
});

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
        this._max = opts.max;
        this._min = opts.min;
        this._field = opts.field;
        this._key = opts.key;
        this._model = opts.model;

        this.$el.css("display", "inline-block");
        this.$el.width(opts.width);
        this.$el.height(opts.height);

        this.render();
    },

    render: function () {
        this._canvas = $("<canvas></canvas>")
            .attr("height", this.$el.height())
            .attr("width", this.$el.width());

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