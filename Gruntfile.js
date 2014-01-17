module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        // tasks
        clean: {
            release: ['release', '_site']
        },
        compass: {
            dev: {
                options: {}
            },
            dist: {
                options: {
                    environment: 'production'
                }
            }
        },
        connect: {
            server: {
                options: {
                    port: 5000,
                    base: '_site/',
                    livereload: true
                }
            }
        },
        copy: {
            cssDev: {
                files: [
                    {src: ['css/**'], dest: '_site/'}
                ]
            },
            release: {
                files: [
                    {src: ['css/**'], dest: 'release/'},
                    {src: ['_layouts/**'], dest: 'release/'},
                    {src: ['index.html'], dest: 'release/'},
                    {src: ['_posts/**'], dest: 'release/'}
                ]
            }
        },
        filerev: {
            cssRelease: {
                src: ['release/css/main.css']
            }
        },
        shell: {
            jekyllBuildDev: {
                command: 'jekyll build',
                stdout: true
            },
            jekyllBuildRelease: {
                command: 'jekyll build --config _config.release.yml',
                stdout: true
            }
        },
        usemin: {
            html: ['release/_layouts/default.html'],
            options: {
                assetsDirs: ['release']
            }
        },
        'useminPrepare': {
            html: '_layouts/default.html',
            options: {
                dest: 'release',
                root: '.'
            }
        },
        watch: {
            sass: {
                files: 'sass/*.scss',
                tasks: ['compass:dev']
            },
            css: {
                files: 'css/**/*.css',
                tasks: ['copy:cssDev'],
                options: {
                    livereload: true
                }
            },
            jekyllSource: {
                files: ['_layouts/**', '_posts/**', '*.html', '_config.yml'],
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

    grunt.registerTask('develop', ['connect', 'watch']);
    grunt.registerTask('release', [
        'clean:release',
        'copy:release',
        'useminPrepare',
        'concat',
        'cssmin',
        'filerev:cssRelease',
        'usemin',
        'shell:jekyllBuildRelease'
    ])

};