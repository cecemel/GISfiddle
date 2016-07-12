#Welcome to GISfiddle!
##About
The project is about the equivalent of jsfiddle, but for GIS systems.
Current implementation only supports postgis queries.

App is still very bare bone so perhaps wait a little more....
##TODOS
 * many things...
 * license
 * 'update' session feature -> just PUT when sessionid is providedx
 * small tables (2 colmns) lay out sucks
 * add passwords backend
 * add some pw check security hook: http://blog.endpoint.com/2010/05/using-postgresql-hooks.html
 * access only one schema mongo
 * remove xssFilter serverside
 * bug loading crappy session (it keeps on loading)
 * bug saving crappy session (crappy session, because crappy stuff or just empty rows)
 * remove queries in query table
 * clear results table after new query
 * replace the strange app thing with '#'
 * limit memory consumption for a query
 * cecemelchocokljlkj: one feature suggestion is the ability to select a bounding box on the map and have some token you can put in the query which gets expanded to it, e.g. so you can write select linestring from ways where linestring && :bbox:
