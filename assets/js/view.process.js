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

var ProcessView = Backbone.View.extend({

    _nameFormatter: function (row, cell, value, columnDef, proc) {
        var pkg, v, isPkg;

        if (proc.get("cmdline") && proc.get("cmdline") != "")
            pkg = proc.get("cmdline").split(" ")[0];

        isPkg = pkg && pkg.indexOf(".") != -1 && pkg.indexOf("/")  == -1;

        if (isPkg)
            v = pkg;
        else
            v = proc.get(columnDef.field);

        if (!this._ps.treeView)
            return this._grid.getOptions().defaultFormatter(row, cell, v, columnDef, proc);

        var spacer = "<span style='display: inline-block; height: 1px; width: "
            + (15 * proc.get("ui-indent") - 1) + "px'></span>";

        var img = "<span style='display: inline-block; height: 15px; width: 15px; margin-right: 3px;"
            + "background-size: 15px 15px;";

        if (isPkg)
            img += "background-image: url(\"http://" + window.location.host + "/icon/" + pkg + "\");";

        img += "'></span>";

        if (_.size(proc.get("ui-children")) > 0) {
            if (proc.get("ui-collapsed"))
                return spacer + " <span class='toggle expand'></span>&nbsp;" + img + v;
            else
                return spacer + " <span class='toggle collapse'></span>&nbsp;" + img + v;
        } else
            return spacer + " <span class='toggle'></span>&nbsp;" + img + v;
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
        { id: "pid", name: "PID", field: "pid", minWidth: 30, maxWidth: 50,
            toolTip: "Process Id" },
        { id: "state", name: "S", field: "state", minWidth: 15, maxWidth: 20,
            toolTip: "Status\nD = uninterruptible sleep\nR = running\nS = sleeping\nT = traced or stopped\nZ = zombie\n" },
        { id: "prio", name: "PRI", field: "prio", minWidth: 20, maxWidth: 30,
            toolTip: "Priority" },
        { id: "cpuPct", name: "%CPU", field: "cpuPct", minWidth: 40, maxWidth: 60, sortable: true,
            toolTip: "CPU Usage\nThe CPU time divided by the time the process has been running." },
        { id: "memPct", name: "%Mem", field: "memPct", minWidth: 40, maxWidth: 60, sortable: true,
            toolTip: "Memory Usage\nThe ratio of the RSS to the total memory." },
        { id: "vss", name: "VSS", field: "vss", minWidth: 60, maxWidth: 80, sortable: true,
            toolTip: "Virtual Set Size\nThe total memory size a process might use." },
        { id: "rss", name: "RSS", field: "rss", minWidth: 60, maxWidth: 80, sortable: true,
            toolTip: "Resident Set Size\nThe non-swapped physical memory used." },
        { id: "shm", name: "SHM", field: "shm", minwidth: 60, maxWidth: 80, sortable: true,
            toolTip: "Shared Memory Size\nThe memory that could be potentially shared with other processes." },
        { id: "time", name: "Time", field: "time", minWidth: 60, maxWidth: 80, sortable: true ,
            toolTip: "CPU Time"},
        { id: "cmdline", name: "Command line", field: "cmdline", minWidth: 80 }
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

    applyColors: function () {
        var deadRows = {};
        var deadCss = {
            "name": "dead", "pid": "dead", "state": "dead", "prio": "dead", "cpuPct": "dead",
            "memPct": "dead", "vss": "dead", "rss": "dead", "shm": "dead", "time": "dead",
            "cmdline": "dead"
        };

        for (var i = 0; i < this._grid.getDataLength(); i++) {
            var row = this._grid.getDataItem(i);
            if (row.get("ui-dead"))
                deadRows[i] = deadCss;
        }

        this._grid.setCellCssStyles("dead", deadRows);
    },

    _updateProcess: function (fname, proc, v, opts) {
        var colIdx, rowIdx, self = this;

        colIdx = this._grid.getColumnIndex(fname);
        rowIdx = proc.get("ui-row");

        setTimeout(function () {
            self._grid.flashCell(rowIdx, colIdx, 750);
        }, 100);
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

    _sendSignal: function (proc, signal) {
        var name = proc.get("name");
        var pid = proc.get("pid");

        console.log("_sendSignal(" + pid + "," + signal + ")");

        $.ajax({
            url: "/os/kill",
            type: "post",
            data: {pid: pid, signal: signal},
        })
        .done(function(data) {
            if (data.status == "success") {
                // Successfully sent the requested signal to the pid
                $.notify("Sent " + signal + " to " + name + " (" + pid + ")", "success");
            }
            else if (data.status == "error") {
                // An error occured
                error_msg = data.error + " : "

                switch (data.error) {
                    case "EPERM":
                        error_msg += "operation not permitted";
                        break;
                    case "ESRCH":
                        error_msg += "no such process"
                        break;
                    default:
                        error_msg += "unknown error"
                }

                $.notify("Error sending " + signal + " to " + name + " (" + pid + "):\n" + error_msg, "error");
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            // The AJAX query failed somehow
            $.notify("Error sending " + signal + " to " + name + " (" + pid + "):\n" + errorThrown, "error");
        });

        return true;
    },

    _displaySignalForm: function(proc) {
        var self = this;

        var signal_list = [
            {id: 'SIGHUP', text: 'SIGHUP (1) - Hangup detected on controlling terminal or death of controlling process'},
            {id: 'SIGINT', text: 'SIGINT (2) - Interrupt from keyboard'},
            {id: 'SIGQUIT', text: 'SIGQUIT (3) - Quit from keyboard'},
            {id: 'SIGILL', text: 'SIGILL (4) - Illegal Instruction'},
            {id: 'SIGABRT', text: 'SIGABRT (6) - Abort signal from abort(3)'},
            {id: 'SIGFPE', text: 'SIGFPE (8) - Floating point exception'},
            {id: 'SIGKILL', text: 'SIGKILL (9) - Kill signal'},
            {id: 'SIGSEGV', text: 'SIGSEGV (11) - Invalid memory reference'},
            {id: 'SIGPIPE', text: 'SIGPIPE (13) - Broken pipe: write to pipe with no readers'},
            {id: 'SIGALRM', text: 'SIGALRM (14) - Timer signal from alarm(2)'},
            {id: 'SIGTERM', text: 'SIGTERM (15) - Termination signal'},
            {id: 'SIGUSR1', text: 'SIGUSR1 (10) - User-defined signal 1'},
            {id: 'SIGUSR2', text: 'SIGUSR2 (12) - User-defined signal 2'},
            {id: 'SIGHLD', text: 'SIGHLD (17) - Child stopped or terminated'},
            {id: 'SIGCONT', text: 'SIGCONT (18) - Continue if stopped'},
            {id: 'SIGSTOP', text: 'SIGSTOP (19) - Stop process'},
            {id: 'SIGSTP', text: 'SIGTSTP (20) - Stop typed at terminal'},
            {id: 'SIGTTIN', text: 'SIGTTIN (21) - Terminal input for background process'},
            {id: 'SIGTTOU', text: 'SIGTTOU (22) - Terminal output for background process'}
        ];

        if (!w2ui.sendSignalForm) {
            $().w2form({
                name: 'sendSignalForm',
                url: '#',
                fields: [
                    { field: 'process', type: 'text', required: true, html: { caption: 'Process', attr: 'style="width: 300px" readonly'} },
                    { field: 'signal',
                        type: 'list',
                        options: {match: 'contains', items: signal_list },
                        required: true,
                        html: { caption: 'Signal', attr: 'style="width: 300px"' } },
                ],
                actions: {
                    "cancel": function () { w2popup.close(); },
                    "send": function () {
                        // validate() returns an array of errors
                        if (this.validate().length == 0) {
                            self._sendSignal(proc, this.record.signal.id);
                            w2popup.close();
                        }
                    },
                }
            });

        }

        w2ui.sendSignalForm.record = {
            process    : proc.get("name") + " (" + proc.get("pid") + ")",
            signal     : '',
        };

        w2ui.sendSignalForm.refresh();

        $().w2popup('open', {
            title   : 'Send a signal...',
            body    : '<div id="form" style="width: 100%; height: 100%;"></div>',
            style   : 'padding: 15px 0px 0px 0px',
            width   : 500,
            height  : 300,
            showMax : true,
            onToggle: function (event) {
                $(w2ui.sendSignalForm.box).hide();
                event.onComplete = function () {
                    $(w2ui.sendSignalForm.box).show();
                    w2ui.sendSignalForm.resize();
                }
            },
            onOpen: function (event) {
                event.onComplete = function () {
                    $('#w2ui-popup #form').w2render('sendSignalForm');
                }
            }
        });
    },

    _onGridContextMenu: function (e, args) {
        var self = this;

        // Prevent the default context menu...
        e.preventDefault();

        // SlickGrid doesn't pass the cell in the 'onContextMenu' event arguments
        // unlike the onClick event.
        var cell = this._grid.getCellFromEvent(e);
        var proc = this._grid.getDataItem(cell.row);

        // Highlight the newly right clicked row
        this._grid.setActiveCell(cell.row, cell.cell);

        // ... and display our own context menu
        $(e.target).w2menu({
            items: [
                {
                    id: 'signal-sigterm', text: 'Terminate process (SIGTERM)',
                    icon: "icon-remove",
                    onSelect: function (e) { return self._sendSignal(proc, "SIGTERM"); },
                },
                {
                    id: 'signal-sigkill', text: 'Kill process (SIGKILL)',
                    icon: "icon-ban-circle",
                    onSelect: function(e) { return self._sendSignal(proc, "SIGKILL"); },
                },
                {
                    id: 'signall-sighup', text: 'Restart process (SIGHUP)',
                    icon: "icon-refresh",
                    onSelect: function(e) { return self._sendSignal(proc, "SIGHUP"); },
                },
                { id: 'separator', text: '--'},
                {
                    id: 'signal-sigstop', text: 'Pause process (SIGSTOP)',
                    icon: "icon-pause",
                    onSelect: function(e) { return self._sendSignal(proc, "SIGSTOP"); },
                },
                {
                    id: 'signal-sigcont',
                    text: 'Continue process (SIGCONT)',
                    icon: "icon-play",
                    onSelect: function(e) { return self._sendSignal(proc, "SIGCONT"); },
                },
                { id: 'separator', text: '--'},
                {
                    id: 'signal-send', text: 'Send signal',
                    onSelect: function(e) { return self._displaySignalForm(proc); },
                },
                { id: 'separator', text: '--' },
                {
                    id: 'details', text: 'Details', icon: "icon-info",
                    onSelect: function(e) {
                        self.trigger("onContextMenuDetailsClick");
                    },
                },
            ],
            onSelect: function (e) {
                if ('onSelect' in e.item && typeof e.item.onSelect === 'function') {
                    e.item.onSelect(e)
                }
            }
        });
    },

    getSelectedProcess: function () {
        var sel = this._grid.getActiveCell();
        if (sel)
            return this._grid.getDataItem(sel.row);
        else
            return null;
    },

    _onGridSort: function (e, args) {
        var colText, colIdx;

        this._ps.sortPs(args.sortCol.field, args.sortAsc);
        this._grid.invalidate();
        this._grid.render();

        colIdx = this._grid.getColumnIndex(args.sortCol.field);
        colText = this._grid.getColumns()[colIdx].name;
        this.trigger("sort", args.sortCol.field, colText);
    },

    treeSort: function () {
        this._ps.sortPs("ui-row");
        this._grid.invalidate();
        this._grid.render();
    },

    autoResize: function () {
        this._grid.resizeCanvas();
        this._grid.autosizeColumns();
    },

    initialize: function (opts) {
        this._ps = opts.ps;
        this._options = opts.options;
        this._toggleProcessDetails = opts.toggleProcessDetails;

        this.render();
    },

    render: function () {
        var self = this;

        // Create and initialize the grid as per:
        // https://github.com/mleibman/SlickGrid/blob/gh-pages/examples/example-explicit-initialization.html
        this._grid = new Slick.Grid(this.$el, this._ps, this._gridColumns, this._gridOptions);

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
        this._grid.onContextMenu.subscribe(function (e, args) {
            self._onGridContextMenu.apply(self, [e, args]);
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

        this._ps.on("add", function () {
            this.reindex();

            self._grid.invalidate();
            self._grid.updateRowCount();

            self._grid.render();
            self.applyColors();
        });

        this._ps.on("remove", function (rmModel) {
            this.reindex();

            self._grid.invalidate();
            self._grid.updateRowCount();

            self._grid.render();
            self.applyColors();
        });

        this._ps.on("change", function (m) {
            self._grid.invalidateRow(m.get("ui-row"));

            self._grid.render();
            self.applyColors();
        });

        this._grid.setSelectionModel(new Slick.RowSelectionModel());

        this._grid.resizeCanvas();
    }
});

