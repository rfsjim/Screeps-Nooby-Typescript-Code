module.exports = function(grunt) {

  var config = require('./.screeps.json');
  var branch = grunt.option('branch') || config.branch;
  var email = grunt.option('email') || config.email;
  var token = grunt.option('token') || config.token;
  var ptr = grunt.option('ptr') ? true: config.ptr;

  grunt.loadNpmTasks('grunt-screeps');
  grunt.loadNpmTasks('grunt-file-append');

  var currentDate = new Date();

  // output current date and branch
  grunt.log.subhead('Task Start: ' + currentDate.toLocaleDateString());
  grunt.log.writeln('Branch: ' + branch);

  grunt.initConfig({
    screeps: {
      options: {
        email: email,
        token: token,
        branch: branch,
        ptr: ptr
        //server: 'season'
      },
      dist: {
        src: ['src/*.js']
      }
    },

    // Add Version information
    file_append: {
      versioning: {
        files:[
          {
            append: "\nglobal.SCRIPT_VERSION = " + currentDate.getTime() + "\n",
            input: 'src/version.js'
          }
        ]
      }
    }
  })

  grunt.registerTask('default', ['file_append:versioning', 'screeps']);
}
