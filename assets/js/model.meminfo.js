var MemInfo = Backbone.Model.extend({
    initialize: function () {
        this.set("memUsed");
    },

    set: function (n, v) {
        n.memUsed = this.get("memTotal") - this.get("memFree");
        Backbone.Model.prototype.set.apply(this, arguments);
    }
});
