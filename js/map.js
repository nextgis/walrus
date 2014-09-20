// Параметры файла данных
var csvcfg = {
    latfield:  "lat",                      // Широта (EPSG:4326)
    lonfield:  "lon",                      // Долгота (EPSG:4326)
    visibility:"show",                     // Видимость маркера (1 - показывать, 0 - не показывать)
    delimiter: ",",                        // Разделитель
    category:  "Вид млекопитающего",       // Вид млекопитающего
    date:      "Дата",                     // Ожидаемый формат даты: dd.mm.yyyy
};

var map        = new L.Map('map', {center: [73.57, 55.90], zoom: 4});
var dateSlider = new L.Control.DateSlider().addTo(map);
var hash       = new L.Hash(map);


var request    = new Http.Get("/walrus/data/walrus.csv", true);
request.start().then(function(response) {

    var layers = {};
    var objectsByLayers = {};

    // Маппинг вида млекопитающего на имя CSS класса маркера
    var cssMap = {
        'Белый медведь': 'bear',
        'Морж'         : 'walrus',
        'Нерпа'        : 'nerpa',
        'Тюлень'       : 'tulen'
    };

    // Преобразуем данные из формата CSV в GeoJSON
    csv2geojson.csv2geojson(response, csvcfg, function(err, data) {
        var groups = _.groupBy(data.features, function(f) { return f.properties[csvcfg.category]; });
        for (var g in groups) {
            var l = L.geoJson(groups[g], {
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(buildPopupContent(feature), {
                        offset: [0, -22.5]
                    });
                },
                pointToLayer: function (feature, latlng) {
                    return L.marker(latlng,  {
                        icon: L.divIcon({
                            className: cssMap[feature.properties[csvcfg.category]] || 'walrus',
                            iconSize: [35, 45],
                            iconAnchor: [17.5, 45]
                        }),
                        riseOnHover: true
                    });
                },
                filter: function(geojson, layer) {
                    // Date(year, month, day)
                    var dateParts = geojson.properties[csvcfg.date].split(".");
                    var date = new Date(dateParts[2], (dateParts[1] - 1), dateParts[0]);
                    var minSliderDate = $(dateSlider.getContainer()).dateRangeSlider("min");
                    var maxSliderDate = $(dateSlider.getContainer()).dateRangeSlider("max");
                    var showOnMap = parseInt(geojson.properties[csvcfg.visibility]);
                    return ((date >= minSliderDate) && (date <= maxSliderDate) && showOnMap);
                }
            }).addTo(map);

            layers[g] = l;
            objectsByLayers[g] = {
                layer: l,
                geojson: groups[g]
            };
        }

        // При каждом сдвиге слайдера перерисовываем маркеры
        $(dateSlider.getContainer()).on("valuesChanging", function(e) {
            for (g in objectsByLayers) {
                objectsByLayers[g].layer.clearLayers().addData(objectsByLayers[g].geojson);
            }
        });

    });
    L.control.layers(null, layers).addTo(map);

});

// Функция формирования содержимого popup-а
function buildPopupContent(row) {
    var thead = "<table>",
        tfoot = "</table>",
        tbody = "";

    var tbodytpl = _.template("<tr><th><%=key%></th><td><%=value%></td></tr>");

    _.each(row.properties, function(item,key,list) {
        if (key !== csvcfg.visibility) {
            tbody += tbodytpl({key: key, value: list[key]});
        }
    });
    return [thead, tbody, tfoot].join("");
}
