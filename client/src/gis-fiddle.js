/********************************************************************************************************************
 * QUERY PROCESSING
 ********************************************************************************************************************/
function initQuery(){
  return {query : "", options: {}, result: {}, log: {}, rawResult: []};
}

function startQueryPipeline(data){
  var deferred = Q.defer();
  var queryObj = initQuery()
  queryObj["query"] = data.query;
  queryObj.options["color"] = data.color;

  deferred.resolve(queryObj);

  return deferred.promise;
}

function validateInput(queryObj) {
  var deferred = Q.defer();
  var cleanedData = xssFilters.inHTMLData(queryObj.query);
  if(!queryObj.query || !queryObj.query.trim()){
    deferred.reject("Please provide a query, e.g. SELECT ST_AsGeoJSON(linestring) FROM ways LIMIT 10;");
  }
  else{
    queryObj.query = cleanedData
    deferred.resolve(queryObj);
  }
  return deferred.promise;
}

function runQuery(queryObj) {
  return utils.postJson("/queries", queryObj)
  .then(function(data){
    queryObj.rawResult = data;
    return queryObj;
  });
}

/*
 * Interprets query result, and tries to build geojson from it
 * Parses output similar to
 * {rawResult: [ {c1: value , ..., cn: value}, ... ,{...}]}
 * to: 
 *  - if contains geojson
 *    {result: {"data" : [{geojson1}, ..., {geojson}], "type" : "geoJson"},  "log" :{"type" : "warning" , "msg": "...."}}}
 *     
 *  - else
      {result: {"data" : [{c1: value , ..., cn: value}, ... ,{...}], "type" : "table"},  "log" :{"type" : "warning" , "msg": "...."}}}
 *
 * Note: if multiple geoJson columns are found, it will build a geojson from the firs encountered geosjon column
 * TODO: 
 * - test on empty input, test on non geojson input, test on parse query error
 * - the function is too complex, refactor
 */
function parseQueryResult(queryObj) {
  var deferred = Q.defer();

  if(queryObj.rawResult.length == 0){
    queryObj.log = {type: "warning", msg: "No rows found..."}
    deferred.resolve(queryObj)
    return deferred.promise;
  }

  extractGeoJsonColumns(queryObj.rawResult)
    .then(function(geoJsonColumns) {

      var logs = {type: "success", msg: "All ok!" 
                     + " (" + queryObj.rawResult.length + " rows found)"}
      
      var parsedResults = {
        "type": "geoJson",
        "data": queryObj.rawResult
      };

      if (geoJsonColumns.length == 0) {
        logs = {type: "warning", msg: "No geoJson found, results may be found in results table." 
                   + " (" + queryObj.rawResult.length + " rows found)"}
        
        parsedResults.type = "table";

        queryObj.result = parsedResults;
        queryObj.log = logs;

        return deferred.resolve(queryObj)
      }

      if (geoJsonColumns.length > 1) {
        logs = {
          "type": "warning",
          "msg": "Multiple geoJson found, using only column : " + geoJsonColumns[0]
                 + "(" + queryObj.rawResult.length + " rows found)"
        };
      }

      //clean out the null geojsons cells...
      parsedResults.data = parsedResults.data.filter(function(e) {
        return e[geoJsonColumns[0]] != undefined
      });

      parsedResults.data = parsedResults.data.map(utils.curry(rowAsGeoJson, geoJsonColumns[0]));

      queryObj.result = parsedResults;
      queryObj.log = logs;

      return deferred.resolve(queryObj)

    }).catch(deferred.reject);

  return deferred.promise;
}

function extractGeoJsonColumns(data) {
  var cols = Object.keys(_.first(data));
  var colsVal = utils.findColumnsVal(data, cols, utils.existy);
  return utils.filterKeysAsync(_.object(cols, colsVal), geoUtils.isGeoJson);
}

function rowAsGeoJson(geoJsonKey, row) {
  var keys = Object.keys(row);
  var geoJson = JSON.parse(row[geoJsonKey]);
  geoJson["properties"] = {};

  for (var key in keys) {
    var column = keys[key]
    if (column == geoJsonKey) {
      continue;
    }

    geoJson["properties"][column] = row[column]
  }

  return geoJson;
}

function updateModel(model, queryObj){
  var deferred = Q.defer();

  var newId = model.length;
  queryObj.id = newId;

  //keep only track of metaData
  model.push(_.omit(queryObj, 'result', 'log', 'rawResult'));

  deferred.resolve(queryObj);
  return deferred.promise;
}

function updateUiQueryResult(queryObj){
  var deferred = Q.defer();

  document.dispatchEvent(new CustomEvent("updateInfo", {'detail': queryObj.log}));
  document.dispatchEvent(new CustomEvent("queryResult", {'detail': queryObj}));

  deferred.resolve(queryObj);
  return deferred.promise
}

/********************************************************************************************************************
 * SCHEMA TREE
 ********************************************************************************************************************/
 function updateSchemaTree(){
  utils.getJson("/schemas")
  .then(utils.curry(utils.subGroupBy, ["table_name", "column_name"]))
  .then(function(data){
    document.dispatchEvent(new CustomEvent('schemaResult', { 'detail': data}));
  });
 }

/********************************************************************************************************************
 * SESSION SAVING
 ********************************************************************************************************************/
function saveModel(model) {
  var cleanedResults = {
    "sessionData": model
  };
  return utils.postJson("/sessions", cleanedResults);
}

function updateUrlSessionId(sessionID) {
  return Q(window.history.pushState("", "", "/sessions/" + sessionID));
}

function updateUiSaveSession(){
  return Q(document.dispatchEvent(new CustomEvent("updateInfo", {'detail': {type: "success", msg: "Saved success!"}})));
}

/********************************************************************************************************************
 * SESSION LOADING
 ********************************************************************************************************************/
 function loadSceneBackend(model,uri) {
  document.dispatchEvent(new CustomEvent('updateInfo', { 'detail': {type: "info", msg: "loading scene, please hold on..."}}));
  var pipelineTemplate = [validateInput, runQuery, parseQueryResult, updateUiLoadScene];
  var fullPipeline = []
  utils.getJson(uri)
  .then(function(data) {
      data['sessionData'].forEach(function(data){
        var queryObj = initQuery();
        queryObj.query = data.query;
        queryObj.options = data.options;
        queryObj.id = data.id;

        model.push(queryObj);

        var initCall = [function(){return Q(queryObj)}].concat(pipelineTemplate);
        fullPipeline = fullPipeline.concat(fullPipeline, initCall) //basically making one long pipeline, not efficient don't care
      })

      //finishing message
      fullPipeline.push(function(){
        return Q(document.dispatchEvent(new CustomEvent("updateInfo", {'detail': {type: "success", msg: "loading success!"}})))
      })
      utils.pipeData(fullPipeline, promiseErrorHandler);

    })
  .catch(promiseErrorHandler)
}

function updateUiLoadScene(queryObj){
  var deferred = Q.defer();

  document.dispatchEvent(new CustomEvent("queryResult", {'detail': queryObj}));
  document.dispatchEvent(new CustomEvent('updateInfo', { 'detail': {type: "info", msg: "loaded a query, moving on..."}}));

  deferred.resolve(queryObj);
  return deferred.promise
}

/********************************************************************************************************************
 * UTILS 
 ********************************************************************************************************************/
function promiseErrorHandler(err) {
  document.dispatchEvent(new CustomEvent('updateInfo', {"detail": {type: "danger", msg: err}}));
  var deferred = Q.defer()
  deferred.reject(err)
  return deferred.promise;
}
/********************************************************************************************************************
 * Boiler plate to wire everything
 ********************************************************************************************************************/
$(document).ready(function() {
  var model = [];

  initMap("map", [50.8465565, 4.351697]);
  initResultsTable("results-table", "jqGridPager");
  initHistoryTable("query-history-table");
  initSchemaDisplay("schema-tree");
  updateSchemaTree();
  initInfoBox("execution-info");
  initColorPicker($(".color-picker"));
  initAboutButton($("#button-about"), $("#about"), $("#about-ok"));


  var pipeline = [startQueryPipeline, validateInput, runQuery, parseQueryResult, utils.curry(updateModel, model), updateUiQueryResult];
  pipeline =  utils.curry(utils.pipeData, pipeline, promiseErrorHandler);
  initQueryForm($("#button-run"), $("#box-query"), $("#display-color"), pipeline)


  var savePipeline = [utils.curry(saveModel, model), updateUrlSessionId, updateUiSaveSession]
  initSaveButton($("#button-save"), $("#query-history-table"), utils.curry(utils.pipeData, savePipeline, promiseErrorHandler));

  /********************************************************************************************************************
   * Load existing scene, if provided
   ********************************************************************************************************************/
  if ((window.location.pathname.match(/^\/sessions\/[^\/]*$/) || []).length == 1) {
    loadSceneBackend(model, window.location.pathname);
  }
});
