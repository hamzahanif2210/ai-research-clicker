// A single signal pulse fired between two nodes of the network diagram -
// a stand-in for what used to be a particle track through the detector.
// `external` marks pulses generated passively by hired workers (drawn
// fainter) rather than by the player's own click.
function ParticleEvent(type, external)
{
    this.work = typeof external !== 'undefined' ? external : false;
    this.type = type;
    this.alpha = this.work ? 0.5 : 1;

    var layerCount = detector.layers.length;
    var fromLayer = Math.floor(Math.random() * (layerCount - 1));
    var toLayer = fromLayer + 1;

    var fromNodes = detector.layers[fromLayer];
    var toNodes = detector.layers[toLayer];

    this.from = fromNodes[Math.floor(Math.random() * fromNodes.length)];
    this.to = toNodes[Math.floor(Math.random() * toNodes.length)];

    // Bow the connecting line into a gentle arc so overlapping pulses
    // between the same two nodes stay visually distinct.
    var midX = (this.from.x + this.to.x) / 2;
    var midY = (this.from.y + this.to.y) / 2;
    var dx = this.to.x - this.from.x;
    var dy = this.to.y - this.from.y;
    var bow = (Math.random() - 0.5) * 0.6;
    this.controlX = midX - dy * bow;
    this.controlY = midY + dx * bow;

    // 0 -> 1 progress of the pulse traveling from source to target node.
    this.progress = 0;

    this.draw(16, true);
};

ParticleEvent.prototype.pointAt = function(t)
{
    var mt = 1 - t;
    return {
        x: mt * mt * this.from.x + 2 * mt * t * this.controlX + t * t * this.to.x,
        y: mt * mt * this.from.y + 2 * mt * t * this.controlY + t * t * this.to.y
    };
};

ParticleEvent.prototype.draw = function(duration, init)
{
    init = typeof init !== 'undefined' ? init : false;

    var ctx = detector.events.ctx;
    var nodeRadius = 6 * detector.ratio;

    if (!init) {
        this.progress = Math.min(1, this.progress + 0.09 / 16 * duration);
        this.alpha -= 0.02 / 16 * duration;
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.strokeStyle = this.type.color;
    ctx.fillStyle = this.type.color;
    ctx.lineWidth = 2 * detector.ratio;

    // The traveled part of the edge, fading in as the pulse advances.
    ctx.beginPath();
    ctx.moveTo(this.from.x, this.from.y);
    var head = this.pointAt(this.progress);
    // Approximate the quadratic curve up to `progress` with a short run of
    // segments so the partial path still bows the same way as the full one.
    var steps = 12;
    for (var i = 1; i <= steps; i++) {
        var t = this.progress * i / steps;
        var p = this.pointAt(t);
        ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // The pulse head itself.
    ctx.beginPath();
    ctx.arc(head.x, head.y, nodeRadius * 0.6, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.restore();
};
