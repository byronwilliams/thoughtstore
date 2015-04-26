(function() {
    angular
        .module("ThoughtWorks")
        .controller("ThoughtListCtrl", ThoughtListCtrl);

    ThoughtListCtrl.$inject = ["$rootScope", "$scope", "ThoughtService"];
    function ThoughtListCtrl($rootScope, $scope, ThoughtService) {
        var vm = this;

        reset();
        init();

        function reset() {
            vm.journal = "default";
            vm.posts = [];
        }

        function init() {
            ThoughtService.list().then(function(res) {
                vm.posts = ThoughtService.transform(res.data);
            });
        }

        $scope.$on("auth:loggedIn", function() {
            init();
        });

        $scope.$on("auth:loggedOut", function() {
            reset();
        });
    };
})();
