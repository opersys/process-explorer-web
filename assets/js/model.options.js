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
            this.set({ id: m.get("id"), opt: opt, val: !v });
            m.save();
        }
    },

    getOption: function (opt) {
        return this.findWhere({ opt: opt });
    },

    getOptionValue: function (opt) {
        return this.getOption(opt).get("val");
    },

    activate: function (opt) {
        this.forEach(function (opt) {
            opt.trigger("change");
        });
    }
});
