'use strict';

var through = require('through2');    // npm install --save through2
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var utf8 = require('utf8');

module.exports = function(options) {
    options = options || {};
    var fileContents = {};

    var convertCities = function(){
        var cities = {};
        var cityArray = fileContents['cities15000.txt'].split(/\r?\n/);
        for (var i=0; i < cityArray.length; i++){
            var line = cityArray[i].trim().split("\t");
            if (/\S/.test(line)){
                var mainName = line[2];
                var country = line[8];
                var state = country == 'US' && line[10] || undefined;
                var population = parseInt(line[14]);
                var timezone = line[17];
                var isCapital = line[7] == 'PPLC' || undefined;

                var cityKey;
                if (state){
                    cityKey = country + '/' + mainName + '/' + state;
                }
                else{
                    cityKey = country + '/' + mainName;
                }
                cityKey = cityKey.replace(' ', '_');
                // There was already a city with that name, let the one
                // with the higher population win.
                if (!cities.hasOwnProperty(cityKey) || population > cities[cityKey].population){
                    cities[cityKey] = {
                        country: country,
                        state: state,
                        name: mainName,
                        timezone: timezone,
                        population: population,
                        isCapital: isCapital
                    };
                }
            }
        }
        return cities;
    };

    var convertCountries = function(){
        var countries = {};
        var countryArray = fileContents['countryInfo.txt'].split(/\r?\n/);
        for (var i=0; i < countryArray.length; i++){
            var line = countryArray[i].trim().split("\t");
            if (line && line[0].charAt(0) !== '#'){
                var countryCode = line[0];
                var country = line[4];
                var capital = line[5];
                countries[countryCode] = {
                    name: country,
                    capital: capital,
                    code: countryCode
                };
            }
        }
        return countries;
    };

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

        var countryData = convertCountries();
        var cityData = convertCities();

        console.log(cityData);

        var self = this;
        var timezoneFile = new File({
            path: 'output.json',
            contents: new Buffer(JSON.stringify(fileContents))
        });
        self.push(timezoneFile);
        callback();
    }


    return through.obj(bufferContents, endStream);
};
