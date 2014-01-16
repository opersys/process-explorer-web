var pswalk = require('../build/Release/pswalk');
var util = require('util');

exports.pstree = function(req, res) {
    var s = [];

    s.push({
        pid: 0,
        parent: "#",
        name: "Kernel"
    });

    pswalk(function (procdata) {
        s.push(procdata);
    });

    res.json(s);
};