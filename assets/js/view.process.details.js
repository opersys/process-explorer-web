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
                            { id: 'network', caption: 'Network', closable: false },
                        ],
                        onClick: function (event) {
                            if (event.target == "environment") {
                                $.ajax({
                                    url: "/process/environ?pid=" + self._process.get("pid"),
                                }).done(function(data) {
                                    $('#processdetails_content').html(self.getEnvironment(data));
                                });
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
    },

    toggle: function() {
        var self = this;

        if ($(self.$el).hasClass("collapsed")) {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-right";
            w2ui["ps_layout"].sizeTo("right", $(window).width() * 0.35);
        }
        else {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-left";
            w2ui["ps_layout"].sizeTo("right", 40);
        }

        w2ui["processdetails_collapse"].refresh();
        $(self.$el).toggleClass("collapsed");

        return;
    },

    setProcess: function(process) {
        this._process = process;
    },
});
