var procView, logCatView,
    // ProcessCollection object, collection of all process.
    ps = new ProcessCollection(),
    // Global CPU Info
    globalCpu = new CpuInfo(),
    // Individual CPU info
    cpuInfo = new CpuInfoCollection(),
    // Logcat
    logCatLines = new LogCatLines(),
    // Memory info
    memInfo = new MemInfo(),
    // Concept
    logcat = new LogCat(),
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
    var pidFilterMode = false;

    $('#mainLayout').w2layout({
        name: 'mainLayout',
        padding: 4,
        panels: [
            {
                type: "top",
                size: 105,
                content: "<div id='cpuGraph'></div><div id='memGraph'></div>"
            },
            {
                type: "main",
                toolbar: {
                    items: [
                        { type: "check", id: "btnPlay", caption: "Play", icon: "icon-play" }
                    ]
                }
            },
            {
                type: "preview",
                size: 200,
                resizer: 5,
                resizable: true,
                class: "logcatview",
                toolbar: {
                    name: "tbPreview",
                    items: [
                        { type: "check",  id: "btnFilterByProcess", caption: "Filter", icon: "icon-long-arrow-down" },
                        { type: "button", id: "btnClear",           caption: "Clear",  icon: "icon-remove" }
                    ],
                    onClick: function (ev) {
                        if (ev.target == "btnClear")
                            logCatLines.reset();

                        if (ev.target == "btnFilterByProcess") {
                            pidFilterMode = !pidFilterMode;

                            if (!pidFilterMode)
                                logCatLines.clearPid();
                        }
                    }
                }
            }
        ],
        onResize: function (ev) {
            console.log("onResize");

            if (procView)
                procView.autoResize();
            if (logCatView)
                logCatView.autoResize();
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
    logCatView = new LogCatView({
        el: $(w2ui["mainLayout"].el("preview")).addClass("logcatview"),
        logcat: logCatLines
    });

    ps.on("remove", function (proc) {
        console.log("Process " + proc.get("name") + "[" + proc.get("pid") + "] removed.");
    });

    procView.on("onProcessSelected", function (el) {
        if (pidFilterMode)
            logCatLines.setPid(el.get("pid"));
    });

    $(window).resize($.debounce( 100, resizeWindow));

    // Update the process list right now.
    globalProcessUpdate();

    // The process collection updates every 5 seconds.
    window.setInterval(globalProcessUpdate, 5000);

    // Reformat the window content.
    resizeWindow();
});