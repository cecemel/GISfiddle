/*
 * Gathers some generic useful geo functions
 */
"use strict";

var geoUtils = {
  GEOJSONVALIDATORURL: 'http://geojsonlint.com/validate',

  /*
   * gets location
   * Q: promises library resolve([lat, long])
   * dummyLocation: [lat, long] if failing to fetch it
   */
   getCurrentLocation: function(dummyLocation) {
    var deferred = Q.defer();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          deferred.resolve([position.coords.latitude, position.coords.longitude]);
        },
        function(err) {
          console.log("got error retreiving location " + err);
          deferred.resolve(dummyLocation);
        }, {
          enableHighAccuracy: false,
          timeout: 10 * 1000,
          maximumAge: 0
        }
      )
    } else {
      deferred.resolve(dummyLocation)
    }

    return deferred.promise;
  },

  /*
   * validates a string as potential geojson
   * $: jquery
   * stringToValidate
   * see: http://geojsonlint.com/ for doc
   */
  validateGeoJsonString: function(stringToValidate) {
    return Q.promise(function(resolve, reject) {
      $.ajax({
        type: "POST",
        url: geoUtils.GEOJSONVALIDATORURL,
        data: stringToValidate,
        dataType: "JSON"
      }).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        if (!jqXHR.responseText) {
          jqXHR.responseText = "General error whilst validating geojson on " + geoUtils.GEOJSONVALIDATORURL
        }
        reject(jqXHR.responseText);
      });
    });
  },

  isGeoJson: function(data) {
    var deferred = Q.defer();
    geoUtils.validateGeoJsonString(data)
      .then(function(result) {
        result.status === "ok" ? deferred.resolve(true) : deferred.resolve(false);
      });
    return deferred.promise;
  }
}
