'use strict';

var through = require('through2');    // npm install --save through2
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;

module.exports = function(options) {
    options = options || {};
    var fileContents = {};

    function bufferContents(file, encoding, callback) {

        if (file.isStream()) {
            this.emit('error', new Error('Streaming not supported'));
            return callback();
        }

        var fileName = path.basename(file.path);
        fileContents[fileName] = file.contents.toString();
        callback();
    };

    function endStream(callback) {
        if (!fileContents) {
            console.log("Error!")
          callback();
          return;
        }

        var cities1000 = fileContents['cities1000.txt'];
        var cities15000 = fileContents['cities15000.txt'];
        var countries = fileContents['countryInfo.txt'];

        console.log(countries);

        var self = this;
        var timezoneFile = new File({
            path: 'output.json',
            contents: new Buffer(JSON.stringify(fileContents))
        });
        self.push(timezoneFile);
        callback();
    };


    return through.obj(bufferContents, endStream);
};
