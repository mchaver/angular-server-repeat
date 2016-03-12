'use strict';

// poor man's parser
// text to javascript key
function parseKey(keyText) {
  var tokens = [];
  var keyTextLength = keyText.length;
  var prev = null;
  var curr = '';

  for (var i = 0; i < keyTextLength; i++) {
    var c = keyText[i];

    if (c === '.') {
      if (prev === '.') {
	throw "'parseVarAndKey Error': .. is an invalid char sequence."
      } else if (i === keyTextLength - 1) {
	throw "'parseVarAndKey Error': .. is an invalid char sequence."
      } else {
	tokens.push(curr);
	curr = '';
	prev = c;
      }
    } else {
      if (i === keyTextLength -1) {
	// last char in sequence
	curr += c;
	tokens.push(curr);
      } else {
	curr += c;
	prev = c;
      }
    }
  }

  if (tokens.length < 2) {
    throw "'parseVarAndKey Error': you must provide a value and one or more keys: 'value.key'."
  }

  return {scopeVar:tokens[0],keys:tokens.splice(1,tokens.length)};
  //return {scopeVar:tokens[0],key:tokens.splice(1,tokens.length).join('.')};
}



function isWindow(obj) {
  return obj && obj.window === obj;
}

var uid = 0;

var isArray = Array.isArray;
function nextUid() {
  return ++uid;
}

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
        //blockNodes = jqLite(slice.call(nodes, 0, i));
        blockNodes = Array.prototype.slice.call(nodes, 0, i);
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

function hashKey(obj, nextUidFn) {
  var key = obj && obj.$$hashKey;

  if (key) {
    if (typeof key === 'function') {
      key = obj.$$hashKey();
    }
    return key;
  }

  var objType = typeof obj;
  if (objType == 'function' || (objType == 'object' && obj !== null)) {
    key = obj.$$hashKey = objType + ':' + (nextUidFn || nextUid)();
  } else {
    key = objType + ':' + obj;
  }

  return key;
}



/*
angular.module('ServerRepeat',['ngAnimate']).directive('serverRepeat',function($animate, $compile, $parse) {
  return {
    restrict : 'A',
    priority : 1000,
    controller: function( $scope, $element, $attrs, $transclude ) {
      $scope.z = 'z-test';
      this.test = 'ctrl test';
      this.collectionNames = [];
    },
    compile: function serverRepeatCompile($element, $attr) {
      var expression = $attr.serverRepeat;
      var serverRepeatMinErr = minErr('serverRepeat');

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
        throw serverRepeatMinErr('badident', "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
          aliasAs);
      }

      
      return {
	pre : function ($scope,$element,$attr,ctrl,$transclude) {
	  var collection;
	  var member;

	  function getCollection(lhs,rhs) {
	    var collection;
	    var collectionName = '';
	    if (rhs.indexOf('.') > -1) {
	      // possibly has more than one child
	      var names = rhs.split('.');
	      var parentAlias = names[0];
	      var parentName  = $scope.$parent['$$collectionAliases'][parentAlias];

	      var collections = $scope.$parent[parentName];
	      var parentCollection = collections[collections.length-1];
              
	      var namesLength = names.length;
	      var childAlias = lhs;
	      var childName = names[namesLength - 1];
	      var middleVarNames = [];
	      for (var i = 1; i < namesLength - 1; i++) {
		middleVarNames.push(names[i]);
	      }
	      // point to the correct collection
	      // parentCollection[childName] = [];

	      collection = parentCollection;
	      for (var i = 0; i < middleVarNames.length; i++) {
		// set value as {}
		collection[middleVarNames[i]] = {};
		collection = collection[middleVarNames[i]];
	      }
	      collection[childName] = [];
	      collection = collection[childName];
	      
	      collectionName = parentName + '[' + String(collections.length-1) + '].' + names.join('.');

	    } else if ($scope.$parent[rhs]) {
              
	      collection = $scope.$parent[rhs];
	      collectionName = rhs; // + '[' + String($scope.$parent[rhs].length) + ']';
	    } else {
	      if (!$scope.$parent.hasOwnProperty('$$collectionAliases')) {
		$scope.$parent['$$collectionAliases'] = {};
	      }
	      $scope.$parent['$$collectionAliases'][lhs] = rhs;
	      $scope.$parent[rhs] = [];
	      collection = $scope.$parent[rhs];
	      collectionName = rhs;
	    }
	    return collection;
	    //return {collection:collection,collectionName:collectionName};
	  }

	  collection = getCollection(lhs,rhs);

	  if ($scope.$parent.hasOwnProperty('$$collectionNames')) {
	    $scope.$parent.$$collectionNames.push({lhs:lhs,rhs:rhs});
	  } else {
	    $scope.$parent.$$collectionNames = [{lhs:lhs,rhs:rhs}];
	  }

	  // properties are added as everything is compiled
	  // dependent on compile order
	  $scope.$parent.addMember = function() {
	    collection.push({});
	    member = collection[collection.length-1];
	  }

	  // incorrect, doesn't handle all cases
	  $scope.$parent.setProperty = function(key, value) {
	    //console.log(member);
	    member[key] = value;
	  }

	  $scope.$parent.setProperties = function(properties) {
	    angular.extend(member, properties);
	  }

	  $scope.$parent.popCollection = function() {
	    console.log('popCollection');
	    $scope.$parent.$$collectionNames.pop();
	    
	    var l = $scope.$parent.$$collectionNames.length;
	    if (l > 0) {
	      var names = $scope.$parent.$$collectionNames[l-1];
	      collection = getCollection(names.lhs,names.rhs);
	      member = collection[collection.length-1];
	    }

	  }

	  // compile each serverRepeatItem in its post-link 
	  $scope.$parent.compileServerRepeatItem = function(element) {
	    var cnl = $scope.$parent.$$collectionNames.length;
	    var cl  = collection.length;

	    if (cnl > 0 && cl > 0) {
	      var newScope = $scope.$new(true);
	      newScope.$$serverSide = true;
	      var lhs = $scope.$parent.$$collectionNames[cnl-1].lhs;
	      newScope[lhs] = collection[cl-1];

	      $compile(element.contents())(newScope);
	    }
	  }
	}, post : function ($scope,$element,$attr,ctrl,$transclude) {	  
	  $scope.$parent.popCollection();
	}
      }	
    }
  }
}).directive('serverRepeatItem',function($compile) {
  return {
    restrict : 'A',
    priority : 999,
    require : '^serverRepeat',
    compile: function serverRepeatCompile($element, $attr) {
      return {
	pre : function ($scope,$element,$attr,ctrl,$transclude) {
	  $scope.$parent.addMember();
	  if ($attr.hasOwnProperty('serverRepeatItemData')) {
	    $scope.$parent.setProperties(angular.fromJson($attr.serverRepeatItemData));
	  }

	}, post : function ($scope,$element,$attr,ctrl,$transclude) {
	  // already traversed the children elements
	  // add data to a new scope and bind it to make ng-bind work properly
	  $scope.$parent.compileServerRepeatItem($element);
	}
      }
    }    
  }
}).directive('serverBind',function($compile) {
  return {
    restrict : 'A',
    priority : 998,
    require  : '^serverRepeat',
    compile: function serverRepeatCompile($element, $attr) {
      return {
	pre : function ($scope,$element,$attr,ctrl,$transclude) {
	  // loop to get appropriate scope
	  var p = $scope.$parent;
	  if (!p.hasOwnProperty('setProperty')) {
	    p = p.$parent;
	  }
	  
	  var keys = $attr.serverBind.split('.');
	  var keysWithoutFirst = keys.slice(1,keys.length);
	  if (keys.length > 0) {
	    var key = keys[keys.length-1]
	    console.log($element.text());
	    p.setProperty(key,$element.text());
	    $element.attr('ng-bind', $attr.serverBind);
	  } else {
            // throw error
	  }
	}, post : angular.noop
      }
    }    
  }
})

*/

angular.module('ServerRepeat',['ngAnimate']).directive('serverRepeat',function($animate, $compile, $parse) {
  return {
    restrict : 'A',
    priority : 1000,
    compile: function serverRepeatCompile($element, $attr) {
      var expression = $attr.serverRepeat;
      var serverRepeatMinErr = minErr('serverRepeat');

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
        throw serverRepeatMinErr('badident', "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
          aliasAs);
      }

      // replace lhs with valueIdentifer

      // pre should require parent functions to be compiled first
      return {pre: function serverRepeatLink($scope,$element,$attr,ctrl,$transclude) {

	// this is very dependent on compile order
	// if compile order is altered then this will break
	// it assumes that its parents were compiled first and
	// that its uncle nodes have not been compiled yet
	// otherwise parentCollection will have the incorrect value, it gets the last one
	function getCollection(lhs,rhs) {
	  var collection;
	  var collectionName = '';
	  if (rhs.indexOf('.') > -1) {
	    // possibly has more than one child
	    var names = rhs.split('.');
	    var parentAlias = names[0];
	    var parentName  = $scope.$parent['$$collectionAliases'][parentAlias];

	    var collections = $scope.$parent[parentName];
	    var parentCollection = collections[collections.length-1];
            
	    var namesLength = names.length;
	    var childAlias = lhs;
	    var childName = names[namesLength - 1];
	    var middleVarNames = [];
	    for (var i = 1; i < namesLength - 1; i++) {
	      middleVarNames.push(names[i]);
	    }

	    // point to the correct collection
	    parentCollection[childName] = [];

	    collection = parentCollection;
	    for (var i = 0; i < middleVarNames.length; i++) {
	      // set value as {}
	      collection[middleVarNames[i]] = {};
	      collection = collection[middleVarNames[i]];
	    }
	    collection[childName] = [];
	    collection = collection[childName];
	    
	    collectionName = parentName + '[' + String(collections.length-1) + '].' + names.join('.');
	    //collectionName = parentName + '[' + String(collections.length-1) + '].' + childName + '[' + String(parentCollection[childName].length) + ']';
	  } else if ($scope.$parent[rhs]) {
            
	    collection = $scope.$parent[rhs];
	    collectionName = rhs; // + '[' + String($scope.$parent[rhs].length) + ']';
	  } else {
	    if (!$scope.$parent.hasOwnProperty('$$collectionAliases')) {
	      $scope.$parent['$$collectionAliases'] = {};
	    }
	    $scope.$parent['$$collectionAliases'][lhs] = rhs;
	    $scope.$parent[rhs] = [];
	    collection = $scope.$parent[rhs];
	    collectionName = rhs;
	  }
	  return {collection:collection,collectionName:collectionName};
	}

	var cs = getCollection(lhs,rhs);
        var collection     = cs.collection;
	var collectionName = cs.collectionName;

	console.log('element:');
	console.log($element);
	var items = Array.prototype.slice.call($element.children());
	console.log(items);
	var i = 0;
	while (items.length > 0) {
	  var c = angular.element(items.shift());
	  console.log(c);
	//for (var i = 0; i < $element.children().length; i++) {
	//for (var i = 0; i < $element.childNodes().length; i++) {
	  //var c = angular.element($element.children()[i]);
	  //var c = angular.element($elemenet.childNodes()[i]);
	  if (c[0].attributes.hasOwnProperty('server-repeat-item')) {
	    var newObject = {};

	    if (c[0].attributes.hasOwnProperty('server-repeat-item-data')) {
	      //  ngServerRepeatCtrl.setProperties(angular.fromJson(attrs.serverBind));
	      console.log(c[0].attributes['server-repeat-item-data']);
	      newObject = angular.fromJson(c[0].attributes['server-repeat-item-data'].value);
	    }


	    var gcs = Array.prototype.slice.call(angular.element(c[0].children));
	    while (gcs.length > 0) {
	    //for (var j = 0; j < c[0].children.length; j++) {
              //var gc = angular.element(c[0].children[j]);
	      var gc = angular.element(gcs.shift());
	      if (gc[0].attributes.hasOwnProperty('server-bind')) {
		// top level server-bind
		// go all the way to the bottom, if there are server-bindchildren server-repeat-item
		// them capture the value as array
		var scopeVarAndKeys = parseKey(gc[0].attributes['server-bind'].value);
		var scopeVar = scopeVarAndKeys.scopeVar;
		var keys = scopeVarAndKeys.keys;
		var val = gc[0].innerText;
		// hashes only right now, not able to distinguish arrays yet
		// need a way to handle that
		
                var newObjectPointer = newObject;
		var keysLength = keys.length;
		for (var k = 0; k < keysLength; k++) {
		  if (k === keysLength - 1) {
		    // add value, push value to an array, or initialize the array
		    newObjectPointer[keys[k]] = val
		  } else {
		    // hash does not exist, create it
		    if (!newObjectPointer.hasOwnProperty(keys[k])) {
		      newObjectPointer[keys[k]] = {};
		    }
		    newObjectPointer = newObjectPointer[keys[k]];
		  }
		}

		// optional ng-bind available, this creates two way data binding
		// if ng-bind is not added then changes from the controller will not be reflected
		// in the html
		angular.element(gc[0]).attr('ng-bind', (scopeVar + "." + keys.join('.')));
	      } else {
		if (!gc[0].attributes.hasOwnProperty('server-repeat') &&
		    !gc[0].attributes.hasOwnProperty('server-repeat-item')) {
		  gcs.concat(Array.prototype.slice.call(angular.element(gc[0].children)));
		}
	      }
	    }

	    collection.push(newObject);

	    var newScope = $scope.$new(true);
            newScope.$$serverSide = true;
	    // might have some issues
	    newScope.$$parentName = collectionName + '[' + String(i) + ']';
	    newScope[lhs] = newObject;

	    $compile($element.children()[i])(newScope);
	  } else {
	    if (!c[0].attributes.hasOwnProperty('server-repeat') &&
		!c[0].attributes.hasOwnProperty('server-bind')) {
	      items.concat(Array.prototype.slice.call(angular.element(c[0].children)));
	    }
	  }
	  i++;
	  //$compile($
	}

	// check for server-repeat-item-dynamic at the same level
      }, post: angular.noop}            
    }
  }
}).directive('serverRepeatItemDynamic', function($animate,$compile,$parse) {
  var NG_REMOVED = '$$NG_REMOVED';
  var serverRepeatMinErr = minErr('serverRepeatItemDynamic');

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
    priority: 1000,
    transclude: 'element',
    compile: function serverRepeatCompile($element, $attr) {

      // must be the direct child of server-repeat
      if (!$element.parent().length > 0 && !$element.parent()[0].attributes.hasOwnProperty('server-repeat')) {
	throw serverRepeatMinErr('iexp', '')
      }
      
      var expression = $element.parent()[0].attributes['server-repeat'].nodeValue;
      var serverRepeatEndComment = document.createComment(' end serverRepeatDynamic: ' + expression + ' ');


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
        throw serverRepeatMinErr('badident', "alias '{0}' is invalid --- must be a valid JS identifier which is not a reserved name.",
          aliasAs);
      }

      var trackByExpGetter, trackByIdExpFn, trackByIdArrayFn, trackByIdObjFn;
      var hashFnLocals = {$id: hashKey};

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

        if (trackByExpGetter) {
          trackByIdExpFn = function(key, value, index) {
            // assign key, value, and $index to the locals so that they can be used in hash functions
            if (keyIdentifier) hashFnLocals[keyIdentifier] = key;
            hashFnLocals[valueIdentifier] = value;
            hashFnLocals.$index = index;
            return trackByExpGetter($scope, hashFnLocals);
          };
        }

        // Store a list of elements from previous run. This is a hash where key is the item from the
        // iterator, and the value is objects with following properties.
        //   - scope: bound scope
        //   - element: previous element.
        //   - index: position
        //
        // We are using no-proto object so that we don't need to guard against inherited props via
        // hasOwnProperty.
        var lastBlockMap = createMap();

	// this is very dependent on compile order
	// if compile order is altered then this will break
	
	var vi;
	if ($scope.$parent.hasOwnProperty(rhs)) {
	  vi = rhs;
	} else {
	  var records = rhs.split('.');
	  records = records.splice(1,records.length).join('.');
	  vi = angular.element($element[0].parentElement).scope().$$parentName + '.' + records;
	}

	var watchServerSideCollectionOnce = $scope.$watchCollection(vi, function(serverSideCollection) {
	  $scope.$watchCollection(vi, function serverRepeatAction(collection) {

            var index, length,
		previousNode = $element[0],     // node that cloned nodes should be inserted after
                // initialized to the comment node anchor
		nextNode,
		// Same as lastBlockMap but it has the current state. It will become the
		// lastBlockMap on the next iteration.
		nextBlockMap = createMap(),
		collectionLength,
		key, value, // key/value of iteration
		trackById,
		trackByIdFn,
		collectionKeys,
		block,       // last object information {scope, element, id}
		nextBlockOrder,
		elementsToRemove;

            if (aliasAs) {
              $scope[aliasAs] = collection;
            }

            if (isArrayLike(collection)) {
              collectionKeys = collection;
              trackByIdFn = trackByIdExpFn || trackByIdArrayFn;
            } else {
              trackByIdFn = trackByIdExpFn || trackByIdObjFn;
              // if object, extract keys, in enumeration order, unsorted
              collectionKeys = [];
              for (var itemKey in collection) {
		if (hasOwnProperty.call(collection, itemKey) && itemKey.charAt(0) !== '$') {
                  collectionKeys.push(itemKey);
		}
              }
            }

            collectionLength = collectionKeys.length;
            nextBlockOrder = new Array(collectionLength);

            // locate existing items
            for (index = 0; index < collectionLength; index++) {
              key = (collection === collectionKeys) ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn(key, value, index);

              if (lastBlockMap[trackById]) {
		// found previously seen block
		block = lastBlockMap[trackById];
		delete lastBlockMap[trackById];
		nextBlockMap[trackById] = block;
		nextBlockOrder[index] = block;
		
              } else if (nextBlockMap[trackById]) {
		// if collision detected. restore lastBlockMap and throw an error
		forEach(nextBlockOrder, function(block) {
                  if (block && block.scope) lastBlockMap[block.id] = block;
		});
		throw serverRepeatMinErr('dupes',
				     "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}, Duplicate value: {2}",
				     expression, trackById, value);
              } else {
		// new never before seen block
		nextBlockOrder[index] = {id: trackById, scope: undefined, clone: undefined};
		nextBlockMap[trackById] = true;
              }
            }

	    
            // remove leftover items
            for (var blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];

              elementsToRemove = getBlockNodes(block.clone);
              $animate.leave(elementsToRemove);
              if (elementsToRemove[0].parentNode) {
		// if the element was not removed yet because of pending animation, mark it as deleted
		// so that we can ignore it later
		for (index = 0, length = elementsToRemove.length; index < length; index++) {
                  elementsToRemove[index][NG_REMOVED] = true;
		}
              }
              block.scope.$destroy();
            }

            // we are not using forEach for perf reasons (trying to avoid #call)
            for (index = 0; index < collectionLength; index++) {
              key = (collection === collectionKeys) ? index : collectionKeys[index];
              value = collection[key];
              block = nextBlockOrder[index];

              if (block.scope) {
		// if we have already seen this object, then we need to reuse the
		// associated scope/element

		nextNode = previousNode;

		// skip nodes that are already pending removal via leave animation
		do {
                  nextNode = nextNode.nextSibling;
		} while (nextNode && nextNode[NG_REMOVED]);

		if (getBlockStart(block) != nextNode) {
                  // existing item which got moved
                  $animate.move(getBlockNodes(block.clone), null, previousNode);
		}
		previousNode = getBlockEnd(block);
		updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
	      } else {
		//** do non-bound server-repeats have scope?
		//** need to make sure
		var eScope = angular.element($element[0].parentElement.children[index]).scope();
		if (eScope && eScope.hasOwnProperty('$$serverSide') && eScope['$$serverSide']) {
		  // handle items from serverside
		  block.scope = angular.element($element[0].parentElement.children[index]).scope();
		  block.clone = angular.element($element[0].parentElement.children[index]);
		  nextBlockMap[block.id] = block;
		} else {
		  $transclude(function serverRepeatTransclude(clone, scope) {
                    block.scope = scope;
                    // http://jsperf.com/clone-vs-createcomment
                    var endNode = serverRepeatEndComment.cloneNode(false);
		    //var endNode = '';
                    clone[clone.length++] = endNode;
                    
                    $animate.enter(clone, null, previousNode);
                    previousNode = endNode;
                    // Note: We only need the first/last node of the cloned nodes.
                    // However, we need to keep the reference to the jqlite wrapper as it might be changed later
                    // by a directive with templateUrl when its template arrives.
                    block.clone = clone;
                    nextBlockMap[block.id] = block;
                    updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
		  });
		}
	      }
            }
            lastBlockMap = nextBlockMap;
          });
	  watchServerSideCollectionOnce();
	});
      };
    }
  };
});

