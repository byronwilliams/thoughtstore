(function() {
    angular
        .module("ThoughtWorks")
        .directive("oneThought", oneThought)
    ;

    function oneThought() {
        var directive = {
            restrict: "A",
            templateUrl: "/partials/thoughts/one.html",
            controller: OneThoughtCtrl,
            controllerAs: "vm",
            bindToController: true,
            scope: {
                thought: "=",
                importMode: "="
            }
        };

        return directive;
    }

    OneThoughtCtrl.$inject = ["$scope", "ThoughtService"];
    function OneThoughtCtrl($scope, ThoughtService) {
        var vm = this;
        var oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate()-1);

        if(vm.importMode || vm.thought.writtenAt.getTime() > oneDayAgo) {
            vm.showTrash = true;
        }

        vm.remove = function() {
            $scope.$emit("deleteThought", {
                thought: vm.thought,
                importMode: vm.importMode
            });
        }

        vm.import = function() {
            $scope.$emit("importThought", vm.thought);
        }
    }
})();
