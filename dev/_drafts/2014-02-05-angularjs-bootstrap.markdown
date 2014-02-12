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

Apart from module name `loadModules` can handle and special array form.

```javascript
modules.unshift(['$provide', function($provide) {
  $provide.value('$rootElement', element);
}]);
```

You can think about this as an degraded module case. Function body is executed during configuration phase. "Run block" is a return value of a function. In the example function returns `undefined` so "run block" is effectivly nothing. But we can write something like this:

```javascript
modules.unshift(['$foo', function($foo) {
  return function () {
    $foo.bar();
  };
}]);
```


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

