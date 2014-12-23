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

    getEnvironment: function(data) {
        var table = document.createElement('table');
        var table_header =document.createElement('thead');
        var table_body = document.createElement('tbody');

        // Table header
        var header = document.createElement('tr');
        var header_name = document.createElement('th');
        var header_value = document.createElement('th');
        header_name.appendChild(document.createTextNode('Name'));
        header_value.appendChild(document.createTextNode('Value'));
        header.appendChild(header_name);
        header.appendChild(header_value);
        table_header.appendChild(header);

        // Table body
        for (var name in data.variables) {
            if (data.variables.hasOwnProperty(name)) {
                var row = document.createElement('tr');
                var cell_name = document.createElement('td');
                var cell_value = document.createElement('td');
                cell_name.appendChild(document.createTextNode(name));
                row.appendChild(cell_name);

                cell_value.appendChild(document.createTextNode(data.variables[name]));
                row.appendChild(cell_value);

                table_body.appendChild(row);
            }
        }

        table.appendChild(table_header);
        table.appendChild(table_body);

        return table;
    },

    getMemoryMaps: function(data) {
        var table = document.createElement('table');
        var table_header =document.createElement('thead');
        var table_body = document.createElement('tbody');

        // Table header
        var header = document.createElement('tr');
        var header_address = document.createElement('th');
        var header_permissions = document.createElement('th');
        var header_path = document.createElement('th');
        header_address.appendChild(document.createTextNode('Address'));
        header_permissions.appendChild(document.createTextNode('Permissions'));
        header_path.appendChild(document.createTextNode('Path'));
        header.appendChild(header_address);
        header.appendChild(header_permissions);
        header.appendChild(header_path);
        table_header.appendChild(header);

        data.maps.forEach(function(map){
            var row = document.createElement('tr');
            var cell_address = document.createElement('td');
            var cell_permissions = document.createElement('td');
            var cell_path = document.createElement('td');
            cell_address.appendChild(document.createTextNode(map.address));
            row.appendChild(cell_address);

            cell_permissions.appendChild(document.createTextNode(map.permissions));
            row.appendChild(cell_permissions);

            cell_path.appendChild(document.createTextNode(map.pathname));
            row.appendChild(cell_path);

            table_body.appendChild(row);
        });

        table.appendChild(table_header);
        table.appendChild(table_body);

        return table;
    },

    getMemoryUsage: function(data) {
        var table = document.createElement('table');
        var table_header =document.createElement('thead');
        var table_body = document.createElement('tbody');

        // Table header
        var header = document.createElement('tr');
        var header_heap = document.createElement('th');
        var header_pss = document.createElement('th');
        header_heap.appendChild(document.createTextNode('Heap'));
        header_pss.appendChild(document.createTextNode('PSS'));
        header.appendChild(header_heap);
        header.appendChild(header_pss);
        table_header.appendChild(header);

        for (var heap_type in data.memusage) {
            if (data.memusage.hasOwnProperty(heap_type)) {
                var heap_stats = data.memusage[heap_type];

                var row = document.createElement('tr');
                var cell_heap_type = document.createElement('td');

                cell_heap_type.appendChild(document.createTextNode(heap_type));
                row.appendChild(cell_heap_type);

                for (var stats in heap_stats) {
                    if (heap_stats.hasOwnProperty(stats)) {
                        if (stats == "pss") {
                            var cell_pss = document.createElement('td');
                            cell_pss.appendChild(document.createTextNode(heap_stats[stats] + " kb"));
                            row.appendChild(cell_pss);
                        }
                    }
                }
                table_body.appendChild(row);
            }
        }

        table.appendChild(table_header);
        table.appendChild(table_body);

        return table;
    },

    getFiles: function(data) {
        var table = document.createElement('table');
        var table_header =document.createElement('thead');
        var table_body = document.createElement('tbody');

        // Table header
        var header = document.createElement('tr');
        var header_fd = document.createElement('th');
        var header_path = document.createElement('th');
        header_fd.appendChild(document.createTextNode('File descriptor'));
        header_path.appendChild(document.createTextNode('Path'));
        header.appendChild(header_fd);
        header.appendChild(header_path);
        table_header.appendChild(header);

        data.files.forEach(function(file){
            var row = document.createElement('tr');
            var cell_fd = document.createElement('td');
            var cell_path = document.createElement('td');
            cell_fd.appendChild(document.createTextNode(file.fd));
            row.appendChild(cell_fd);

            cell_path.appendChild(document.createTextNode(file.path));
            row.appendChild(cell_path);

            table_body.appendChild(row);
        });

        table.appendChild(table_header);
        table.appendChild(table_body);

        return table;
    },

    fetchProcessDetails: function(url, parser) {
        self = this;

        $.ajax({
            url: url,
        }).done(function(data) {
            if (data.status == "success") {
                $('#processdetails_content').html(parser(data));
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
                        error_msg += ":( (unknown error)";
                }

                $.notify(error_msg, "error");
            }
        });
    },

    initialize: function (opts) {
        var self = this;

        this._process = null;

        var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

        // Create the layout
        self.$el.w2layout({
            name: 'processdetails_layout',
            panels: [
                { type: 'main',
                    title: '<div id="processdetails_title"></div>',
                    content: '<div id="processdetails_content"></div>',
                    tabs: {
                        name: 'processDetailsTabs',
                        active: 'files',
                        tabs: [
                            { id: 'files', caption: 'Files', closable: false },
                            { id: 'memory', caption: 'Memory', closable: false },
                            { id: 'environment', caption: 'Environment', closable: false },
                            { id: 'memory_usage', caption: 'Memory usage', closable: false },
                        ],
                        onClick: function (event) {
                            if (event.target == "environment") {
                                self.fetchProcessDetails.apply(self, ["/process/environ?pid=" + self._process.get("pid"), self.getEnvironment]);
                            }
                            else if (event.target == "memory") {
                                self.fetchProcessDetails.apply(self, ["/process/maps?pid=" + self._process.get("pid"), self.getMemoryMaps]);
                            }
                            else if (event.target == "files") {
                                self.fetchProcessDetails.apply(self, ["/process/files?pid=" + self._process.get("pid"), self.getFiles]);
                            }
                            else if (event.target == "memory_usage") {
                                self.fetchProcessDetails.apply(self, ["/process/memusage?pid=" + self._process.get("pid"), self.getMemoryUsage]);
                            }
                            else {
                                $('#processdetails_content').html('Tab: ' + event.target);
                            }
                        }
                    }
                },
            ],
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
    },

    toggle: function() {
        var self = this;

        if ($(self.$el).hasClass("collapsed")) {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-right";
            w2ui["ps_layout"].sizeTo("right", self._expand_width);
        }
        else {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-left";
            self._expand_width = w2ui["ps_layout"].get("right").width;
            w2ui["ps_layout"].sizeTo("right", 40);
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
