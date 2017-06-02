var moment = require('moment-timezone');
var tzserviceApiUrl = process.env.NODE_ENV == "development" ? "http://localhost:8888/api/" : "http://services.glgresearch.com/timezone-selector/api/";
var jstz = require('jstimezonedetect');


module.exports = /*@ngInject*/ function($scope, $http) {
    $scope.test = "...";
    $scope.moment = moment;
    $scope.selectedTimezone = undefined;
    $scope.english = true;

    var timezone = jstz.determine().name();

    var setInitialTimezone = function(d){
        $scope.selectedTimezone = d.data[0];
    };

    var errorInitialTimezone = function(d){
        console.log("Error: ", d);
    };

    $http.get(tzserviceApiUrl, {params: {q: timezone, zoneName: 1}}).then(setInitialTimezone, errorInitialTimezone);


    var successCallback = function(d){
        $scope.timezones = d.data;
    };

    var errorCallback = function(e){
        console.log("Error: ", e);
    };

    $scope.querySearch = function (query) {
        $http.get(tzserviceApiUrl, {params: {q: $scope.searchText, poly: $scope.english ? 0 : 1}}).then(successCallback, errorCallback);
    };

    $scope.searchTextChange = function(text) {
        $scope.querySearch(text);
    };

    $scope.selectTimezone = function(item) {
        $scope.selectedTimezone = item;
        $scope.searchText = item.d;
        $scope.timezones = [];
    };

    $scope.formatTimezone = function(tz){
        if (!tz || tz === undefined || !tz.hasOwnProperty('z')){
            return "None";
        }
        else{
            var timestamp = new moment.tz(tz.z);
            var abbr = moment.tz.zone(tz.z).abbr(timestamp);
            return tz.d + ' (' + abbr + ') ' + timestamp.format('h:mm a') + ' ' + timestamp.format('ZZ');
        }
    };
};
