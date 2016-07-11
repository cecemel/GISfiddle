/*
 * collection of 'generic' useful functions
 */
"use strict";
var utils = {

  /*
   * posts json string, returns promise
   * See why wrapping ajax in Q is still ok: 
   * https://github.com/kriskowal/q/wiki/Coming-from-jQuery
   */
  postJson: function(url, jsonString) {
    return Q.promise(function(resolve, reject) {
      $.ajax({
        type: "POST",
        url: url,
        data: jsonString,
        dataType: "JSON"
      }).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        reject(jqXHR.responseText);
      });
    });
  },

  getJson: function(url) {
    return Q.promise(function(resolve, reject) {
      $.ajax({
        type: "GET",
        url: url,
        dataType: "JSON"
      }).then(function(data) {
        resolve(data);
      }, function(jqXHR) {
        reject(jqXHR.responseText);
      });
    });
  },

  /**
   * curry
   * with courtesy of M@DNIFICENT
   * e.g. \
   * 
   * sayHello = function (user, target) {
   *   return window.alert(user + " -> " + target + " :: Hello!");
   *   };
   *  sayHelloAad = curry(sayHello, "Aad");
   *  sayHelloAad("Felix");
   * 
   */
  curry: function() {
    var slice = [].slice;
    var args, fn;
    fn = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
    return function() {
      var appendedArgs;
      appendedArgs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      return fn.apply(null, slice.call(args).concat(slice.call(appendedArgs)));
    };
  },

  /*
   * transposes  [ {c1: ...}, ... { c1, ...}] to {c1 : [], ... cn : []}
   */
  transpose: function(data) {
    return data.reduce(function(memo, curr) {
      Object.keys(curr).forEach(function(key) {
        (memo[key] && memo[key].push(curr[key])) || (memo[key] = [curr[key]])
      })
      return memo;
    }, {})
  },

  /*
   * given a set of columlabels, find first value matching predicate
   */
  findColumnsVal: function(tableData, cols, predicate) {
    return utils.arrify(cols).reduce(function(memo, currKey) {
      memo.push(_.chain(tableData)
        .pluck(currKey)
        .find(predicate).value())
      return memo;
    }, [])
  },

  existy: function(data) {
    return !(_.isNaN(data) || _.isNull(data) || _.isUndefined(data));
  },

  arrify: function(data) {
    return (data instanceof Array) ? data : [data];
  },

  /*
   * returns keys of which values match predicate, returns promise
   */
  filterKeysAsync: function(data, predicate) {
    var deferred = Q.defer();
    var keys = _.keys(data);
    var vals = _.values(data);

    Q.all(vals.map(predicate))
      .done(function(results) {
        deferred.resolve(keys.filter(function(e, i) {
          return results[i]
        }));
      }, deferred.reject);

    return deferred.promise;
  },

  /*
   * given an array of promises, and generic data object, pipes the data through the array of promises
   */
  pipeData: function(promises, errorHandler, data) {
    return promises.reduce(function(prev, curr) {
      return prev.then(curr).fail(errorHandler);
    }, Q(data)).done();
  },

  /*
   * groups by key, but then recursivly
   */
  subGroupBy: function(hierarchy, data) {
    if (hierarchy.length == 0) {
      return data;
    }

    var groupedData = _.groupBy(data, hierarchy[0])
    _.keys(groupedData)
     .forEach(function(key) {
        groupedData[key] = utils.subGroupBy(_.rest(hierarchy), groupedData[key])
      })

    return groupedData;
  }
}
