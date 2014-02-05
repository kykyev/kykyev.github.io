---
layout: post
title:  "Angular.js modules"
date:   2014-01-27 16:20:00
---

Public API call `angular.module` is created by `setupModuleLoader` function. After removing "irrelevant" code it looks pretty simple. So `angular.module` is in fact a closure with a `modules` object in it's lexical environment.

```javascript
function setupModuleLoader(window) {
    function ensure(obj, name, factory) {
        return obj[name] || (obj[name] = factory());
    }
    var angular = ensure(window, 'angular', Object);
    return ensure(angular, 'module', function() {
        var modules = {};
        return function module(name, requires, configFn) {...}
    }
}
```
First call to `angular.module` will create a `moduleInstance` object and register it in internal `modules` cache. Subsequent calls will return that cached value.

```javascript
function module(name, requires, configFn) {
    return ensure(modules, name, function() {

        var invokeQueue = [];
        var runBlocks = [];
        var config = invokeLater('$injector', 'invoke');

        var moduleInstance = {
            _invokeQueue: invokeQueue,
            _runBlocks: runBlocks,
            ...
        };

        if (configFn) {
            config(configFn);
        }

        return  moduleInstance;
    });
}
```
`invokeLater` function is to provide mechanism for a deferred function invocation. For example call `config(1, "a")` will put into internal `invokeQueue` array item that represents deferred function call. Somewhere in the future this information will allow to actually make call.

```javascript
// now
["$injector", "invoke", [1, "a"]]
// in the future
$injector.invoke.apply($injector, [1, "a"])
```

```javascript
function invokeLater(provider, method, insertMethod) {
    return function() {
        invokeQueue[insertMethod || 'push']([provider, method, arguments]);
        return moduleInstance;
    };
}
```
Module instance object has quite a rich API. Everything except `run` method is using the same pattern with `invokeLater` and refers to "configuration methods". `run` method registers callable blocks into internal `runBlock` array. These blocks will be executed later in the future.

```javascript
var moduleInstance = {
    provider: invokeLater('$provide', 'provider'),
    factory: invokeLater('$provide', 'factory'),
    service: invokeLater('$provide', 'service'),
    value: invokeLater('$provide', 'value'),
    constant: invokeLater('$provide', 'constant', 'unshift'),
    animation: invokeLater('$animateProvider', 'register'),
    filter: invokeLater('$filterProvider', 'register'),
    controller: invokeLater('$controllerProvider', 'register'),
    directive: invokeLater('$compileProvider', 'directive'),
    config: config,
    run: function(block) {
        runBlocks.push(block);
        return this;
    },
    ...
};
```
Deferred functions are supposed to be executed by `createInjector` function. See [post](/2014/01/19/angularjs-dependency-injection.html) about Angular's dependency injection mechanism. `loadModules(modulesToLoad)` collects `runBlock`s from all provided modules and their dependencies. Then `runBlock`s are invoked by the service injector. That's why only services can be injected into `runBlock`s.

```javascript
function createInjector(modulesToLoad) {
    ...
    forEach(loadModules(modulesToLoad), function(fn) {
        instanceInjector.invoke(fn || noop);
    });
    ...
}
```

`loadModules` is a recursive function that visits modules in topological order. Remember that module can have one or more other modules as their dependencies. Each module's `invokeQueue` is executed in the "environment" of provider injector. So all configuration methods of module instance object can ask only for providers to be injected.

```javascript
function loadModules(modulesToLoad){
    var runBlocks = [], moduleFn, invokeQueue, i, ii;
    forEach(modulesToLoad, function(module) {
        if (loadedModules.get(module)) return;
        loadedModules.put(module, true);
        ...
        moduleFn = angularModule(module);
        runBlocks = runBlocks
                        .concat(loadModules(moduleFn.requires))
                        .concat(moduleFn._runBlocks);

        for(invokeQueue = moduleFn._invokeQueue,
                    i = 0, ii = invokeQueue.length; i < ii; i++) {
            var invokeArgs = invokeQueue[i],
                provider = providerInjector.get(invokeArgs[0]);
            provider[invokeArgs[1]].apply(provider, invokeArgs[2]);
        }
        ...
    });
    return runBlocks;
  }
```

In the following example ([see fiddle](http://jsfiddle.net/kykyev/PTEUd/1/)) module `modA` is created. Third argument to `angular.module` is a configuration function that setups provider for '$shell' service. After everything is setup `runBlock` provided by `run` method is executed. It ask for a `$shell` service.

```javascript
var ShellProviderFn = function() {
    this.$get = function() {
        return {
            magic_symbol: '@',
            log: function(what) {
                console.log(this.magic_symbol + what);
            }
        };
    };
};

var modAInstance = angular.module("modA", [], function($provide) {
    console.log('begin execute ConfigFn');
    $provide.provider('$shell', ShellProviderFn);
}).run(function($shell) {
    console.log('begin execute runBlock');
    $shell.log('Hello');
});

angular.injector(["modA"]);
```

Angular's modules are not for namespacing. Many modules may share common injector. So if module `modA` registers a service `servA`, then any other module that shares with `modA` the same injector can ask simply for `servA`.

<div class="illustration">
    <img class="illustration__img" src="/assets/img/angular-modules-dependency.svg">
</div>
