"use strict";

/********************************************************************************************************************
 * MAP
 ********************************************************************************************************************/
function initMap(mapId, location) {
  var baseLayer = L.tileLayer("http://{s}.tile.osm.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  });

  var map = L.map(mapId, {
    center: location,
    zoom: 13, 
    layers: [baseLayer]
  });

  var layerControl = L.control.layers().addTo(map);
  layerControl.addOverlay(baseLayer, "base");

  //L.control.layers(baseLayerControl, null).addTo(map);

  L.marker(location).addTo(map)
    .bindPopup("Hi from authors' home...")
    .openPopup();

  initZoomBehaviour(map);

  //Boilerplate when to update the map
  document.addEventListener("queryResult",
    function(e) {
      var mapData = e.detail;

      if (mapData.result["type"] !== "geoJson") {
        return;
      }

      var layout = {
        style: function() {
          return {
            color: mapData.options.color
          }
        },
        onEachFeature: onEachFeatureRow
      }
      updateMap(map, layout, mapData, layerControl);
      updateMapCenter(map, mapData.result.data);
    });

  return map;
}

function initZoomBehaviour(map) {
  map.scrollWheelZoom.disable();
  map.on("click", function() {
    if (map.scrollWheelZoom.enabled()) {
      map.scrollWheelZoom.disable();
    } else {
      map.scrollWheelZoom.enable();
    }
  });
}

function updateMap(map, layout, mapData, layerControl) {
  var geoJsonlayer = {};
  var layer = L.layerGroup()
        .addLayer(L.geoJson(mapData.result.data, layout))
        .addTo(map);

  layerControl.addOverlay(layer, "query: " + mapData.id);
}

function updateMapCenter(map, data) {
  var coordinates = data.find(function(e) {
    return e.coordinates.length > 0
  }).coordinates[0];

  map.panTo(new L.LatLng(coordinates[1], coordinates[0]));
}

function onEachFeatureRow(feature, layer) {
  var keys = Object.keys(feature.properties || {});

  var popupContent = keys.reduce(function(stringDispl, key) {
    stringDispl += "<span style='font-weight:bold'>" + key + "</span>: " + feature.properties[key] + "<br>";
    return stringDispl;
  }, "");

  layer.bindPopup(popupContent || "No extra info provided");
}

/********************************************************************************************************************
 * TABLES
 ********************************************************************************************************************/
function initResultsTable(tableId, pagerId) {
  var table = $("#" + tableId);

  document.addEventListener("queryResult", function(e) {
    var tableData = e.detail;

    if (tableData.result["type"] !== "table") {
      return;
    }

    updateTable(tableId, tableData.result.data, {
      "pagerId": pagerId
    });

  });

  return table;
}

function initHistoryTable(tableId) {
  var table = $("#" + tableId);

  document.addEventListener("queryResult", function(e) {
    
    var data = {"id": e.detail.id, "query": e.detail.query, "options" : JSON.stringify(e.detail.options)}
    
    if ($(table).jqGrid("getGridParam", "reccount") > 0) {
        $(table).addRowData(undefined, data, "last");
        return;
      }

    updateTable(tableId, utils.arrify(data), {});

  });

  return table;
}

/*
 * Renders table given
 * tableMeta = {tableId: "id of table", pagerId: "id of the pager div"}
 * data = [{c1: el, cn..},..., {c1: el, cn..}]
 * Note: there is a bug in the layout, header row layout is currently fucked up
 */
function updateTable(tableId, data, options) {
  var table = "#" + tableId;

  $.jgrid.gridUnload(table);
  $(table).jqGrid({
    styleUI: "Bootstrap",
    datatype: "jsonstring",
    datastr: data,
    colNames: Object.keys(data[0]) || [],
    colModel: Object.keys(data[0]).map(function(e) {
      return {
        "name": e,
        "index": e
      }
    }),
    viewrecords: true,
    shrinkToFit: false,
    autowidth: true,
    height: 250,
    rowNum: 20,
    rownumbers: options.displayRowNumbers || false,
    pager: options.pagerId || ""
  });
}

/********************************************************************************************************************
 * SCHEMA DISPLAY
 ********************************************************************************************************************/
function initSchemaDisplay(schemaTreeId) {
  var tree = $("#" + schemaTreeId);

  document.addEventListener('schemaResult', function(e) {
    var treeData = e.detail;
    var formatedTreeData = buildSchemaDataTree("data_type", treeData);
    displaySchema(tree, formatedTreeData);
  })

  return tree;
}

/*
 * Builds a schema data structure, compatible with the jsTree library
 */
function buildSchemaDataTree(endNodeKey, data) {
  if (_.isArray(data)) {
    return data.map(function(e) {
      return e[endNodeKey]
    })
  }

  var keys = _.keys(data).sort();

  var children = keys.map(function(key) {
    var node = {
      text: key
    };
    node["children"] = buildSchemaDataTree(endNodeKey, data[key]);
    return node;
  })

  return children;
}

function displaySchema(element, data) {
  element.jstree({
    'core': {
      "themes": {
        "stripes": true
      },
      'data': data
    }
  });
}

/********************************************************************************************************************
 * INFO BOX
 ********************************************************************************************************************/
function initInfoBox(boxId) {
  var box = $("#" + boxId);
  document.addEventListener('updateInfo', function(e) {
    var boxData = e.detail;
    updateInfoBox(box, boxData.type, boxData.msg);
  });
  return box;
}

function updateInfoBox(element, type, msg) {
  element.empty();
  element.removeClass("alert-warning alert-danger alert-info alert-success");
  element.addClass("alert-" + type);

  if (type === "info") {
    element.append("<i class='fa fa-spinner fa-spin'></i>");
  }
  element.append(msg).show("slow");
  $("html, body").animate({
    scrollTop: 0
  }, "slow");
}

/********************************************************************************************************************
 * BUTTONS/FORMS/...
 ********************************************************************************************************************/
function initQueryForm(submitButton, textBox, colorBox, queryPipeline) {
  submitButton.on("click",
    function(event) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('updateInfo', { 'detail': {type: "info", msg: "executing..."}}));
      queryPipeline({"query" : textBox.val(), "color": colorBox.val()});
    });
}

function initSaveButton(saveButton, table, handler) {
  saveButton.on("click",
    function(event) {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent('updateInfo', { 'detail': {type: "info", msg: "saving..."}}));
      handler();
    });
}

function initAboutButton(element, textBox, okElement) {
  element.on("click",
    function(event) {
      event.preventDefault();
      textBox.toggle(400);
    })
  okElement.on("click",
    function(event) {
      event.preventDefault();
      textBox.toggle(400);
    })
}

function initColorPicker(element) {
  element.colorpicker();
}
