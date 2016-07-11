/**
 * Access sessions peristant layer
 **/
var config = require("config");
var mongoClient = require("mongodb").MongoClient;
var ObjectID = require('mongodb').ObjectID;
var url = config.get("sessionsDb.connectionString");
var sessionColl = "sessions";

function getSessionById(db, sessionId) {
  return new Promise(function(resolve, reject) {
    db.then(function(db) {
      var collection = db.collection(sessionColl);
      collection.find({_id : new ObjectID(sessionId)})
      .toArray(function(error, results){
        if (error) {
          reject(error);
          return;
        }
        resolve(results[0] || []);
      })

      });
    });
}

function insertSession(db, sessionData) {
  return new Promise(function(resolve, reject) {
    db.then(function(db) {
      var collection = db.collection(sessionColl);
      console.log('got collection...')
      collection.insertOne(sessionData,
        function(insertError, result) {
          if (insertError) {
            reject(insertError);
            return;
          }
          console.log("insert session OK");
          resolve(result);
        })
    })
  });
}

function connect() {
  return new Promise(function(resolve, reject) {
    mongoClient.connect(url, function(err, db) {
      if (err) {
        reject(err);
        return;
      }
      console.log("connected to " + url);
      resolve(db);
    })
  });
}

module.exports = {
  connect: connect,
  insertSession: insertSession,
  getSessionById: getSessionById
}
