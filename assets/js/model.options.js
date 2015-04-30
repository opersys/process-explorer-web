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

var OptionItem = Backbone.Model.extend({ });

var Options = Backbone.Collection.extend({
    localStorage: new Backbone.LocalStorage("Options"),
    model: OptionItem,

    // Initialize the option
    initOption: function (opt, val) {
        if (!this.findWhere({ opt: opt })) {
            var m = new OptionItem(
                { opt: opt, val: val}
            );

            this.add(m);
            m.save();
        }
    },

    toggleOption: function (opt) {
        var m;
        if ((m  = this.findWhere({ opt: opt }))) {
            var v = m.get("val");
            m.set("val", !v);
            m.save();
        }
    },

    getOption: function (opt) {
        return this.findWhere({ opt: opt });
    },

    getOptionValue: function (opt) {
        return this.getOption(opt).get("val");
    },

    setOptionValue: function (opt, nval) {
        var m;
        if ((m = this.findWhere({ opt: opt }))) {
            var v = m.get("val");
            m.set("val", nval);
            m.save();
        }
    },

    activate: function (opt) {
        this.forEach(function (opt) {
            opt.trigger("change");
        });
    }
});
