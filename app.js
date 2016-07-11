/*
 * Main entry point for quick-postgis-vis
 */

var express = require("express");
var logger = require('log4js').getLogger();
var bodyParser = require("body-parser");
var config = require("config");
var serverConfig = config.get("server");
var xssFilters = require("xss-filters");
var entities = new require("html-entities").AllHtmlEntities;

var postgisDao = require("./postgisDao");
var utils = require("./utils")
var sessionsDao = require("./sessionsDao");

/********************************************************************************************************************
 * init
 ********************************************************************************************************************/
var sessionsDb = sessionsDao.connect().catch(function(err) {
  throw (err);
});
var app = express();
var root = "./client";
app.use(bodyParser.urlencoded({
  extended: true
}));

/********************************************************************************************************************
 * routes
 ********************************************************************************************************************/
app.use(express.static(root));
app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  //all 'browser' calls -> return index: one page app hack?
  if (!req.headers.accept.match("application/json")) {
    res.sendFile("index.html", {
      root: "./client"
    });
    return;
  }
  next();
});

app.post("/queries", function(request, response, next) {
  var query = request.body["query"];

  query = entities.decode(query); //remove html escaped characters after xss-filter

  _verifyQueries([query])
    .then(function(queryArr){return postgisDao.executeQuery(queryArr[0])})
    .then(
      function(val) {
        logger.info("query ok:" + query);
        _sendResponse(response, 200, val.rows);
      }
    )
    .catch(
      function(err) {
        logger.error("Got error: " + err + " for query " + query);
        _sendResponse(response, 400, err); //currently don't care client sees errors
      }
    )
});

app.get("/sessions/:sessionid", function(request, response, next) {
  sessionsDao.getSessionById(sessionsDb, request.params.sessionid)
    .then(utils.curry(_xssFilter, xssFilters.inHTMLData))
    .then(function(result) {
      _sendResponse(response, 200, result);
    })
    .catch(function(err) {
      logger.error("Got error fetching session: " + err + " for session " + request.params.sessionid);
      _sendResponse(response, 400, err);
    })
})

app.post("/sessions", function(request, response, next) {
  var sessionData = request.body;
  _xssFilter(entities.decode, sessionData)
    .then(_isValidSessionData)
    .then(function(isValidSession) {
      return sessionsDao.insertSession(sessionsDb, sessionData);
    })
    .then(function(result) {
      _sendResponse(response, 200, result.insertedId.toString());
    })
    .catch(function(err) {
      logger.error("Got error saving session: " + err);
      _sendResponse(response, 400, err);
    })
})

app.get("/schemas", function(request, response, next){
  postgisDao.schemaInfo()
  .then(function(data){
    _sendResponse(response, 200, data.rows);
  })
  .catch(function(err) {
      logger.error("Got error fetching schemaInfo: " + err);
      _sendResponse(response, 400, err);
  });
})

//run server
app.listen(serverConfig.port, function() {
  logger.info("Listening on port " + serverConfig.port);
});

/********************************************************************************************************************
 * helpers
 ********************************************************************************************************************/
function _xssFilter(encodingFunction, sessionData) {
  return new Promise(function(resolve, reject) {
    var jsonStr = JSON.stringify(sessionData);
    var cleaned = encodingFunction(jsonStr);
    resolve(JSON.parse(cleaned));
  });
}

function _isValidSessionData(sessionData) {
  return new Promise(function(resolve, reject) {
    
    //lightweight form validation
    var cleanedData = sessionData.sessionData.map(function(e) {
      if (!("options" in e && "query" in e)) {
        reject("The provided data is not considered valid session data!")
      }
      return {"options": e["options"], "query": e["query"]};
    });

    _verifyQueries(cleanedData.map(function(e){return e["query"]}))
    .then(function(){
      resolve(cleanedData);
    })
    .catch(reject);

  });
}

function _totalQuerySize(queries){
  var promises = queries.map(postgisDao.getQuerySize)
  return utils.promisesReduce(promises, function(prev, curr){prev += curr; return prev}, 0)
}

function _verifyQueries(queries) {
  //checks now it does not return too much rows...
  return _totalQuerySize(queries)
    .then(function(size) {
      if (size > 10000) {
        return Promise.reject("The response could explose your browser's memory, please make sure the total number of rows does not exceed 10000");
      }
      return Promise.resolve(queries);
    })
    .catch(utils.passRejectedPromise);
}

function _sendResponse(response, statusCode, data) {
  response.status(statusCode);
  response.header("Content-Type", "application/json");
  response.send(JSON.stringify(data));
}
