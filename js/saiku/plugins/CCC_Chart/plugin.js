/*  
 *   Copyright 2012 OSBI Ltd
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

/**
 * Renders a chart for each workspace
 */
var Chart = Backbone.View.extend({

    events: {
        'click .keep' : 'keepVisible'
    },

	cccOptions: {
        type: "BarChart",
        stacked: true
    },

    data: null,
    hasProcessed: null,

    /** each element should be: [ key, title, function ] */
    extraCharts: [],

    getChartProperties: function(chartName) { 
        var self = this; 
        var ret = [];
        _.each(ChartProperties, function(property) {
            if (property.ChartObject == chartName) {
                ret.push(property);
            }

        });
        return ret;

    },

    initialize: function(args) {
        
        this.workspace = args.workspace;
        
        // Create a unique ID for use as the CSS selector
        this.id = _.uniqueId("chart_");
        $(this.el).attr({ id: this.id });
        //$('<div id="nav_' + this.id + '">' + "<input type='submit' class='keep' value='keep only selected' />" + '</div>').appendTo($(this.el));
        $('<div class="canvas_wrapper" style="display:none;"><div id="canvas_' + this.id + '"></div></div>').appendTo($(this.el));
        

        this.processing = $('<div id="processing_' + this.id + '" class="processing_chart"><span class="processing_image">&nbsp;&nbsp;</span> <span class="i18n">Running query...</span></div>');
        this.cccOptions.canvas = 'canvas_' + this.id;
        this.cccOptions = this.getQuickOptions(this.cccOptions);

        this.data = null;
        
        // Bind table rendering to query result event
        _.bindAll(this, "receive_data", "process_data", "show",  "getData", "render_view", "render_chart", "render_chart_delayed", "getQuickOptions","exportChart","block_ui");
        var self = this;
        this.workspace.bind('query:run',  function() {
            if (! $(self.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
                return false;
            }
            self.data = {};
            self.data.resultset = [];
            self.data.metadata = [];
            $(self.el).find('.canvas_wrapper').hide();
            self.processing.show();
            return false;
        });

        this.workspace.bind('query:fetch', this.block_ui);
        
        this.workspace.bind('query:result', this.receive_data);

         var pseudoForm = "<div id='nav" + this.id + "' style='display:none' class='nav'><form id='svgChartPseudoForm' target='_blank' method='POST'>" +
                "<input type='hidden' name='type' class='type'/>" +
                "<input type='hidden' name='svg' class='svg'/>" +
                "</form></div>";
        if (isIE) {
            pseudoForm = "<div></div>";
        }
        this.nav =$(pseudoForm);

        $(this.el).append(this.nav);
        $(this.el).append(this.processing);

        /*
        // Create navigation
        var exportoptions = "<div><a class='hide' href='#charteditor' id='acharteditor' /><!--<a class='editor' href='#chart_editor'>Advanced Properties</a>-->Export to: " +
                "<a class='export' href='#png' class='i18n'>PNG</a>, " +
                "<a class='export' href='#pdf' class='i18n'>PDF</a>, " +
                //"<a class='export' href='#tiff' class='i18n'>TIFF</a>, " +
                "<a class='export' href='#svg' class='i18n'>SVG</a>, " +
                "<a class='export' href='#jpg' class='i18n'>JPG</a>" +
                "<form id='svgChartPseudoForm' target='_blank' method='POST'>" +
                "<input type='hidden' name='type' class='type'/>" +
                "<input type='hidden' name='svg' class='svg'/>" +
                "</form>";

        var chartnav = exportoptions + "</div>";
        if (typeof isIE !== "undefined") {
            chartnav = "<div></div>";
        }
        // Create navigation
        this.nav = $(chartnav).css({
        		    'padding-bottom': '10px'
        		});
        this.nav.find('a.type').css({
                    color: '#666',
                    'margin-right': '5px',
                    'text-decoration': 'none',
                    'border': '1px solid #ccc',
                    padding: '5px'
                });

        this.nav.find('a.export').click(this.exportChart);
        

        this.nav.find('a').css({ 
                    color: '#666', 
                    'margin-right': '5px', 
                    'text-decoration': 'none', 
                    'border': '1px solid #ccc', 
                    padding: '5px' 
                });
        */
        /* XXX - enable again later
        $(this.nav).append('<div style="display:none;"> <div id="charteditor" class="chart_editor"></div></div>');
        
        this.editor = new ChartEditor({  workspace : this.workspace, 
                                        ChartProperties : ChartProperties, 
                                        ChartTypes: ChartTypes, 
                                        data : this.getData, 
                                        getChartProperties : this.getChartProperties});

        $(this.nav).find('.chart_editor').append($(this.editor.el));
        */

    },

    block_ui: function() {
        if (! $(this.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
            return;
        }
        //Saiku.ui.block("Updating chart data....");
    },

    exportChart: function(type) {
        var svgContent = new XMLSerializer().serializeToString($('svg')[0]);
        var rep = '<svg xmlns="http://www.w3.org/2000/svg" ';
        if (svgContent.substr(0,rep.length) != rep) {
            svgContent = svgContent.replace('<svg ', rep);    
        }
        
        var form = $('#svgChartPseudoForm');
        form.find('.type').val(type);
        form.find('.svg').val(svgContent);
        form.attr('action', Settings.REST_URL + this.workspace.query.url() + escape("/../../export/saiku/chart"));
        form.submit();
        return false;
    },

    render_view: function() {
    	// Append chart to workspace
        $(this.workspace.el).find('.workspace_results')
            .prepend($(this.el).hide());
    },
    
    getData: function() {
        return this.data;
    },

    show: function(event, ui) {
        /*
        if ('MODE' in Settings && Settings.MODE == 'table') {
            $(this.nav).hide();    
        } else {
            $(this.nav).show();
        }
        
        $('a#acharteditor').fancybox(
                                   {
                                   'autoDimensions'    : false,
                                   'autoScale'         : false,
                                   'height'            :  ($("body").height() - 140),
                                   'width'             :  ($("body").width() - 100),
                                   'transitionIn'      : 'none',
                                   'transitionOut'     : 'none',
                                   'type'              : 'inline'
                                   }
                               );
        */
        if (this.cccOptions.width <= 0) {
            this.cccOptions.width = $(this.workspace.el).find('.workspace_results').width() - 40;
        }
        if (this.cccOptions.height <= 0) {
            this.cccOptions.height = $(this.workspace.el).find('.workspace_results').height() - 40;
        }
        
        $(this.el).show();

        var hasRun = this.workspace.query.result.hasRun();
        if (hasRun) {
            this.process_data({ data: this.workspace.query.result.lastresult() });
        }

    },

    chart_editor: function() {
		$('a#acharteditor').click();
		return true;
    },

    export_button: function(event) {
        var self = this;
        $target = $(event.target).hasClass('button') ? $(event.target) : $(event.target).parent();
        
        var self = this;
        $body = $(document);
        //$body.off('.contextMenu .contextMenuAutoHide');
        //$('.context-menu-list').remove();
        $.contextMenu('destroy', '.export_button');
        $.contextMenu({
                selector: '.export_button',
                trigger: 'left',
                ignoreRightClick: true,
                callback: function(key, options) {
                    self.workspace.chart.exportChart(key);
                },
                items: {
                    "png": {name: "PNG"},
                    "jpg": {name: "JPEG"},
                    "pdf": {name: "PDF"},
                    "svg": {name: "SVG"}
                }
        });
        $target.contextMenu();
    },

    button: function(event) {
        $target = $(event.target).hasClass('button') ? $(event.target) : $(event.target).parent();
        if ($target.hasClass('chartoption')) {
            $target.parent().siblings().find('.chartoption.on').removeClass('on');
            $target.addClass('on');
            if ($(this.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
                $(this.el).find('.canvas_wrapper').hide();
            }
        }

        // They've clicked on a chart, so remove the
        // render override, in case the newly clicked
        // isn't an extra chart.
        this._renderOverride = null;
        if (this._extraChart) {
            this.extraChartReset();
        }

        return false;
    },

    extraChartReset: function(makeExtraChart, showTable) {
        //Reset defaults; no extra chart, show the main chart, and
        //hide the table.
        if (this._extraChart) {
            this._extraChart.remove();
            this._extraChart = null;
        }
        if (!showTable) {
            $(this.el).nextAll('table').css('display', 'none');
        }
        else {
            $(this.el).nextAll('table').css('display', '');
        }

        if (makeExtraChart) {
            $(this.el).hide();
            this._extraChart = $('<div></div>').insertAfter(this.el);
            return this._extraChart;
        }
        else if (!$(this.el).is(':visible')) {
            $(this.el).show();
        }
    },

    stackedBar: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'stackedBar');
        var options = {
            stacked: true,
            type: "BarChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },
    
    bar: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'bar');
        var options = {
            type: "BarChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
        /*
        this.cccOptions.multiChartIndexes = [1];
        this.cccOptions.dataMeasuresInColumns = true;
        this.cccOptions.orientation = 'vertical';
        this.cccOptions.smallTitlePosition = 'left';
        //this.cccOptions.multiChartColumnsMax = 5;
        this.cccOptions.smallWidth = 300;
        this.cccOptions.smallHeight = 100;
        */
    },

    multiplebar: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'multiplebar');
        var options = {
            type: "BarChart",
            multiChartIndexes: [1],
            dataMeasuresInColumns: true,
            orientation: "vertical",
            smallTitlePosition: "top",
            multiChartMax: 30,
            multiChartColumnsMax: Math.floor( this.cccOptions.width / 200),
            smallWidth: 200,
            smallHeight: 150

        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },
    
    line: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'line');
        var options = {
            type: "LineChart"
        };

        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },
    
    pie: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'pie');
        var options = {
            type: "PieChart",
            multiChartIndexes: [0] // ideally this would be chosen by the user (count, which)
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },

    heatgrid: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'heatgrid');
        var options = {
            type: "HeatGridChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },

    stackedBar100: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'stackedBar100');
        var options = {
            type: "NormalizedBarChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },

    area: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'area');
        var options = {
            type: "StackedAreaChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },
    dot: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'dot');
        var options = {
            type: "DotChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },
    waterfall: function() {
        this.workspace.query.setProperty('saiku.ui.render.type', 'waterfall');
        var options = {
            type: "WaterfallChart"
        };
        this.cccOptions = this.getQuickOptions(options);
        this.render_chart();
    },

    keepVisible: function(event) {


        var chart = this.chart.root;
        var data = chart.data;
         
        data
        .datums(null, {selected: false})
        .each(function(datum) {
            datum.setVisible(false);
        });
         
        data.clearSelected();
         
        chart.render(true, true, false);


    },

    // Default static style-sheet
    cccOptionsDefault: {
        Base: {
            animate: false,
            selectable: true,
            valuesVisible: false,
            legend:  true,
            legendPosition: "top",
            legendAlign: "right",
            legendSizeMax: "30%",
            axisSizeMax: "40%",
            plotFrameVisible : false,
            orthoAxisMinorTicks : false,
            colors: ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5" ]
/*
"#B12623",
"#ff8585",
"#009bff",
"#1f77b4",
"#ff5900",
"#ffbb9e",
"#750000",
"#cecece",
 "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5" ]
 */
        },
        
        HeatGridChart: {
            orientation: "horizontal",
            useShapes: true,
            shape: "circle",
            nullShape: "cross",
            colorNormByCategory: false,
            sizeRole: "value",
            legend: false,
            hoverable: true,
            axisComposite: true,
            colors: ["red", "yellow", "lightgreen", "darkgreen"],
            xAxisSize: 130,
            yAxisSize: 130
        },
        
        WaterfallChart: {
            orientation: "horizontal"
        },
        
        PieChart: {
            multiChartColumnsMax: 3,
            multiChartMax: 30,
            smallTitleFont: "bold 14px sans-serif",
            valuesVisible: true,
            valuesMask: "{value.percent}",
            explodedSliceRadius: "10%",
            extensionPoints: {
                slice_innerRadiusEx: '40%',
                 slice_offsetRadius: function(scene) {
                       return scene.isSelected() ? '10%' : 0;
                }
            },
            clickable: true,
            //valuesLabelStyle: 'inside'
        },
        
        LineChart: {
            extensionPoints: {
                area_interpolate: "monotone", // cardinal
                line_interpolate: "monotone"
            }
        },
        
        StackedAreaChart: {
            extensionPoints: {
                area_interpolate: "monotone",
                line_interpolate: "monotone"
            }
        }
    },
    
    getQuickOptions: function(baseOptions) {
        var chartType = (baseOptions && baseOptions.type) || "BarChart";
        var workspaceResults = $(this.workspace.el).find(".workspace_results");
        var options = _.extend({
                type:   chartType,
                canvas: 'canvas_' + this.id,
                width:  workspaceResults.width() - 40,
                height: workspaceResults.height() - 40
            },
            this.cccOptionsDefault.Base,
            this.cccOptionsDefault[chartType], // may be undefined
            baseOptions);
        
        if(this.data != null && this.data.resultset.length > 5) {
            if(options.type === "HeatGridChart") {
                options.xAxisSize = 150;
            } else if(options.orientation !== "horizontal") {
                options.extensionPoints = _.extend(Object.create(options.extensionPoints || {}),
                    {
                        xAxisLabel_textAngle: -Math.PI/2,
                        xAxisLabel_textAlign: "right",
                        xAxisLabel_textBaseline:  "middle"
                    });
            }
        }
        
        return options;
    },

    render_chart: function() {
        _.delay(this.render_chart_delayed, 0, this);
        return false; 
    },
    
    render_chart_delayed: function() {
        if (!$(this.workspace.querytoolbar.el).find('.render_chart').hasClass('on') || !this.hasProcessed) {
            return;
        }

        if (this._renderOverride) {
            //We are using e.g. an extra chart
            this._renderOverride();
            return;
        }
        
/* DEBUGGING
this.med = new Date().getTime();
$(this.el).prepend(" | chart render (" + (this.med - this.call_time) + ")" );
this.call_time = undefined;
*/
        var workspaceResults = $(this.workspace.el).find(".workspace_results");
        var isSmall = (this.data != null && this.data.height < 80 && this.data.width < 80);
        var isMedium = (this.data != null && this.data.height < 300 && this.data.width < 300);
        var isBig = (!isSmall && !isMedium);
        var animate = false;
        var hoverable =  isSmall;

        var runtimeChartDefinition = _.clone(this.cccOptions);
         if (isBig) {
            if (runtimeChartDefinition.hasOwnProperty('extensionPoints') && runtimeChartDefinition.extensionPoints.hasOwnProperty('line_interpolate'))
                delete runtimeChartDefinition.extensionPoints.line_interpolate;
            if (runtimeChartDefinition.hasOwnProperty('extensionPoints') && runtimeChartDefinition.extensionPoints.hasOwnProperty('area_interpolate'))
                delete runtimeChartDefinition.extensionPoints.area_interpolate;
         }
         runtimeChartDefinition = _.extend(runtimeChartDefinition, {
                width:  workspaceResults.width() - 40,
                height: workspaceResults.height() - 40,
                hoverable: hoverable,
                animate: animate
        });

        /* XXX - enable later
        var start = new Date().getTime();
        this.editor.chartDefinition = _.clone(this.cccOptions);
        this.editor.set_chart("pvc." + this.cccOptions.type);
        this.editor.render_chart_properties("pvc." + this.cccOptions.type, this.editor.chartDefinition);
        */

        this.chart = new pvc[runtimeChartDefinition.type](runtimeChartDefinition);
/* DEBUGGING
this.med3 = new Date().getTime();
$(this.el).prepend(" pvc (" + (this.med3 - this.med) + ")" );
*/

        this.chart.setData(this.data, {
            crosstabMode: true,
            seriesInRows: false
        });

        try {
            if (animate) {
                $(this.el).find('.canvas_wrapper').show();
            }
            this.chart.render();
/* DEBUGGING
            var med2 = new Date().getTime();
            $(this.el).prepend(" done (" + (med2 - this.med) + ")" );
*/
        } catch (e) {
            $(this.el).text("Could not render chart");
        }
        this.processing.hide();
        if (animate) {
            return false;
        }
        $('#nav_' + this.id).show();
        if (isIE || isBig) {
            $(this.el).find('.canvas_wrapper').show();
        } else {
            $(this.el).find('.canvas_wrapper').fadeIn(400);
        }
        return false;
    },
            
    receive_data: function(args) {
        if (! $(this.workspace.querytoolbar.el).find('.render_chart').hasClass('on')) {
            return;
        }
        return _.delay(this.process_data, 0, args);

    },
    
     process_data: function(args) {
        this._initExtraCharts();
        this.data = {};
        this.data.resultset = [];
        this.data.metadata = [];
        this.data.height = 0;
        this.data.width = 0;

        if (typeof args.data == "undefined" || args.data == null || args.data.cellset == null ) {
            return false;
        }
        var cellset = args.data.cellset;
        if (cellset && cellset.length > 0) {
/* DEBUGGING
var start = new Date().getTime();
this.call_time = start;
$(this.el).prepend(" | chart process");
*/
            var lowest_level = 0;
            var data_start = 0;
            for (var row = 0; data_start == 0 && row < cellset.length; row++) {
                    this.data.metadata = [];
                    for (var field = 0; field < cellset[row].length; field++) {
                        var firstHeader = [];

                        while (cellset[row][field].type == "COLUMN_HEADER" && cellset[row][field].value == "null") {
                            row++;
                        }
                        if (cellset[row][field].type == "ROW_HEADER_HEADER") {

                            while(cellset[row][field].type == "ROW_HEADER_HEADER") {
                                firstHeader.push(cellset[row][field].value);
                                field++;
                            }

                            this.data.metadata.push({
                                colIndex: 0,
                                colType: "String",
                                colName: firstHeader.join('/')
                            });    
                            lowest_level = field - 1;
                        }
                        if (cellset[row][field].type == "COLUMN_HEADER" && cellset[row][field].value != "null") {
                            var lowest_col_header = 0;
                            var colheader = [];
                            while(lowest_col_header <= row) {
                                colheader.push(cellset[lowest_col_header][field].value);
                                lowest_col_header++;
                            }
                            this.data.metadata.push({
                                colIndex: field - lowest_level + 1,
                                colType: "Numeric",
                                colName: colheader.join('/')
                            });

                            data_start = row+1;
                        }
                    }
            }
            var labelsSet = {};
            for (var row = data_start; row < cellset.length; row++) {
            if (cellset[row][0].value !== "") {
                    var record = [];
                    this.data.width = cellset[row].length - lowest_level + 1;
                    var label = "";
                    for (var labelCol = lowest_level; labelCol >= 0; labelCol--) {
                        var lastKnownUpperLevelRow = row;
                        while(cellset[lastKnownUpperLevelRow] && cellset[lastKnownUpperLevelRow][labelCol].value === 'null') {
                            --lastKnownUpperLevelRow;
                        }
                        if(cellset[lastKnownUpperLevelRow]) {
                            if (label == "") {
                                label = cellset[lastKnownUpperLevelRow][labelCol].value;
                            } else {
                                label = cellset[lastKnownUpperLevelRow][labelCol].value + " / " + label;
                            }
                        }
                    }
                    if(label in labelsSet) {
                        labelsSet[label] = labelsSet[label]+1;
                        label = label + ' [' + (labelsSet[label] + 1) + ']';
                    } else {
                        labelsSet[label] = 0;
                    }
                    record.push(label);

                    for (var col = lowest_level + 1; col < cellset[row].length; col++) {
                        var cell = cellset[row][col];
                        var value = cell.value || 0;
                        // check if the resultset contains the raw value, if not try to parse the given value
                        var raw = cell.properties.raw;
                        if (raw && raw !== "null") {
                            value = parseFloat(raw);
                        } else if (typeof(cell.value) !== "number" && parseFloat(cell.value.replace(/[^a-zA-Z 0-9.]+/g,''))) {
                            value = parseFloat(cell.value.replace(/[^a-zA-Z 0-9.]+/g,''));
                        }
                        record.push(value);
                    }
                    this.data.resultset.push(record);
                }
            }
            //makeSureUniqueLabels(this.data.resultset);
            this.hasProcessed = true;
            this.data.height = this.data.resultset.length;
            this.cccOptions = this.getQuickOptions(this.cccOptions);
            this.render_chart();
        } else {
            $(this.el).find('.canvas_wrapper').text("No results").show();
            this.processing.hide();
        }
    },

    _initExtraCharts: function() {
        //Chart stuff...
        if (!Chart._extraCharts_init) {
            var $chartOptions = $('ul.options.chart');
            Chart.prototype.extraCharts.sort(function(a, b) {
                    return a[1].localeCompare(b[1]);
            });
            for (var i = 0, m = Chart.prototype.extraCharts.length;
                    i < m; i++) {
                var ec = Chart.prototype.extraCharts[i];
                var domSrc = '<li class="extra_chart"><a href="#{0}"\
                        class="i18n {0} chartoption button"\
                        title="{1}">{1}</a></li>';
                domSrc = domSrc.replace(/\{0\}/g, ec[0])
                        .replace(/\{1\}/g, ec[1]);
                var $ec = $(domSrc);
                $ec.appendTo($chartOptions);

                if (ec[0] in Chart.prototype) {
                    throw new Error("Duplicate chart key: "
                            + ec[0]);
                }
                Chart.prototype[ec[0]] = (function(ec) {
                    var redrawMyChart = function() {
                        this.workspace.query.setProperty('saiku.ui.render.type',
                                ec[0]);
                        //"this" is the proper reference to the
                        //current chart object.
                        //Ensure that on redraws, we'll keep using
                        //this overridden chart!
                        this._renderOverride = redrawMyChart;
                        try {
                            return ec[2](this);
                        }
                        catch (e) {
                            //The parent method catches all
                            //exceptions, so print the tb here.
                            if (e.stack) {
                                console.log("At: " + e.stack);
                            }
                            console.error(e);
                        }
                    };
                    return redrawMyChart;
                })(ec);
            }
            //Don't update the prototype again.
            Chart._extraCharts_init = true;
        }
    }
});


