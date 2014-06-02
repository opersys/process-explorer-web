/*
 * Copyright (C) 2014 Opersys inc.
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

var FileSystemView = Backbone.View.extend({

    _gridColumns: [
        { id: "path", name: "Path", field: "path" },
        { id: "uid", name: "UID", field: "uid" },
        { id: "gid", name: "GID", field: "gid" }
    ],

    _gridOptions: {
        formatterFactory:{
            getFormatter: function () {
                return function(row, cell, value, col, data) {
                    return data.get(col.field);
                };
            }
        },

        enableColumnReorder: false,
        enableCellNavigation: true,
        forceFitColumns: true
    },

    initialize: function (opts) {
        this._fs = opts.fs;
        this._options = opts.options;

        this.render();
    },

    autoResize: function () {
        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    render: function () {
        var self = this;

        this._grid = new Slick.Grid(this.$el, this._fs, this._gridColumns, this._gridOptions);

        this._fs.on("add", function () {
            self._grid.invalidate();
            self._grid.updateRowCount();

            self._grid.render();
        });

        this._fs.on("remove", function () {
            self._grid.invalidate();
            self._grid.updateRowCount();

            self._grid.render();
        });

        this._fs.fetch();
    }
});