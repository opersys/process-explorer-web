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

    _gridColumns: [
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

    _gridOptions: {
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
    },

    _onPsRowsChanged: function () {
        var self = this;
        this._grid.invalidate();
    },

    autoResize: function () {
        /*if ($(this._grid.getCanvasNode()).width() == this.$el.innerWidth() &&
            $(this._grid.getCanvasNode()).height() == this.$el.innerHeight())
            return;*/

        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        this._ps = opts.ps;
        this._options = opts.options;

        this._options.getOption("rowColorMode").on("change", function () {
            if (options.getOptionValue("rowColorMode"))
                logCatView.applyColors();
            else
                logCatView.clearColors();
        });

        this.render();
    },

    render: function () {
        var self = this;

        // Create and initialize the grid as per:
        // https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example-explicit-initialization.html
        this._grid = new Slick.Grid(this.$el, ps, this._gridColumns, this._gridOptions);

        // Initialize the column formatters and call the formatters
        // in the context of the view.

        this._gridColumns[this._grid.getColumnIndex("name")].formatter = function () {
            return self._nameFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("cpuPct")].formatter = function () {
            return self._percentFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("memPct")].formatter = function () {
            return self._percentFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("rss")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("vss")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("shm")].formatter = function () {
            return self._memoryFormatter.apply(self, arguments);
        };

        this._gridColumns[this._grid.getColumnIndex("time")].formatter = function () {
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

        this._grid.resizeCanvas();
    }
});

