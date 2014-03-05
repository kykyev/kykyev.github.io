---
layout: post
title:  "Dive into ngController directive"
date:   2014-02-12 19:10:00
---
{% raw %}

[codepen](http://codepen.io/kykyev/pen/vCeGa)

```html
<div ng-controller="EchoController">
        <input type="text" ng-model="message">
        <p>{{message}}</p>
    </div>
</body>
```

```javascript
var demoApp = angular.module('demoApp', []);
demoApp.controller('EchoController', function($scope) {
    $scope.message = "qwerty";
});
```

Built-in directives like `ng-controller` are registered during configuration of `ng` module. This is done by call to `directive` method of `$CompileProvider`. As one can expect `$CompileProvider` is a provider for a `$compile` service. One might reason that every directive teaches compiler a new trick. Directives are working on a per DOM element level - they describe procedure how to attach some behavior to element or transform it. Job of compiler is to traverse whole DOM tree, find all directives, execute them and thus transform static HTML markup into live view.

```javascript
angularModule('ng', ['ngLocale'])
  .config(['$provide', function ngModule($provie) {
    // register provider for `$compile` service
    // and call provider's `directive` method
    // that registers built-in directives
    $provide.provider('$compile', $CompileProvider).
      directive({
        input: inputDirective,
        ngController: ngControllerDirective,
        ngModel: ngModelDirective
      })
    });
  }]);
```

Here `ngControllerDirective` is what is called "directive factory". It is what is passed to `directive` method as a `directiveFactory` argument.

```javascript
// directive factory for `ngController` directive
var ngControllerDirective = [function() {
  return {
    scope: true,
    controller: '@',
    priority: 500
  };
}];
// let's register `ngController` directive
$compileProvider.directive('ngController', ngControllerDirective);
```

Later it will be shown that directive factory is invoked by `$injector.invoke` which makes it injectable.

```javascript
var sampleDirectiveFactory = ["$Dependency", function($dep) {
  return {
    foo: $dep.isFoo()
  };
}];

var directive = $injector.invoke(sampleDirectiveFactory);
```

Let's look under the hood of `directive` method. In it's closure it has `hasDirectives` cache object for storing already registered directives.  If cache doesn't contain key `ngController` then we register provider for `ngControllerDirective` service. Remember that `$provide.factory` is a special case of `$provide.provide` [see [1]](#note1). Service 'ngControllerDirective' has the same name as a directive factory 'ngControllerDirective' but strickly speaking they are different entities. We will see later that service constructor calls directive factory.

```javascript
var hasDirectives = {};

this.directive = function registerDirective(name, directiveFactory) {
    if (isString(name)) {
      if (!hasDirectives.hasOwnProperty(name)) {
        hasDirectives[name] = [];
        $provide.factory(
            name + "Directive",
            ['$injector', '$exceptionHandler', <service constructor>]
        );
      }
      hasDirectives[name].push(directiveFactory);
    } else {
      forEach(name, reverseParams(registerDirective));
    }
    return this;
};
```

Strange case is that single directive can have several factories. Or if we register directive `foo` twice than `hasDirective['foo']` will be array with two identical factories. But for most cases there is one-to-one correspondence between directive and it's factory.

Let's see what is going on inside `<service constructor>`. In case of `ngController` directive `hasDirectives['ngController']` is array of length one that contains directive factory. Being invoked by injector directive factory returns wrapped object.

 ```javascript
 {
    scope: true,
    controller: '@',
    priority: 500
 }
 ```
 Not specified object's fields are set to default values. For instance, directive factory for `ngController` setups only three fields: `scope`, `controller`, `priority`. All the rest fields such as `require`, `restrict`, etc. are set to default values.

```javascript
<service constructor> = function($injector, $exceptionHandler) {
    var directives = [];
    forEach(hasDirectives[name], function(directiveFactory, index) {
      try {
        var directive = $injector.invoke(directiveFactory);
        if (isFunction(directive)) {
          directive = { compile: valueFn(directive) };
        } else if (!directive.compile && directive.link) {
          directive.compile = valueFn(directive.link);
        }
        directive.priority = directive.priority || 0;
        directive.index = index;
        directive.name = directive.name || name;
        directive.require = directive.require || (directive.controller && directive.name);
        directive.restrict = directive.restrict || 'A';
        directives.push(directive);
      } catch (e) {
        $exceptionHandler(e);
      }
    });
    return directives;
  }]
```

`<service constructor>` is called when we first time ask for a `ngControllerDirective` service. In Angular this is done during compilation process. When compiler encounters DOM element it collects directives associated with the element. Following code snippet is from `compileNodes` function.

```javascript
var directives = collectDirectives(nodeList[i], [], attrs, i === 0 ? maxPriority : undefined,
                                        ignoreDirective);
```

Here is a value of `nodeList[i]` from debugging session:

```html
> nodeList[i]
<div ng-controller="EchoController">...</div>
```

`collectDirectives` sees `ng-controller` attribute, normalizes it and pass to `addDirective` as it's second `name` parameter:

```javascript
addDirective(directives, "ngController", 'A', maxPriority, ignoreDirective, attrStartName,
                            attrEndName);
```

`addDirective` asks for `ngControllerDirective` service. It is this time when `<service constructor>` is invoked.

```javascript
var directives = $injector.get("ngControllerDirective");
```

Debugging session:

```javascript
> directives
[{
    controller: "@",
    index: 0,
    name: "ngController",
    priority: 500,
    require: "ngController",
    restrict: "A",
    scope: true
}]
```

Collected directives are applied to DOM element. Metaphorically directives are baked with `nodeLinkFn` closure. So later on during linking when `nodeLinkFn` is called it has `directives` array in closure environment.

```javascript
var nodeLinkFn = applyDirectivesToNode(directives, nodeList[i], ...);

function applyDirectivesToNode(...) {
    //...
    nodeLinkFn.scope = true;
    return nodeLinkFn;
}
```

After compilation phase it is turn for linking. Here is a fragment from `compositeLinkFn` that relevant to controller directive. New scope object is associated with `<div ng-controller="EchoController">` element and this scope is inherited by all descendants of `div` element - `input` and `p` in our case. This `*LinkFn` stuff is tricky - see [Compilation process in Angular.js](/2014/02/06/angularjs-compilation.html) for information.

```javascript
// nodeList=[<div ng-controller="EchoController">]
function compositeLinkFn(scope, nodeList, ...) {
    for (node in nodeList) {
        if (nodeLinkFn.scope) {
            childScope = scope.$new();
            $node.data('$scope', childScope);
        }
        // node=<div ng-controller="EchoController">
        // childLinkFn= composite link function for child
        // elements of <div ng-controller="EchoController">
        // see dedicated post about compilation and linking
        nodeLinkFn(childLinkFn, childScope, node, ...);
    }
}
```

`nodeLinkFn` extracts controller name from node attributes dictionary

```javascript
controller = attrs[directive.name]
```

setups controller's local environment. Without local environment controller will be associated with default `$rootScope`.

```javascript
var locals = {
  $scope: scope,
  $element: $element,
  $attrs: attrs
}, controllerInstance;
```

Everything together:

```javascript
function nodeLinkFn(childLinkFn, scope, linkNode, ...) {
    // ...
    if (controllerDirectives) {
      forEach(controllerDirectives, function(directive) {
        var locals = {
          $scope: scope,
          $element: $element,
          $attrs: attrs
        }, controllerInstance;

        controller = directive.controller;
        if (controller == '@') {
            // extract "EchoController"
            controller = attrs[directive.name];
        }
        // $controller - controller service
        //controller="EchoController"
        controllerInstance = $controller(controller, locals);
        elementControllers[directive.name] = controllerInstance;
        if (!hasElementTranscludeDirective) {
          $element.data('$' + directive.name + 'Controller', controllerInstance);
        }
      });
    }
}
```

Finally about `$controller`. One can guess that this is a service that deals with delivering actuall controller function by it's name. That is `$controller` is a return value of `$ControllerProvider.$get`. That return value is `function(expression, locals)` - function that basically finds controller by expression like `EchoController` and executes it in `locals` environment.   For more info see [Simplest example of Angular.js app](/2014/02/11/angularjs-simplest-app-example.html).

```javascript
controllerInstance = $controller(controller, locals);
```


<div id="note1">[1] factory is a special case of provider with one method - `$get` service constructor</div>
```javascript
function factory(name, factoryFn) {
    return provider(name, { $get: factoryFn });
}
```
