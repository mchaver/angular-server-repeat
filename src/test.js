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
  //var key = tokens[0];
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

  console.log('getBlockNodes function');
  console.log(nodes);
  console.log(blockNodes);

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


angular.module('ServerRepeat',['ngAnimate']).directive('serverRepeat',function($animate, $compile, $parse) {
  return {
    restrict : 'A',
    priority : 1000,
    //terminal : true,
    //$$tlb: true,
    compile: function serverRepeatCompile($element, $attr) {
      var expression = $attr.serverRepeat;
      var serverRepeatMinErr = minErr('serverRepeat');

      //console.log(parseKey('post.title'));

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

      // pre should require parent functions to be compiled first
      return {pre: function serverRepeatLink($scope,$element,$attr,ctrl,$transclude) {
        console.log('pre:');
	console.log(rhs);
        if (trackByExpGetter) {
          trackByIdExpFn = function(key, value, index) {
            // assign key, value, and $index to the locals so that they can be used in hash functions
            if (keyIdentifier) hashFnLocals[keyIdentifier] = key;
            hashFnLocals[valueIdentifier] = value;
            hashFnLocals.$index = index;
            return trackByExpGetter($scope, hashFnLocals);
          };
        }

	function getCollection(lhs,rhs) {
	  var collection;
	  
	  if (rhs.indexOf('.') > -1) {
	    var parentAliasAndChildName = rhs.split('.');
	    var parentAlias = parentAliasAndChildName[0];
	    var parentName = $scope.$parent['collectionAliases'][parentAlias];
	    var childAlias = lhs;
	    var childName  = parentAliasAndChildName[1];
	    var collections = $scope.$parent[parentName];

	    console.log('collections:');
	    console.log(collections);
	    var parentCollection = collections[collections.length-1];
            
	    parentCollection[childName] = [];
	    collection = parentCollection[childName];
	    /*
	    if (parentCollection.hasOwnProperty(childName)) {
	      
	    } else {

	    }
	    */
	  } else if ($scope.$parent[rhs]) {
	    collection = $scope.$parent[rhs];
	  } else {
	    if (!$scope.$parent.hasOwnProperty('collectionAliases')) {
	      $scope.$parent['collectionAliases'] = {};
	    }
	    $scope.$parent['collectionAliases'][lhs] = rhs;
	    $scope.$parent[rhs] = [];
	    collection = $scope.$parent[rhs];
	  }
	  return collection;
	}

        //var collection           = $scope.$parent[rhs] || [];
	var collection = getCollection(lhs,rhs);

	for (var i = 0; i < $element.children().length; i++) {
	  var c = angular.element($element.children()[i]);

	  if (c[0].attributes.hasOwnProperty('server-repeat-item')) {
	    var newObject = {};

	    for (var j = 0; j < c[0].children.length; j++) {
              var gc = angular.element(c[0].children[j]);
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

		/*
		var keysLength = keys.length;
		for (var k = 0; k < keysLength; k++) {
                  if (k === keysLength - 1) {
                    newObject[keys[k]] = val;
		  }
		}
		*/
		
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
		
		angular.element(gc[0]).attr('ng-bind', (scopeVar + "." + keys.join('.')));
	      }
	    }
	    // hashKey
	    /*
	      key = (collection === collectionKeys) ? index : collectionKeys[index];
              value = collection[key];
              trackById = trackByIdFn(key, value, index);

	     */
	    var newScope = $scope.$new(true);
	    newScope['$index'] = i;
            newScope['$$serverSide'] = true;
	    newScope[lhs] = newObject;
               
	    console.log(newScope);
	    collection.push(newObject);
	    $compile($element.children()[i])(newScope);
	   
	  }
	}
	console.log(rhs);
        
	console.log('directive scope')
	console.log($scope);
      }, post: angular.noop}
            
    }
  }
}).directive('serverRepeatItemDynamic', function($animate,$compile,$parse) {
  var NG_REMOVED = '$$NG_REMOVED';
  var ngRepeatMinErr = minErr('serverRepeatItemDynamic');

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
    compile: function ngRepeatCompile($element, $attr) {

      // must be the direct child of server-repeat
      if (!$element.parent().length > 0 && !$element.parent()[0].attributes.hasOwnProperty('server-repeat')) {
	throw ngRepeatMinErr('iexp', '')
      }
      
      var expression = $element.parent()[0].attributes['server-repeat'].nodeValue;
      var ngRepeatEndComment = document.createComment(' end serverRepeatDynamic: ' + expression + ' ');


      var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)(?:\s+as\s+([\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

      if (!match) {
        throw ngRepeatMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
            expression);
      }

      var lhs = match[1];
      var rhs = match[2];
      var aliasAs = match[3];
      var trackByExp = match[4];

      match = lhs.match(/^(?:(\s*[\$\w]+)|\(\s*([\$\w]+)\s*,\s*([\$\w]+)\s*\))$/);

      if (!match) {
        throw ngRepeatMinErr('iidexp', "'_item_' in '_item_ in _collection_' should be an identifier or '(_key_, _value_)' expression, but got '{0}'.",
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

      return function ngRepeatLink($scope, $element, $attr, ctrl, $transclude) {

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

	var remove = $scope.$watchCollection(rhs, function(serverSideCollection) {
	  // don't let serverSideCollection be a reference to rhs
	  var serverSideCollection = angular.copy(serverSideCollection);
	  var serverSideCollectionLength = serverSideCollection.length;
	  // track indexes in case something is deleted or moved
	  var firstTime = true;
	  var serverSideBlocks = createMap();
          //watch props
	  console.log('serverSideCollection');
          console.log(serverSideCollection);	  
          $scope.$watchCollection(rhs, function ngRepeatAction(collection) {
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
	      console.log(trackById);
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
		throw ngRepeatMinErr('dupes',
				     "Duplicates in a repeater are not allowed. Use 'track by' expression to specify unique keys. Repeater: {0}, Duplicate key: {1}, Duplicate value: {2}",
				     expression, trackById, value);
              } else {
		// new never before seen block
		nextBlockOrder[index] = {id: trackById, scope: undefined, clone: undefined};
		nextBlockMap[trackById] = true;
              }
            }


	    // ** need to readjust the serverSideCollection size if an item
	    // from the serverSideCollection gets deleted
	    
            // remove leftover items
            for (var blockKey in lastBlockMap) {
              block = lastBlockMap[blockKey];
	      console.log('getBlockNodes');
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
              } else if (index > serverSideCollectionLength - 1) {
		// don't animate items that are entered via sever-repeat-item
		// new item which we don't know about
		$transclude(function ngRepeatTransclude(clone, scope) {
                  block.scope = scope;
                  // http://jsperf.com/clone-vs-createcomment
                  var endNode = ngRepeatEndComment.cloneNode(false);
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
              } else {
		// handle items in serverside
		console.log('server side');
                  
		block.scope = angular.element($element[0].parentElement.children[index]).scope();
   
		block.clone = angular.element($element[0].parentElement.children[index]);
                console.log(block);
		nextBlockMap[block.id] = block;

		/*
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
		*/
                /*
		var endNode = ngRepeatEndComment.cloneNode(false);

		var clone = angular.element($element[0].parentElement.children[index]);
                clone[clone.length++] = endNode;

		previousNode = endNode;  
                block.clone = clone;
		nextBlockMap[block.id] = block;
		updateScope(block.scope, index, valueIdentifier, value, keyIdentifier, key, collectionLength);
                */
	      }
            }
            lastBlockMap = nextBlockMap;
          });
	  remove();
	});
      };
    }
  };
});
