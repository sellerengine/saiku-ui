
Chart.prototype.extraCharts.push([ 'bubble', 'Bubble Chart', makeBubbles ]);

function makeBubbles(chart) {
    var options = {
        canvas: chart.id,
        width: $(chart.workspace.el).find('.workspace_results').width() - 40,
        height: $(chart.workspace.el).find('.workspace_results').height() - 40
    };

    if (chart.data.metadata.length !== 2) {
        $(chart.el).text("Bubble chart requires exactly one measure in the "
                + "columns section, and one dimension in the rows.  Any "
                + "drillable dimensions should go in filters.");
        return;
    }

    var myClass = "bubble";
    if (!chart._d3_svg
            || !$(chart._d3_svg[0]).is(':visible')
            || $(chart._d3_svg[0]).attr('class') !== myClass
            ) {
        var extraEl = chart.extraChartReset(true, true);
        chart._d3_svg = d3.select(extraEl[0]).append("svg")
            .attr("width", options.width)
            .attr("height", options.height)
            .attr("class", myClass);
        chart._d3_color = d3.scale.category20c();
    }
    var svg = chart._d3_svg;

    //DO show the tabular results
    $(chart.el).nextAll('table').css('display', '');

    var diameter = Math.min(options.width, options.height);
    var format = d3.format(",");
    var color = chart._d3_color;

    var bubble = d3.layout.pack()
        .sort(null)
        .size([ diameter, diameter ])
        .padding(1.5);

    var allData = [];
    for (var i = 0, m = chart.data.resultset.length; i < m; i++) {
        var d = chart.data.resultset[i];
        allData.push({ name: d[0] || "null", value: Math.abs(d[1]) + 0.00001 });
    }

    //Makes exit() and update() (not enter or exit) code worthless, but I'm
    //leaving it in as an example.
    svg.selectAll(".node").remove();

    var nodeData = svg
        .selectAll(".node")
        .data(
            bubble.nodes({ children: allData })
                .filter(function(d) { return !d.children; }),
            //The key function; never needed unless we're using a key other than
            //index to match data up
            function(d) { return d.name; }
        );

    //existing nodes need an update (UNUSED with .remove() above)
    var existingTrans = nodeData.transition().duration(350);
    existingTrans
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    existingTrans
        .select("circle")
            .attr("r", function(d) { return d.r; });
    nodeData.select("title").text(function(d) { return d.name + ": " + format(d.value); });

    //exit() operates on old data elements that are no longer in the new data
    nodeData.exit().remove();

    //enter() operates on new data elements that weren't in data
    var node = nodeData
        .enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate("+ d.x + "," + d.y + ")"; })
            .on("click", function(d) {
                chart.workspace.drop_zones.dimension_drill(d.name);
            });

    node.append("title")
        .text(function(d) { return d.name + ": " + format(d.value); });

    node.append("circle")
        .attr("r", function(d) { return d.r; })
        .style("fill", function(d) { return color(d.name); });

    node.append("text")
        .attr("dy", "0.3em")
        .style("text-anchor", "middle")
        .text(function(d) { return d.name.substring(0, d.r / 3); });
}
