module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        css_crunch: {
            dist: {
                src: "assets/css/",
                dest: "dist/public/css/<%= pkg.name %>_styles.css",
                minify: true,
                optimize: true,
                copy: true
            }
        },

        mkdir: {
            dist: {
                options: {
                    create: [
                        "dist/public/css",
                        "dist/public/js",
                        "dist/routes",
                        "dist/views"
                    ]
                }
            }
        },

        copyto: {
            dist: {
                files: [
                    { cwd: "./bin/arm", dest: "dist/", src:
                        [
                            "node",
                            "pswalk.node"
                        ]
                    },
                    { cwd: ".", dest: "dist/", src:
                        [
                            "app.js",
                            "package.json"
                        ]
                    },
                    { cwd: "./", dest: "dist/", src:
                        [
                            "public/**/*",
                            "routes/*.js",
                            "app.js"
                        ]
                    },
                    { cwd: "./assets/css", dest: "dist/public/css/", src:
                        [
                            "font-awesome.min.css"
                        ]
                    }
                ]
            }
        },

        concat: {
            options: { separator: ";" },
            dist_css: {
                // Font Awesome is not included since it seems it has to be
                // loaded alone for the web font to be properly loaded in Chrome.
                src: [
                    "assets/css/style.css",
                    "assets/css/slick.grid.css",
                    "assets/css/slick-default-theme.css",
                    "assets/css/w2ui-1.3.1.min.css",
                ],
                dest: "dist/public/css/<%= pkg.name %>_styles.css"
            },
            dist_libs: {
                // Source files. Order matters.
                src: [
                    "assets/jslib/jquery-2.0.3.min.js",
                    "assets/jslib/jquery.event.drag-2.2.js",
                    "assets/jslib/jquery.ba-throttle-debounce.min.js",
                    "assets/jslib/jquery.timer.js",
                    "assets/jslib/underscore-min.js",
                    "assets/jslib/backbone.js",
                    "assets/jslib/backbone.localStorage-min.js",
                    "assets/jslib/humanize.min.js",
                    "assets/jslib/Queue.js",
                    "assets/jslib/moment.min.js",
                    "assets/jslib/smoothie.js",
                    "assets/jslib/w2ui-1.3.1.min.js",
                    "assets/jslib/slickgrid/slick.core.js",
                    "assets/jslib/slickgrid/slick.grid.js",
                    "assets/jslib/slickgrid/slick.formatters.js",
                    "assets/jslib/slickgrid/plugins/slick.rowselectionmodel.js",
                    "assets/jslib/slickback.min.js",
                ],
                dest: "dist/public/js/<%= pkg.name %>_libs.js"
            },
            dist_main: {
                src: [
                    "assets/js/models.js",
                    "assets/js/views.js",
                    "assets/js/pstree.js"
                ],
                dest: "dist/public/js/<%= pkg.name %>_main.js"
            }
        },

        uglify: {
            dist: {
                files: {
                    "dist/js/public/<%= pkg.name %>_libs.min.js": ["<%= concat.dist_libs.dest %>"],
                    "dist/js/public/<%= pkg.name %>_main.min.js": ["<%= concat.dist_main.dest %>"]
                }
            }
        },

        cssmin: {
            dist: {
                src: "<%= concat.dist_css.dest %>",
                dest: "<%= concat.dist_css.dest %>"
            }
        },

        exec: {
            npm_install: {
                command: "npm --production install",
                stdout: false,
                stderr: false,
                cwd: "dist"
            }
        },

        jade: {
            html: {
                src: ["views/*.jade"],
                dest: "dist/public/",
                options: {
                    client: false
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-css");
    grunt.loadNpmTasks("grunt-copy-to");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-jade");
    grunt.loadNpmTasks("grunt-exec");

    grunt.registerTask("default", ["mkdir", "copyto", "concat", "uglify", "cssmin", "jade", "exec"]);
}

