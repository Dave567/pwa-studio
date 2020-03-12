const { inspect } = require('util');
const jsonCache = new WeakMap();

class Inspectable {
    constructor(props) {
        this._props = props;
    }
    [inspect.custom](depth, options) {
        if (depth < 0) {
            return options.stylize(this.toString(), 'special');
        }
        return this._props;
    }
    toString() {
        return `${this._props.type}<${this._props.id}>`;
    }
}

const liveMethods = {
    toJSON() {
        if (jsonCache.has(this)) {
            return jsonCache.get(this);
        }
        const props = {
            type: this.constructor.name,
            id: this._ensureIdentifier()
        };
        if (this._parent) {
            props.parent = this._parent.toJSON();
        }
        const json = new Inspectable(props);
        jsonCache.set(this, json);
        return json;
    },
    track(event, ...args) {
        if (!this._out) {
            throw new Error(
                'Trackable must be initialized with tracker.identify'
            );
        }
        return this._out({
            origin: this.toJSON(),
            event,
            args
        });
    }
};

const deadMethods = {
    toJSON() {
        return {};
    },
    track() {}
};

class Trackable {
    static enableTracking() {
        Object.assign(Trackable.prototype, liveMethods);
    }
    static disableTracking() {
        Object.assign(Trackable.prototype, deadMethods);
    }
    _ensureIdentifier() {
        if (!this.hasOwnProperty('_identifier')) {
            throw new Error(
                'Trackable must be initialized with tracker.identify'
            );
        }
        return this._identifier;
    }
    identify(identifier, owner) {
        this._identifier = identifier;
        if (owner instanceof Trackable) {
            this._parent = owner;
            this._out = (...args) => this._parent._out(...args);
        } else {
            this._out = owner;
        }
    }
}

Trackable.disableTracking();

module.exports = Trackable;
