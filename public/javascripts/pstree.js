"use strict";

var dataView, grid,
    // Process models layed out in a tree structure,
    psTree,
    // ProcessColl object, collection of all process.
    ps = new ProcessCollection(), oldPs,
    // CPU Info
    sysCpu = new SystemCpuInfo();

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
    return Slick.Formatters.PercentCompleteBar(row, cell, proc.get(columnDef.field), proc);
};

var treeFilter = function (item) {
    if (item.parent != null) {
        var parent = dataView.getItemById(item.parent);

        while (parent) {
            if (parent._collapsed)
                return false;

            parent = dataView.getItemById(parent.parent);
        }
    }

    return true;
};

// Update a single process item.
function updateProcess(psItem, fname) {
    var colIdx, rowIdx;
    var dataItem = dataView.getItemById(psItem.get("pid"));

    if (!dataItem) return;

    if (fname == "vss" || fname == "rss")
        dataItem[fname] = Humanize.filesizeformat(psItem.get(fname));
    else
        dataItem[fname] = psItem.get(fname);

    dataView.updateItem(psItem.get("pid"), dataItem);

    colIdx = grid.getColumnIndex(fname);
    rowIdx = dataView.getRowById(psItem.get("pid"));

    grid.flashCell(rowIdx, colIdx, 750);
}

var resizeWindow = function () {
    var doResize = false;

    // Resize the layout to the size of the window.
    $("#layout")
        .width($(window).width())
        .height($(window).height());

    // Change the size properties of the grid so that it fits inside the layout.
    var jqGrid = $("#grid");

    if (!jqGrid.parent().is($(w2ui.layout.el("main"))))
        $(w2ui.layout.el("main")).append(jqGrid);

    if (jqGrid.width() != $(w2ui.layout.el("main")).width()) {
        jqGrid.width($(w2ui.layout.el("main")).width());
        doResize = true;
    }

    if (jqGrid.height() != $(w2ui.layout.el("main")).height()) {
        jqGrid.height($(w2ui.layout.el("main")).height());
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

        sysCpu.set(sysinfo.cpuinfo);

        for (var i = 0; i < sysinfo.ps.length; i++) {
            var proc = ps.get(sysinfo.ps[i].pid);

            if (!proc) {
                proc = new Process(sysinfo.ps[i]);
                ps.add(proc);
            } else
                proc.set(sysinfo.ps[i]);

            proc.updatePct(sysCpu.get("totalDeltaTime"));
        }

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
                e.set({"ui-indent": ppsItem.get("ui-indent") +  1});
            }
        });

        // Iterate through the collection depth first to attribute row numbers
        var e, r = 0, iin = [ps.get(0)];

        while ((e = iin.shift())) {
            e.set("ui-row", r++);
            iin = _.values(e.get("ui-children")).concat(iin);
        }

        // Usually a collection would sort itself but I think Slickback is
        // isn't cooperating well with this for some reason.
        ps.sort();

        resizeWindow();
    });
};

var initGrid = function () {
    var columns = [
        { id: "pid", name: "PID", field: "id", formatter: pidFormatter },
        { id: "name", name: "Name", field: "name" },
        { id: "pct", name: "%", field: "pct", formatter: percentFormatter },
        { id: "vss", name: "VSS", field: "vss", formatter: memoryFormatter },
        { id: "rss", name: "RSS", field: "rss", formatter: memoryFormatter  },
        { id: "track", name: "Track" },
        { id: "graph", name: "Graphs" }
    ];

    var options = {
        enableColumnReorder: false,
        formatterFactory: Slickback.BackboneModelFormatterFactory
    };

    grid = new Slick.Grid("#grid", ps, columns, options);

    grid.onClick.subscribe(function (e, args) {
        var item = dataView.getItem(args.row);
        var pid = item.id;

        if ($(e.target).hasClass("toggle")) {
            var item = dataView.getItemById(pid);

            if (!item) return;

            if (!item._collapsed)
                item._collapsed = true;
            else
                item._collapsed = false;

            dataView.updateItem(pid, item);
        }

        e.stopImmediatePropagation();
    });

    ps.onRowCountChanged.subscribe(function () {
        grid.updateRowCount();
        ps.sort();
        grid.render();
    });

    ps.onRowsChanged.subscribe(function () {
        grid.invalidateAllRows();
        ps.sort();
        grid.render();
    });
};

$(document).ready(function () {
    initGrid();

    // Generate the main layout
    $("#layout").w2layout({
        name: "layout",
        panels: [
            { type: "top", size: 60, content: "TOP BAR" },
            { type: "left", size: 40, content: "LEFT BAR" },
            { type: "main" }
        ]
    });

    $(window).resize(resizeWindow);

    // Update the process list right now.
    globalProcessUpdate();

    // The process collection updates every 5 seconds.
    window.setInterval(globalProcessUpdate, 5000);

    // Reformat the window content.
    resizeWindow();
});