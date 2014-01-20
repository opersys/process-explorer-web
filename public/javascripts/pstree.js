"use strict";

var dataView, grid,
    // Process models layed out in a tree structure,
    psTree,
    // ProcessColl object, collection of all process.
    ps = new ProcessColl(),
    // CPU Info
    newCpuInfo, oldCpuInfo;

var processFormatter = function (row, cell, value, columnDef, dataContext) {
    var spacer = "<span style='display: inline-block; height: 1px; width: " + (15 * dataContext["indent"]) + "px'></span>";
    var idx = dataView.getIdxById(dataContext.id);
    var psItem;

    psItem = ps.get(dataContext.id);

    if (psItem && _.size(psItem.get("children")) > 0) {
        if (dataContext._collapsed)
            return spacer + " <span class='toggle expand'></span>&nbsp;" + value;
        else
            return spacer + " <span class='toggle collapse'></span>&nbsp;" + value;
    } else
        return spacer + " <span class='toggle'></span>&nbsp;" + value;
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

// Clear the data view and reinsert all process. This is necessary when a new
// process is added.
function updateAllProcess() {
    var item;
    var iin = [], iout = [];
    var states = {};
    var psItem, p;

    // Flatten the list of items to add to the tree.
    iin.push({ pid: 0, indent: 0 });

    while (iin.length > 0) {
        p = iin.shift();
        psItem = ps.get(p.pid);

        if (!psItem) continue;

        iout.push(p);

        var childPids = _.map(_.keys(psItem.get("children")).sort(),
            function (pid) {
                return {pid: pid, indent: p.indent + 1};
            }
        );

        iin = childPids.concat(iin);
    }

    dataView.beginUpdate();

    // Save the item transient states before clearing the array..
    for (var i = 0; i < dataView.getItems().length; i++)  {
        states[dataView.getItems()[i].id] = {
            _collapsed: dataView.getItems()[i]._collapsed
        };
    }

    dataView.getItems().length = 0;

    while (iout.length > 0) {
        p = iout.shift();
        psItem = ps.get(p.pid);

        dataView.addItem({
            id: psItem.get("pid"),
            name: psItem.get("name"),
            vss: Humanize.filesizeformat(psItem.get("vss")),
            rss: Humanize.filesizeformat(psItem.get("rss")),
            indent: p.indent,
            parent: psItem.get("ppid") == 0 ? null : psItem.get("ppid"),
            _collapsed: states[psItem.get("pid")] ? states[psItem.get("pid")]._collapsed : false
        });
    }

    dataView.endUpdate();

    resizeWindow();
}

// Update a single process item.
function updateProcess(psItem, fname) {
    var colIdx, rowIdx;
    var dataItem = dataView.getItemById(psItem.get("pid"));

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
    // Clear the process tree.
    psTree = {};

    $.ajax("/sysinfo").done(function (sysinfo) {
        var totalDeltaTime;

        console.log("Process list update.")

        newCpuInfo = new CpuInfo(sysinfo.cpuinfo);

        if (oldCpuInfo) {
            totalDeltaTime =
                (newCpuInfo.get("utime") + newCpuInfo.get("ntime") + newCpuInfo.get("stime") + newCpuInfo.get("itime")
                + newCpuInfo.get("iowtime") + newCpuInfo.get("irqtime") + newCpuInfo.get("sirqtime"))
                - (oldCpuInfo.get("utime") + oldCpuInfo.get("ntime") + oldCpuInfo.get("stime") + oldCpuInfo.get("itime")
                + oldCpuInfo.get("iowtime") + oldCpuInfo.get("irqtime") + oldCpuInfo.get("sirqtime"));

            console.log(((newCpuInfo.get("utime") + newCpuInfo.get("ntime"))
                - (oldCpuInfo.get("utime") + oldCpuInfo.get("ntime"))) * 100  / totalDeltaTime);
            console.log((newCpuInfo.get("stime") - newCpuInfo.get("stime")) * 100 / totalDeltaTime);
            console.log((newCpuInfo.get("iowtime") - oldCpuInfo.get("iowtime")) * 100 / totalDeltaTime);
            console.log(((newCpuInfo.get("irqtime") + newCpuInfo.get("sirqtime")) - (oldCpuInfo.get("irqtime") + oldCpuInfo.get("sirqtime"))) * 100 / totalDeltaTime);
        }

        oldCpuInfo = newCpuInfo;

        for (var i = 0; i < sysinfo.ps.length; i++)
            ps.add(new Process(sysinfo.ps[i]))

        // Scan the dataview for process that are no longer in the collection
        var dataItems = dataView.getItems();

        for (var i = 0; i < dataItems.length; i++) {
            if (dataItems[i].id == 0)
                continue;

            if (!ps.get(dataItems[i].id)) {
                console.log("Removing process " + dataItems[i].id);
                dataView.deleteItem(dataItems[i].id);
            }
        }

        // Calculate the process tree
        ps.each(function (e) {
            // Process tree calculation.
            if (e.get("pid") == 0)
                psTree[0] = e;

            else if (e.get("ppid") != undefined) {
                var ppsItem = ps.get(e.get("ppid"));
                var ppsItemCh = ppsItem.get("children");
                ppsItemCh[e.get("pid")] = e;
                ppsItem.set("children", ppsItemCh);
            }
        });

        updateAllProcess();
    });
};

var initGrid = function () {
    var columns = [
        { id: "pid", name: "PID", field: "id", formatter: processFormatter },
        { id: "name", name: "Name", field: "name" },
        { id: "vss", name: "VSS", field: "vss" },
        { id: "rss", name: "RSS", field: "rss" },
        { id: "track", name: "Track" },
        { id: "graph", name: "Graphs" }
    ];

    var options = {
        enableColumnReorder: false
    };

    grid = new Slick.Grid("#grid", dataView, columns, options);

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
};

var initDataView = function () {
    dataView = new Slick.Data.DataView({ inlineFilters: false });

    dataView.onRowCountChanged.subscribe(function (e, args) {
        grid.updateRowCount();
        grid.render();
    });

    dataView.onRowsChanged.subscribe(function (e, args) {
        grid.invalidateRows(args.rows);
        grid.render();
    });

    dataView.setFilter(treeFilter);

    // Listen to changes on the model to update the grid.
    ps.on("change:vss", function (psItem) { updateProcess(psItem, "vss"); });
    ps.on("change:rss", function (psItem) { updateProcess(psItem, "rss"); });
    ps.on("change:name", function (psItem) { updateProcess(psItem, "name"); });
};

$(document).ready(function () {
    initDataView();
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