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

var ProcessTab = Backbone.View.extend({

    toggleTagFilter: function (optName, tagVal) {
        var self = this;

        return function () {
            var v = self.options.getOptionValue(optName);

            if (v)
                self.logCatView.addTagFilter(tagVal);
            else
                self.logCatView.clearTagFilter(tagVal);
        };
    },

    setButton: function (toolbar, btnId, value) {
        _.each(toolbar.items, function (b) {
            if (b.id == btnId) {
                _.each(_.keys(value), function (k) {
                    b[k] = value[k];
                });
            }
        });
    },

    graphUpdate: function (psView) {
        var self = psView;

        $.ajax("/cpuinfo").done(function (cpuinfo) {
            self.cpuInfo.set(cpuinfo.cpus);

            // Initialize and update the CPU graph
            self.cpuInfo.each(function (ci) {
                if (!self.cpuChart.hasSerie(ci.get("no")))
                    self.cpuChart.serie(ci.get("no"), "userPct", ci);

                self.cpuChart.addSerieData(ci.get("no"), ci.get("userPct"));
            });
        });

        $.ajax("/meminfo").done(function (meminfo) {
            self.memInfo.set(meminfo);

            if (!self.memChart.hasSerie("memUsed"))
                self.memChart.serie("memUsed");

            // Update the memory chart range if needed.
            if (self.memChart.getRange().max != self.memInfo.get("memTotal"))
                self.memChart.setRange({min: 0, max: self.memInfo.get("memTotal")});

            // Update the memory graphs.
            self.memChart.addSerieData("memUsed", self.memInfo.get("memUsed"));
        });
    },

    globalProcessUpdate: function (psView) {
        var self = psView;

        $.ajax("/sysinfo").done(function (sysinfo) {
            var totalDeltaTime;

            self.globalCpu.set(sysinfo.cpuinfo.global);
            self.cpuInfo.set(sysinfo.cpuinfo.cpus);
            self.memInfo.set(sysinfo.meminfo);

            self.ps.set(uncompress(sysinfo.ps));

            self.ps.each(function (proc) {
                var newChildren = {};

                proc.updateCpuPct(self.globalCpu.get("totalDeltaTime") / self.globalCpu.get("ncpu"));
                proc.updateMemPct(self.memInfo.get("memTotal"));

                _.each(_.keys(proc.get("ui-children")), function (cprocPid) {
                    if (!self.ps.get(cprocPid)) {
                        proc.get("ui-children")[cprocPid].set("ui-dead", true);
                        newChildren[cprocPid] = proc.get("ui-children")[cprocPid];
                    } else
                        newChildren[cprocPid] = self.ps.get(cprocPid);
                });
                proc.set("ui-children", newChildren);
            });

            // Calculate the process tree
            self.ps.each(function (e) {
                if (e.get("pid") != 0 && e.get("ppid") != undefined) {
                    var ppsItem = self.ps.get(e.get("ppid"));
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
    },

    initialize: function (opt) {
        var self = this;

        self.$el = opt.target;

        // ProcessCollection object, collection of all process.
        self.ps = new ProcessCollection();

        // Global CPU Info
        self.globalCpu = new CpuInfo();

        // Individual CPU info
        self.cpuInfo = new CpuInfoCollection();

        // Logcat
        self.logCatLines = new LogCatLines();

        // Memory info
        self.memInfo = new MemInfo();

        // Logcat
        self.logcat = new LogCat();

        // Options model
        self.options = opt.options;

        self.options.getOption("filterError").on("change", self.toggleTagFilter("filterError", "E"));
        self.options.getOption("filterWarning").on("change", self.toggleTagFilter("filterWarning", "W"));
        self.options.getOption("filterInfo").on("change", self.toggleTagFilter("filterInfo", "I"));
        self.options.getOption("filterDebug").on("change", self.toggleTagFilter("filterDebug", "D"));
        self.options.getOption("filterVerbose").on("change", self.toggleTagFilter("filterVerbose", "V"));

        // Create the w2ui layout.
        self.$el.w2layout({
            name: "ps_layout",
            padding: 4,
            panels: [
                {
                    type: "top",
                    size: 50,
                    toolbar: {
                        items: [
                            { type: "check", id: "btnPause", icon: "icon-pause",
                                checked: self.options.getOptionValue("paused")
                            },
                            { type: "break" },
                            { type: "html", html: "<span style='margin-left: 1em'>Process delay:</span>" },
                            { type: "menu",  id: "mnuDelay", caption: "", img: "icon-time", items: [
                                { id: "1000", text: "1 sec" },
                                { id: "2000", text: "2 sec" },
                                { id: "5000", text: "5 sec" },
                                { id: "10000", text: "10 sec" }
                            ]},
                            { type: "break" },
                            { type: "html", html: "<span style='margin-left: 1em'>Graph delay:</span>" },
                            { type: "menu",  id: "mnuGraphDelay", caption: "", img: "icon-time", items: [
                                { id: "500", text: "500 msec"},
                                { id: "1000", text: "1 sec" },
                                { id: "2000", text: "2 sec" },
                                { id: "5000", text: "5 sec" },
                                { id: "10000", text: "10 sec" }
                            ]},
                            { type: "break" },
                            { type: "html", html: "<span id='txtSortType' style='margin-left: 1em'>No sorting</span>" },
                            { type: "button", id: "btnCancelSort", caption: "Cancel", disabled: true },
                            { type: "spacer" },
                            { type: "html", html: "<div id='cpuGraph'></div>" },
                            { type: "html", html: "<div id='memGraph'></div>" },
                            { type: "html", html:
                                "<a href='http://www.opersys.com'><img alt='opersys logo' src='/images/opersys_land_logo.png' /></a>" },
                            { type: "html", html:
                                "<a href='javascript:showApropos()'><img alt='copyright icon' src='/images/copyright.png' /></a>" }
                        ],
                        onClick: function (ev) {
                            if (ev.target == "btnPause")
                                self.options.toggleOption("paused");

                            if (ev.target == "btnCancelSort") {
                                self.procView.treeSort();
                                $("#txtSortType").text("No sorting");
                                w2ui["ps_layout"].get("main").toolbar.disable("btnCancelSort");
                            }

                            if (ev.target == "mnuDelay" && ev.subItem)
                                self.options.setOptionValue("delay", ev.subItem.id);

                            if (ev.target == "mnuGraphDelay" && ev.subItem)
                                self.options.setOptionValue("graphDelay", ev.subItem.id);
                        }
                    }
                },
                {
                    type: "preview",
                    size: 200,
                    resizer: 5,
                    resizable: true,
                    toolbar: {
                        name: "tbPreview",
                        items: [
                            { type: "check",  id: "btnFilterByProcess", caption: "Filter", icon: "icon-long-arrow-down",
                                checked: self.options.getOptionValue("pidFilterMode")
                            },
                            { type: "button", id: "btnClear", caption: "Clear",  icon: "icon-remove" },
                            { type: "check",  id: "btnColors", caption: "Color",  icon: "icon-tint",
                                checked: self.options.getOptionValue("rowColorMode")
                            },
                            { type: "button", id: "btnEnd", caption: "", icon: "icon-double-angle-down" },
                            { type: "break" },
                            { type: "check", id: "btnFilterError", caption: "E",
                                checked: self.options.getOptionValue("filterError") },
                            { type: "check", id: "btnFilterWarning", caption: "W",
                                checked: self.options.getOptionValue("filterWarning") },
                            { type: "check", id: "btnFilterInfo", caption: "I",
                                checked: self.options.getOptionValue("filterInfo") },
                            { type: "check", id: "btnFilterDebug", caption: "D",
                                checked: self.options.getOptionValue("filterDebug") },
                            { type: "check", id: "btnFilterVerbose", caption: "V",
                                checked: self.options.getOptionValue("filterVerbose") },
                            { type: "break" },
                            { type: "html",   id: "txtFiltered", html: "<div id='txtFiltered'></div>" },
                            { type: "spacer" },
                            { type: "button", id: "btnMinimize", icon: "icon-chevron-down" }
                        ],
                        onClick: function (ev) {
                            if (ev.target == "btnClear")
                                self.logCatLines.clearAll();

                            if (ev.target == "btnFilterByProcess")
                                self.options.toggleOption("pidFilterMode");

                            if (ev.target == "btnColors")
                                self.options.toggleOption("rowColorMode");

                            if (ev.target == "btnMinimize")
                                self.options.toggleOption("minimizeLogcat");

                            if (ev.target == "btnEnd")
                                self.logCatView.scrollToEnd();

                            if (ev.target == "btnFilterError")
                                self.options.toggleOption("filterError");

                            if (ev.target == "btnFilterWarning")
                                self.options.toggleOption("filterWarning");

                            if (ev.target == "btnFilterInfo")
                                self.options.toggleOption("filterInfo");

                            if (ev.target == "btnFilterDebug")
                                self.options.toggleOption("filterDebug");

                            if (ev.target == "btnFilterVerbose")
                                selfoptions.toggleOption("filterVerbose");
                        }
                    }
                },
                {
                    type: "right",
                    size: 40,
                    resizer: 5,
                    resizable: true,
                    style: "opacity: 0.92;",
                }
            ],
            onResize: function (ev) {
                var main_panel = $(this.el("main").parentElement);

                ev.onComplete = function () {
                    // Avoid resizing the main panel so that we can have an
                    // overlay panel on the right. Keep 40px for the scrollbar.
                    main_panel.width($(window).width() - 40);
                };
            }
        });

        self.cpuChart = new ChartView({
            el: $("#cpuGraph"),
            max: 100,
            min: 0,
            delay: self.options.getOptionValue("graphDelay"),
            width: 200,
            height: 50
        });
        self.memChart = new ChartView({
            el: $("#memGraph"),
            min: 0,
            delay: self.options.getOptionValue("graphDelay"),
            width: 200,
            height:50
        });
        // Process details view
        self.procDetailsView = new ProcessDetailsView({
            el: $(w2ui["ps_layout"].el("right")),
        });
        self.procView = new ProcessView({
            el: $(w2ui["ps_layout"].el("main")).addClass("processview"),
            ps: self.ps,
            options: self.options
        });
        self.logCatView = new LogCatView({
            el: $(w2ui["ps_layout"].el("preview")).addClass("logcatview"),
            logcat: self.logCatLines,
            options: self.options
        });

        self.procView.on("sort", function (sortField, sortFieldText) {
            $("#txtSortType").text("Sorting by: " + sortFieldText);
            w2ui["ps_layout"].get("main").toolbar.enable("btnCancelSort");
        });

        self.procView.on("onProcessSelected", function (el) {
            if (self.options.getOptionValue("pidFilterMode"))
                self.logCatView.filterByPid(el.get("pid"));

            self.procDetailsView.setProcess(el);
            self.procDetailsView.refresh();
        });

        self.procView.on("onContextMenuDetailsClick", function () {
            self.procDetailsView.toggle();
        });

        // Initialize the timer.
        self.updateTimer = $.timer(
            function () {
                self.globalProcessUpdate(self);
            },
            self.options.getOptionValue("delay"));
        self.graphUpdateTimer = $.timer(
            function () {
                self.graphUpdate(self);
            },
            self.options.getOptionValue("graphDelay"));

        self.options.getOption("paused").on("change", function () {
            var v = self.options.getOptionValue("paused");

            if (!v) {
                self.updateTimer.play();
                self.graphUpdateTimer.play();

                if (self.cpuChart) self.cpuChart.start();
                if (self.memChart) self.memChart.start();
            }
            else {
                self.updateTimer.pause();
                self.graphUpdateTimer.pause();

                if (self.cpuChart) self.cpuChart.stop();
                if (self.memChart) self.memChart.stop();
            }
        });

        self.options.getOption("delay").on("change", function () {
            var v = self.options.getOptionValue("delay");

            self.updateTimer.set({ time: v });

            // Update the toolbar text.
            self.setButton(w2ui["ps_layout"].get("main").toolbar, "mnuDelay", {
                caption: (v / 1000) + "s"
            });

            w2ui["ps_layout"].get("main").toolbar.refresh("mnuDelay");
        });

        self.options.getOption("graphDelay").on("change", function () {
            var v = self.options.getOptionValue("graphDelay");

            self.graphUpdateTimer.set({ time: v });

            self.cpuChart.resetDelay(v);
            self.memChart.resetDelay(v);

            // Update the toolbar text.
            self.setButton(w2ui["ps_layout"].get("main").toolbar, "mnuGraphDelay", {
                caption: (v / 1000) + "s"
            });

            w2ui["ps_layout"].get("main").toolbar.refresh("mnuGraphDelay");
        });

        self.options.getOption("minimizeLogcat").on("change", function () {
            var buttonsToHide = [
                "btnFilterByProcess", "btnClear", "btnColors", "btnEnd",
                "btnFilterError", "btnFilterWarning", "btnFilterInfo", "btnFilterDebug",
                "btnFilterVerbose"
            ];

            var panel = w2ui["ps_layout"].get("preview");

            if (self.options.getOptionValue("minimizeLogcat")) {
                _.each(buttonsToHide, function (btn) {
                    self.setButton(panel.toolbar, btn, {hidden: true});
                });
                self.setButton(panel.toolbar, "btnMinimize", {icon: "icon-chevron-up"});

                w2ui["ps_layout"].set("preview", {size: 0});
            } else {
                _.each(buttonsToHide, function (btn) {
                    self.setButton(panel.toolbar, btn, {hidden: false});
                });
                self.setButton(panel.toolbar, "btnMinimize", {icon: "icon-chevron-down"});

                w2ui["ps_layout"].set("preview", {size: 200});
            }

            panel.toolbar.refresh();
            self.logCatView.setElement(w2ui["ps_layout"].el("preview"));
            self.logCatView.render();
        });

        self.options.getOption("pidFilterMode").on("change", function () {
            if (!self.options.getOptionValue("pidFilterMode"))
                self.logCatView.clearPidFilter();
            else {
                if (self.procView.getSelectedProcess())
                    self.logCatView.filterByPid(self.procView.getSelectedProcess().get("pid"));
            }
        });
    },

    activate: function () {
        var self = this;

        // Update the process list right now.
        self.globalProcessUpdate(self);

        // Start the timers.
        self.updateTimer.play();
        self.graphUpdateTimer.play();
    },

    deactivate: function () {
        var self = this;

        self.updateTimer.pause();
        self.graphUpdateTimer.pause();
    },

    resize: function (width, height) {
        var self = this;

        self.$el
            .width(width)
            .height(height);

        w2ui["ps_layout"].resize();
        self.procView.autoResize();
    }
});
