(function BBoxToolsPanel(thisObj) {
    function getActiveComp() {
        var comp = app.project.activeItem;

        if (!(comp instanceof CompItem)) {
            alert("コンポジションを開いてください。");
            return null;
        }

        return comp;
    }

    function getSelectedLayers(comp) {
        var selected = comp.selectedLayers;

        if (!selected || selected.length === 0) {
            alert("レイヤーを選択してください。");
            return null;
        }

        var layers = [];

        for (var i = 0; i < selected.length; i++) {
            layers.push(selected[i]);
        }

        return layers;
    }

    function getBBox(layer, time, padding) {
        var rect = layer.sourceRectAtTime(time, true);

        return {
            left: rect.left - padding,
            top: rect.top - padding,
            right: rect.left + rect.width + padding,
            bottom: rect.top + rect.height + padding
        };
    }

    function createBBoxShape(bbox) {
        var shape = new Shape();

        shape.vertices = [
            [bbox.left,  bbox.top],
            [bbox.right, bbox.top],
            [bbox.right, bbox.bottom],
            [bbox.left,  bbox.bottom]
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

        return shape;
    }

    function copyPropertyValue(source, target) {
        if (!source || !target) {
            return;
        }

        try {
            target.setValue(source.value);
        } catch (e) {
        }
    }

    function copyLayerTransform(sourceLayer, targetLayer) {
        var sourceTransform =
            sourceLayer.property("ADBE Transform Group");

        var targetTransform =
            targetLayer.property("ADBE Transform Group");

        if (!sourceTransform || !targetTransform) {
            return;
        }

        copyPropertyValue(
            sourceTransform.property("ADBE Anchor Point"),
            targetTransform.property("ADBE Anchor Point")
        );

        copyPropertyValue(
            sourceTransform.property("ADBE Position"),
            targetTransform.property("ADBE Position")
        );

        copyPropertyValue(
            sourceTransform.property("ADBE Scale"),
            targetTransform.property("ADBE Scale")
        );

        if (sourceLayer.threeDLayer) {
            copyPropertyValue(
                sourceTransform.property("ADBE Orientation"),
                targetTransform.property("ADBE Orientation")
            );

            copyPropertyValue(
                sourceTransform.property("ADBE Rotate X"),
                targetTransform.property("ADBE Rotate X")
            );

            copyPropertyValue(
                sourceTransform.property("ADBE Rotate Y"),
                targetTransform.property("ADBE Rotate Y")
            );
        }

        copyPropertyValue(
            sourceTransform.property("ADBE Rotate Z"),
            targetTransform.property("ADBE Rotate Z")
        );
    }

    function escapeExpressionString(str) {
        return str
            .replace(/\\/g, "\\\\")
            .replace(/"/g, "\\\"");
    }

    function linkPropertyToLayer(
        sourceLayer,
        targetProperty,
        propertyName
    ) {
        if (!targetProperty) {
            return;
        }

        var layerName =
            escapeExpressionString(sourceLayer.name);

        targetProperty.expression =
            'thisComp.layer("' +
            layerName +
            '").transform.' +
            propertyName +
            ';';
    }

    function followLayerTransform(sourceLayer, targetLayer) {
        var transform =
            targetLayer.property("ADBE Transform Group");

        if (!transform) {
            return;
        }

        linkPropertyToLayer(
            sourceLayer,
            transform.property("ADBE Anchor Point"),
            "anchorPoint"
        );

        linkPropertyToLayer(
            sourceLayer,
            transform.property("ADBE Position"),
            "position"
        );

        linkPropertyToLayer(
            sourceLayer,
            transform.property("ADBE Scale"),
            "scale"
        );

        if (sourceLayer.threeDLayer) {
            linkPropertyToLayer(
                sourceLayer,
                transform.property("ADBE Orientation"),
                "orientation"
            );

            linkPropertyToLayer(
                sourceLayer,
                transform.property("ADBE Rotate X"),
                "xRotation"
            );

            linkPropertyToLayer(
                sourceLayer,
                transform.property("ADBE Rotate Y"),
                "yRotation"
            );
        }

        linkPropertyToLayer(
            sourceLayer,
            transform.property("ADBE Rotate Z"),
            "rotation"
        );
    }

    function adjustLayerLength(sourceLayer, targetLayer) {
        try {
            targetLayer.inPoint =
                sourceLayer.inPoint;

            targetLayer.outPoint =
                sourceLayer.outPoint;

        } catch (e) {
        }
    }

    function createBBoxMatteLayer(
        comp,
        sourceLayer,
        bbox,
        options
    ) {
        var matte =
            comp.layers.addShape();

        matte.name =
            sourceLayer.name + "(bbox)";

        matte.threeDLayer =
            sourceLayer.threeDLayer;

        // 親テキストと同期
        if (sourceLayer.parent !== null) {
            matte.parent =
                sourceLayer.parent;
        }

        if (options.followMovement) {
            followLayerTransform(
                sourceLayer,
                matte
            );
        } else {
            copyLayerTransform(
                sourceLayer,
                matte
            );
        }

        // Layer Length
        if (options.adjustLength) {
            adjustLayerLength(
                sourceLayer,
                matte
            );
        }

        // BBox Shape
        var contents =
            matte.property(
                "ADBE Root Vectors Group"
            );

        var group =
            contents.addProperty(
                "ADBE Vector Group"
            );

        group.name = "BBox";

        var groupContents =
            group.property(
                "ADBE Vectors Group"
            );

        var pathGroup =
            groupContents.addProperty(
                "ADBE Vector Shape - Group"
            );

        pathGroup
            .property("ADBE Vector Shape")
            .setValue(
                createBBoxShape(bbox)
            );

        var fill =
            groupContents.addProperty(
                "ADBE Vector Graphic - Fill"
            );

        fill
            .property(
                "ADBE Vector Fill Color"
            )
            .setValue([1, 1, 1]);

        fill
            .property(
                "ADBE Vector Fill Opacity"
            )
            .setValue(100);


        return matte;
    }

    // Track Matte
    function isTrackMatteBound(layer, matte) {
        try {
            return (
                layer.trackMatteLayer === matte
            );
        } catch (e) {
            return false;
        }
    }

    function bindTrackMatte(layer, matte) {
        matte.moveBefore(layer);

        var bound = false;

        try {
            if (
                typeof layer.setTrackMatte ===
                "function"
            ) {
                layer.setTrackMatte(
                    matte,
                    TrackMatteType.ALPHA
                );

                bound =
                    isTrackMatteBound(
                        layer,
                        matte
                    );
            }
        } catch (e) {
            bound = false;
        }

        // fallback
        if (!bound) {
            try {
                layer.trackMatteType =
                    TrackMatteType.ALPHA;

                try {
                    bound =
                        layer.trackMatteLayer ===
                        matte;

                } catch (e2) {
                    bound =
                        layer.trackMatteType ===
                        TrackMatteType.ALPHA;
                }

            } catch (e) {
                bound = false;
            }
        }

        if (!bound) {
            throw new Error(
                "Track Matteの紐付けに失敗しました。"
            );
        }
    }

    // via mask
    function createBBoxMasks() {
        var comp =
            getActiveComp();

        if (!comp) {
            return;
        }

        var layers =
            getSelectedLayers(comp);

        if (!layers) {
            return;
        }

        app.beginUndoGroup(
            "Create BBox Masks"
        );

        var time = comp.time;
        var padding = 0;
        var failed = [];

        for (
            var i = 0;
            i < layers.length;
            i++
        ) {
            var layer = layers[i];

            try {
                var bbox =
                    getBBox(
                        layer,
                        time,
                        padding
                    );

                var masks =
                    layer.property(
                        "ADBE Mask Parade"
                    );

                if (!masks) {
                    throw new Error(
                        "Maskを追加できないレイヤーです。"
                    );
                }

                var mask =
                    masks.addProperty(
                        "ADBE Mask Atom"
                    );

                mask.name =
                    "Bounding Box";

                mask
                    .property(
                        "ADBE Mask Shape"
                    )
                    .setValue(
                        createBBoxShape(bbox)
                    );

                mask.maskMode =
                    MaskMode.ADD;

            } catch (e) {
                failed.push(
                    layer.name +
                    ": " +
                    e.toString()
                );
            }
        }

        app.endUndoGroup();

        if (failed.length > 0) {
            alert(
                "一部のレイヤーで処理に失敗しました。\n\n" +
                failed.join("\n")
            );
        }
    }

    // via trackmatte
    function createBBoxMattes(options) {
        var comp =
            getActiveComp();

        if (!comp) {
            return;
        }

        var layers =
            getSelectedLayers(comp);

        if (!layers) {
            return;
        }

        app.beginUndoGroup(
            "Create BBox Mattes"
        );

        var time = comp.time;
        var padding = 0;
        var failed = [];

        for (
            var i = 0;
            i < layers.length;
            i++
        ) {
            var layer =
                layers[i];

            try {
                var bbox =
                    getBBox(
                        layer,
                        time,
                        padding
                    );

                var matte =
                    createBBoxMatteLayer(
                        comp,
                        layer,
                        bbox,
                        options
                    );

                bindTrackMatte(
                    layer,
                    matte
                );

            } catch (e) {
                failed.push(
                    layer.name +
                    ": " +
                    e.toString()
                );
            }
        }

        app.endUndoGroup();

        if (failed.length > 0) {
            alert(
                "一部のレイヤーで処理に失敗しました。\n\n" +
                failed.join("\n")
            );
        }
    }

    // UI
    function buildUI(thisObj) {
        var panel =
            (thisObj instanceof Panel)
                ? thisObj
                : new Window(
                    "palette",
                    "BBox Tools",
                    undefined,
                    {
                        resizeable: true
                    }
                );

        panel.orientation =
            "column";

        panel.alignChildren =
            ["fill", "top"];

        panel.spacing = 6;
        panel.margins = 8;

        // Options
        var optionsPanel =
            panel.add(
                "panel",
                undefined,
                "Options"
            );

        optionsPanel.orientation =
            "column";

        optionsPanel.alignChildren =
            ["left", "top"];

        optionsPanel.margins = 8;

        var adjustLengthCheckbox =
            optionsPanel.add(
                "checkbox",
                undefined,
                "Adjust Layer Length"
            );

        adjustLengthCheckbox.value =
            true;


        var followMovementCheckbox =
            optionsPanel.add(
                "checkbox",
                undefined,
                "Follow Text Movement"
            );

        followMovementCheckbox.value =
            false;

        // Mask
        var maskButton =
            panel.add(
                "button",
                undefined,
                "Create BBox Mask"
            );

        maskButton.onClick =
            function () {
                createBBoxMasks();
            };

        // Track Matte
        var matteButton =
            panel.add(
                "button",
                undefined,
                "Create BBox Matte"
            );

        matteButton.onClick =
            function () {
                createBBoxMattes({
                    adjustLength:
                        adjustLengthCheckbox.value,

                    followMovement:
                        followMovementCheckbox.value
                });
            };

        panel.layout.layout(true);

        panel.onResizing =
        panel.onResize =
            function () {
                this.layout.resize();
            };

        return panel;
    }

    // Start
    var panel =
        buildUI(thisObj);


    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }

})(this);