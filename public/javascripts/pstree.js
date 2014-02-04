"use strict";

var procView,
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

var resizeWindow = function () {
    $("#mainLayout")
        .width($(window).width())
        .height($(window).height());
    w2ui["mainLayout"].resize();
};

function uncompress(clist) {
    var ctab = clist.ctab;
    var lstlst = clist.list;
    var r = [];

    _.each(lstlst, function (lst) {
        var obj = {};

        _.each(ctab, function (k) {
            obj[k] = lst.shift();
        });
        r.push(obj);
    });
    return r;
}

var globalProcessUpdate = function () {
    $.ajax("/sysinfo").done(function (sysinfo) {
        var totalDeltaTime;

        console.log("Process list update.");

        globalCpu.set(sysinfo.cpuinfo.global);
        cpuInfo.set(sysinfo.cpuinfo.cpus);
        memInfo.set(sysinfo.meminfo);

        ps.set(uncompress(sysinfo.ps));

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
    });
};

$(document).ready(function () {
    $('#mainLayout').w2layout({
        name: 'mainLayout',
        panels: [{
            type: 'top',
            size: 105,
            content:
                "<div id='cpuGraph'></div><div id='memGraph'></div>"
        }, {
            type: 'main'
        }
        ],
        onResize: function (ev) {
            if (procView)
                procView.autoResize();
        }
    });

    $(w2ui["mainLayout"].el("top")).append($("#graphLayout"));

    cpuChart = new ChartView({
        el: $("#cpuGraph"),
        max: 100,
        min: 0,
        delay: 5000,
        width: 300,
        height: 101
    });
    memChart = new ChartView({
        el: $("#memGraph"),
        min: 0,
        delay: 5000,
        width: 300,
        height: 101
    });
    procView = new ProcessView({
        el: $(w2ui["mainLayout"].el("main")),
        ps: ps
    });

    ps.on("remove", function (proc) {
        console.log("Process " + proc.get("name") + "[" + proc.get("pid") + "] removed.");
    });

    $(window).resize($.debounce( 100, resizeWindow));

    // Update the process list right now.
    globalProcessUpdate();

    // The process collection updates every 5 seconds.
    window.setInterval(globalProcessUpdate, 5000);

    // Reformat the window content.
    resizeWindow();
});