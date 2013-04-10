
Chart.prototype.extraCharts.push([ 'hs-zoom', 'Zoom Chart (rows should be time dimension)', makeHsZoom ]);

function makeHsZoom(chart) {
    var chartEl = $(chart.el).empty();
    chartEl.css('display', '');
    //DO show the tabular results as well.
    chartEl.nextAll('table').css('display', '');

    var options = {
        canvas: chart.id,
        width: $(chart.workspace.el).find('.workspace_results').width() - 40,
        height: $(chart.workspace.el).find('.workspace_results').height() - 40
    };

    var seriesOptions;
    try {
        seriesOptions = _makeHsZoom_parseData(chart);
    }
    catch (e) {
        console.error("While parsing data: " + e + "\n" + e.stack);
        chartEl.text("Failed to parse data: " + e);
        return;
    }

    d3f = d3.format(',');
    chartEl.highcharts("StockChart", {
        chart: { width: options.width, height: options.height },
        yAxis: {
            labels: {
                formatter: function() { return d3f(this.value); }
            },
            plotLines: [
                { value: 0, width: 2, color: 'silver' }
            ]
        },
        plotOptions: {
            series: {
                events: {
                    click: function(e) {
                        //this === series
                        chart.workspace.drop_zones.dimension_drill(this.name,
                                $('div.fields_list_body.columns .d_dimension:first',
                                    chart.workspace.drop_zones.el));
                    }
                }
            }
        },
        tooltip: {
            //While shared: true is nice, it makes it hard to tell which series
            //you're actually looking at with the cursor
            shared: false
        },
        series: seriesOptions
    });
}

function _makeHsZoom_parseData(chart) {
    /** Separate function for parsing series data out */
    var series = [];

    //Grab from meta data; first is our time data, all others are data sets.
    //This only works when we have ONE row information!
    if (chart.data.metadata[0].colIndex !== 0
            || chart.data.metadata[1].colIndex !== 2) {
        //This implies that the second cell is still header information, meaning
        //there is more than 1 row of information.
        throw new Error("It looks like you maybe don't have only one element, "
                + "which must be time-series data, in rows?");
    }
    for (var i = 1, m = chart.data.metadata.length; i < m; i++) {
        var col = chart.data.metadata[i];
        //This is a hack right now, but due to our layout of measures at the
        //end of columns, and the handling in CCC_Chart/plugin.js, we'll have
        //a slash-joined name as our column.
        var nameNoMeasures = col.colName.substring(0,
                col.colName.lastIndexOf('/'));
        series.push({ name: nameNoMeasures, data: [] });
    }
    var dtParse = /(\d\d\d\d)-(\d\d)-(\d\d)(T(\d\d):(\d\d):(\d\d))?.*/;
    for (var i = 0, m = chart.data.resultset.length; i < m; i++) {
        var data = chart.data.resultset[i];
        //ts must be timestamp data; we accept ISO8601
        //YYYY-MM-DDTHH:MM:SS(crap) or just timestamps.
        var ts = Date.parse(data[0]);
        if (isNaN(ts)) {
            ts = parseFloat(data[0]);
        }
        if (isNaN(ts)) {
            throw new Error("Invalid timestamp: " + data[0]);
        }

        for (var j = 1, k = data.length; j < k; j++) {
            series[j - 1].data.push([ ts, data[j] ]);
        }
    }

    return series;
}
