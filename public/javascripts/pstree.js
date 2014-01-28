"use strict";

var dataView, grid,
    // ProcessCollection object, collection of all process.
    ps = new ProcessCollection(),
    // Global CPU Info
    globalCpu = new CpuInfo(),
    // Individual CPU info
    cpuInfo = new CpuInfoCollection(),
    // Memory info
    memInfo = new MemInfo(),
    // CPU % chart
    cpuChart,
    // Mem % chart
    memChart;

var pidFormatter = function (row, cell, value, columnDef, proc) {
    var spacer = "<span style='display: inline-block; height: 1px; width: " + (15 * proc.get("ui-indent")) + "px'></span>";

    if (_.size(proc.get("ui-children")) > 0) {
        if (proc.get("ui-collapsed"))
            return spacer + " <span class='toggle expand'></span>&nbsp;" + value;
        else
            return spacer + " <span class='toggle collapse'></span>&nbsp;" + value;
    } else
        return spacer + " <span class='toggle'></span>&nbsp;" + value;
};

var memoryFormatter = function (row, cell, value, columnDef, proc) {
    return Humanize.filesizeformat(proc.get(columnDef.field));
};

var percentFormatter = function (row, cell, value, columnDef, proc) {
    return proc.get(columnDef.field).toFixed(1) + "%";
};

// Update a single process item.
function updateProcess(fname, proc, v, opts) {
    var colIdx, rowIdx;

    colIdx = grid.getColumnIndex(fname);
    rowIdx = proc.get("ui-row");

    grid.flashCell(rowIdx, colIdx, 750);
}

var resizeWindow = function () {
    var doResize = false;

    // Change the size properties of the grid so that it fits inside the layout.
    var jqGrid = $("#grid");
    var jqCont = $("#grid-container");

    if (jqGrid.width() != jqCont.width()) {
        jqGrid.width(jqCont.width());
        doResize = true;
    }

    if (jqGrid.height() != jqCont.height()) {
        jqGrid.height(jqCont.height());
        doResize = true;
    }

    if (doResize) {
        grid.resizeCanvas();
        grid.autosizeColumns();
    }
};

var globalProcessUpdate = function () {
    $.ajax("/sysinfo").done(function (sysinfo) {
        var totalDeltaTime;

        console.log("Process list update.");

        globalCpu.set(sysinfo.cpuinfo.global);
        cpuInfo.set(sysinfo.cpuinfo.cpus);
        memInfo.set(sysinfo.meminfo);

        ps.set(sysinfo.ps);

        // Update the CPU graph
        cpuInfo.each(function (ci) {
            cpuChart.serie(ci.get("no"), "userPct", ci);
        });

        memChart.serie("memUsed", "memUsed", memInfo);
        memChart.serie("memShared", "memShared", memInfo);

        ps.each(function (proc) {
            proc.updateCpuPct(globalCpu.get("totalDeltaTime") / globalCpu.get("ncpu"));
            proc.updateMemPct(memInfo.get("memTotal"));
        });

        // Calculate the process tree
        ps.each(function (e) {
            if (e.get("pid") != 0 && e.get("ppid") != undefined) {
                var ppsItem = ps.get(e.get("ppid"));
                var ppsItemCh = ppsItem.get("ui-children");

                // Add the new children to the parent.
                ppsItemCh[e.get("pid")] = e;
                ppsItem.set({"ui-children": ppsItemCh});

                // Set the indent and the order of the current process in the
                // tree view.
                e.set({
                    "ui-indent": ppsItem.get("ui-indent") +  1,
                    "ui-parent": ppsItem
                });
            }
        });

        resizeWindow();
    });
};

var initGrid = function () {
    var columns = [
        { id: "pid", name: "PID", field: "id", formatter: pidFormatter },
        { id: "name", name: "Name", field: "name" },
        { id: "cpuPct", name: "%CPU", field: "cpuPct", formatter: percentFormatter },
        { id: "memPct", name: "%Mem", field: "memPct", formatter: percentFormatter },
        { id: "vss", name: "VSS", field: "vss", formatter: memoryFormatter },
        { id: "rss", name: "RSS", field: "rss", formatter: memoryFormatter  }
    ];

    var options = {
        enableColumnReorder: false,
        formatterFactory: Slickback.BackboneModelFormatterFactory
    };

    grid = new Slick.Grid("#grid", ps, columns, options);

    grid.onClick.subscribe(function (e, args) {
        var proc = grid.getDataItem(args.row);

        if ($(e.target).hasClass("toggle")) {
            if (!proc.get("ui-collapsed"))
                proc.set({"ui-collapsed": true});
            else
                proc.set({"ui-collapsed": false});
        }

        e.stopImmediatePropagation();
    });

    ps.on("change:cpuPct", function (m, v, opts) { updateProcess("cpuPct", m, v, opts); });
    ps.on("change:memPct", function (m, v, opts) { updateProcess("memPct", m, v, opts); });
    ps.on("change:vss", function (m, v, opts) { updateProcess("vss", m, v, opts) });
    ps.on("change:rss", function (m, v, opts) { updateProcess("rss", m, v, opts) });

    ps.onRowCountChanged.subscribe(function () {
        grid.updateRowCount();
        grid.render();
    });

    ps.onRowsChanged.subscribe(function () {
        grid.invalidateAllRows();
        grid.render();
    });

    ps.on("remove", function (proc) {
        console.log("Process " + proc.get("name") + "[" + proc.get("pid") + "] removed.");
    });
};

$(document).ready(function () {
    initGrid();

    cpuChart = new ChartView({
        el: $("#cpuChart"),
        max: 100,
        min: 0,
        delay: 5000
    });
    memChart = new ChartView({
        el: $("#memChart"),
        min: 0,
        delay: 5000
    });

    $(window).resize(resizeWindow);

    // Update the process list right now.
    globalProcessUpdate();

    // The process collection updates every 5 seconds.
    window.setInterval(globalProcessUpdate, 5000);

    // Reformat the window content.
    resizeWindow();
});