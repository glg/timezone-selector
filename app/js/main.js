'use strict';

require('angular');
require('angular-route');
require('angular-animate');
require('angular-cookies');
require('angular-cache');
require('angular-sanitize');
require('angular-touch');



var timezoneSelector = angular.module('TimezoneSelector', ['ngRoute', 'ngAnimate'])
  .config([
    '$locationProvider',
    '$routeProvider',
    function($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');
      // routes
      $routeProvider
        .when("/", {
          templateUrl: "./templates/timezone-dialog.html",
          controller: "MainController"
        })
        .otherwise({
           redirectTo: '/'
        });
    }
  ])

  .controller('MainController', require('./controllers/controller'))
