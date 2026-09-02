var detector =
{
    core:
    {
        canvas: null,
        ctx: null
    },

    events:
    {
        canvas: null,
        ctx: null,
        list: [],
    },

    visible: true,

    width: 400,
    height: 400,

    ratio: 1,

    // Palette for the network diagram scaffold - a light and a dark variant,
    // switched by setTheme() to match the rest of the page.
    themes:
    {
        light:
        {
            background: '#f4f0e6',
            edge: '#ded8c6',
            nodeFill: '#ffffff',
            nodeStroke: '#8a8f6b'
        },
        dark:
        {
            background: '#12141c',
            edge: '#2a2f40',
            nodeFill: '#1b1e2a',
            nodeStroke: '#4a5170'
        }
    },

    // Active palette, swapped in place by setTheme() - starts dark to match
    // the pre-paint default until ThemeService applies the real setting.
    colors:
    {
        background: '#12141c',
        edge: '#2a2f40',
        nodeFill: '#1b1e2a',
        nodeStroke: '#4a5170'
    },

    // Switches the diagram's palette to match light/dark mode and redraws
    // the static scaffold (nodes + idle edges). Safe to call before init().
    setTheme: function(isDark)
    {
        var theme = isDark ? detector.themes.dark : detector.themes.light;
        detector.colors.background = theme.background;
        detector.colors.edge = theme.edge;
        detector.colors.nodeFill = theme.nodeFill;
        detector.colors.nodeStroke = theme.nodeStroke;

        if (detector.core.ctx) {
            detector.coreDraw();
        }
    },

    // Node layout, computed in coreDraw() from detector.width/height.
    layers: [],

    // One entry per node-to-node "signal" a click can send, each with its
    // own color - stands in for the old electron/jet/muon track types.
    tracks:
    [
        {
            name: 'activation',
            color: '#5B8CFF'
        },
        {
            name: 'gradient',
            color: '#2FD3A6'
        },
        {
            name: 'attention',
            color: '#C06CF2'
        }
    ],

    lastRender: 0,

    animate: function(time)
    {
        var duration = typeof time !== 'undefined' ? time - detector.lastRender : 16;
        detector.lastRender = time;

        requestAnimFrame(detector.animate);
        detector.draw(duration);
    },

    init: function(baseSize)
    {
        detector.core.canvas = document.getElementById('detector-core');
        detector.core.ctx = detector.core.canvas.getContext('2d');

        detector.events.canvas = document.getElementById('detector-events');
        detector.events.ctx = detector.events.canvas.getContext('2d');

        var devicePixelRatio = window.devicePixelRatio || 1;
        var backingStoreRatio = detector.core.ctx.webkitBackingStorePixelRatio ||
                                detector.core.ctx.mozBackingStorePixelRatio ||
                                detector.core.ctx.msBackingStorePixelRatio ||
                                detector.core.ctx.oBackingStorePixelRatio ||
                                detector.core.ctx.backingStorePixelRatio || 1;

        var ratio = devicePixelRatio / backingStoreRatio;

        detector.ratio = baseSize / 400;

        detector.width = baseSize;
        detector.height = baseSize;

        detector.core.canvas.width = baseSize;
        detector.core.canvas.height = baseSize;

        detector.events.canvas.width = baseSize;
        detector.events.canvas.height = baseSize;

        if (devicePixelRatio !== backingStoreRatio) {
            var oldWidth = detector.core.canvas.width;
            var oldHeight = detector.core.canvas.height;

            detector.core.canvas.width = oldWidth * ratio;
            detector.core.canvas.height = oldHeight * ratio;
            detector.core.canvas.style.width = oldWidth + 'px';
            detector.core.canvas.style.height = oldHeight + 'px';

            detector.events.canvas.width = oldWidth * ratio;
            detector.events.canvas.height = oldHeight * ratio;
            detector.events.canvas.style.width = oldWidth + 'px';
            detector.events.canvas.style.height = oldHeight + 'px';

            // now scale the context to counter
            // the fact that we've manually scaled
            // our canvas element
            detector.core.ctx.scale(ratio, ratio);
            detector.events.ctx.scale(ratio, ratio);
        }

        detector.layoutLayers();
        detector.coreDraw();
        detector.animate();
    },

    // How many nodes sit in each layer, input to output.
    layerSizes: [3, 5, 5, 3],

    // Work out where every node in every layer sits on the canvas, and
    // remember the positions in detector.layers for both coreDraw() and
    // event.js to use.
    layoutLayers: function()
    {
        var margin = 46 * detector.ratio;
        var usableWidth = detector.width - margin * 2;
        var layerCount = detector.layerSizes.length;

        detector.layers = detector.layerSizes.map(function(size, layerIndex) {
            var x = margin + (layerCount === 1 ? 0 : usableWidth * layerIndex / (layerCount - 1));
            var spacing = detector.height / (size + 1);

            var nodes = [];
            for (var i = 0; i < size; i++) {
                nodes.push({ x: x, y: spacing * (i + 1) });
            }
            return nodes;
        });
    },

    coreDraw: function()
    {
        var ctx = detector.core.ctx;

        ctx.clearRect(0, 0, detector.width, detector.height);

        ctx.fillStyle = detector.colors.background;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(0, 0, detector.width, detector.height, 12 * detector.ratio);
        } else {
            ctx.rect(0, 0, detector.width, detector.height);
        }
        ctx.fill();

        // Idle edges between every pair of nodes in consecutive layers.
        ctx.strokeStyle = detector.colors.edge;
        ctx.lineWidth = 1;
        for (var l = 0; l < detector.layers.length - 1; l++) {
            var from = detector.layers[l];
            var to = detector.layers[l + 1];
            for (var i = 0; i < from.length; i++) {
                for (var j = 0; j < to.length; j++) {
                    ctx.beginPath();
                    ctx.moveTo(from[i].x, from[i].y);
                    ctx.lineTo(to[j].x, to[j].y);
                    ctx.stroke();
                }
            }
        }

        // Nodes on top of the edges.
        var nodeRadius = 6 * detector.ratio;
        ctx.lineWidth = 2;
        detector.layers.forEach(function(layer) {
            layer.forEach(function(node) {
                ctx.beginPath();
                ctx.fillStyle = detector.colors.nodeFill;
                ctx.strokeStyle = detector.colors.nodeStroke;
                ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2, true);
                ctx.fill();
                ctx.stroke();
            });
        });
    },

    addEvent: function()
    {
        var num = Math.max(3, Math.ceil(15 * Math.random()));

        for (var i = 0; i < num; i++) {
            var index = Math.round(Math.random() * (detector.tracks.length - 1));
            var event = new ParticleEvent(detector.tracks[index]);
            detector.events.list.push(event);
        }
    },

    addEventExternal: function(numWorkers)
    {
        if (!detector.visible) {
            return;
        }

        var num = Math.min(20 * numWorkers / 10, 20);

        for (var i = 0; i < num; i++) {
            var index = Math.round(Math.random() * (detector.tracks.length - 1));
            var event = new ParticleEvent(detector.tracks[index], true);
            detector.events.list.push(event);
        }
    },

    draw: function(duration)
    {
        detector.events.ctx.clearRect(0, 0, detector.width, detector.height);

        var del = -1;
        for (var e in detector.events.list) {
            if (detector.events.list[e].alpha > 0) {
                detector.events.list[e].draw(duration);
            } else {
                del = e;
            }
        }

        if (del > 0) {
            detector.events.list.splice(0, del);
        }
    }
};

window.requestAnimFrame = (function(){
    return window.requestAnimationFrame       ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame    ||
           window.oRequestAnimationFrame      ||
           window.msRequestAnimationFrame     ||
           function(/* function */ callback, /* DOMElement */ element){
               window.setTimeout(callback, 1000 / 60);
           };
})();

(function() { detector.init(400); $('#detector').width(400).height(400); })();
