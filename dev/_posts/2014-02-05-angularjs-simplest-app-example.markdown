---
layout: post
title:  "Simplest example of Angular.js app"
date:   2014-02-11 16:47:00
---


```html
<html ng-app="demoApp">
    <head>
        <script src="/javascript/angular.js"></script>
        <script src="/javascript/app.js"></script>
    </head>
    <body>
        <div ng-controller="EchoController">
            <input type="text" ng-model="message">
            <p>{{ message }}</p>
        </div>
    </body>
</html>
```

First of all `angular.js` script runs. It setups global `angular` object and makes some pre-boottrap work like registering built-in modules and setting event handler on DOM ready event.

```javascript
// registering built-in modules
angularModule = setupModuleLoader(window);
angularModule('ngLocale', []).provider('$locale', $LocaleProvider);
angularModule('ng', ['ngLocale'], ['$provide',
    function ngModule($provide) {...}]);
// ...  ...  ...
// set event handler and globally expose `angular` object
publishExternalAPI(angular);
jqLite(document).ready(function() {
    angularInit(document, bootstrap);
});
```

After that it is turn of `app.js` script to run. It creates module `demoApp` and insctructs it to register `EchoController` controller later. It will be done during module's configuration phase. See post about modules for more info.

```javascript
var demoApp = angular.module('demoApp', []);
demoApp.controller('EchoController', function($scope) {
    $scope.message = "qwerty";
});
```

Now we wait untill DOM is ready to kick off bootstraping of Angular app. During bootstrap process modules are configured and initialized by their run blocks. Note that in this process phase typically we should not access DOM, as it will be transformed later by compilation and linking. By the way it is during `demoApp` module configuration when `EchoController` is registered:

```javascript
$controllerProvider.register('EchoConroller', function($tscope) {
    $scope.message = "qwerty";
});
```

Finally everything is ready to start compilation and linking. Compiler will see node with `ngController` directive and will handle it by `addDirective` function. Directive is nothin more than kind of service, so `addDirective` simply ask injector to deliver directive. Just like every service, 'ngControllerDirective' has corresponding `ngControllerDirectiveProvider` provider.

```javascript
// service name is 'ngControllerDirective'
// why it returns array?
var directives = $injector.get('ngControllerDirective')
```

Durint linking phase (`nodeLinkFn` function) `$controller` service calls `EchoController` function. Under the hood `$controller` lookups internal registor by name `EchoController` and sees there corresponding entry - our function.

```javascript
controller = directive.controller;
if (controller == '@') {
  controller = attrs[directive.name];
}
// controller='EchoController'
controllerInstance = $controller(controller, locals);
```

```javascript
// we are inside `$controller`
//function ($scope) {
//  $scope.message = "qwerty";
//}
instance = $injector.instantiate(expression, locals);
```

Argument `locals` is needed to inject scope object assiciated with `EchoController`. Remember, controller function asks for a `$scope` and by default this is a root scope, that can be overriden by a scope from a `locals`.

```javascript
// 'EchoController' asks for '$scope'
function($scope) {
    $scope.message = "qwerty";
}
```

Notice that controller function is handled as a counscructor. So we can write like this:

```javascript
function($scope) {
    $scope.message = "qwerty";
    this.pi = 3.14;
}
```

and then `controllerInstance` is a object with a `pi` field. Why so is a separate in depth topic about controllers.

And only after all above linking of "<div ng-controller="EchoController">" and all it's descendants is started. Linking bidirectionally binds scope with a DOM. In our case these are `input` element and `{{ message }}` text node.