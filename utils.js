/*
 * collection of 'generic' useful functions
 */

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
function curry() {
  var slice = [].slice;
  var args, fn;
  fn = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
  return function() {
    var appendedArgs;
    appendedArgs = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return fn.apply(null, slice.call(args).concat(slice.call(appendedArgs)));
  };
};

function promisesReduce(promises, func, init){
	return Promise.all(promises)
	.then(function(results){
		return results.reduce(func, init);
	})
	.catch(passRejectedPromise);
}

//see: https://github.com/nodejs/node/issues/2181 why this function exists
function passRejectedPromise(err){
	return Promise.reject(err)
}

module.exports = {
  curry: curry,
  promisesReduce: promisesReduce,
  passRejectedPromise: passRejectedPromise
}
