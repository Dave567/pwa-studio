const { inspect } = require('util');
class WrapLoaderConfig {
    constructor(passedConfig) {
        if (passedConfig === undefined) {
            this._setsForExports = Object.create(null);
        } else if (passedConfig instanceof WrapLoaderConfig) {
            this._setsForExports = passedConfig._setsForExports;
        } else {
            throw new Error(
                `A WrapLoaderConfig can only be constructed from another WrapLoaderConfig or from nothing, but the passed argument was: ${inspect(
                    passedConfig
                )}`
            );
        }
    }
    _ensureOn(obj, name, Thing) {
        let prop = obj[name];
        if (!(name in obj)) {
            prop = new Thing();
            obj[name] = prop;
        }
        return prop;
    }
    _provideSet(modulePath, exportName) {
        return this._ensureOn(
            this._ensureOn(this._setsForExports, modulePath, Object),
            exportName,
            Set
        );
    }
    toLoaderOptions() {
        const wrap = {};
        for (const [modulePath, setForExport] of Object.entries(
            this._setsForExports
        )) {
            wrap[modulePath] = {};
            for (const [exportName, wrappers] of Object.entries(setForExport)) {
                wrap[modulePath][exportName] = [...wrappers];
            }
        }
        return { wrap };
    }
}

module.exports = WrapLoaderConfig;
