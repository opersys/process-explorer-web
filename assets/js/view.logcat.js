var LogCatView = Backbone.View.extend({

    _gridColumns: [
        { id: "tag", name: "T", field: "tag", minWidth: 20, maxWidth: 20 },
        { id: "pid", name: "PID", field: "pid", minWidth: 50, maxWidth: 50 },
        { id: "msg", name: "Message", field: "msg", minWidth: 300 }
    ],

    _gridOptions: {
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
    },

    _onPsRowCountChanged: function () {
        var self = this;

        this._grid.updateRowCount();

        $.debounce(500, function () {
            //    self.autoResize();
            //   self._grid.render();
            if (options.getOptionValue("rowColorMode"))
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
        /*if ($(this._grid.getCanvasNode()).width() == this.$el.width() &&
         $(this._grid.getCanvasNode()).height() == this.$el.height())
         return;*/

        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        this._logcat = opts.logcat;
        this._options = opts.options;

        this.render();
    },

    render: function () {
        var self = this;
        var errorCss = {
            "tag": "error", "pid": "error", "msg": "error"
        };
        var warningCss = {
            "tag": "warning", "pid": "warning", "msg": "warning"
        };

        this._grid = new Slick.Grid(this.$el, this._logcat, this._gridColumns, this._gridOptions);

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

        // Options
        if (this._options.getOptionValue("rowColorMode"))
            this.applyColors();

        this._grid.setSelectionModel(new Slick.RowSelectionModel());

        this._grid.resizeCanvas();
    }
});