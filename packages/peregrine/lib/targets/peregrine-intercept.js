const path = require('path');
const WrapLoaderConfig = require('@magento/pwa-buildpack/lib/WebpackTools/WrapLoaderConfig');

class TalonWrapperConfig extends WrapLoaderConfig {
    _provideSet(modulePath, ...rest) {
        return super._provideSet(
            path.resolve(__dirname, '../talons/', modulePath),
            ...rest
        );
    }
    get useProductFullDetail() {
        return this._provideSet(
            'ProductFullDetail/useProductFullDetail.js',
            'useProductFullDetail'
        );
    }
    get useApp() {
        return this._provideSet('App/useApp.js', 'useApp');
    }
}

module.exports = targets => {
    targets.of('@magento/pwa-buildpack').wrapEsModules.tap(wrapConfig => {
        const talonWrapperConfig = new TalonWrapperConfig(wrapConfig);
        targets.own.talons.call(talonWrapperConfig);
        return wrapConfig;
    });
};
