---
layout: post
title:  "Bootstraping Angular.js app"
date:   2014-02-05 15:35:00
---

```javascript
modules = modules || [];
modules.unshift(['$provide', function($provide) {
  $provide.value('$rootElement', element);
}]);
modules.unshift('ng');
var injector = createInjector(modules);
```

In ... it is described how case of `ng` is handled. Remember that every module has two different blocks of code associated with it - "config block" and "run block". `loadModules` first runs all config blocks and then all run blocks both in the same topological sort order.

Apart from module name `loadModules` can handle and special array form as above. You can think of this as an degraded module case. Here "config block" is `function($provide) {...}` and "run block" is `undefined` value because first function returns nothing.

```javascript
function loadModules(modulesToLoad){
    var runBlocks = [], moduleFn, invokeQueue, i, ii;
    forEach(modulesToLoad, function(module) {
        if (loadedModules.get(module)) return;
        loadedModules.put(module, true);
        try {
            if (isString(module)) {
              // handles 'ng' case
              // see post about Angular.js modules
            } else if (isFunction(module)) {
                runBlocks.push(providerInjector.invoke(module));
            } else if (isArray(module)) {
                // handles case of ['$provide', function($provide) {...}]
                runBlocks.push(providerInjector.invoke(module));
            } else {
              assertArgFn(module, 'module');
            }
        } ...
    });
    return runBlocks;
}
```

