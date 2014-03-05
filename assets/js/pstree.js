var procView, logCatView,
    // Options
    options = new Options(),
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

function setButton(toolbar, btnId, value) {
    _.each(toolbar.items, function (b) {
        if (b.id == btnId) {
            _.each(_.keys(value), function (k) {
                b[k] = value[k];
            });
        }
    });
}

$(document).ready(function () {
    var updateTimer;

    options.fetch();
    options.initOption("pidFilterMode", false);
    options.initOption("rowColorMode", false);
    options.initOption("playing", true);
    options.initOption("delay", 5000);
    options.initOption("maximizeLogcat", false);
    options.initOption("minimizeLogcat", false);
    options.initOption("filterError", true);
    options.initOption("filterWarning", true);
    options.initOption("filterInfo", true);
    options.initOption("filterDebug", true);
    options.initOption("filterVerbose", true);

    // Initialize the timer.
    updateTimer = $.timer(globalProcessUpdate, options.getOptionValue("delay"));

    var toggleTagFilter = function (optName, tagVal) {
        return function () {
            var v = options.getOptionValue(optName);

            if (v)
                logCatView.addTagFilter(tagVal);
            else
                logCatView.clearTagFilter(tagVal);
        };
    };

    options.getOption("filterError").on("change", toggleTagFilter("filterError", "E"));
    options.getOption("filterWarning").on("change", toggleTagFilter("filterWarning", "W"));
    options.getOption("filterInfo").on("change", toggleTagFilter("filterInfo", "I"));
    options.getOption("filterDebug").on("change", toggleTagFilter("filterDebug", "D"));
    options.getOption("filterVerbose").on("change", toggleTagFilter("filterVerbose", "V"));

    options.getOption("playing").on("change", function () {
        var v = options.getOptionValue("playing");

        if (v)
            updateTimer.play();
        else
            updateTimer.pause();
    });

    options.getOption("delay").on("change", function () {
        var v = options.getOptionValue("delay");

        updateTimer.set({ time: v });

        // Update the toolbar text.
        setButton(w2ui["mainLayout"].get("main").toolbar, "mnuDelay", {
            caption: (v / 1000) + " " + Humanize.pluralize(v / 1000, "second", "seconds")
        });

        w2ui["mainLayout"].get("main").toolbar.refresh();
    });

    options.getOption("minimizeLogcat").on("change", function () {
        var buttonsToHide = [
            "btnFilterByProcess", "btnClears", "btnColors", "btnMinimize",
            "btnFilterError", "btnFilterWarning", "btnFilterInfo", "btnFilterDebug",
            "btnFilterVerbose"
        ];

        var panel = w2ui["mainLayout"].get("preview");

        if (options.getOptionValue("minimizeLogcat")) {
            _.each(buttonsToHide, function (btn) {
                setButton(panel.toolbar, btn, {hidden: true});
            });
            setButton(panel.toolbar, "btnMinimize", {icon: "icon-chevron-up"});

            w2ui["mainLayout"].set("preview", {size: 0});
        } else {
            _.each(buttonsToHide, function (btn) {
                setButton(panel.toolbar, btn, {hidden: false});
            });
            setButton(panel.toolbar, "btnMinimize", {icon: "icon-chevron-down"});

            w2ui["mainLayout"].set("preview", {size: 200});
        }

        panel.toolbar.refresh();
        logCatView.setElement(w2ui["mainLayout"].el("preview"));
        logCatView.render();
    });

    $("#mainLayout").w2layout({
        name: "mainLayout",
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
                        { type: "check", id: "btnPlay", caption: "Run", icon: "icon-play",
                          checked: options.getOptionValue("playing")
                        },
                        { type: "menu",  id: "mnuDelay", caption: "", img: "icon-time", items: [
                            { id: "1000", text: "1 sec" },
                            { id: "2000", text: "2 sec" },
                            { id: "5000", text: "5 sec" },
                            { id: "10000", text: "10 sec" }
                        ]}
                    ],
                    onClick: function (ev) {
                        if (ev.target == "btnPlay")
                            options.toggleOption("playing");

                        if (ev.target == "mnuDelay" && ev.subItem)
                            options.setOptionValue("delay", ev.subItem.id);
                    }
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
                        { type: "check",  id: "btnFilterByProcess", caption: "Filter", icon: "icon-long-arrow-down",
                          checked: options.getOptionValue("pidFilterMode")
                        },
                        { type: "button", id: "btnClear", caption: "Clear",  icon: "icon-remove" },
                        { type: "check",  id: "btnColors", caption: "Color",  icon: "icon-tint",
                          checked: options.getOptionValue("rowColorMode")
                        },
                        { type: "button", id: "btnEnd", caption: "", icon: "icon-double-angle-down" },
                        { type: "break" },
                        { type: "check", id: "btnFilterError", caption: "E",
                          checked: options.getOptionValue("filterError") },
                        { type: "check", id: "btnFilterWarning", caption: "W",
                          checked: options.getOptionValue("filterWarning") },
                        { type: "check", id: "btnFilterInfo", caption: "I",
                          checked: options.getOptionValue("filterInfo") },
                        { type: "check", id: "btnFilterDebug", caption: "D",
                          checked: options.getOptionValue("filterDebug") },
                        { type: "check", id: "btnFilterVerbose", caption: "V",
                          checked: options.getOptionValue("filterVerbose") },
                        { type: "break" },
                        { type: "html",   id: "txtFiltered",html: "<div id='txtFiltered'></div>" },
                        { type: "spacer" },
                        { type: "button", id: "btnMinimize", icon: "icon-chevron-down" }
                    ],
                    onClick: function (ev) {
                        if (ev.target == "btnClear")
                            logCatLines.reset();

                        if (ev.target == "btnFilterByProcess")
                            options.toggleOption("pidFilterMode");

                        if (ev.target == "btnColors")
                            options.toggleOption("rowColorMode");

                        if (ev.target == "btnMinimize")
                            options.toggleOption("minimizeLogcat");

                        if (ev.target == "btnEnd")
                            logCatView.scrollToEnd();

                        if (ev.target == "btnFilterError")
                            options.toggleOption("filterError");

                        if (ev.target == "btnFilterWarning")
                            options.toggleOption("filterWarning");

                        if (ev.target == "btnFilterInfo")
                            options.toggleOption("filterInfo");

                        if (ev.target == "btnFilterDebug")
                            options.toggleOption("filterDebug");

                        if (ev.target == "btnFilterVerbose")
                            options.toggleOption("filterVerbose");
                    }
                }
            }
        ],
        onResize: function (ev) {
            // Thanks, w2ui. This thing is elegant but rather confusing...
            ev.onComplete = function () {
                if (procView)
                    procView.autoResize();
                if (logCatView)
                    logCatView.autoResize();
            };
        }
    });

    cpuChart = new ChartView({
        el: $("#cpuGraph"),
        max: 100,
        min: 0,
        delay: 5000,
        width: 300,
        height: 101,
        caption: "CPU"
    });
    memChart = new ChartView({
        el: $("#memGraph"),
        min: 0,
        delay: 5000,
        width: 300,
        height: 101,
        caption: "Memory"
    });
    procView = new ProcessView({
        el: $(w2ui["mainLayout"].el("main")),
        ps: ps,
        options: options
    });
    logCatView = new LogCatView({
        el: $(w2ui["mainLayout"].el("preview")).addClass("logcatview"),
        logcat: logCatLines,
        options: options
    });

    ps.on("remove", function (proc) {
        console.log("Process " + proc.get("name") + "[" + proc.get("pid") + "] removed.");
    });

    procView.on("onProcessSelected", function (el) {
        if (options.getOptionValue("pidFilterMode"))
            logCatView.filterByPid(el.get("pid"));
    });

    // Add the options handlers.
    options.getOption("pidFilterMode").on("change", function () {
        if (!options.getOptionValue("pidFilterMode"))
            logCatView.clearPidFilter();
    });

    $(window).resize($.debounce(100, resizeWindow));

    options.activate();

    // Update the process list right now.
    globalProcessUpdate();

    // Reformat the window content.
    resizeWindow();
});