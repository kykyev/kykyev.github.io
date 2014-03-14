---
layout: post
title:  "Angular.js dependency injection"
date:   2014-01-19 22:48:00
---

Say, for some reason we do not want use `window.console` directly and instead use `$shell` service that somehow wraps `window.console`.

```javascript
var sayHello = function($shell) {
    $shell.log('Hello');
};
```

Each service has it's own provider. Provider is a constructor function (well, [not always [1]](#note1)) that produces object with `$get` factory method. Later one must be either constructor function or simply a function returning object that represents service. Here is a provider for `$shell` service. Anywhere `$shell` is demanded, object returned by `$get` will be injected.

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
```

Central piece of DI mechanism is `injector` object constructed by `createInternalInjector`.

```javascript
function createInternalInjector(cache, factory) {
    function getService(serviceName) {...}
    function invoke(fn, self, locals) {...}
    function instantiate(Type, locals) {...}
    function has(name) {...}
    return {
        invoke: invoke,
        instantiate: instantiate,
        get: getService,
        annotate: annotate,
        has: has
    };
}
```
Actually we need two these objects - one for providers, second for services. Both are created in `createInjector` method that is accesible via `angular.injector`. Angular don't expose `providerInjector`, so a little trick is needed: altering source code to expose neccessary things via global `agent007` object. Now after invoking `angular.injector()` global object `agent007`  we will have everything that is needed.

```javascript
function createInjector(modulesToLoad) {
    var ...,
        providerInjector = (providerCache.$injector =
                                createInternalInjector(providerCache, ...),
        instanceInjector = (instanceCache.$injector =
                                createInternalInjector(instanceCache, ...);
    ...
    // a little trick
    window.agent007 = {
        providerInjector: providerInjector,
        providerCache: providerCache,
        instanceInjector: instanceInjector,
        instanceCache: instanceCache
    };
    return instanceInjector;
}
```

Firstly provider for `$shell` service should be registrated.

```javascript
providerInjector.invoke(function($provide) {
    $provide.provider('$shell', ShellProviderFn);
});
```

Here we see DI in action: function is invoked and parameter `$provide` is taken seemingly out of nowhere. DI mechanics will be reviewed later, for now we may observe that in `createInjector` function `providerCache` is prepopulated with a `$provide` object, so provider injector already knows about it.

```javascript
providerCache = {
        $provide: {
            provider: supportObject(provider),
            factory: supportObject(factory),
            service: supportObject(service),
            value: supportObject(value),
            constant: supportObject(constant),
            decorator: decorator
          }
      }
```

Method  `$provide.provider` is in charge of registrating given provider - instantiates it and populates cache, so next time when this provider is needed it is not instantiated again but is just taken out of the cache. That's why provider is effectively a singleton object.

```javascript
function provider(name, provider_) {
    if (isFunction(provider_) || isArray(provider_)) {
      provider_ = providerInjector.instantiate(provider_);
    }
    if (!provider_.$get) {
      throw $injectorMinErr('pget', "Provider '{0}' must define $get factory method.", name);
    }
    return providerCache[name + providerSuffix] = provider_;
  }
```

After registrating provider for `$shell` service everything is set up to use it. Notice that this time service injector `instanceInjector` is used.

```javascript
var Foo = function($shell) {
    $shell.log('Hello');
};
instanceInjector.invoke(Foo);
```

Now let's look under the hood of injector API. Having removed "unneccessary" code `invoke` method seems to be rather simple.

```javascript
function invoke(fn, self, locals){
    var args = [],
        $inject = annotate(fn), ...;
    for(i = 0, length = $inject.length; i < length; i++) {
        key = $inject[i];
        args.push(getService(key));
    }
    return fn.apply(self, args);
}
```

`annotate` takes either function or array like `["$shell", function(shell) {...}]` and parses it to extract names for parameters. `getService` is another method of injector that lookups for a service. Idea is simple: first lookup in cache, if it does not contain service then instantiate it and populate cache. The rest of code is to detect circular dependencies.

```javascript
function getService(serviceName) {
    if (cache.hasOwnProperty(serviceName)) {
        ...
        return cache[serviceName];
    } else {
        try {
            ...
            return cache[serviceName] = factory(serviceName);
        } catch ...
    }
}
```

Service instantiating is done by a `factory` that is supplied during injector construction. Remember `createInjector` function:

```javascript
function createInjector(modulesToLoad) {
    ...
    var providerInjector = (providerCache.$injector =
        createInternalInjector(providerCache, function() {
            throw $injectorMinErr('unpr', "Unknown provider: {0}", path.join(' <- '));
        }));

    var instanceInjector = (instanceCache.$injector =
          createInternalInjector(instanceCache, function(servicename) {
            var provider = providerInjector.get(servicename + providerSuffix);
            return instanceInjector.invoke(provider.$get, provider);
          }));

    ...
}
```

Notice that factory for a provider injector does nothing except throwing error about unknown service, while service injector factory is more involved:

```javascript
function(servicename) {
    var provider = providerInjector.get(servicename + providerSuffix);
        return instanceInjector.invoke(provider.$get, provider);
}
```
it tries to find provider for a given service. As mentioned above `$get` method of provider is responsible for service instantiation. Service injector invokes `$get` method, and if that dependes on another services than they are recursively resolved.

It is not difficult to exctract DI component out of Angular. See [gist](https://gist.github.com/kykyev/8630948).

<span id="note1">[1]&nbsp;</span>To handle source code minification Angular introduces special syntax. Injector's methods `invoke`, `instantiate` apart from common Javascript function also accepts special array.

```javascript
//source code minification will bloke this
var sayHello = function($shell) {
    $shell.log('Hello');
};

//this is bullet-proof against code minification
var sayHello = ["$shell", function(shell) {
    shell.log('Hello');
}];
```
