'use strict';

var through = require('through2');    // npm install --save through2
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var utf8 = require('utf8');
var parseString = require('xml2js').parseString;
var moment = require('moment-timezone');
var _ = require('lodash');

module.exports = function(options) {
    options = options || {};
    var fileContents = {};

    var convertCities = function(){
        var cities = {};
        var cityArray = fileContents['cities15000.txt'].split(/\r?\n/);
        for (var i=0; i < cityArray.length; i++){
            var line = cityArray[i].trim().split("\t");
            if (/\S/.test(line)){
                var mainName = [line[2]];
                var translatedNames = _.union(mainName, line[3].split(','));
                var country = line[8];
                var state = country == 'US' && line[10] || undefined;
                var population = parseInt(line[14]);
                var timezone = line[17];
                var isCapital = line[7] == 'PPLC' || undefined;

                for (var j =0;j<translatedNames.length; j++){
                    var cityName = translatedNames[j];
                    var cityKey;
                    if (state){
                        cityKey = country + '/' + cityName + '/' + state;
                    }
                    else{
                        cityKey = country + '/' + cityName;
                    }
                    cityKey = cityKey.replace(' ', '_');
                    // There was already a city with that name, let the one
                    // with the higher population win.
                    if (!cities.hasOwnProperty(cityKey) || population > cities[cityKey].population){
                        cities[cityKey] = {
                            country: country,
                            state: state,
                            name: cityName,
                            timezone: timezone,
                            population: population,
                            isCapital: isCapital
                        };
                    }
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

    var getWindowsZones = function(){
        var mapZones;
        parseString(fileContents['windowsZones.xml'], function(err, results){
            mapZones = results.supplementalData.windowsZones[0].mapTimezones[0].mapZone;
        });

        var rv = {};

        for (var i=0; i <mapZones.length; i++){
            if (mapZones[i].$.territory == '001'){
                rv[mapZones[i].$.other] = mapZones[i].$.type;
            }
        }
        return rv;
    };

    var getTimezones = function(){
        var tzData = JSON.parse(fileContents['latest.json']);
        return tzData;
    };

    var combineData = function(countries, cities, tzData, windowsZones){
        var selectables = [];
        var timezoneMapping = {};
        var timezonesFound = {};

        var saveSelectable = function(key, name, fullName, tz, country, commonTz, sortInfo){
            var re = new RegExp(/[\-=_!"#%&'*{},.\/:;?\(\)\[\]@\\$\^*+<>~`\u00a1\u00a7\u00b6\u00b7\u00bf\u037e\u0387\u055a-\u055f\u0589\u05c0\u05c3\u05c6\u05f3\u05f4\u0609\u060a\u060c\u060d\u061b\u061e\u061f\u066a-\u066d\u06d4\u0700-\u070d\u07f7-\u07f9\u0830-\u083e\u085e\u0964\u0965\u0970\u0af0\u0df4\u0e4f\u0e5a\u0e5b\u0f04-\u0f12\u0f14\u0f85\u0fd0-\u0fd4\u0fd9\u0fda\u104a-\u104f\u10fb\u1360-\u1368\u166d\u166e\u16eb-\u16ed\u1735\u1736\u17d4-\u17d6\u17d8-\u17da\u1800-\u1805\u1807-\u180a\u1944\u1945\u1a1e\u1a1f\u1aa0-\u1aa6\u1aa8-\u1aad\u1b5a-\u1b60\u1bfc-\u1bff\u1c3b-\u1c3f\u1c7e\u1c7f\u1cc0-\u1cc7\u1cd3\u2016\u2017\u2020-\u2027\u2030-\u2038\u203b-\u203e\u2041-\u2043\u2047-\u2051\u2053\u2055-\u205e\u2cf9-\u2cfc\u2cfe\u2cff\u2d70\u2e00\u2e01\u2e06-\u2e08\u2e0b\u2e0e-\u2e16\u2e18\u2e19\u2e1b\u2e1e\u2e1f\u2e2a-\u2e2e\u2e30-\u2e39\u3001-\u3003\u303d\u30fb\ua4fe\ua4ff\ua60d-\ua60f\ua673\ua67e\ua6f2-\ua6f7\ua874-\ua877\ua8ce\ua8cf\ua8f8-\ua8fa\ua92e\ua92f\ua95f\ua9c1-\ua9cd\ua9de\ua9df\uaa5c-\uaa5f\uaade\uaadf\uaaf0\uaaf1\uabeb\ufe10-\ufe16\ufe19\ufe30\ufe45\ufe46\ufe49-\ufe4c\ufe50-\ufe52\ufe54-\ufe57\ufe5f-\ufe61\ufe68\ufe6a\ufe6b\uff01-\uff03\uff05-\uff07\uff0a\uff0c\uff0e\uff0f\uff1a\uff1b\uff1f\uff20\uff3c\uff61\uff64\uff65]+/g);
            var tokens = fullName.toLowerCase().replace(re, '').split(' ');
            sortInfo = sortInfo !== undefined ? sortInfo : {};
            tokens = _.chain(tokens).union(getAbbrs(tz)).sortBy().value();
            var rv = {
                'k': key,
                'd': fullName,
                'z': tz,
                'T': tokens.join(' '),
                'sortinfo': sortInfo
            };

            if (name != fullName){
                rv.n = name;
            }
            if (country !== undefined){
                rv.c = country;
            }
            if (commonTz){
                rv.C = 1;
            }

            selectables.push(rv);
            };

        var getAbbrs = function(tz){
            var zone = tzData.zones[timezoneMapping[tz]];
            var abbrs = zone.split('|')[1].split(' ');
            var tzName = zone.split('|')[0];
            var abbrOffsetIndex = zone.split('|')[3].slice(-2);
            var returnVals = [];
            for (var i=0;i<abbrOffsetIndex.length; i++){
                returnVals.push(abbrs[parseInt(abbrOffsetIndex[i], 16)].toLowerCase());
            }
            return returnVals;
        };

        var score = function(item){
            var itemScore = 0;
            var isCanonical = function(fullName, abbrList){
                var words = fullName.trim().split(' +');
                var canonAbbr = "";
                if (words.length === 1){
                    canonAbbr = words[0].toLowerCase();
                }
                else{
                    for (var i=0;i < words.length; i++){
                        canonAbbr += words[i][0].toLowerCase();
                    }
                }
                if (abbrList.indexOf(canonAbbr) > -1){
                    return true;
                }
                return false;
            };
            if (item.hasOwnProperty('C')){
                itemScore += 5;
            }
            if (isCanonical(item.d, item.T.split(' '))){
                itemScore += 5;
            }
            if (item.hasOwnProperty('sortinfo') && Object.keys(item.sortinfo).length !== 0){
                if(item.sortinfo.city.isCapital){
                    itemScore += 1;
                }
                itemScore += Math.log(Math.max(item.sortinfo.city.population, 1)) / 50.0;
            }
            return -itemScore;
        };

        for (var i=0; i < tzData.zones.length; i++){
            var tz = tzData.zones[i].split('|')[0];
            if(!timezoneMapping.hasOwnProperty(tz)) {
                timezoneMapping[tz] = i;
            }
        }
        var reverseTzMap = _.invert(timezoneMapping);

        for (i=0; i < tzData.links.length; i++){
            var split = tzData.links[i].split('|');
            var target = split[0];
            var tz2 = split[1];
            timezoneMapping[tz2] = timezoneMapping[target];
        }



        for(var city in cities ){
            var keyName = (cities[city].country.toLowerCase() + ":" + cities[city].name + ':' + (cities[city].state || '')).replace(/\:+$/, '').toLowerCase() ;
            keyName = keyName.replace(' ', '-')
            .replace('_', '-')
            .replace('\'', '')
            .replace(',', '')
            .replace('(', '')
            .replace(')', '');
            var displayParts = [countries[cities[city].country].name];
            if (cities[city].hasOwnProperty('state') && cities[city].state !== undefined){
                displayParts.push(cities[city].state);
            }
            displayParts.push(cities[city].name);
            saveSelectable(keyName, cities[city].name, displayParts.join(', '), cities[city].timezone, cities[city].country, false, {city: cities[city]});
            timezonesFound[cities[city].timezone] = 1;
        }

        for (var name in timezoneMapping){
            if (!timezonesFound.hasOwnProperty(name) && (name.toLowerCase().indexOf('/') === -1 || name.toLowerCase().indexOf('etc/') === 0)){
                var key = name.toLowerCase()
                .replace('_', '-')
                .replace('/', ':')
                .replace(',', '')
                .replace('\'', '');
                saveSelectable(key, name.split("/").slice(1).join('/'), name, name, undefined, false);
            }
        }

        for (var wName in windowsZones) {
            var wKey = wName.toLowerCase().split(' ').join('_')
            .replace('(', '')
            .replace(')', '')
            .replace(',', '');
            saveSelectable(wKey, wName, wName, windowsZones[wName], undefined, true);
        }


        var sortedSelectables = _.sortBy(selectables, [function(o){
            return score(o);
        },
        function(p){
            return p.d.toLowerCase();
        }]);

        _.forEach(selectables, function(n){
            delete n.sortinfo;
        });




        return {
            'tzmap': reverseTzMap,
            'selectables': sortedSelectables
        };

    };

    function bufferContents(file, encoding, callback) {

        if (file.isStream()) {
            this.emit('error', new Error('Streaming not supported'));
            return callback();
        }

        var fileName = path.basename(file.path);
        fileContents[fileName] = file.contents.toString();
        callback();
    }

    function endStream(callback) {
        if (!fileContents) {
            console.log("Error!");
          callback();
          return;
        }

        var countryData = convertCountries();
        var cityData = convertCities();
        var windowsZones = getWindowsZones();
        var tzData = getTimezones();


        var combinedJson = combineData(countryData, cityData, tzData, windowsZones);

        var self = this;
        var timezoneFile = new File({
            path: 'output.json',
            contents: new Buffer(JSON.stringify(combinedJson))
        });
        self.push(timezoneFile);
        callback();
    }


    return through.obj(bufferContents, endStream);
};
