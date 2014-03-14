---
layout: post
title:  "Simplest example of Angular.js app"
date:   2014-02-11 16:47:00
---
{% raw %}

Here is example of typical Angular.js "Hello World" app: [codepen](http://codepen.io/kykyev/pen/vCeGa). App is as simple as possible but a lot of details are moving under the hood.

```html
<html ng-app="demoApp">
    <head>
        <script src="/javascript/angular.js"></script>
        <script src="/javascript/app.js"></script>
    </head>
    <body>
        <div ng-controller="EchoController">
            <input type="text" ng-model="message">
            <p>{{message}}</p>
        </div>
    </body>
</html>
```

First of all `angular.js` script runs. It setups global `angular` object and makes some pre-bootstrap work like registering built-in modules and setting event handler on DOM ready event.

```javascript
angularModule = setupModuleLoader(window);
// registering built-in modules
angularModule('ngLocale', []).provider('$locale', $LocaleProvider);
angularModule('ng', ['ngLocale'], ['$provide',
    function ngModule($provide) {...}]);

// globally expose `angular` object
publishExternalAPI(angular);
// set handler on DOM ready event
jqLite(document).ready(function() {
    angularInit(document, bootstrap);
});
```

Then `app.js` script runs. It creates module `demoApp` and instructs it to register `EchoController` controller later. Actual registration of the controller will be done during module's configuration phase. See [post](/2014/01/27/angularjs-modules.html) about modules for more info.

```javascript
var demoApp = angular.module('demoApp', []);
demoApp.controller('EchoController', function($scope) {
    $scope.message = "qwerty";
});
```

Now we wait until DOM is ready when app bootstrap is kicked off. During bootstrap process modules are configured and initialized by their run blocks. It is during `demoApp` module configuration when `EchoController` is registered:

```javascript
$controllerProvider.register('EchoConroller', function($tscope) {
    $scope.message = "qwerty";
});
```

Actual bootstrap algorithm is following:

1. Function `angularInit` extracts value of HTML `ng-app` attribute - `demoApp` in example. This is user defined root module that represents app. Finally `angularInit` makes call to `bootstrap`:

  ```javascript
    // appElement = html root element in our example
    // module = "demoApp"
    bootstrap(appElement, module ? [module] : []);
  ```

2. Function `bootstrap` augment `modules` array with built-in module `ng`:

  ```javascript
    modules.unshift(['$provide', function($provide) {
      $provide.value('$rootElement', element);
    }]);
    modules.unshift('ng');
  ```

  Then all modules are configured and initialized in the context of the same injector:

  ```javascript
    var injector = createInjector(modules);
  ```

3. Lastly `bootstrap` function kicks off DOM compilation:

  ```javascript
    injector.invoke(['$rootScope', '$rootElement', '$compile', '$injector', '$animate',
       function(scope, element, compile, injector, animate) {
        scope.$apply(function() {
          element.data('$injector', injector);
          compile(element)(scope);
        });
      }]
    );
  ```

  By the way default injector can be later accessed as `$injector` attribute of `html` root element. That can be necessary some other modules are introduced in the context of their own injector that doesn't know about services from `ng` and `demoApp` modules. That's why you will need to directly call default injector.

Compilation and linking
-----------------------

Compiler handles nodes with `compileNodes` function that collects directives declarations, e.g `ng-controller="EchoController"`. Directive is nothing more than kind of service, for example `ngConroller` directive maps into `ngControllerDirective` service. Just like every service, `ngControllerDirective` has corresponding `ngControllerDirectiveProvider` provider.

Now to the linking. During that phase (`nodeLinkFn` function) `$controller` service instantiates `EchoController`.

```javascript
controller = directive.controller;
if (controller == '@') {
  controller = attrs[directive.name];
}
// controller='EchoController'
controllerInstance = $controller(controller, locals);
```

Under the hood `$controller` lookups internal cache by name `EchoController`, sees there our controller constructor function, runs it and thus produce controller instance. `expression` could be either function or string. In later case string is extracted from HTML markup - `EchoController` in our example. But it could also take form `EchoController as echo` for example - see commented source for what it means.

```javascript
function(expression /* "EchoController" */, locals) {
    var instance, match, constructor, identifier;

    if(isString(expression)) {
        // parsing expression
        // CNTRL_REG = "^(\S+)(\s+as\s+(\w+))?$"
        // e.g. "EchoController as echo" is accepted
        match = expression.match(CNTRL_REG);
        constructor = match[1]; // "EchoController"
        identifier = match[3];
        // in our case `undefined` but if
        // expression was "EchoController as echo"
        // then `identifier` would be 'echo'

        // lookup in cache
        expression = controllers[constructor]
        // returns our controller function
        //function ($scope) {
        //  $scope.message = "qwerty";
        //}
    }

    // instantiating controller
    instance = $injector.instantiate(expression, locals);

    // in case of "EchoController as echo" `echo` key that
    // references controller instance is placed in scope
    // so we can access controller instance from within HTML
    if (identifier) {
        locals.$scope[identifier] = instance;
    }
}
```

Argument `locals` is needed to inject scope object associated with `EchoController`. Remember, controller constructor asks for a `$scope` and by default this is a root scope. That can be overriden by a scope object from a `locals`.

```javascript
// 'EchoController' asks for '$scope'
function($scope) {
    $scope.message = "qwerty";
}
```

It should be stressed that `EchoController` is a constructor function. So we can write like in the following code snippet and thus controller instance would be a object with a `pi` field.

```javascript
function EchoController($scope) {
    $scope.message = "qwerty";
    this.pi = 3.14;
}
```

Finally only after all above is done linking of `<div ng-controller="EchoController">` and all it's descendants is started. Linking bidirectionally binds scope with a DOM. In our case these are `input` element and `{{ message }}` text node.
