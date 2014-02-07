---
layout: post
title:  "Compilation process in Angular.js"
date:   2014-02-06 20:22:00
---

`element` is a root `html` DOM element.

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

Function `compileNodes` takes a list of DOM nodes -- [node1, node2, ..., nodeN].

It cycle  [node1, node2, ..., nodeN] list, say current loop value is nodeK:

1. Collects directives attached to nodeK by `collectDirectives` function.
2. If there are directives found they are applied by function `applyDirectivesToNode` that returns `nodeLinkFn`  -- a linking function for the nodeK. If no directives found then `nodeLinkFn` is set to `null`.
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

This nested structure of `compositeLinkFn` closures mimicks DOM and is used in linking phase.

<div class="illustration">
    <img class="illustration__img" src="/assets/img/angular-compilation-dom.svg">
</div>


<pre>
compositeLinkFn &equiv; X
nodeLinkFn &equiv; Y
&rarr; &equiv; "has in closure environment"

X<sup>[html]</sup> &rarr; [Y<sup>html</sup>, X<sup>[head, body]</sup>]
.    X<sup>[head, body]</sup> &rarr; [Y<sup>head</sup>, X<sup>[style]</sup>, Y<sup>body</sup>, X<sup>[input, p]</sup>]
.    .    X<sup>[style]</sup> &rarr; [Y<sup>head</sup>, null]
.    X<sup>[input, p]</sup> &rarr; [Y<sup>input</sup>, null, Y<sup>p</sup>, X<sup>[#text]</sup>]
.    .    X<sup>[#text]</sup> &rarr; [Y<sup>#text</sup>, null]
</pre>