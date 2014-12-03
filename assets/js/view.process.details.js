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

    initialize: function (opts) {
        var self = this;

        this._ps = opts.ps;
        this._options = opts.options;

        var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';

        // Create the layout
        self.$el.w2layout({
            name: 'processdetails_layout',
            panels: [
                { type: 'main',
                    content: '',
                    title: '<div id="processdetails_title"></div>',
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
                            $('#tab-content').html('Tab: ' + event.target);
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
            w2ui["ps_layout"].sizeTo("right", 250);
        }
        else {
            w2ui["processdetails_collapse"].get("collapse").icon = "icon-chevron-left";
            w2ui["ps_layout"].sizeTo("right", 40);
        }

        w2ui["processdetails_collapse"].refresh();
        $(self.$el).toggleClass("collapsed");

        return;
    }
});
