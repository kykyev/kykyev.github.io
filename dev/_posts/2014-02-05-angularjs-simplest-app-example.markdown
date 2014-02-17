---
layout: post
title:  "Simplest example of Angular.js app"
date:   2014-02-11 16:47:00
---
{% raw %}

Here is example of classic Angular.js demo app: [codepen](http://codepen.io/kykyev/pen/vCeGa). App is as simple as possible but a lot of is moving under the hood.

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

Then `app.js` script runs. It creates module `demoApp` and insctructs it to register `EchoController` controller later. Actual registration will be done during module's configuration phase. See [post](/2014/01/27/angularjs-modules.html) about modules for more info.

```javascript
var demoApp = angular.module('demoApp', []);
demoApp.controller('EchoController', function($scope) {
    $scope.message = "qwerty";
});
```

Now we wait until DOM is ready when app bootstraping is kicked off. During bootstrap process modules are configured and initialized by their run blocks. It is during `demoApp` module configuration when `EchoController` is registered:

```javascript
$controllerProvider.register('EchoConroller', function($tscope) {
    $scope.message = "qwerty";
});
```

Note that in this phase typically we should not access DOM, as it will be transformed later by compilation and linking.

Finally everything is ready to start compilation and subsequent linking. Compiler handles nodes with `compileNodes` function that collects directives declarations, e.g `ng-controller="EchoController"`. Directive is nothing more than kind of service, for example `ngConroller` directive maps into `ngControllerDirective` service. Just like every service, `ngControllerDirective` has corresponding `ngControllerDirectiveProvider` provider.

Now to the linking. During that phase (`nodeLinkFn` function) `$controller` service calls `EchoController` function.

```javascript
controller = directive.controller;
if (controller == '@') {
  controller = attrs[directive.name];
}
// controller='EchoController'
controllerInstance = $controller(controller, locals);
```

Under the hood `$controller` lookups internal cache by name `EchoController` and sees there corresponding entry - our function.

```javascript
// we are inside `$controller`
//expression = function ($scope) {
//  $scope.message = "qwerty";
//}
instance = $injector.instantiate(expression, locals);
```

Argument `locals` is needed to inject scope object associated with `EchoController`. Remember, controller function asks for a `$scope` and by default this is a root scope. That can be overriden by a scope from a `locals`.

```javascript
// 'EchoController' asks for '$scope'
function($scope) {
    $scope.message = "qwerty";
}
```

Notice that controller function is handled as a constructor. So we can write like this:

```javascript
function($scope) {
    $scope.message = "qwerty";
    this.pi = 3.14;
}
```

and then `controllerInstance` is a object with a `pi` field.

And only after all above is done linking of `<div ng-controller="EchoController">` and all it's descendants is started. Linking bidirectionally binds scope with a DOM. In our case these are `input` element and "{{ message }}" text node.
