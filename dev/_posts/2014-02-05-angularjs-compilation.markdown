---
layout: post
title:  "Compilation process in Angular.js"
date:   2014-02-06 20:22:00
---

Entry point into compilation process is in `doBootstrap` function. To get rid of unneccessary context that code can be paraphrased in following way:

```javascript
// root DOM element
var $rootElement = angular.element(window.document);
// setup builtin services
var $injector = angular.injector(['ng']);
// compiling
var $compile = $injector.get('$compile');
var compositeLinkFn = $compile($rootElement);
// linking
var $rootScope = $injector.get('$rootScope');
compositeLinkFn($rootScope);
```



```javascript
function compile ($compileNodes, ...) {
    // compiles DOM tree and make link function
    var compositeLinkFn = compileNodes($compileNodes, ...);
    return function publicLinkFn(scope, ...) {
        // linking, this produces live view
        compositeLinkFn(scope, ...);
    };
}
```

Function `compileNodes` takes a list of DOM nodes -- [node1, node2, ..., nodeN].

It cycle  [node1, node2, ..., nodeN] list, say current loop value is nodeK:

1. Collects directives attached to nodeK by `collectDirectives` function.
2. If there are any directives found they are applied by function `applyDirectivesToNode` that returns `nodeLinkFn`  -- a linking function for the nodeK. If no directives found then `nodeLinkFn` is set to `null`. In a nutshell directive's `compile` method is called

  ```javascript
  linkFn = directive.compile($compileNode, ...);
  ```
Returned `linkFn` function will be called upon executing `nodeLinkFn`.

3. `compileNodes` recursively calls itself for childs of nodeK. This returns `childLinkFn` -- a composite linking function. If there are no child then `childLinkFn` is set to null.
4. Pushs link functions into array

  ```javascript
  linkFns.push(nodeLinkFn, childLinkFn)
  ```

5. Remembers if where is anything apart from `null`

  ```javascript
  linkFnFound = linkFnFound || nodeLinkFn || childLinkFn`;
  ```

Finally after cycle ends `compileNodes` returns self explaining value

```javascript
linkFnFound ? compositeLinkFn : null;
```

that is either closure `compositeLinkFn` or null. Key thing to remember is that `compositeLinkFn` contains `linkFns` array in it's environment: `linkFns` = [nodeLinkFn1, childLinkFn1, nodeLinkFn2, childLinkFn2, ..., nodeLinkFnN, childLinkFnN]

This nested structure of `compositeLinkFn` closures mimics DOM and is used in linking phase. For example, this DOM tree

<div class="illustration">
    <img class="illustration__img" src="/assets/img/angular-compilation-dom.svg">
</div>

is mimiced by the following 'tree' of link closures:

<pre>
X<sup>[html]</sup> &rarr; [Y<sup>html</sup>, X<sup>[head, body]</sup>]
.    X<sup>[head, body]</sup> &rarr; [Y<sup>head</sup>, X<sup>[style]</sup>, Y<sup>body</sup>, X<sup>[input, p]</sup>]
.    .    X<sup>[style]</sup> &rarr; [Y<sup>head</sup>, null]
.    X<sup>[input, p]</sup> &rarr; [Y<sup>input</sup>, null, Y<sup>p</sup>, X<sup>[#text]</sup>]
.    .    X<sup>[#text]</sup> &rarr; [Y<sup>#text</sup>, null]

where compositeLinkFn &equiv; X
      nodeLinkFn &equiv; Y
      &rarr; &equiv; "has in closure environment"
</pre>

So `$compile` service applied to root DOM element returns compositeLinkFn<sup>[html]</sup>. Later one called with default scope turns DOM tree into live view equipped with two-way data bindings.

```javascript
var compositeLinkFn = $compile($rootElement /* html root element */);
compositeLinkFn($rootScope);
```