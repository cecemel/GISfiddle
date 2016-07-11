/**
 * Access postgis db
 **/
var config = require('config');
var pg = require('pg');
var utils = require('./utils')

var conString = config.get('gisDb.connectionString');

function getQuerySize(query) {
  return explainQuery(query)
    .then(function(queryMeta) {
      return queryMeta.rows[0]["QUERY PLAN"][0].Plan["Plan Rows"]
    }).catch(utils.passRejectedPromise)
}

function explainQuery(query) {
  var expQuery = "EXPLAIN (FORMAT JSON) " + query;
  return executeQuery(expQuery);
}

function schemaInfo(){
  var query = "SELECT column_name, data_type, udt_name, table_name" 
              + " FROM information_schema.columns"
              + " WHERE table_schema = 'public'";
  return executeQuery(query);
}

function executeQuery(query) {
  return new Promise(function(resolve, reject) {
    pg.connect(conString, function(error, client, done) {
      if (error) reject(error);
      client.query(query, [],
        function(error, result) {
          done();
          if (error) reject(error);

          result = _colnamesIfNoRows(result);
          resolve(result);
        });
    });
  });
}

function _colnamesIfNoRows(result){
  if(!result || result.rows.length > 0){
    return result;
  }
  result = [result.fields.reduce(function(prev, curr){
    prev[curr["name"]] = "";
    return prev;
  }, {})]

  return result
}

module.exports = {
  getQuerySize: getQuerySize,
  explainQuery: explainQuery,
  executeQuery: executeQuery,
  schemaInfo: schemaInfo
}
