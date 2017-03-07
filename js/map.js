// Data parameters
var cfg = {
    visibility: "show",                                      // Show marker (1 - yes, 0 - no)
    category:   "Вид млекопитающего",                        // Species
    date:       "Дата",                                      // Date in dd.mm.yyyy format
    instance:   "http://barents-kara-xprojects.nextgis.com", // NextGIS Web instance
    resource:   58,                                          // NextGIS Web resource id

};

var map        = new L.Map('map', {center: [73.57, 55.90], zoom: 4});
var dateSlider = new L.Control.DateSlider().addTo(map);
var hash       = new L.Hash(map);

var request    = $.ajax({
    url: _.template("<%=instance%>/api/resource/<%=resource%>/geojson")({
        instance: cfg.instance,
        resource: cfg.resource
    })
});

request.then(function(data) {
    var layers = {};
    var objectsByLayers = {};

    // Lookup object for CSS classes
    var cssMap = {
        'Белый медведь': 'bear',
        'Морж'         : 'walrus',
        'Нерпа'        : 'nerpa',
        'Тюлень'       : 'tulen'
    };

    var groups = _.groupBy(data.features, function(f) {
        return f.properties[cfg.category];
    });
    for (var g in groups) {
        var l = L.geoJson(groups[g], {
            onEachFeature: function (feature, layer) {
                layer.bindPopup(buildPopupContent(feature), {
                    offset: [0, -22.5]
                });
            },
            pointToLayer: function (feature, latlng) {
                var earthRadius = 6378137;
                return L.marker(
                    L.Projection.SphericalMercator.unproject(
                        L.point(latlng.lng, latlng.lat).divideBy(earthRadius)
                    ), {
                        icon: L.divIcon({
                            className: cssMap[feature.properties[cfg.category]] || 'walrus',
                            iconSize: [35, 45],
                            iconAnchor: [17.5, 45]
                        }),
                        riseOnHover: true
                    });
            },
            filter: function(geojson, layer) {
                // Date(year, month, day)
                var dateParts = geojson.properties[cfg.date].split(".");
                var date = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
                var minSliderDate = $(dateSlider.getContainer()).dateRangeSlider("min");
                var maxSliderDate = $(dateSlider.getContainer()).dateRangeSlider("max");
                var showOnMap = parseInt(geojson.properties[cfg.visibility]);
                return ((date >= minSliderDate) && (date <= maxSliderDate) && showOnMap);
            }
        }).addTo(map);

        layers[g] = l;
        objectsByLayers[g] = {
            layer: l,
            geojson: groups[g]
        };
    }

    // Warning: Use this event wisely, because it is fired very frequently.
    // It can have impact on performance. When possible, prefer the valuesChanged event.
    $(dateSlider.getContainer()).on("valuesChanging", function(e) {
        for (g in objectsByLayers) {
            objectsByLayers[g].layer.clearLayers().addData(objectsByLayers[g].geojson);
        }
    });

    L.control.layers(null, layers).addTo(map);

});


// Build popup content
function buildPopupContent(row) {
    var thead = "<table>",
        tfoot = "</table>",
        tbody = "";

    var tbodytpl = _.template("<tr><th><%=key%></th><td><%=value%></td></tr>");

    _.each(row.properties, function(item,key,list) {
        if (key !== cfg.visibility) {
            tbody += tbodytpl({key: key, value: list[key]});
        }
    });
    return [thead, tbody, tfoot].join("");
}
