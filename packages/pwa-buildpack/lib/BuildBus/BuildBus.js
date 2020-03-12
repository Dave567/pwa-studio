const path = require('path');
const pertain = require('pertain');
const TargetProvider = require('./TargetProvider');
const Trackable = require('./Trackable');

const busCache = new Map();

const FACTORY = Symbol('FORCE_BUILDBUS_CREATE_FACTORY');
class BuildBus extends Trackable {
    static clear(context) {
        const absContext = path.resolve(context);
        busCache.delete(absContext);
    }
    static clearAll() {
        busCache.clear();
    }
    static for(context) {
        const absContext = path.resolve(context);
        if (busCache.has(absContext)) {
            return busCache.get(absContext);
        }
        const bus = new BuildBus(FACTORY, absContext);
        busCache.set(absContext, bus);
        bus.identify(context, console.log); // should be quickly replaced!
        return bus;
    }
    constructor(invoker, context) {
        super();
        if (invoker !== FACTORY) {
            throw new Error(
                `BuildBus must not be created with its constructor. Use the static factory method BuildBus.for(context) instead.`
            );
        }
        this._hasRun = {};
        this.context = context;
        this.targetProviders = new Map();
    }
    getTargetsOf(depName) {
        return this._getTargets(depName).own;
    }
    _getTargets(depName) {
        const targetProvider = this.targetProviders.get(depName);
        if (!targetProvider) {
            throw new Error(
                `${
                    this._identifier
                }: Cannot getTargetsOf("${depName}"): ${depName} has not yet declared`
            );
        }
        return targetProvider;
    }
    _requestTargets(source, requested) {
        this.track('requestTargets', { source, requested });

        const targets = {};
        const targetProvider = this._getTargets(requested);
        for (const [name, tapable] of Object.entries(
            targetProvider._tapables
        )) {
            targets[name] = targetProvider._linkTarget(source, name, tapable);
        }
        return targets;
    }
    init() {
        this.runPhase('declare');
        this.runPhase('intercept');
        return this;
    }
    runPhase(phase) {
        if (this._hasRun[phase]) {
            return;
        }
        this._hasRun[phase] = true;
        this.track('runPhase', phase);
        pertain(this.context, `pwa-studio.targets.${phase}`).forEach(dep => {
            let targetProvider = this.targetProviders.get(dep.name);
            if (!targetProvider) {
                targetProvider = new TargetProvider(this, dep, extDep =>
                    this._requestTargets(dep.name, extDep)
                );
                this.targetProviders.set(dep.name, targetProvider);
            }
            targetProvider.phase = phase;
            this.track('requireDep', phase, dep.name, dep.path);
            require(dep.path)(targetProvider);
            targetProvider.phase = null;
        });
    }
}

module.exports = BuildBus;
