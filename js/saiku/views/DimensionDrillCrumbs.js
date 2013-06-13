
var DimensionDrillCrumbs = Backbone.View.extend({
    tagName: "span",

    className: "dimension_drill_crumbs",

    events: {
        "click .crumb": "goBack"
    },

    initialize: function() {
        this.listenTo(DimensionDrillCrumbs.crumbs, "add remove", this.render);
        this.render();
    },

    goBack: function(event) {
        var toIndex = $(event.target).data('index');
        var curLen = DimensionDrillCrumbs.crumbs.length;
        function doNext() {
            curLen -= 1;
            if (curLen < toIndex) {
                //Get our new results now that we've updated the query fully.
                Saiku.ws.query.run();
                return;
            }
            var c = DimensionDrillCrumbs.crumbs.pop();
            var fakeEvent = $.Event("click", { target: c.get("dimensionEl") });
            Saiku.ws.drop_zones.dimension_undrill(fakeEvent, doNext);
        }
        doNext();
    },

    render: function() {
        var $el = $(this.el);
        $el.empty();
        if (DimensionDrillCrumbs.crumbs.length === 0) {
            return;
        }

        $el.append('<span class="header">Drill trail: </span>');
        e = [ 0 ];
        DimensionDrillCrumbs.crumbs.each(function(crumb, index) {
            //Make sure it exists... this is a hack to work around if the
            //user re-configures the query.
            if ($('.d_dimension.dimension_drill a[href="' + crumb.get("href")
                    + '"]').length === 0) {
                //Will trigger render
                DimensionDrillCrumbs.crumbs.remove(crumb);
                return;
            }

            if (e[0] !== 0) {
                $el.append('> ')
            }
            var dimMember = crumb.get("dimMember");
            var catName = dimMember.level.split("].[");
            catName = catName[catName.length - 1];
            catName = catName.substring(0, catName.length - 1);
            var value = crumb.get("uniqueName").split("].[");
            value = value[value.length - 1];
            value = value.substring(0, value.length - 1);

            var activeEl = $('<span class="crumb"></span>')
                .text(catName + "=" + value)
                .data('index', index);
            $el.append(activeEl);
            e[0] += 1;
        });
    }
});

var Crumb = Backbone.Model.extend({
});

DimensionDrillCrumbs.crumbs = new Backbone.Collection();
