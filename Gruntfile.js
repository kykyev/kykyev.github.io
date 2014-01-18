module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // tasks
        clean: {
            release: ['css/', '_layouts/', '_site.release']
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
                        src: ['dev/css/main.css'],
                        dest: '_site.dev/css/main.css'
                    }
                ]
            }
        },
        filerev: {
            cssRelease: {
                src: ['css/main.css']
            }
        },
        shell: {
            copyRelease: {
                command: 'cp -r dev/css .; cp -r dev/_layouts .; cp dev/index.html .',
                stdout: true
            },
            jekyllBuildDev: {
                command: 'jekyll build --config _config.dev.yml',
                stdout: true
            },
            jekyllBuildRelease: {
                command: 'jekyll build',
                stdout: true
            }
        },
        usemin: {
            html: ['_layouts/default.html'],
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
            css: {
                files: 'dev/css/**/*.css',
                tasks: ['copy:cssDev'],
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
    grunt.loadNpmTasks('grunt-usemin');

    grunt.registerTask('develop', [
        'shell:jekyllBuildDev',
        'connect',
        'watch'
    ]);
    grunt.registerTask('release', [
        'clean:release',
        'shell:copyRelease',
        'useminPrepare',
        'concat',
        'cssmin',
        'filerev:cssRelease',
        'usemin',
        'shell:jekyllBuildRelease'
    ])

};