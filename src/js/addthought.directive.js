(function() {
    angular
        .module("ThoughtWorks")
        .directive("addThought", addThought)
    ;

    function addThought() {
        var directive = {
            restrict: "A",
            templateUrl: "/partials/thoughts/add.html",
            controller: AddThoughtCtrl,
            controllerAs: "vm",
            bindToController: true
        };

        return directive;
    }

    AddThoughtCtrl.$inject = ["$scope", "ThoughtService"];
    function AddThoughtCtrl($scope, ThoughtService) {
        var vm = this;

        vm.reset = function() {
            vm.text = "";

            if(!vm.date || vm.date.length === 0) {
                vm.date = (new Date());
            }
        }

        vm.add = function() {
            console.log("vm.add");
            ThoughtService.add(vm.text, vm.date).then(function(thought) {
                vm.reset();
            });
        }

        vm.reset();
    }
})();

