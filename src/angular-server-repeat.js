var minErr = function minErr (module, constructor) {
  return function (){
    var ErrorConstructor = constructor || Error;
    throw new ErrorConstructor(module + arguments[0] + arguments[1]);
  };
};

function createMap() {
  return Object.create(null);
}

function getBlockNodes(nodes) {
  // TODO(perf): update `nodes` instead of creating a new object?
  var node = nodes[0];
  var endNode = nodes[nodes.length - 1];
  var blockNodes;

  for (var i = 1; node !== endNode && (node = node.nextSibling); i++) {
    if (blockNodes || nodes[i] !== node) {
      if (!blockNodes) {
        blockNodes = jqLite(slice.call(nodes, 0, i));
      }
      blockNodes.push(node);
    }
  }

  return blockNodes || nodes;
}

function isArrayLike(obj) {
  // `null`, `undefined` and `window` are not array-like
  if (obj == null || isWindow(obj)) return false;

  // arrays, strings and jQuery/jqLite objects are array like
  // * jqLite is either the jQuery or jqLite constructor function
  // * we have to check the existence of jqLite first as this method is called
  //   via the forEach method when constructing the jqLite object in the first place
  if (isArray(obj) || isString(obj) || (jqLite && obj instanceof jqLite)) return true;

  // Support: iOS 8.2 (not reproducible in simulator)
  // "length" in obj used to prevent JIT error (gh-11508)
  var length = "length" in Object(obj) && obj.length;

  // NodeList objects (with `item` method) and
  // other objects with suitable length characteristics are array-like
  return isNumber(length) &&
    (length >= 0 && ((length - 1) in obj || obj instanceof Array) || typeof obj.item == 'function');
}

function containsObject(obj, list) {
  var result = false;
  var listLength = list.length;
  for (var i = 0; i < listLength; i++) {
    if (angular.equals(list[i],obj)) {
      result = true;
      break;
    }
  }
  return result;
}

angular.module('ServerRepeat', ['ngAnimate']).directive('serverRepeat', function($parse, $animate, $compile) {
  var NG_REMOVED = '$$NG_REMOVED';
  var serverRepeatMinErr = minErr('serverRepeat');

  var updateScope = function(scope, index, valueIdentifier, value, keyIdentifier, key, arrayLength) {
    // TODO(perf): generate setters to shave off ~40ms or 1-1.5%
    scope[valueIdentifier] = value;
    if (keyIdentifier) scope[keyIdentifier] = key;
    scope.$index = index;
    scope.$first = (index === 0);
    scope.$last = (index === (arrayLength - 1));
    scope.$middle = !(scope.$first || scope.$last);
    // jshint bitwise: false
    scope.$odd = !(scope.$even = (index&1) === 0);
    // jshint bitwise: true
  };

  var getBlockStart = function(block) {
    return block.clone[0];
  };

  var getBlockEnd = function(block) {
    return block.clone[block.clone.length - 1];
  };

  return {
    restrict: 'A',
    //multiElement: true,
    $$tlb: true,
    compile: function serverRepeatCompile($element, $attr) {
      var expression = $attr.serverRepeat;
      //var serverRepeatEndComment = $compile.$$createComment('end serverRepeat', expression);

      var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

      if (!match) {
        throw serverRepeatMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
            expression);
      }

      var lhs = match[1];
      var rhs = match[2];
      var aliasAs = match[3];
      var trackByExp = match[4];

      match = lhs.match(/^(?:(\s*[\$\w]+)|\(\s*([\$\w]+)\s*,\s*([\$\w]+)\s*\))$/);

      if (!match) {
        throw serverRepeatMinErr('iidexp', "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.",
            lhs);
      }
      
      var valueIdentifier = match[3] || match[1];
      var keyIdentifier = match[2];

      if (aliasAs && (!/^[$a-zA-Z_][$a-zA-Z0-9_]*$/.test(aliasAs) ||
          /^(null|undefined|this|\$index|\$first|\$middle|\$last|\$even|\$odd|\$parent|\$root|\$id)$/.test(aliasAs))) {
        throw ngRepeatMinErr('badident', "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
          aliasAs);
      }


      var trackByExpGetter, trackByIdExpFn, trackByIdArrayFn, trackByIdObjFn;
      // var hashFnLocals = {$id: hashKey};

      if (trackByExp) {
        trackByExpGetter = $parse(trackByExp);
      } else {
        trackByIdArrayFn = function(key, value) {
          return hashKey(value);
        };
        trackByIdObjFn = function(key) {
          return key;
        };
      }

      return function serverRepeatLink($scope, $element, $attr, ctrl, $transclude) {
	var member               = $scope[lhs] = { $$scope: $scope };
        var collection           = $scope.$parent[rhs] || [];
	
	for (var i = 0; i < $element.children().length; i++) {
	  var c = angular.element($element.children()[i]);
	  if (c[0].attributes.hasOwnProperty('server-repeat-item')) {
	    var newObject = {};
	    for (var j = 0; j < c[0].children.length; j++) {
              var gc = angular.element(c[0].children[j]);
	      if (gc[0].attributes.hasOwnProperty('server-bind')) {
		var key = gc[0].attributes['server-bind'].value;
		var val = gc[0].innerText;
		newObject[key] = val;
		console.log(gc[0]);
		angular.element(gc[0]).attr('ng-bind', (lhs + "." + key));
		//newObject[gc[0].attributes['server-bind'].value] = gc[0].innerText;
	      }
	    }
	    // hashKey
	    var sScope = $scope.$new(true);
	    sScope['index'] = i;
	    sScope[lhs] = newObject;
	    console.log(sScope);
	    $compile($element.children()[i])(sScope);
	    collection.push(newObject);
	  }
	}
	
	$scope.$parent[rhs] = collection;
        // watch here if serverRepeatItemDynamic does not exist
	// this means there are no dynamic elements
	/*
	$scope.$parent.$watchCollection(rhs, function(u) {
          console.log('change in top');
	});
	*/
      }
    }
  }
}).directive('serverRepeatItemDynamic', function($animate,$compile) {
  return {
    restrict : 'A',
    transclude : 'element',
    compile: function($element, $attr) {
      //var expression = $attr.serverRepeatItemDynamic;
      var serverRepeatItemDynamicMinErr = minErr('serverRepeatItemDynamic');
      //var serverRepeatItemDynamicEndComment = $compile.$$createComment('end serverRepeatItemDynamic',expression) 
      return function($scope, $element, $attr, ctrl, $transclude) {
        //console.log($scope);
	//console.log($scope.post);
	//console.log($scope.$$childHead);
	if (!$element.parent().length > 0 &&
	  !$element.parent()[0].attributes.hasOwnProperty('server-repeat')) {
	  throw serverRepeatItemDynamicMinErr('badident', 'requires server-repeat as an immediate parent', $element.parent());
	}

	var expression = $element.parent()[0].attributes['server-repeat'].nodeValue;
	var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);
	if (!match) {
          throw serverRepeatMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
				   expression);
	}
	var lhs = match[1];
	var rhs = match[2];

	//var serverSideCollection = $scope.$parent[rhs];
	//console.log(serverSideCollection);
	
	var remove = $scope.$parent.$watchCollection(rhs, function(serverSideCollection) {
	  console.log('first call');
	  console.log(serverSideCollection);

	  // copy, don't want this to be a reference
	  var serverSideCollection = angular.copy(serverSideCollection);
          var previousCollection   = angular.copy(serverSideCollection);
	  console.log(previousCollection);
	  $scope.$parent.$watchCollection(rhs, function(collection) {
	    console.log('second');

	    var collectionLength = collection.length;
	    var previousCollectionLength = previousCollection.length;
	    // locate existing items
	    //for (var index = 0; index < collectionLength; index++) {
	    // key = index;
            // }

	    // remove leftover items

	    // add new items
	    // get second to last child
	    //previousNode = $element.parent()[0];
	    previousNode = $element[0];
	    // console.log($element);
	    // console.log($element[0].children);
	    // console.log(previousNode);
	    console.log(collection);
	    console.log(previousCollection);
	    /*
	    var existingElements = $element[0].parentElement.children;

	    for (var i = 0; existingElements.length; i++) {
	      console.log('see scope');
	      //console.log(existingElements[i]);
	    }
	    */
	    /*
	    var existingElements = angular.element($element[0].parentElement.children);
	    console.log(existingElements);
	    console.log(existingElements.length);
	    var deleteElements = [];
	    var scopeIds = [];
	    for (var i = 0; i < existingElements.length; i++) {
	      var localScope = angular.element(existingElements[i].scope());
	      scopeIds.push(localScope.index);
	      if (i != localScope.index) {
		//
	      }
	      //if (i != localScope.index) {
		
	      // } else {

	      //	      }
	    }
	    */
	    /* works
	    if (collectionLength < previousCollectionLength) {
            $animate.leave($element[0].parentElement.children[0]);
	    }
	    */
	    for (index = 0; index < collectionLength; index++) {
	      console.log('scope');
              // check for scope, it has the index
	      // if scope is not

	      // index matches id from scope, means item has not moved
	      // index has no id in scope, means item has been deleted
	      // id from scope does not have index, means it has been deleted
	      
	      if (index < previousCollectionLength &&
		  angular.equals(collection[index],previousCollection[index])) {
		console.log('old');
	      } else {
		console.log('new');
		$transclude(function(clone,scope) {
		  $animate.enter(clone, null, previousNode);
		  scope[lhs] = collection[index];
		  scope['index'] = index;
		});
	      }
	      console.log(angular.element($element[0].parentElement.children[index]).scope());
	      console.log(angular.element($element[0].parentElement.children[index]).scope()['index']);
	    }
	    previousCollection = angular.copy(collection);
	  });
	  remove();
	});
	/*
	var second = $scope.$parent.$watchCollection(rhs, function(updatedCollection) {
	  console.log('second');
	});
	*/
      }
    }
  } 
});
