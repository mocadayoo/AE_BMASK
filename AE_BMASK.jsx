(function BBoxMaskPanel(thisObj) {
    function createBBoxMask() {
        app.beginUndoGroup("Create Bounding Box Mask");

        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("コンポジションを開いてください。");
            app.endUndoGroup();
            return;
        }

        var layers = comp.selectedLayers;

        if (layers.length === 0) {
            alert("レイヤーを選択してください。");
            app.endUndoGroup();
            return;
        }

        var time = comp.time;
        var padding = 0;

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];

            var rect;
            try {
                rect = layer.sourceRectAtTime(time, true);
            } catch (e) {
                continue;
            }

            var left   = rect.left - padding;
            var top    = rect.top - padding;
            var right  = rect.left + rect.width + padding;
            var bottom = rect.top + rect.height + padding;

            var masks = layer.property("ADBE Mask Parade");

            if (!masks) {
                continue;
            }

            var mask = masks.addProperty("ADBE Mask Atom");
            mask.name = "Bounding Box";

            var shape = new Shape();

            shape.vertices = [
                [left, top],
                [right, top],
                [right, bottom],
                [left, bottom]
            ];

            shape.inTangents = [
                [0, 0],
                [0, 0],
                [0, 0],
                [0, 0]
            ];

            shape.outTangents = [
                [0, 0],
                [0, 0],
                [0, 0],
                [0, 0]
            ];

            shape.closed = true;

            mask.property("ADBE Mask Shape").setValue(shape);
            mask.maskMode = MaskMode.ADD;
        }

        app.endUndoGroup();
    }

    function buildUI(thisObj) {
        var panel = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "BBox Mask", undefined, {
                resizeable: true
            });

        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];

        var button = panel.add(
            "button",
            undefined,
            "Create BBox Mask"
        );

        button.onClick = createBBoxMask;

        panel.layout.layout(true);
        panel.layout.resize();

        panel.onResizing = panel.onResize = function () {
            this.layout.resize();
        };

        return panel;
    }

    var panel = buildUI(thisObj);

    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }

})(this);