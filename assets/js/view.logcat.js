/*
 Copyright 2014 Opersys inc.

 Licensed to the Apache Software Foundation (ASF) under one
 or more contributor license agreements.  See the NOTICE file
 distributed with this work for additional information
 regarding copyright ownership.  The ASF licenses this file
 to you under the Apache License, Version 2.0 (the
 "License"); you may not use this file except in compliance
 with the License.  You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing,
 software distributed under the License is distributed on an
 "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 KIND, either express or implied.  See the License for the
 specific language governing permissions and limitations
 under the License.
*/

var LogCatView = Backbone.View.extend({

    _gridColumns: [
        { id: "tag", name: "T", field: "tag", minWidth: 20, maxWidth: 20 },
        { id: "tim", name: "time", field: "tim", midWidth: 60, maxWidth: 90 },
        { id: "pid", name: "PID", field: "pid", minWidth: 50, maxWidth: 50 },
        { id: "msg", name: "Message", field: "msg", minWidth: 300 }
    ],

    _gridOptions: {
        formatterFactory:{
            getFormatter: function (column) {
                return function(row,cell,value,col,data) {
                    return data.get(col.field);
                };
            }
        },

        enableColumnReorder: false,
        enableCellNavigation: true,
        forceFitColumns: true
    },

    clearColors: function () {
        this._grid.removeCellCssStyles("warnings");
        this._grid.removeCellCssStyles("errors");
    },

    applyColors: function () {
        var errorRows = [], warningRows = [];
        var errorCss = {
            "tag": "error", "tim": "error", "pid": "error", "msg": "error"
        };
        var warningCss = {
            "tag": "warning", "tim": "warning", "pid": "warning", "msg": "warning"
        };

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

    addTagFilter: function (tag) {
        var newfi, fi = this._logcat.getFilterItem("tag");

        if (_.isArray(fi))
            newfi = fi.concat([tag]);
        else
            newfi = [tag];

        this._logcat.setFilterItem("tag", newfi);
    },

    clearTagFilter: function (tag) {
        this._logcat.setFilterItem("tag", _.without(this._logcat.getFilterItem("tag"), tag));
    },

    filterByPid: function (pid) {
        if (this._options.getOptionValue("pidFilterMode")) {
            this._logcat.setFilterItem("pid", pid);

            // FIXME: Cheating on the model.
            $("#txtFiltered").text("Filtered for PID: " + pid);
        }
    },

    clearPidFilter: function () {
        this._logcat.clearFilterItem("pid");

        // FIXME: Cheating on the model
        $("#txtFiltered").text("");
    },

    scrollToEnd: function () {
        this._grid.scrollRowToTop(this._logcat.models[this._logcat.models.length - 1].get("no"));
    },

    autoResize: function () {
        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        this._logcat = opts.logcat;
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

        this._grid = new Slick.Grid(this.$el, this._logcat, this._gridColumns, this._gridOptions);

        this._logcat.on("add", $.debounce(250,
            function (m) {
                self._grid.scrollRowToTop(m.get("no"));
            }
        ));

        this._logcat.on("append", function () {
            self._grid.updateRowCount();
            self._grid.render();

            // Options
            if (self._options.getOptionValue("rowColorMode"))
                self.applyColors();
        });

        this._logcat.on("remove", function () {
            self._grid.updateRowCount();
            self._grid.render();
        });

        this._logcat.on("empty", function () {
            self._grid.updateRowCount();
            self._grid.render();
        });

        // Options
        if (this._options.getOptionValue("rowColorMode"))
            this.applyColors();

        this._grid.setSelectionModel(new Slick.RowSelectionModel());

        this._grid.resizeCanvas();
    }
});