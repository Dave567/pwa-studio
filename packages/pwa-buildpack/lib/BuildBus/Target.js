/**
 * Represents an edge on the graph, or a "route" between stops, created between
 * two extensions when one of them references the target(s) of another. When
 * extension Foo requests targets of extension Bar, the BuildBus provides an
 * Target instead of the literal Tapable instance. This enables
 * better logging, error checking, and validation.
 */
const Trackable = require('./Trackable');

class Target extends Trackable {
    constructor(owner, requestor, targetName, tapableType, tapable) {
        super();
        this._owner = owner;
        this._tapable = tapable;
        this._requestor = requestor;
        this.name = targetName;
        this.identify(`${targetName}[${tapableType}]`, this._owner);
    }
    _invokeTap(method, customName, tap) {
        let interceptor = tap;
        let tapName = this._requestor;
        if (interceptor) {
            // a custom name was passed!
            tapName = `${this._requestor}:${customName}`;
        } else {
            interceptor = customName;
        }
        this.track(method, {
            requestor: this._requestor,
            interceptor: tapName
        });
        return this._tapable[method](tapName, interceptor);
    }
    call(...args) {
        this.track('beforeCall', ...args);
        const returned = this._tapable.call(...args);
        this.track('afterCall', returned, ...args);
        return returned;
    }
    callAsync(...args) {
        this.track('beforeCallAsync', ...args);
        const callbackIndex = args.length - 1;
        const callback = args[callbackIndex];
        const argsMinusCallback = args.slice(0, callbackIndex);
        argsMinusCallback.push((...returned) => {
            this.track('afterCallAsync', { returned }, ...args);
            callback(...returned);
        });
        return this._tapable.callAsync();
    }
    intercept(options) {
        this.track('tapableIntercept', options);
        return this._tapable.intercept(options);
    }
    promise(...args) {
        this.track('beforePromise', ...args);
        return this._tapable.promise(...args).then(returned => {
            this.track('afterPromise', { returned }, ...args);
            return returned;
        });
    }
    tap(name, interceptor) {
        return this._invokeTap('tap', name, interceptor);
    }
    tapAsync(name, interceptor) {
        return this._invokeTap('tapAsync', name, interceptor);
    }
    tapPromise(name, interceptor) {
        return this._invokeTap('tapPromise', name, interceptor);
    }
    track(eventName, ...args) {
        return super.track(eventName, ...args);
    }
}

Target.External = class ExternalTarget extends Target {
    _throwOnExternalInvoke(method) {
        throw new Error(
            `${this._requestor} ran targets.of("${this._owner.name}").${
                this.name
            }.${method}(). Only ${
                this._owner.name
            } can invoke its own targets. ${
                this._requestor
            } can only intercept them.`
        );
    }
    call() {
        this._throwOnExternalInvoke('call');
    }
    callAsync() {
        this._throwOnExternalInvoke('callAsync');
    }
    promise() {
        this._throwOnExternalInvoke('promise');
    }
};

module.exports = Target;
