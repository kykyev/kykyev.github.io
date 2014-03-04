---
layout: post
title:  "Input and ngModel directives"
date:   2014-02-12 19:10:00
---
{% raw %}

[codepen](http://codepen.io/kykyev/pen/vCeGa)

Here is "directive factory" for a `input` directive. There is corresponding service with the same name `inputDirective`. In a nutshell service constructor returns object wrapped by a "directive factory" and if neccessary fills missing fields with default values. For example in case of `input` directive `priority` field is missing and is set to default value 0. Detailed overview of this process can be found [here](/2014/02/12/angularjs-ng-controller-directive.html) featuring `ngController` directive as example.

```javascript
var inputDirective = ['$browser', '$sniffer', function($browser, $sniffer) {
  return {
    restrict: 'E',
    require: '?ngModel',
    link: function(scope, element, attr, ctrl) {
      if (ctrl) {
        (inputType[lowercase(attr.type)] || inputType.text)
            (scope, element, attr, ctrl, $sniffer, $browser);
      }
    }
  };
}];
```

Notice `require` field. It states that directive depends on `ngModel` controller. Directive's `link` method is called by `nodeLinkFn` function during link phase. As expected value of `ctrl` argument is an instance of `NgModelController`. We will talk about it later.

 ```javascript
for(i = postLinkFns.length - 1; i >= 0; i--) {
    linkFn = postLinkFns[i];
    linkFn(
        linkFn.isolateScope ? isolateScope : scope,
        $element,
        attrs,
        linkFn.require && getControllers(linkFn.require, $element, elementControllers),
        transcludeFn
    );
}
 ```

Now about this code snippet

```javascript
(inputType[lowercase(attr.type)] || inputType.text)
```

It will make sence if you look at 'ng/directive/input.js' file. `inputType` is a mapping from input type to corresponding handler function. Here is a fragment of it.

```javascript
var inputType = {
  'text': textInputType,
  'number': numberInputType,
  'email': emailInputType,
  //...
```

In our case we are dealing with text input that's why handler function is `textInputType`. It is quite involved so it's worth going through.

Here we register handlers on element's "composing" events. Basically we introduce state `composing` attached to input element. This is done via closures.

```javascript
function textInputType(scope, element, attr, ctrl, $sniffer, $browser) {
  if (!$sniffer.android) {
    var composing = false;
    element.on('compositionstart', function(data) {
      composing = true;
    });
    element.on('compositionend', function() {
      composing = false;
    });
  }
```

Function `listener` is a handler for element's [input](https://developer.mozilla.org/en-US/docs/Web/Reference/Events/input) and [change](https://developer.mozilla.org/en-US/docs/Web/Reference/Events/change) events.

```javascript
  var listener = function() {
    // if composing than do nothing
    if (composing) return;
    var value = element.val();
    // do trimming by default
    if (toBoolean(attr.ngTrim || 'T')) {
      value = trim(value);
    }
    // process only if ngModel's view value differs
    // from value extracted from input element
    if (ctrl.$viewValue !== value) {
      if (scope.$$phase) {
        ctrl.$setViewValue(value);
      } else {
        scope.$apply(function() {
          ctrl.$setViewValue(value);
        });
      }
    }
  };
```

And here `listener` event handler is registered.

```javascript
  if ($sniffer.hasEvent('input')) {
    element.on('input', listener);
  } else {
    // akward walkaround for bad browsers
  }
  element.on('change', listener);
```

Variable `ctrl` holds instance of `NgModelController`

```javascript
ctrl.$render = function() {
    element.val(ctrl.$isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue);
};

// a lot of code dealing with input validation
```

We are done with `textInputType` function.

`ctrls[0]` is an instance of `NgModelController`

```javascript
var ngModelDirective = function() {
  return {
    require: ['ngModel', '^?form'],
    controller: NgModelController,
    link: function(scope, element, attr, ctrls) {
      // notify others, especially parent forms

      var modelCtrl = ctrls[0],
          formCtrl = ctrls[1] || nullFormCtrl;

      formCtrl.$addControl(modelCtrl);

      scope.$on('$destroy', function() {
        formCtrl.$removeControl(modelCtrl);
      });
    }
  };
};
```

Notice that controller attribute of `ngController` directive has value `@` while one of `ngModelDirective` has value `NgModelController`.

function nodeLinkFn:

```javascript
controller = directive.controller;
if (controller == '@') {
  controller = attrs[directive.name];
}
controllerInstance = $controller(controller, locals);
```

Let's explore `NgModelController`. \<input\> element has a string value that is displayed on a page. This is `$viewValue` - string representation of model value. Actual model value `$modelValue` might be different. For example, in case of \<input type="date"\> `$viewValue` might be string "Dec 12, 2010" while `$modelValue` is javascript `Date` object.

```javascript
var NgModelController = ['$scope', '$exceptionHandler', '$attrs', '$element', '$parse',
  function($scope, $exceptionHandler, $attr, $element, $parse) {
    this.$viewValue = Number.NaN;
    this.$modelValue = Number.NaN;
    this.$parsers = [];
    this.$formatters = [];
    this.$viewChangeListeners = [];
    this.$pristine = true;
    this.$dirty = false;
    this.$valid = true;
    this.$invalid = false;
    this.$name = $attr.name;
```

`$attr.ngModel` has string value "message"

```javascript
var ngModelGet = $parse($attr.ngModel),
    ngModelSet = ngModelGet.assign;
if (!ngModelSet) {
    throw "Expression is non-assignable";
}
```

Method `$render` not surprisingly renders view. `noop` is just empty function. Real `$render` method is setuped by `inputDirective` - see `textInputType` function above.

```javascript
this.$render = noop;
```

Tests if input field is empty.

```javascript
this.$isEmpty = function(value) {
    return isUndefined(value) || value === '' || value === null || value !== value;
};
```

???

```javascript
var parentForm = $element.inheritedData('$formController') || nullFormCtrl,
    invalidCount = 0, // used to easily determine if we are valid
    $error = this.$error = {}; // keep invalid keys here
```

`PRISTINE_CLASS` has string value "ng-pristine"

```javascript
  // Setup initial state of the control
  $element.addClass(PRISTINE_CLASS);
  toggleValidCss(true);
```

???

```javascript
  // convenience method for easy toggling of classes
  function toggleValidCss(isValid, validationErrorKey) {
    validationErrorKey = validationErrorKey ? '-' + snake_case(validationErrorKey, '-') : '';
    $element.
      removeClass((isValid ? INVALID_CLASS : VALID_CLASS) + validationErrorKey).
      addClass((isValid ? VALID_CLASS : INVALID_CLASS) + validationErrorKey);
  }
```

???

```javascript
  this.$setPristine = function () {
    this.$dirty = false;
    this.$pristine = true;
    $element.removeClass(DIRTY_CLASS).addClass(PRISTINE_CLASS);
  };
```

Method `$setViewValue` should be called when value in input field changes.

```javascript
this.$setViewValue = function(value) {
    this.$viewValue = value;
    // change to dirty
    if (this.$pristine) {
        this.$dirty = true;
        this.$pristine = false;
        $element.removeClass(PRISTINE_CLASS).addClass(DIRTY_CLASS);
        parentForm.$setDirty();
    }

    forEach(this.$parsers, function(fn) {
        value = fn(value);
    });

    if (this.$modelValue !== value) {
        this.$modelValue = value;
        ngModelSet($scope, value);
        forEach(this.$viewChangeListeners, function(listener) {
            try {
              listener();
            } catch(e) {
              $exceptionHandler(e);
            }
        });
    }
};
```

Register handler that will be called whenever scope state changes and during app init process. Notice that dirty checking is involved - we check whether value from scope differs from `$modelValue` on this controller.

```javascript
var ctrl = this;

$scope.$watch(function ngModelWatch() {
    var value = ngModelGet($scope);
    // if scope model value and ngModel value are out of sync
    if (ctrl.$modelValue !== value) {

        var formatters = ctrl.$formatters,
            idx = formatters.length;

        ctrl.$modelValue = value;
        // run formatters
        while(idx--) {
            value = formatters[idx](value);
        }
        // rerender view if needed
        if (ctrl.$viewValue !== value) {
            ctrl.$viewValue = value;
            ctrl.$render();
        }
    }
    return value;
});
```