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

var ProcessDetailsView = Backbone.View.extend({

    _expand_width: $(window).width() * 0.35,

    handleEnvironment: function(element, data) {
        var self = this;

        // HTML layout
        var environment_content = document.createElement('div');
        var table_element = document.createElement('div');

        environment_content.appendChild(table_element)

        element.html(environment_content);

        // HTML content
        var data_table = new google.visualization.DataTable();
        var data_array = [];

        for (var name in data.variables) {
            if (data.variables.hasOwnProperty(name)) {
                data_array.push([name, data.variables[name]]);
            }
        }

        data_table.addColumn("string", "Name");
        data_table.addColumn("string", "Value");
        data_table.addRows(data_array);

        var table_chart = new google.visualization.Table(table_element);
        table_chart.draw(data_table);
    },

    handleMemoryMaps: function(element, data) {
        var self = this;

        // HTML layout
        var memorymaps_content = document.createElement('div');
        var table_element = document.createElement('div');

        memorymaps_content.appendChild(table_element);

        element.html(memorymaps_content);

        // HTML content
        var data_table = new google.visualization.DataTable();
        var data_array = [];

        data.maps.forEach(function(map) {
            data_array.push([map.address, map.permissions, map.pathname]);
        });

        data_table.addColumn("string", "Address");
        data_table.addColumn("string", "Permissions");
        data_table.addColumn("string", "Path");
        data_table.addRows(data_array);

        var table_chart = new google.visualization.Table(table_element);
        table_chart.draw(data_table);
    },

    handleMemoryUsage: function(element, data) {
        var self = this;

        // HTML layout
        var memory_usage_content = document.createElement('div');
        var chart_element = document.createElement('div');
        var table_element = document.createElement('div');

        memory_usage_content.appendChild(chart_element);
        memory_usage_content.appendChild(table_element);

        element.html(memory_usage_content);

        // HTML content
        var data_table = new google.visualization.DataTable();
        var data_array = [];
        var data_max = 0; // max value, to limit the upper bound of the graph

        for (var heap_type in data.memusage) {
            if (data.memusage.hasOwnProperty(heap_type)) {
                var heap_stats = data.memusage[heap_type];
                var priv = (heap_stats["private_clean"] + heap_stats["private_dirty"]) * 1024;
                var shared = (heap_stats["shared_clean"] + heap_stats["shared_dirty"]) * 1024;
                var pss = heap_stats["pss"] * 1024;

                data_array.push([heap_type, priv, shared, pss]);

                data_max = Math.max(data_max, priv, shared, pss);
            }
        }

        data_table.addColumn("string", "Heap");
        data_table.addColumn("number", "Private");
        data_table.addColumn("number", "Shared");
        data_table.addColumn("number", "PSS");
        data_table.addRows(data_array);

        var options = {
            title: 'Memory usage',
            isStacked: true,
            height: 500,
            vAxis: {
                title: 'Bytes',
            },
            vAxis: {
                viewWindow: {
                    max: data_max,
                }
            },
            series: {
                2: {
                    targetAxisIndex: 1
                },
                3: {
                    targetAxisIndex: 1
                },
            },
        };

        var chart = new google.charts.Bar(chart_element);
        chart.draw(data_table, google.charts.Bar.convertOptions(options));

        var table_chart = new google.visualization.Table(table_element);
        table_chart.draw(data_table);
    },

    handleFiles: function(element, data) {
        var self = this;

        // HTML layout
        var files_content = document.createElement('div');
        var table_element = document.createElement('div');

        files_content.appendChild(table_element);

        element.html(files_content);

        // HTML content
        var data_table = new google.visualization.DataTable();
        var data_array = [];

        data.files.forEach(function(file){
            data_array.push([parseInt(file.fd), file.path]);
        });

        data_table.addColumn("number", "File Descriptor");
        data_table.addColumn("string", "Path");
        data_table.addRows(data_array);

        var table_chart = new google.visualization.Table(table_element);
        table_chart.draw(data_table);
    },

    handleNetworkConnections: function(element, data) {
        var self = this;

        // HTML layout
        var networkconnections_content = document.createElement('div');
        var ip4_title = document.createElement('h3');
        ip4_title.textContent = "inet";
        var ip4_table_element = document.createElement('div');
        var ip6_title = document.createElement('h3');
        ip6_title.textContent = "inet6";
        var ip6_table_element = document.createElement('div');

        networkconnections_content.appendChild(ip4_title);
        networkconnections_content.appendChild(ip4_table_element);
        networkconnections_content.appendChild(ip6_title);
        networkconnections_content.appendChild(ip6_table_element);

        element.html(networkconnections_content);

        // HTML content
        var ip4_data_table = new google.visualization.DataTable();
        var ip6_data_table = new google.visualization.DataTable();
        var ip4_data_array = [];
        var ip6_data_array = [];

        data.networkconnections.forEach(function(conn){
            if (conn.type == "tcp6" || conn.type == "udp6" ) {
                ip6_data_array.push([conn.src_ip + ":" + conn.src_port, conn.dst_ip + ":" + conn.dst_port, conn.type, conn.status]);
            }
            else {
                ip4_data_array.push([conn.src_ip + ":" + conn.src_port, conn.dst_ip + ":" + conn.dst_port, conn.type, conn.status]);
            }
        });

        ip4_data_table.addColumn("string", "Source");
        ip4_data_table.addColumn("string", "Destination");
        ip4_data_table.addColumn("string", "Protocol");
        ip4_data_table.addColumn("string", "Status");

        ip6_data_table.addColumn("string", "Source");
        ip6_data_table.addColumn("string", "Destination");
        ip6_data_table.addColumn("string", "Protocol");
        ip6_data_table.addColumn("string", "Status");

        ip4_data_table.addRows(ip4_data_array);
        ip6_data_table.addRows(ip6_data_array);

        var ip4_table_chart = new google.visualization.Table(ip4_table_element);
        ip4_table_chart.draw(ip4_data_table);

        var ip6_table_chart = new google.visualization.Table(ip6_table_element);
        ip6_table_chart.draw(ip6_data_table);
    },

    fetchProcessDetails: function(url, handler) {
        self = this;

        $.ajax({
            url: url,
        }).done(function(data) {
            if (data.status == "success") {
                handler.apply(self, [$('#processdetails_content'), data]);
            }
            else {
                error_msg = "Unable to load process details for " + self._process.get("name") + " (" + self._process.get("pid") + ")\n";

                switch (data.error) {
                    case "EACCES":
                        error_msg += "You don't have the permission. (permission denied)";
                        break;
                    case "ENOENT":
                        error_msg += "The process doesn't seem to exist anymore. (no such file or directory)";
                        break;
                    default:
                        error_msg += ":( (" + data.error + ")";
                }

                $.notify(error_msg, "error");
            }
        });
    },

    initialize: function (opts) {
        var self = this;

        this._process = null;

        var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

        // Google Chart
        google.load("visualization", "1.1", {packages:["corechart", "bar", "table"], callback: function() {
            }
        });

        // Create the layout
        self.$el.w2layout({
            name: 'processdetails_layout',
            panels: [
                { type: 'main',
                    title: '<div id="processdetails_title"></div>',
                    content: '<div id="processdetails_content"></div><div id="processdetails_label">Process Details</div>',
                    tabs: {
                        name: 'processDetailsTabs',
                        active: 'files',
                        tabs: [
                            { id: 'files', caption: 'Files', closable: false },
                            { id: 'memory', caption: 'Memory', closable: false },
                            { id: 'environment', caption: 'Environment', closable: false },
                            { id: 'memory_usage', caption: 'Memory usage', closable: false },
                            { id: 'network_connections', caption: 'Network', closable: false },
                        ],
                        onClick: function (event) {
                            if (event.target == "environment") {
                                self.fetchProcessDetails.apply(self,
                                        ["/process/environ?pid=" + self._process.get("pid"), self.handleEnvironment]);
                            }
                            else if (event.target == "memory") {
                                self.fetchProcessDetails.apply(self,
                                        ["/process/maps?pid=" + self._process.get("pid"), self.handleMemoryMaps]);
                            }
                            else if (event.target == "files") {
                                self.fetchProcessDetails.apply(self,
                                        ["/process/files?pid=" + self._process.get("pid"), self.handleFiles]);
                            }
                            else if (event.target == "memory_usage") {
                                self.fetchProcessDetails.apply(self,
                                        ["/process/memusage?pid=" + self._process.get("pid"), self.handleMemoryUsage]);
                            }
                            else if (event.target == "network_connections") {
                                self.fetchProcessDetails.apply(self,
                                        ["/process/networkconnections?pid=" + self._process.get("pid"), self.handleNetworkConnections]);
                            }
                        }
                    }
                },
            ],
            onResize: function(ev) {
                ev.onComplete = function() {
                    // FIXME - bv @ 2014-12-19
                    // Fairly inefficient way to refresh the charts so that
                    // they will use 100% of the new width.
                    if (w2ui['processdetails_layout_main_tabs'].active == 'memory_usage') {
                        w2ui['processdetails_layout_main_tabs'].click('memory_usage');
                    }
                };
            },
        });

        $("#processdetails_title").w2toolbar({
                name: 'processdetails_collapse',
                items: [
                    { type: 'button', id: 'collapse', icon: 'icon-chevron-left' },
                    { type: "html", html: "<span style='margin-left: 1em'>Process details</span>" },
                ],
                onClick: function(event) {
                    self.toggle.apply(self);
                },
            });

        // The panel is initially toggled
        $(self.$el).addClass("collapsed");
        $("#processdetails_content").css("display", "none");
        $("#processdetails_label").css("display", "block");
        w2ui["processdetails_layout"].hideTabs("main");
    },

    toggle: function() {
        var self = this;

        if ($(self.$el).hasClass("collapsed")) {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-right";
            w2ui["ps_layout"].sizeTo("right", self._expand_width);

            // Show the body of the layout.
            $("#processdetails_content").css("display", "block");
            $("#processdetails_label").css("display", "none");
            w2ui["processdetails_layout"].showTabs("main");
        }
        else {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-left";
            self._expand_width = w2ui["ps_layout"].get("right").width;
            w2ui["ps_layout"].sizeTo("right", 40);

            // Hide the body of the layout.
            $("#processdetails_content").css("display", "none");
            $("#processdetails_label").css("display", "block");
            w2ui["processdetails_layout"].hideTabs("main");
        }

        w2ui["processdetails_collapse"].refresh();
        $(self.$el).toggleClass("collapsed");

        return;
    },

    refresh: function() {
        $('#processdetails_content').html("");
        w2ui['processdetails_layout_main_tabs'].click(w2ui['processdetails_layout_main_tabs'].active);
    },

    setProcess: function(process) {
        this._process = process;
    },
});
