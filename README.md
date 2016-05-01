# angular-server-repeat

This package is inspired by [Angular Server Repeat by Restorando](https://github.com/restorando/angular-server-repeat), but the code is based off of the [Angular 1 definition of ngRepeat](https://github.com/angular/angular.js/blob/master/src/ng/directive/ngRepeat.js).

This package allows you to define static items in HTML that can be deleted, read and wrote in an Angular directive. You can even add dynamic items to the array of statically defined items.

## HTML Example
```html
<!-- persons will be injected into the parent directive as $scope.persons = [] -->

<div server-repeat="person in persons">
  <!-- each server-repeat-item will be added to persons 
       server-repeat-item-data will be added to the server-repeat-item but will not be rendered on the screen
  -->
  <div server-repeat-item server-repeat-item-data='{"id":0}'>
    <!-- server-bind defines a field in the object that gets appended to $scope.persons -->
    <!-- person.name = 'Cervantes' -->
    <div server-bind="person.name">Cervantes</div>
    <!-- person.age = 58 -->
    <div server-bind="person.age">58</div>
  </div>
  <div server-repeat-item server-repeat-item-data='{"id":1}'>
    <div server-bind="person.name">Lazarillo</div>
    <div server-bind="person.age">24</div>
  </div>
  <div server-repeat-item server-repeat-item-data='{"id":2}'>
    <div server-bind="person.name">Vega</div>
    <div server-bind="person.age">31</div>
  </div>
  
  <!-- this allows items to be added to $scope.persons -->
  <div server-repeat-item-dynamic>
    <!-- you can use ng-bind just like in ng-repeat -->
    <div ng-bind="person.name"></div>
    <div ng-bind="person.age"></div>
  </div>
</div>
```

