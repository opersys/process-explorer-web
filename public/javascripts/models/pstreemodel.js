var Process = Backbone.Model.extend({
    initialize: function () {
        this.set("children", {});
        this.set("indent", 0);
    },
    idAttribute: "pid"
});

var ProcessColl = Backbone.Collection.extend({
    model: Process,
    url: "/pstree"
});