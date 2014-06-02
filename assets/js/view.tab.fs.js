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

var FileSystemTab = Backbone.View.extend({

    initialize: function (opt) {
        var self = this;

        self.$el = opt.target;

        self.$el.w2layout({
            name: "fs_layout",
            padding: 4,
            panels: [
                {
                    type: "main"
                }
            ]
        });

        fsView = new FileSystemView({
            el: $(w2ui["fs_layout"].el("main")),
            fs: fs
        });
    },

    activate: function () {

    },

    deactivate: function () {

    },

    resize: function (width, height) {
        var self = this;

        self.$el
            .width(width)
            .height(height);

        w2ui["fs_layout"].resize();
        fsView.autoResize();
    }
});