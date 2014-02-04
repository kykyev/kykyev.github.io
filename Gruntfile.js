module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // tasks
        cssmin: {
            minify: {
                expand: true,
                cwd: 'assets/css/',
                src: ['*.css'],
                dest: 'assets/css/'
            }
        },
        clean: {
            release: ['assets/', '_layouts/', '_posts', '_site.release/', 'index.html']
        },
        compass: {
            dev: {
                options: {
                    basePath: 'dev'
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 5000,
                    base: '_site.dev/',
                    livereload: true
                }
            }
        },
        copy: {
            cssDev: {
                files: [
                    {
                        src: ['dev/assets/css/main.css'],
                        dest: '_site.dev/assets/css/main.css'
                    }
                ]
            }
        },
        filerev: {
            assetsRelease: {
                src: ['assets/css/*.css', 'assets/img/*.*']
            }
        },
        shell: {
            copyRelease: {
                command: 'cp -r dev/assets/ .; cp -r dev/_layouts/ .;' +
                         'cp -r dev/_posts/ .; cp dev/index.html .;',
                stdout: true
            },
            jekyllBuildDev: {
                command: 'jekyll build --config _config.dev.yml;' +
                         'rm -rf _site.dev/assets;' + 'ln -s ../dev/assets _site.dev/assets;',
                stdout: true
            },
            jekyllBuildRelease: {
                command: 'jekyll build',
                stdout: true
            }
        },
        svgmin: {
            release: {
                files: [{
                    expand: true,
                    cwd: 'assets/img',
                    src: ['*.svg'],
                    dest: 'assets/img/'
                }]
            }
        },
        usemin: {
            html: ['_layouts/*.html', '_posts/*.markdown'],
            options: {
                assetsDirs: ['.']
            }
        },
        'useminPrepare': {
            html: '_layouts/default.html',
            options: {
                dest: '.',
                root: '.'
            }
        },
        watch: {
            sass: {
                files: 'dev/sass/**/*.scss',
                tasks: ['compass:dev']
            },
            assets: {
                files: 'dev/assets/**/*.*',
                options: {
                    livereload: true
                }
            },
            jekyllSource: {
                files: ['dev/**/*.html', '_posts/**', '_config.yml'],
                tasks: ['shell:jekyllBuildDev'],
                options: {
                    livereload: true
                }
            }
        },
        webfont: {
            icons: {
                src: 'dev/svg/*.svg',
                dest: 'dev/sass/modules/',
                options: {
                    types: 'woff',
                    embed: true,
                    destHtml: 'dev/',
                    ligatures: true,
                    stylesheet: 'scss'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-filerev');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-svgmin');
    grunt.loadNpmTasks('grunt-usemin');
    grunt.loadNpmTasks('grunt-webfont');

    grunt.registerTask('develop', [
        'shell:jekyllBuildDev',
        'connect',
        'watch'
    ]);
    grunt.registerTask('release', [
        'clean:release',
        'shell:copyRelease',
        'filerev:assetsRelease',
        'cssmin',
        'svgmin',
        'usemin',
        'shell:jekyllBuildRelease'
    ])

};