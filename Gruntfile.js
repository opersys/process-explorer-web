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
                        "dist/views",
                        "dist/bin",
                        "dist/bin/x64",
                        "dist/bin/arm",
                        "out"
                    ]
                }
            }
        },

        copyto: {
            dist: {
                files: [
                    { expand: true, cwd: "./bin/arm",
                        src: ["node"],
                        dest: "dist/"},
                    { expand: true, cwd: "./bin/arm",
                        src: ["pswalk.node"],
                        dest: "dist/bin/arm/"},
                    { expand: true, cwd: "./bin/x64",
                        src: ["pswalk.node"],
                        dest: "dist/bin/x64/"},
                    { expand: true, cwd: "./bin/ia32",
                        src: ["pswalk.node"],
                        dest: "dist/bin/ia32/"},
                    { expand: true, cwd: ".",
                        src: ["app.js", "package.json"],
                        dest: "dist/"},
                    { expand: true, cwd: ".",
                        src: ["public/**/*", "routes/*.js", "app.js"],
                        dest: "dist/"},
                ]
            },
            external: {
                files: [
                    // FontAwesome
                    { src: [ "external/FontAwesome/font-awesome.min.css" ], dest: "dist/public/css/font-awesome.min.css" },
                    { expand: true,
                        cwd: "external/FontAwesome",
                        src: ["*.otf", "*.eot", "*.svg", "*.ttf", "*.woff"],
                        dest: "dist/public/font" }
                ]
            }
        },

        concat: {
            options: { separator: "\n\n/* ******** */\n\n" },
            dist_css: {
                // Font Awesome is not included since it seems it has to be
                // loaded alone for the web font to be properly loaded in Chrome.
                src: [
                    "external/slickgrid/slick.grid.css",
                    "external/slickgrid/slick-default-theme.css",
                    "external/w2ui/w2ui-1.4.2.min.css",
                    "assets/css/style.css"
                ],
                dest: "dist/public/css/<%= pkg.name %>_styles.css"
            },
            dist_libs: {
                // Source files. Order matters.
                src: [
                    "external/jquery-2.0.3/jquery-2.0.3.min.js",
                    "external/jquery.event.drag/jquery.event.drag-2.2.js",
                    "external/jquery.debounce/jquery.ba-throttle-debounce.min.js",
                    "external/jquery.timer/jquery.timer.js",
                    "external/underscore/underscore-min.js",
                    "external/backbone/backbone.js",
                    "external/backbone.localstorage/backbone.localStorage-min.js",
                    "external/humanize/humanize.min.js",
                    "external/moment/moment.min.js",
                    "external/notifynotify.min.js",
                    "external/SmoothieCharts/smoothie.js",
                    "external/w2ui/w2ui-1.4.2.min.js",
                    "external/slickgrid/slick.core.js",
                    "external/slickgrid/slick.grid.js",
                    "external/slickgrid/slick.formatters.js",
                    "external/slickgrid/plugins/slick.rowselectionmodel.js"
                ],
                dest: "dist/public/js/<%= pkg.name %>_libs.js"
            },
            dist_main: {
                options: {
                    process: function(src, filepath) {
                        return '//####' + filepath + '\n' + src;
                    },
                    nonull: true
                },
                src: [
                    "assets/js/model.cpuinfo.js",
                    "assets/js/model.logcat.js",
                    "assets/js/model.meminfo.js",
                    "assets/js/model.fs.js",
                    "assets/js/model.options.js",
                    "assets/js/model.process.js",
                    "assets/js/view.chart.js",
                    "assets/js/view.logcat.js",
                    "assets/js/view.process.js",
                    "assets/js/view.process.details.js",
                    "assets/js/view.fs.js",
                    "assets/js/view.tab.fs.js",
                    "assets/js/view.tab.ps.js",
                    "assets/js/pstree.js",
                    "assets/js/app.js"
                ],
                dest: "dist/public/js/<%= pkg.name %>_main.js"
            }
        },

        uglify: {
            dist: {
                options: {
                    sourceMap: true
                },
                files: {
                    "dist/public/js/<%= pkg.name %>_libs.min.js": ["<%= concat.dist_libs.dest %>"],
                    "dist/public/js/<%= pkg.name %>_main.min.js": ["<%= concat.dist_main.dest %>"]
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
                command: "npm --python=$(which python2) --production install",
                stdout: false,
                stderr: false,
                cwd: "dist"
            },
            md5sum: {
                command: "md5sum out/process-explorer.zip | cut -f 1 -d ' ' > out/process-explorer.zip.md5sum"
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
        },

        chmod: {
            options: {
                mode: "755"
            },
            node: {
                src: ["dist/node"]
            }
        },

        compress: {
            dist: {
                options: {
                    archive: "out/process-explorer.zip",
                    mode: 0
                },
                files: [
                    { expand: true, cwd: "./dist", src: ["./**"] }
                ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-css");
    grunt.loadNpmTasks("grunt-copy-to");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-jade");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-pack");
    grunt.loadNpmTasks("grunt-chmod");

    grunt.registerTask("default", ["mkdir", "copyto", "concat", "uglify", "cssmin", "jade", "exec:npm_install"]);
    grunt.registerTask("pack", ["default", "chmod", "compress", "exec:md5sum"]);
}

